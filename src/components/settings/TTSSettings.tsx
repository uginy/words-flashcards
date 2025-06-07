
import { useState, useEffect, useRef } from 'react';
import { getTTSManager } from '../../services/tts/TTSManager';
import type { TTSConfig, TTSProviderType } from '../../services/tts/types';
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
    voiceRole: ''
  });
  const [isTestPlaying, setIsTestPlaying] = useState(false);
  const [testMessage, setTestMessage] = useState<string>('');
  const isTestStoppedRef = useRef(false);
  const currentTestControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Load current config
    const ttsManager = getTTSManager();
    const loadedConfig = ttsManager.getConfig();
    console.log('🔧 Loaded TTS config:', loadedConfig);
    setConfig(loadedConfig);
  }, []);

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

  const handleVoiceRoleChange = (voiceRole: string) => {
    const newConfig = { ...config, voiceRole: voiceRole === 'default' ? '' : voiceRole };
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
          voiceRole: newConfig.voiceRole
        };
        (provider as { updateConfig: (config: typeof microsoftConfig) => void }).updateConfig(microsoftConfig);
      }
    }
  };

  const testTTS = async () => {
    if (isTestPlaying) {
      // Stop current test
      console.log('🛑 Stopping TTS test...');
      const ttsManager = getTTSManager();
      
      // Log current provider
      const currentProvider = ttsManager.getCurrentProvider();
      console.log('🛑 Current TTS provider:', currentProvider.name);
      
      // Stop the TTS manager
      ttsManager.stop();
      
      // Additional stop methods for different providers
      if (currentProvider.name === 'system') {
        console.log('🛑 Additional system TTS stop...');
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          console.log('🛑 speechSynthesis.cancel() called');
        }
      }
      
      // Abort the current test controller
      if (currentTestControllerRef.current) {
        console.log('🛑 Aborting test controller');
        currentTestControllerRef.current.abort();
        currentTestControllerRef.current = null;
      }
      
      // Force stop all audio elements on the page (including newly created ones)
      const stopAllAudio = () => {
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach((audio, index) => {
          console.log(`🛑 Stopping audio element ${index}`);
          audio.pause();
          audio.currentTime = 0;
          // Also remove the element to prevent further playback
          audio.remove();
        });
      };
      
      // Stop current audio
      stopAllAudio();
      
      // Keep stopping audio for a short period to catch newly created elements
      const stopInterval = setInterval(stopAllAudio, 100);
      setTimeout(() => {
        clearInterval(stopInterval);
        console.log('🛑 Stopped monitoring for new audio elements');
      }, 1000);
      
      isTestStoppedRef.current = true;
      setIsTestPlaying(false);
      setTestMessage('🛑 Test stopped');
      setTimeout(() => setTestMessage(''), 3000);
      return;
    }
    
    console.log('▶️ Starting TTS test...');
    isTestStoppedRef.current = false; // Reset stop flag
    setIsTestPlaying(true);
    setTestMessage('▶️ Playing test audio...');
    
    // Create new AbortController for this test
    const testController = new AbortController();
    currentTestControllerRef.current = testController;
    
    try {
      const ttsManager = getTTSManager();
      const testText = 'שלום עולם! זה בדיקת קול';
      
      console.log('🎵 Starting TTS speak...');
      
      // Create a race between TTS and abort signal
      const speakPromise = ttsManager.speak(testText, { lang: 'he-IL' });
      const abortPromise = new Promise<never>((_, reject) => {
        testController.signal.addEventListener('abort', () => {
          console.log('🛑 Test aborted via AbortController');
          reject(new Error('Test aborted'));
        });
      });
      
      await Promise.race([speakPromise, abortPromise]);
      console.log('✅ TTS speak completed');
      
      // Only set success message if test wasn't stopped
      if (!isTestStoppedRef.current) {
        setTestMessage('✅ Test completed successfully!');
        setTimeout(() => setTestMessage(''), 3000);
      }
    } catch (error) {
      console.error('TTS test failed:', error);
      
      // Only show error if test wasn't stopped
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
      console.log('🏁 TTS test finished, setting isTestPlaying to false');
      setIsTestPlaying(false);
    }
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
      voiceRole: ''
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
                    <SelectItem value="cheerful">Cheerful</SelectItem>
                    <SelectItem value="sad">Sad</SelectItem>
                    <SelectItem value="angry">Angry</SelectItem>
                    <SelectItem value="fearful">Fearful</SelectItem>
                    <SelectItem value="disgruntled">Disgruntled</SelectItem>
                    <SelectItem value="serious">Serious</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="whispering">Whispering</SelectItem>
                    <SelectItem value="hopeful">Hopeful</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Emotional style for voice expression
                </p>
              </div>

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
                    <SelectItem value="narrator">Narrator</SelectItem>
                    <SelectItem value="customer-service">Customer Service</SelectItem>
                    <SelectItem value="newscast">Newscast</SelectItem>
                    <SelectItem value="assistant">Assistant</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Role-based voice characteristics
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
            <div className="flex gap-2">
              <Button
                onClick={testTTS}
                variant="outline"
              >
                {isTestPlaying ? 'Stop' : 'Test Voice'}
              </Button>
              
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
                    voiceRole: ''
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
