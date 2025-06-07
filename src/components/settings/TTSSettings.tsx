
import { useState, useEffect } from 'react';
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
    speechRate: 1.0,
    speechPitch: 1.0,
    speechVolume: 1.0,
    voiceStyle: '',
    voiceRole: ''
  });
  const [isTestPlaying, setIsTestPlaying] = useState(false);
  const [testMessage, setTestMessage] = useState<string>('');

  useEffect(() => {
    // Load current config
    const ttsManager = getTTSManager();
    setConfig(ttsManager.getConfig());
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
    const newConfig = { ...config, speechRate: Number.parseFloat(value) };
    setConfig(newConfig);
    updateConfig(newConfig);
  };

  const handleSpeechPitchChange = (value: string) => {
    const newConfig = { ...config, speechPitch: Number.parseFloat(value) };
    setConfig(newConfig);
    updateConfig(newConfig);
  };

  const handleSpeechVolumeChange = (value: string) => {
    const newConfig = { ...config, speechVolume: Number.parseFloat(value) };
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
      ttsManager.stop();
      setIsTestPlaying(false);
      setTestMessage('🛑 Test stopped');
      setTimeout(() => setTestMessage(''), 3000);
      return;
    }
    
    console.log('▶️ Starting TTS test...');
    setIsTestPlaying(true);
    setTestMessage('');
    
    try {
      const ttsManager = getTTSManager();
      const testText = 'שלום עולם! זה בדיקת קול מפורטת של מערכת הסינתזה של דיבור. אנו בודקים את איכות הקול, המהירות, הטון והעוצמה. הטקסט הזה ארוך יותר כדי לבדוק כיצד המערכת מתמודדת עם טקסט מורכב ומפורט. זה יעזור לנו להעריך את כל ההגדרות החדשות שהוספנו למערכת.';
      
      console.log('🎵 Starting TTS speak...');
      await ttsManager.speak(testText, { lang: 'he-IL' });
      console.log('✅ TTS speak completed');
      
      // Only set success message if we're still in playing state (not stopped)
      if (isTestPlaying) {
        setTestMessage('✅ Test completed successfully!');
      }
    } catch (error) {
      console.error('TTS test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('user interaction')) {
        setTestMessage('⚠️ Please click on the page first, then try the test again.');
      } else if (errorMessage.includes('API')) {
        setTestMessage('❌ API error. Please check your API key settings.');
      } else {
        setTestMessage(`❌ Test failed: ${errorMessage}`);
      }
    } finally {
      console.log('🏁 TTS test finished, setting isTestPlaying to false');
      setIsTestPlaying(false);
      // Clear message after 5 seconds
      setTimeout(() => setTestMessage(''), 5000);
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
      speechRate: 1.0,
      speechPitch: 1.0,
      speechVolume: 1.0,
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
                  Speech Rate: {config.speechRate?.toFixed(1) || '1.0'}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={config.speechRate || 1.0}
                  onChange={(e) => handleSpeechRateChange(e.target.value)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Slow (0.5x)</span>
                  <span>Normal (1.0x)</span>
                  <span>Fast (2.0x)</span>
                </div>
              </div>

              {/* Speech Pitch */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Speech Pitch: {config.speechPitch?.toFixed(1) || '1.0'}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={config.speechPitch || 1.0}
                  onChange={(e) => handleSpeechPitchChange(e.target.value)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Low (0.5x)</span>
                  <span>Normal (1.0x)</span>
                  <span>High (2.0x)</span>
                </div>
              </div>

              {/* Speech Volume */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Speech Volume: {Math.round((config.speechVolume || 1.0) * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={config.speechVolume || 1.0}
                  onChange={(e) => handleSpeechVolumeChange(e.target.value)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Quiet (10%)</span>
                  <span>Normal (100%)</span>
                </div>
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
        </div>
      </div>
    </div>
  );
}
