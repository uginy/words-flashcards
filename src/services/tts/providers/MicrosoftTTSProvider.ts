import type { TTSProvider, TTSOptions, TTSVoice, SSMLBuilder } from '../types';

class MicrosoftSSMLBuilder implements SSMLBuilder {
  buildSSML(text: string, options: TTSOptions): string {
    const lang = options.lang || 'he-IL';
    const voiceName = this.getVoiceName(lang, options.voice);
    const rate = options.rate || 1.0;
    const pitch = options.pitch || 1.0;

    // Convert rate and pitch to percentage values
    const ratePercent = Math.round(rate * 100);
    const pitchPercent = Math.round(pitch * 100);
    
    return `<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" version="1.0" xml:lang="${lang}">
  <voice name="${voiceName}">
    <prosody rate="${ratePercent}%" pitch="${pitchPercent}%">
      ${this.escapeXml(text)}
    </prosody>
  </voice>
</speak>`.trim();
  }

  private getVoiceName(lang: string, voiceHint?: string): string {
    const voiceMap: Record<string, string[]> = {
      'he-IL': ['he-IL-HilaNeural', 'he-IL-AvriNeural'],
      'ru-RU': ['ru-RU-SvetlanaNeural', 'ru-RU-DmitryNeural'],
      'en-US': ['en-US-JennyNeural', 'en-US-GuyNeural']
    };

    const voices = voiceMap[lang] || voiceMap['he-IL'];
    
    // If voice hint provided, try to match it
    if (voiceHint) {
      const matchedVoice = voices.find(v => v.includes(voiceHint));
      if (matchedVoice) return matchedVoice;
    }

    return voices[0];
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export class MicrosoftTTSProvider implements TTSProvider {
  readonly name = 'microsoft' as const;
  private ssmlBuilder = new MicrosoftSSMLBuilder();
  private currentAudio: HTMLAudioElement | null = null;

  constructor(
    private apiKey: string,
    private region = 'westeurope'
  ) {}

  get isAvailable(): boolean {
    return Boolean(this.apiKey && this.region);
  }

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    if (!this.isAvailable) {
      throw new Error('Microsoft TTS provider is not properly configured');
    }

    // Stop any current playback
    this.stop();

    try {
      // Build SSML
      const ssml = this.ssmlBuilder.buildSSML(text, options);
      console.log('Generated SSML:', ssml);
      
      // Make TTS request
      const audioBuffer = await this.synthesizeSpeech(ssml);
      console.log('TTS request successful, received audio buffer');
      
      // Play audio
      await this.playAudio(audioBuffer);
      
    } catch (error) {
      throw new Error(`Microsoft TTS error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  pause(): void {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
    }
  }

  resume(): void {
    if (this.currentAudio?.paused) {
      this.currentAudio.play();
    }
  }

  async getAvailableVoices(): Promise<TTSVoice[]> {
    if (!this.isAvailable) {
      return [];
    }

    // Static list of common Microsoft voices for the app's languages
    return [
      { id: 'he-IL-HilaNeural', name: 'Hila (Hebrew)', language: 'he-IL', gender: 'female', provider: 'microsoft' },
      { id: 'he-IL-AvriNeural', name: 'Avri (Hebrew)', language: 'he-IL', gender: 'male', provider: 'microsoft' },
      { id: 'ru-RU-SvetlanaNeural', name: 'Svetlana (Russian)', language: 'ru-RU', gender: 'female', provider: 'microsoft' },
      { id: 'ru-RU-DmitryNeural', name: 'Dmitry (Russian)', language: 'ru-RU', gender: 'male', provider: 'microsoft' },
      { id: 'en-US-JennyNeural', name: 'Jenny (English)', language: 'en-US', gender: 'female', provider: 'microsoft' },
      { id: 'en-US-GuyNeural', name: 'Guy (English)', language: 'en-US', gender: 'male', provider: 'microsoft' }
    ];
  }

  private async synthesizeSpeech(ssml: string): Promise<ArrayBuffer> {
    const url = `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`;
    console.log('TTS request to:', url);
    console.log('SSML payload:', ssml);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3'
      },
      body: ssml
    });

    if (!response.ok) {
      let errorDetails = '';
      try {
        const errorText = await response.text();
        const errorJson = JSON.parse(errorText);
        errorDetails = JSON.stringify(errorJson, null, 2);
      } catch {
        errorDetails = await response.text();
      }
      
      console.error('TTS synthesis failed:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        error: errorDetails
      });
      
      throw new Error(`TTS synthesis failed: ${response.status} - ${errorDetails}`);
    }

    console.log('TTS synthesis successful');
    return response.arrayBuffer();
  }

  private async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);
      
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        resolve();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        reject(new Error('Audio playback failed'));
      };

      audio.play().catch(reject);
    });
  }
}