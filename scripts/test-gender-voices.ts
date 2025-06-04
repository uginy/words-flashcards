#!/usr/bin/env bun

/**
 * Test script for gender-based voice selection in TTS
 * 
 * This script demonstrates how voice selection works based on participant gender:
 * 1. Male participant - should use male voice
 * 2. Female participant - should use female voice
 * 3. Cache separation by gender
 */

import { getTTSManager } from '../src/services/tts';
import type { DialogParticipant } from '../src/types';

async function testGenderVoices() {
  console.log('🎭 Testing Gender-Based Voice Selection\n');

  const ttsManager = getTTSManager();
  
  // Configure for Microsoft TTS
  ttsManager.updateConfig({
    provider: 'microsoft',
    cacheEnabled: true,
    fallbackToSystem: true
  });

  const config = ttsManager.getConfig();
  console.log('TTS Configuration:', {
    provider: config.provider,
    cacheEnabled: config.cacheEnabled
  });

  // Create test participants
  const maleParticipant: DialogParticipant = {
    id: 'participant_male',
    name: 'דוד',
    gender: 'male',
    voiceSettings: {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0
    }
  };

  const femaleParticipant: DialogParticipant = {
    id: 'participant_female', 
    name: 'שרה',
    gender: 'female',
    voiceSettings: {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0
    }
  };

  // Test text
  const testText = 'שלום! איך השמחים היום?';

  console.log(`\n📝 Test text: ${testText}`);
  console.log('\n👥 Participants:');
  console.log(`   Male: ${maleParticipant.name} (${maleParticipant.gender})`);
  console.log(`   Female: ${femaleParticipant.name} (${femaleParticipant.gender})`);

  // Clear cache before testing
  ttsManager.clearCache();
  console.log('\n🧹 Cache cleared');

  try {
    // Test male voice
    console.log('\n🎵 Testing male voice...');
    const maleOptions = {
      lang: 'he-IL',
      rate: maleParticipant.voiceSettings?.rate || 1.0,
      pitch: maleParticipant.voiceSettings?.pitch || 1.0,
      volume: maleParticipant.voiceSettings?.volume || 1.0,
      gender: maleParticipant.gender
    };

    console.log('Male TTS options:', maleOptions);
    const startMale = Date.now();
    await ttsManager.speak(testText, maleOptions);
    const maleDuration = Date.now() - startMale;
    console.log(`✅ Male voice synthesis completed in ${maleDuration}ms`);

    // Test female voice
    console.log('\n🎵 Testing female voice...');
    const femaleOptions = {
      lang: 'he-IL',
      rate: femaleParticipant.voiceSettings?.rate || 1.0,
      pitch: femaleParticipant.voiceSettings?.pitch || 1.0,
      volume: femaleParticipant.voiceSettings?.volume || 1.0,
      gender: femaleParticipant.gender
    };

    console.log('Female TTS options:', femaleOptions);
    const startFemale = Date.now();
    await ttsManager.speak(testText, femaleOptions);
    const femaleDuration = Date.now() - startFemale;
    console.log(`✅ Female voice synthesis completed in ${femaleDuration}ms`);

    // Check cache separation
    const cacheStats = ttsManager.getCacheStats();
    console.log('\n📊 Cache after gender tests:');
    console.log(`   Total entries: ${cacheStats.size}`);
    console.log('   Cache entries:');
    cacheStats.entries.forEach((entry, index) => {
      const keyParts = entry.key.split('-');
      const optionsBase64 = keyParts[keyParts.length - 1];
      try {
        const decodedOptions = JSON.parse(atob(optionsBase64));
        console.log(`     ${index + 1}. Gender: ${decodedOptions.gender}, Provider: ${entry.provider}`);
      } catch {
        console.log(`     ${index + 1}. Provider: ${entry.provider} (could not decode options)`);
      }
    });

    // Test cache retrieval (should be fast)
    console.log('\n🔄 Testing cache retrieval...');
    
    console.log('   Male voice from cache...');
    const startMaleCache = Date.now();
    await ttsManager.speak(testText, maleOptions);
    const maleCacheDuration = Date.now() - startMaleCache;
    console.log(`   ✅ Male cache retrieval: ${maleCacheDuration}ms`);

    console.log('   Female voice from cache...');
    const startFemaleCache = Date.now();
    await ttsManager.speak(testText, femaleOptions);
    const femaleCacheDuration = Date.now() - startFemaleCache;
    console.log(`   ✅ Female cache retrieval: ${femaleCacheDuration}ms`);

    // Performance summary
    console.log('\n⚡ Performance Summary:');
    console.log(`   Male voice: ${maleDuration}ms → ${maleCacheDuration}ms (${((maleDuration - maleCacheDuration) / maleDuration * 100).toFixed(1)}% improvement)`);
    console.log(`   Female voice: ${femaleDuration}ms → ${femaleCacheDuration}ms (${((femaleDuration - femaleCacheDuration) / femaleDuration * 100).toFixed(1)}% improvement)`);

  } catch (error) {
    console.error('❌ Gender voice test failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Microsoft TTS provider is not properly configured')) {
        console.log('\n💡 To test with Microsoft TTS, configure your API key:');
        console.log('   ttsManager.updateConfig({');
        console.log('     provider: "microsoft",');
        console.log('     microsoftApiKey: "your-api-key",');
        console.log('     microsoftRegion: "westeurope"');
        console.log('   });');
        console.log('\n🔄 Falling back to system TTS for basic test...');
        
        // Test with system TTS
        await testWithSystemTTS(testText, maleParticipant, femaleParticipant);
      }
    }
  }

  console.log('\n✨ Gender voice test completed!');
}

async function testWithSystemTTS(text: string, male: DialogParticipant, female: DialogParticipant) {
  const ttsManager = getTTSManager();
  
  ttsManager.updateConfig({
    provider: 'system',
    cacheEnabled: false // System TTS doesn't support caching
  });

  console.log('\n🔧 Using System TTS...');
  
  try {
    const maleOptions = {
      lang: 'he-IL',
      gender: male.gender
    };
    
    const femaleOptions = {
      lang: 'he-IL', 
      gender: female.gender
    };

    console.log('Male participant speaking...');
    await ttsManager.speak(text, maleOptions);
    
    console.log('Female participant speaking...');
    await ttsManager.speak(text, femaleOptions);
    
    console.log('✅ System TTS gender test completed');
  } catch (error) {
    console.error('❌ System TTS test failed:', error);
  }
}

// Run test if called directly
if (typeof process !== 'undefined' && process.argv[1]?.endsWith('test-gender-voices.ts')) {
  testGenderVoices().catch(console.error);
}

export { testGenderVoices };