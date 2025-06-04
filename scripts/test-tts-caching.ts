#!/usr/bin/env bun

/**
 * Test script for TTS caching functionality
 * 
 * This script demonstrates how TTS caching works:
 * 1. First synthesis - creates cache entry
 * 2. Second synthesis - uses cached audio
 * 3. Cache statistics and management
 */

import { getTTSManager } from '../src/services/tts';

async function testTTSCaching() {
  console.log('🔊 Testing TTS Caching\n');

  const ttsManager = getTTSManager();
  
  // Configure for Microsoft TTS (requires API key)
  const config = ttsManager.getConfig();
  console.log('Current TTS config:', {
    provider: config.provider,
    cacheEnabled: config.cacheEnabled,
    fallbackToSystem: config.fallbackToSystem
  });

  // Test text
  const testText = 'שלום עולם! זה בדיקה של מערכת הקבצה.';
  const options = {
    lang: 'he-IL',
    rate: 1.0,
    pitch: 1.0
  };

  console.log('\n📝 Test text:', testText);
  console.log('🔧 TTS options:', options);

  // Check initial cache state
  console.log('\n📊 Initial cache stats:', ttsManager.getCacheStats());

  try {
    // First synthesis (should create cache entry)
    console.log('\n🎵 First synthesis (should cache)...');
    const startTime1 = Date.now();
    await ttsManager.speak(testText, options);
    const duration1 = Date.now() - startTime1;
    console.log(`✅ First synthesis completed in ${duration1}ms`);

    // Check cache after first synthesis
    console.log('\n📊 Cache stats after first synthesis:', ttsManager.getCacheStats());

    // Second synthesis (should use cache)
    console.log('\n🎵 Second synthesis (should use cache)...');
    const startTime2 = Date.now();
    await ttsManager.speak(testText, options);
    const duration2 = Date.now() - startTime2;
    console.log(`✅ Second synthesis completed in ${duration2}ms`);

    console.log(`\n⚡ Performance comparison:`);
    console.log(`   First synthesis: ${duration1}ms`);
    console.log(`   Second synthesis: ${duration2}ms`);
    console.log(`   Speed improvement: ${duration1 > 0 ? ((duration1 - duration2) / duration1 * 100).toFixed(1) : 'N/A'}%`);

    // Test with different options (should create new cache entry)
    console.log('\n🎵 Third synthesis with different rate (should cache separately)...');
    const differentOptions = { ...options, rate: 1.2 };
    const startTime3 = Date.now();
    await ttsManager.speak(testText, differentOptions);
    const duration3 = Date.now() - startTime3;
    console.log(`✅ Third synthesis completed in ${duration3}ms`);

    // Final cache stats
    console.log('\n📊 Final cache stats:', ttsManager.getCacheStats());

    // Test cache management
    console.log('\n🧹 Testing cache management...');
    console.log('Cache entries before cleanup:', ttsManager.getCacheStats().size);
    
    const removedCount = ttsManager.clearExpiredCache(1000); // Remove entries older than 1 second
    console.log('Removed expired entries:', removedCount);
    console.log('Cache entries after cleanup:', ttsManager.getCacheStats().size);

    // Clear all cache
    ttsManager.clearCache();
    console.log('Cache entries after full clear:', ttsManager.getCacheStats().size);

  } catch (error) {
    console.error('❌ TTS test failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Microsoft TTS provider is not properly configured')) {
        console.log('\n💡 To test Microsoft TTS caching, configure API key:');
        console.log('   ttsManager.updateConfig({');
        console.log('     provider: "microsoft",');
        console.log('     microsoftApiKey: "your-api-key",');
        console.log('     microsoftRegion: "westeurope"');
        console.log('   });');
      }
    }
  }

  console.log('\n✨ TTS caching test completed!');
}

// Run test if called directly
if (typeof process !== 'undefined' && process.argv[1]?.endsWith('test-tts-caching.ts')) {
  testTTSCaching().catch(console.error);
}

export { testTTSCaching };