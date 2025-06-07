import type { TTSProvider, TTSOptions, TTSVoice, SSMLBuilder } from '../types';

class MicrosoftSSMLBuilder implements SSMLBuilder {
  constructor(private config?: {
    speechRate?: string;
    speechPitch?: string;
    speechVolume?: string;
    voiceStyle?: string;
    voiceRole?: string;
  }) {}

  buildSSML(text: string, options: TTSOptions): string {
    const lang = options.lang || 'he-IL';
    const voiceName = this.getVoiceName(lang, options.voice, options.gender);
    
    // Use direct SSML string values from config
    const rate = this.config?.speechRate || 'medium';
    const pitch = this.config?.speechPitch || 'medium';
    const volume = this.config?.speechVolume || 'medium';
    
    // Build voice element with optional style and role
    let voiceElement = `<voice name="${voiceName}"`;
    if (this.config?.voiceStyle) {
      voiceElement += `>\n    <mstts:express-as style="${this.config.voiceStyle}"`;
      if (this.config?.voiceRole) {
        voiceElement += ` role="${this.config.voiceRole}"`;
      }
      voiceElement += '>';
    } else {
      voiceElement += '>';
    }
    
    const prosodyContent = `
      <prosody rate="${rate}" pitch="${pitch}" volume="${volume}">
        ${this.escapeXml(text)}
      </prosody>`;
    
    let closingTags = `\n  </voice>`;
    if (this.config?.voiceStyle) {
      closingTags = `\n    </mstts:express-as>${closingTags}`;
    }
    
    return `<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" version="1.0" xml:lang="${lang}">
  ${voiceElement}${prosodyContent}${closingTags}
</speak>`.trim();
  }

  private getVoiceName(lang: string, voiceHint?: string, gender?: 'male' | 'female'): string {
    const voiceMap: Record<string, { male: string; female: string }> = {
      'he-IL': { female: 'he-IL-HilaNeural', male: 'he-IL-AvriNeural' },
      'ru-RU': { female: 'ru-RU-SvetlanaNeural', male: 'ru-RU-DmitryNeural' },
      'en-US': { female: 'en-US-JennyNeural', male: 'en-US-GuyNeural' }
    };

    const languageVoices = voiceMap[lang] || voiceMap['he-IL'];
    
    // Prioritize gender selection over voice hint for reliable gender-based voice selection
    if (gender) {
      const genderVoice = languageVoices[gender];
      console.log(`Selected voice for gender ${gender}:`, genderVoice);
      return genderVoice;
    }

    // If voice hint provided but no gender specified, try to match it
    if (voiceHint) {
      const allVoices = [languageVoices.male, languageVoices.female];
      const matchedVoice = allVoices.find(v => v.includes(voiceHint));
      if (matchedVoice) {
        console.log('Selected voice by hint:', matchedVoice);
        return matchedVoice;
      }
    }

    // Default to female voice
    console.log('Using default female voice:', languageVoices.female);
    return languageVoices.female;
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
  private ssmlBuilder: MicrosoftSSMLBuilder;
  private currentAudio: HTMLAudioElement | null = null;
  private currentPlaybackController: AbortController | null = null;

  constructor(
    private apiKey: string,
    private region = 'westeurope',
    config?: {
      speechRate?: string;
      speechPitch?: string;
      speechVolume?: string;
      voiceStyle?: string;
      voiceRole?: string;
    }
  ) {
    this.ssmlBuilder = new MicrosoftSSMLBuilder(config);
  }

  updateConfig(config: {
    speechRate?: string;
    speechPitch?: string;
    speechVolume?: string;
    voiceStyle?: string;
    voiceRole?: string;
  }): void {
    this.ssmlBuilder = new MicrosoftSSMLBuilder(config);
  }

  get isAvailable(): boolean {
    return Boolean(this.apiKey && this.region);
  }

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    if (!this.isAvailable) {
      throw new Error('Microsoft TTS provider is not properly configured');
    }

    // Stop any current playbook
    this.stop();

    try {
      // Build SSML
      const ssml = this.ssmlBuilder.buildSSML(text, options);
      console.log('Generated SSML:', ssml);
      
      // Make TTS request
      const audioBuffer = await this.synthesizeSpeech(ssml);
      console.log('TTS request successful, received audio buffer');
      
      // Play audio (won't throw on autoplay issues)
      await this.playAudio(audioBuffer);
      
    } catch (error) {
      // Only throw for synthesis errors, not playback errors
      if (error instanceof Error && error.message.includes('TTS synthesis failed')) {
        throw new Error(`Microsoft TTS error: ${error.message}`);
      }
      
      // For other errors (like autoplay), just log and continue
      console.warn('Microsoft TTS warning:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<ArrayBuffer> {
    if (!this.isAvailable) {
      throw new Error('Microsoft TTS provider is not properly configured');
    }

    // Build SSML
    const ssml = this.ssmlBuilder.buildSSML(text, options);
    
    // Make TTS request and return audio buffer
    return await this.synthesizeSpeech(ssml);
  }

  stop(): void {
    console.log('🛑 MicrosoftTTSProvider.stop() called');
    
    // Cancel current playback controller
    if (this.currentPlaybackController) {
      console.log('🛑 Microsoft: Aborting playback controller');
      this.currentPlaybackController.abort();
      this.currentPlaybackController = null;
    } else {
      console.log('🛑 Microsoft: No playback controller to abort');
    }
    
    if (this.currentAudio) {
      console.log('🛑 Microsoft: Stopping audio element');
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    } else {
      console.log('🛑 Microsoft: No audio element to stop');
    }
    
    console.log('🛑 MicrosoftTTSProvider.stop() completed');
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
    return new Promise((resolve) => {
      const controller = new AbortController();
      this.currentPlaybackController = controller;
      
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);
      
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      const cleanup = () => {
        URL.revokeObjectURL(audioUrl);
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        if (this.currentPlaybackController === controller) {
          this.currentPlaybackController = null;
        }
      };

      // Listen for abort signal
      controller.signal.addEventListener('abort', () => {
        cleanup();
        resolve(); // Resolve instead of reject to avoid errors in UI
      });

      audio.onended = () => {
        cleanup();
        resolve();
      };

      audio.onerror = () => {
        cleanup();
        console.warn('Audio playback error - continuing anyway');
        resolve(); // Don't reject on audio errors
      };

      // Try to play with autoplay protection handling
      audio.play().catch((error: Error) => {
        if (error.name === 'NotAllowedError') {
          console.warn('Autoplay prevented - audio ready but not playing due to browser policy');
          cleanup();
          resolve(); // Don't treat autoplay prevention as an error
        } else {
          console.warn('Audio play error:', error.message);
          cleanup();
          resolve(); // Don't reject, just log and continue
        }
      });
    });
  }
}
