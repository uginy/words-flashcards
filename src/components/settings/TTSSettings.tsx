
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
    microsoftRegion: 'westeurope'
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

  const handleRegionChange = (region: string) => {
    const newConfig = { ...config, microsoftRegion: region };
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
  };

  const testTTS = async () => {
    if (isTestPlaying) return;
    
    setIsTestPlaying(true);
    setTestMessage('');
    
    try {
      const ttsManager = getTTSManager();
      await ttsManager.speak('שלום עולם! זה בדיקת קול.', { lang: 'he-IL' });
      setTestMessage('✅ Test completed successfully!');
    } catch (error) {
      console.error('TTS test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('user interaction')) {
        setTestMessage('⚠️ Please click on the page first, then try the test again.');
      } else if (errorMessage.includes('API')) {
        setTestMessage('❌ API error. Please check your API key and region settings.');
      } else {
        setTestMessage(`❌ Test failed: ${errorMessage}`);
      }
    } finally {
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
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Region
                </label>
                <Select
                  value={config.microsoftRegion || 'westeurope'}
                  onValueChange={handleRegionChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eastus">East US</SelectItem>
                    <SelectItem value="westeurope">West Europe</SelectItem>
                    <SelectItem value="southeastasia">Southeast Asia</SelectItem>
                    <SelectItem value="australiaeast">Australia East</SelectItem>
                  </SelectContent>
                </Select>
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
                disabled={isTestPlaying}
                variant="outline"
              >
                {isTestPlaying ? 'Playing...' : 'Test Voice'}
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
