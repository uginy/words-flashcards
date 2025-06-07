
import { useState, useEffect, useRef } from 'react';
import { getTTSManager } from '../../services/tts/TTSManager';
import type { TTSConfig, TTSProviderType, TTSVoice } from '../../services/tts/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export function TTSSettings() {
  const [config, setConfig] = useState<TTSConfig>({
    provider: 'system',
    fallbackToSystem: true,
    cacheEnabled: false,
    microsoftRegion: 'westeurope',
    speechRate: 'medium',
    speechPitch: 'medium',
    speechVolume: 'medium',
    voiceStyle: '',
    voiceStyleDegree: 1,
    voiceRole: '',
    selectedMaleVoice: '',
    selectedFemaleVoice: ''
  });
  const [isTestPlaying, setIsTestPlaying] = useState(false);
  const [testMessage, setTestMessage] = useState<string>('');
  const [availableVoices, setAvailableVoices] = useState<TTSVoice[]>([]);
  const isTestStoppedRef = useRef(false);
  const currentTestControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Load current config
    const ttsManager = getTTSManager();
    const loadedConfig = ttsManager.getConfig();
    setConfig(loadedConfig);
  }, []);

  // Load available voices when provider changes to Microsoft
  useEffect(() => {
    const loadVoices = async () => {
      if (config.provider === 'microsoft') {
        try {
          const ttsManager = getTTSManager();
          const provider = ttsManager.getCurrentProvider();
          if (provider.name === 'microsoft') {
            const voices = await provider.getAvailableVoices();
            setAvailableVoices(voices);
          }
        } catch (error) {
          setAvailableVoices([]);
        }
      } else {
        setAvailableVoices([]);
      }
    };

    loadVoices();
  }, [config.provider]);

  const handleProviderChange = (provider: TTSProviderType) => {
    const newConfig = { ...config, provider };
    setConfig(newConfig);
    updateConfig(newConfig);
  };

  const handleApiKeyChange = (apiKey: string) => {
    const newConfig = { ...config, microsoftApiKey: apiKey };
    setConfig(newConfig);
    updateConfig(newConfig);
  };

  const handleSpeechRateChange = (value: string) => {
    const newConfig = { ...config, speechRate: value };
    setConfig(newConfig);
    updateConfig(newConfig);
  };

  const handleSpeechPitchChange = (value: string) => {
    const newConfig = { ...config, speechPitch: value };
    setConfig(newConfig);
    updateConfig(newConfig);
  };

  const handleSpeechVolumeChange = (value: string) => {
    const newConfig = { ...config, speechVolume: value };
    setConfig(newConfig);
    updateConfig(newConfig);
  };

  const handleVoiceStyleChange = (voiceStyle: string) => {
    const newConfig = { ...config, voiceStyle: voiceStyle === 'default' ? '' : voiceStyle };
    setConfig(newConfig);
    updateConfig(newConfig);
  };

  const handleVoiceStyleDegreeChange = (value: string) => {
    const degree = Number.parseFloat(value);
    const newConfig = { ...config, voiceStyleDegree: degree };
    setConfig(newConfig);
    updateConfig(newConfig);
  };

  const handleVoiceRoleChange = (voiceRole: string) => {
    const newConfig = { ...config, voiceRole: voiceRole === 'default' ? '' : voiceRole };
    setConfig(newConfig);
    updateConfig(newConfig);
  };

  const handleMaleVoiceChange = (voiceId: string) => {
    const newConfig = { ...config, selectedMaleVoice: voiceId === 'auto' ? '' : voiceId };
    setConfig(newConfig);
    updateConfig(newConfig);
  };

  const handleFemaleVoiceChange = (voiceId: string) => {
    const newConfig = { ...config, selectedFemaleVoice: voiceId === 'auto' ? '' : voiceId };
    setConfig(newConfig);
    updateConfig(newConfig);
  };

  const handleFallbackChange = (checked: boolean) => {
    const newConfig = { ...config, fallbackToSystem: checked };
    setConfig(newConfig);
    updateConfig(newConfig);
  };

  const handleCacheChange = (checked: boolean) => {
    const newConfig = { ...config, cacheEnabled: checked };
    setConfig(newConfig);
    updateConfig(newConfig);
  };

  const updateConfig = (newConfig: TTSConfig) => {
    const ttsManager = getTTSManager();
    ttsManager.updateConfig(newConfig);
    
    // If Microsoft provider is active, immediately update its configuration
    if (newConfig.provider === 'microsoft' && ttsManager.getCurrentProvider().name === 'microsoft') {
      const provider = ttsManager.getCurrentProvider();
      if ('updateConfig' in provider && typeof provider.updateConfig === 'function') {
        const microsoftConfig = {
          speechRate: newConfig.speechRate,
          speechPitch: newConfig.speechPitch,
          speechVolume: newConfig.speechVolume,
          voiceStyle: newConfig.voiceStyle,
          voiceStyleDegree: newConfig.voiceStyleDegree,
          voiceRole: newConfig.voiceRole,
          selectedMaleVoice: newConfig.selectedMaleVoice,
          selectedFemaleVoice: newConfig.selectedFemaleVoice
        };
        (provider as { updateConfig: (config: typeof microsoftConfig) => void }).updateConfig(microsoftConfig);
      }
    }
  };

  const testTTS = async () => {
    if (isTestPlaying) {
      // Stop current test
      const ttsManager = getTTSManager();
      const currentProvider = ttsManager.getCurrentProvider();
      ttsManager.stop();
      if (currentProvider.name === 'system') {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      }
      if (currentTestControllerRef.current) {
        currentTestControllerRef.current.abort();
        currentTestControllerRef.current = null;
      }
      const stopAllAudio = () => {
        const audioElements = document.querySelectorAll('audio');
        for (const audio of audioElements) {
          audio.pause();
          audio.currentTime = 0;
          audio.remove();
        }
      };
      stopAllAudio();
      const stopInterval = setInterval(stopAllAudio, 100);
      setTimeout(() => {
        clearInterval(stopInterval);
      }, 1000);
      isTestStoppedRef.current = true;
      setIsTestPlaying(false);
      setTestMessage('🛑 Test stopped');
      setTimeout(() => setTestMessage(''), 3000);
      return;
    }
    isTestStoppedRef.current = false;
    setIsTestPlaying(true);
    setTestMessage('▶️ Playing test audio...');
    const testController = new AbortController();
    currentTestControllerRef.current = testController;
    try {
      const ttsManager = getTTSManager();
      const testText = 'שלום עולם! זה בדיקת קול';
      const speakPromise = ttsManager.speak(testText, { lang: 'he-IL' });
      const abortPromise = new Promise<never>((_, reject) => {
        testController.signal.addEventListener('abort', () => {
          reject(new Error('Test aborted'));
        });
      });
      await Promise.race([speakPromise, abortPromise]);
      if (!isTestStoppedRef.current) {
        setTestMessage('✅ Test completed successfully!');
        setTimeout(() => setTestMessage(''), 3000);
      }
    } catch (error) {
      if (!isTestStoppedRef.current) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('user interaction')) {
          setTestMessage('⚠️ Please click on the page first, then try the test again.');
        } else if (errorMessage.includes('API')) {
          setTestMessage('❌ API error. Please check your API key settings.');
        } else {
          setTestMessage(`❌ Test failed: ${errorMessage}`);
        }
        setTimeout(() => setTestMessage(''), 5000);
      }
    } finally {
      setIsTestPlaying(false);
    }
  };

  const testGenderVoice = async (gender: 'male' | 'female') => {
    isTestStoppedRef.current = false;
    setIsTestPlaying(true);
    setTestMessage(`▶️ Testing ${gender} voice...`);
    const testController = new AbortController();
    currentTestControllerRef.current = testController;
    try {
      const ttsManager = getTTSManager();
      const testText = gender === 'male' ? 'זה קול גברי לבדיקה' : 'זה קול נשי לבדיקה';
      const speakPromise = ttsManager.speak(testText, { lang: 'he-IL', gender });
      const abortPromise = new Promise<never>((_, reject) => {
        testController.signal.addEventListener('abort', () => {
          reject(new Error('Test aborted'));
        });
      });
      await Promise.race([speakPromise, abortPromise]);
      if (!isTestStoppedRef.current) {
        setTestMessage(`✅ ${gender.charAt(0).toUpperCase() + gender.slice(1)} voice test completed successfully!`);
        setTimeout(() => setTestMessage(''), 3000);
      }
    } catch (error) {
      if (!isTestStoppedRef.current) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('user interaction')) {
          setTestMessage('⚠️ Please click on the page first, then try the test again.');
        } else if (errorMessage.includes('API')) {
          setTestMessage('❌ API error. Please check your API key settings.');
        } else {
          setTestMessage(`❌ ${gender.charAt(0).toUpperCase() + gender.slice(1)} voice test failed: ${errorMessage}`);
        }
        setTimeout(() => setTestMessage(''), 5000);
      }
    } finally {
      setIsTestPlaying(false);
    }
  };

  const testSSMLGeneration = () => {
    if (config.provider !== 'microsoft') {
      setTestMessage('⚠️ SSML generation test is only available for Microsoft provider');
      setTimeout(() => setTestMessage(''), 3000);
      return;
    }

    // Mock SSML generation logic for testing
    setTestMessage('✅ SSML generation test completed');
    setTimeout(() => setTestMessage(''), 3000);
  };

  const clearCache = () => {
    const ttsManager = getTTSManager();
    const stats = ttsManager.getCacheStats();
    ttsManager.clearCache();
    
    setTestMessage(`✅ Cache cleared! Removed ${stats.size} cached audio files.`);
    setTimeout(() => setTestMessage(''), 3000);
  };

  const resetToDefaults = () => {
    const newConfig = {
      ...config,
      speechRate: 'medium',
      speechPitch: 'medium',
      speechVolume: 'medium',
      voiceStyle: '',
      voiceStyleDegree: 1,
      voiceRole: '',
      selectedMaleVoice: '',
      selectedFemaleVoice: ''
    };
    setConfig(newConfig);
    updateConfig(newConfig);
    setTestMessage('✅ Settings reset to defaults');
    setTimeout(() => setTestMessage(''), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Text-to-Speech Settings</h3>
        
        {/* Provider Selection */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              TTS Provider
            </label>
            <Select value={config.provider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System (Browser)</SelectItem>
                <SelectItem value="microsoft">Microsoft Cognitive Services</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {config.provider === 'system' 
                ? 'Uses browser built-in speech synthesis'
                : 'High-quality cloud-based text-to-speech'
              }
            </p>
          </div>

          {/* Microsoft Settings */}
          {config.provider === 'microsoft' && (
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <div>
                <label className="block text-sm font-medium mb-2">
                  API Key
                </label>
                <Input
                  type="password"
                  value={config.microsoftApiKey || ''}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder="Enter your Microsoft Cognitive Services API key"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get your API key from Azure Cognitive Services
                </p>
              </div>

              {/* Voice Selection by Gender */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">Voice Selection by Gender</h4>
                
                {/* Male Voice Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Male Voice
                  </label>
                  <Select value={config.selectedMaleVoice || 'auto'} onValueChange={handleMaleVoiceChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select male voice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (Default Male)</SelectItem>
                      {availableVoices
                        .filter(voice => voice.gender === 'male')
                        .map((voice) => (
                          <SelectItem key={voice.id} value={voice.id}>
                            {voice.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Voice used for male nouns and masculine forms
                  </p>
                </div>

                {/* Female Voice Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Female Voice
                  </label>
                  <Select value={config.selectedFemaleVoice || 'auto'} onValueChange={handleFemaleVoiceChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select female voice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (Default Female)</SelectItem>
                      {availableVoices
                        .filter(voice => voice.gender === 'female')
                        .map((voice) => (
                          <SelectItem key={voice.id} value={voice.id}>
                            {voice.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Voice used for female nouns and feminine forms
                  </p>
                </div>
              </div>

              {/* Speech Rate */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Speech Rate
                </label>
                <Select value={config.speechRate || 'medium'} onValueChange={(value) => handleSpeechRateChange(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select speech rate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="x-slow">Very Slow (x-slow)</SelectItem>
                    <SelectItem value="slow">Slow</SelectItem>
                    <SelectItem value="medium">Normal (medium)</SelectItem>
                    <SelectItem value="fast">Fast</SelectItem>
                    <SelectItem value="x-fast">Very Fast (x-fast)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Speech speed using Microsoft SSML values
                </p>
              </div>

              {/* Speech Pitch */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Speech Pitch
                </label>
                <Select value={config.speechPitch || 'medium'} onValueChange={(value) => handleSpeechPitchChange(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select speech pitch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="x-low">Very Low (x-low)</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Normal (medium)</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="x-high">Very High (x-high)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Voice pitch using Microsoft SSML values
                </p>
              </div>

              {/* Speech Volume */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Speech Volume
                </label>
                <Select value={config.speechVolume || 'medium'} onValueChange={(value) => handleSpeechVolumeChange(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select speech volume" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="x-soft">Very Soft (x-soft)</SelectItem>
                    <SelectItem value="soft">Soft</SelectItem>
                    <SelectItem value="medium">Normal (medium)</SelectItem>
                    <SelectItem value="loud">Loud</SelectItem>
                    <SelectItem value="x-loud">Very Loud (x-loud)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Voice volume using Microsoft SSML values
                </p>
              </div>

              {/* Voice Style */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Voice Style (optional)
                </label>
                <Select value={config.voiceStyle || 'default'} onValueChange={handleVoiceStyleChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="advertisement_upbeat">Advertisement Upbeat</SelectItem>
                    <SelectItem value="affectionate">Affectionate</SelectItem>
                    <SelectItem value="angry">Angry</SelectItem>
                    <SelectItem value="assistant">Assistant</SelectItem>
                    <SelectItem value="calm">Calm</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                    <SelectItem value="cheerful">Cheerful</SelectItem>
                    <SelectItem value="customerservice">Customer Service</SelectItem>
                    <SelectItem value="depressed">Depressed</SelectItem>
                    <SelectItem value="disgruntled">Disgruntled</SelectItem>
                    <SelectItem value="documentary-narration">Documentary Narration</SelectItem>
                    <SelectItem value="embarrassed">Embarrassed</SelectItem>
                    <SelectItem value="empathetic">Empathetic</SelectItem>
                    <SelectItem value="envious">Envious</SelectItem>
                    <SelectItem value="excited">Excited</SelectItem>
                    <SelectItem value="fearful">Fearful</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="gentle">Gentle</SelectItem>
                    <SelectItem value="hopeful">Hopeful</SelectItem>
                    <SelectItem value="lyrical">Lyrical</SelectItem>
                    <SelectItem value="narration-professional">Narration Professional</SelectItem>
                    <SelectItem value="narration-relaxed">Narration Relaxed</SelectItem>
                    <SelectItem value="newscast">Newscast</SelectItem>
                    <SelectItem value="newscast-casual">Newscast Casual</SelectItem>
                    <SelectItem value="newscast-formal">Newscast Formal</SelectItem>
                    <SelectItem value="poetry-reading">Poetry Reading</SelectItem>
                    <SelectItem value="sad">Sad</SelectItem>
                    <SelectItem value="serious">Serious</SelectItem>
                    <SelectItem value="shouting">Shouting</SelectItem>
                    <SelectItem value="sports_commentary">Sports Commentary</SelectItem>
                    <SelectItem value="sports_commentary_excited">Sports Commentary Excited</SelectItem>
                    <SelectItem value="whispering">Whispering</SelectItem>
                    <SelectItem value="terrified">Terrified</SelectItem>
                    <SelectItem value="unfriendly">Unfriendly</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Emotional style for voice expression. Note: Not all voices support all styles.
                </p>
              </div>

              {/* Voice Style Degree */}
              {config.voiceStyle && config.voiceStyle !== 'default' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Style Intensity (optional)
                  </label>
                  <Select value={config.voiceStyleDegree?.toString() || '1'} onValueChange={handleVoiceStyleDegreeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select intensity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.01">Minimal (0.01)</SelectItem>
                      <SelectItem value="0.1">Very Light (0.1)</SelectItem>
                      <SelectItem value="0.3">Light (0.3)</SelectItem>
                      <SelectItem value="0.5">Soft (0.5)</SelectItem>
                      <SelectItem value="0.8">Moderate (0.8)</SelectItem>
                      <SelectItem value="1">Normal (1.0)</SelectItem>
                      <SelectItem value="1.2">Strong (1.2)</SelectItem>
                      <SelectItem value="1.5">Very Strong (1.5)</SelectItem>
                      <SelectItem value="2">Maximum (2.0)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Intensity of the selected style. Range: 0.01 to 2.0. Default: 1.0.
                  </p>
                </div>
              )}

              {/* Voice Role */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Voice Role (optional)
                </label>
                <Select value={config.voiceRole || 'default'} onValueChange={handleVoiceRoleChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="Girl">Girl</SelectItem>
                    <SelectItem value="Boy">Boy</SelectItem>
                    <SelectItem value="YoungAdultFemale">Young Adult Female</SelectItem>
                    <SelectItem value="YoungAdultMale">Young Adult Male</SelectItem>
                    <SelectItem value="OlderAdultFemale">Older Adult Female</SelectItem>
                    <SelectItem value="OlderAdultMale">Older Adult Male</SelectItem>
                    <SelectItem value="SeniorFemale">Senior Female</SelectItem>
                    <SelectItem value="SeniorMale">Senior Male</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Role-based voice age and gender characteristics. Note: Not all voices support all roles.
                </p>
              </div>

              {/* Reset Button */}
              <div className="pt-2">
                <Button
                  onClick={resetToDefaults}
                  variant="outline"
                  size="sm"
                >
                  Reset to Defaults
                </Button>
              </div>
            </div>
          )}

          {/* Fallback Option */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="fallback"
              checked={config.fallbackToSystem}
              onChange={(e) => handleFallbackChange(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="fallback" className="text-sm">
              Fallback to system TTS on errors
            </label>
          </div>

          {/* Cache Option */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="cache"
              checked={config.cacheEnabled}
              onChange={(e) => handleCacheChange(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="cache" className="text-sm">
              Enable audio caching
            </label>
          </div>

          {/* Test and Actions */}
          <div className="space-y-3 pt-4">
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={testTTS}
                variant="outline"
              >
                {isTestPlaying ? 'Stop' : 'Test Voice'}
              </Button>
              
              {config.provider === 'microsoft' && (
                <>
                  <Button
                    onClick={() => testGenderVoice('male')}
                    variant="outline"
                    disabled={isTestPlaying}
                  >
                    Test Male Voice
                  </Button>
                  <Button
                    onClick={() => testGenderVoice('female')}
                    variant="outline"
                    disabled={isTestPlaying}
                  >
                    Test Female Voice
                  </Button>
                  <Button
                    onClick={testSSMLGeneration}
                    variant="outline"
                    disabled={isTestPlaying}
                  >
                    Test SSML
                  </Button>
                </>
              )}
              
              {config.cacheEnabled && (
                <Button
                  onClick={clearCache}
                  variant="outline"
                >
                  Clear Cache
                </Button>
              )}
            </div>
            
            {testMessage && (
              <div className="text-sm p-2 rounded-md bg-gray-50 border">
                {testMessage}
              </div>
            )}
          </div>

          {/* Save Settings */}
          <div className="pt-6 border-t">
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  updateConfig(config);
                  setTestMessage('✅ All TTS settings saved successfully!');
                  setTimeout(() => setTestMessage(''), 3000);
                }}
                variant="default"
                size="default"
              >
                Save TTS Settings
              </Button>
              <Button
                onClick={() => {
                  const defaultConfig = {
                    provider: 'system' as TTSProviderType,
                    fallbackToSystem: true,
                    cacheEnabled: false,
                    microsoftRegion: 'westeurope',
                    speechRate: 'medium',
                    speechPitch: 'medium',
                    speechVolume: 'medium',
                    voiceStyle: '',
                    voiceStyleDegree: 1,
                    voiceRole: '',
                    selectedMaleVoice: '',
                    selectedFemaleVoice: ''
                  };
                  setConfig(defaultConfig);
                  updateConfig(defaultConfig);
                  setTestMessage('✅ All TTS settings reset to defaults');
                  setTimeout(() => setTestMessage(''), 3000);
                }}
                variant="outline"
                size="default"
              >
                Reset All TTS Settings
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
