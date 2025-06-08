#!/usr/bin/env node

import { enrichWordsWithOllama } from '../src/services/ollama/index.ts';
import { DEFAULT_OLLAMA_API_URL, DEFAULT_OLLAMA_MODEL } from '../src/config/ollama.ts';
import type { Word } from '../src/types/index.ts';

// Test configuration
const CHUNK_SIZE = 5;
const DEFAULT_DELAY_BETWEEN_CHUNKS = 1000; // 1 second - faster for local inference
const DEFAULT_PROGRESSIVE_DELAY = false; // Less needed for local inference

// Test Hebrew words covering different categories
const TEST_HEBREW_WORDS = [
  // Verbs (פועל)
  'לאכול',    // to eat
  'ללכת',     // to go
  'לדבר',     // to speak
  'לכתוב',    // to write
  'לקרוא',    // to read
  
  // Nouns (שם עצם)
  'ספר',      // book
  'בית',      // house
  'מים',      // water
  'אוכל',     // food
  'חבר',      // friend
  
  // Adjectives (שם תואר)
  'גדול',     // big
  'קטן',      // small
  'יפה',      // beautiful
  'טוב',      // good
  'רע',       // bad
  
  // Phrases (פרזות)
  'מה שלומך',  // how are you
  'בוקר טוב',  // good morning
  'תודה רבה',  // thank you very much
  'סליחה',    // excuse me
  'שלום',     // hello/goodbye
];

interface TestResult {
  chunkIndex: number;
  words: string[];
  success: boolean;
  rawResponse?: unknown;
  parsedWords?: Word[];
  error?: string;
  errorType?: 'network' | 'json_parse' | 'api_error' | 'validation' | 'ollama_error';
  processingTime: number;
}

interface TestStatistics {
  totalChunks: number;
  successfulChunks: number;
  failedChunks: number;
  totalWords: number;
  successfulWords: number;
  failedWords: number;
  totalProcessingTime: number;
  averageChunkTime: number;
  jsonParseErrors: number;
  networkErrors: number;
  apiErrors: number;
  validationErrors: number;
  ollamaErrors: number;
}

// Mock toast function for logging
const mockToast = (opts: { title: string; description: string; variant?: string }) => {
  const timestamp = new Date().toISOString();
  const level = opts.variant === 'destructive' ? 'ERROR' : opts.variant === 'warning' ? 'WARN' : 'INFO';
  console.log(`[${timestamp}] [${level}] ${opts.title}: ${opts.description}`);
};

// Utility function to create delay
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Split array into chunks
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Detailed logging function for chunks
function logChunkInfo(chunkIndex: number, words: string[], phase: 'start' | 'success' | 'error', details?: { processingTime: number; wordCount?: number; errorType?: string; error?: string }) {
  const timestamp = new Date().toISOString();
  const chunkInfo = `Chunk ${chunkIndex + 1} (${words.length} words: ${words.join(', ')})`;
  
  switch (phase) {
    case 'start':
      console.log(`\n[${timestamp}] 🚀 Starting processing ${chunkInfo}`);
      break;
    case 'success':
      console.log(`[${timestamp}] ✅ Successfully processed ${chunkInfo}`);
      if (details) {
        console.log(`   📊 Processing time: ${details.processingTime}ms`);
        console.log(`   📝 Words processed: ${details.wordCount}`);
      }
      break;
    case 'error':
      console.log(`[${timestamp}] ❌ Failed to process ${chunkInfo}`);
      if (details) {
        console.log(`   💥 Error type: ${details.errorType}`);
        console.log(`   📄 Error message: ${details.error}`);
        console.log(`   ⏱️ Processing time: ${details.processingTime}ms`);
      }
      break;
  }
}

// Check if Ollama is available
async function checkOllamaHealth(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// List available Ollama models
async function listOllamaModels(baseUrl: string): Promise<string[]> {
  try {
    const response = await fetch(`${baseUrl}/tags`);
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.models?.map((model: any) => model.name) || [];
  } catch {
    return [];
  }
}

// Main test function
async function testOllamaChunks(): Promise<void> {
  console.log('🧪 Starting Ollama Chunks Test');
  console.log('=' .repeat(60));
  
  // Configuration
  const baseUrl = process.env.OLLAMA_API_URL || DEFAULT_OLLAMA_API_URL;
  const model = process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;
  const useSimplePrompt = process.env.USE_SIMPLE_PROMPT === 'true';
  const delayBetweenChunks = parseInt(process.env.DELAY_BETWEEN_CHUNKS || String(DEFAULT_DELAY_BETWEEN_CHUNKS));
  const useProgressiveDelay = process.env.PROGRESSIVE_DELAY !== 'false';
  const enableLogging = process.env.ENABLE_LOGGING !== 'false';
  const validateJson = process.env.VALIDATE_JSON !== 'false';
  
  console.log(`📋 Test Configuration:`);
  console.log(`   🌐 Ollama URL: ${baseUrl}`);
  console.log(`   🤖 Model: ${model}`);
  console.log(`   📦 Chunk size: ${CHUNK_SIZE} words`);
  console.log(`   ⏰ Delay between chunks: ${delayBetweenChunks}ms`);
  console.log(`   📈 Progressive delay: ${useProgressiveDelay ? 'Enabled' : 'Disabled'}`);
  console.log(`   📝 Simple prompt: ${useSimplePrompt ? 'Yes' : 'No'}`);
  console.log(`   🔍 Enable logging: ${enableLogging ? 'Yes' : 'No'}`);
  console.log(`   ✅ Validate JSON: ${validateJson ? 'Yes' : 'No'}`);
  console.log(`   📊 Total test words: ${TEST_HEBREW_WORDS.length}`);
  console.log();
  
  // Check Ollama health
  console.log('🔍 Checking Ollama availability...');
  const isHealthy = await checkOllamaHealth(baseUrl);
  
  if (!isHealthy) {
    console.error('❌ Ollama service is not available!');
    console.log('💡 Make sure Ollama is running:');
    console.log('   1. Install Ollama: https://ollama.ai/');
    console.log('   2. Start Ollama: ollama serve');
    console.log(`   3. Check if accessible at: ${baseUrl}`);
    process.exit(1);
  }
  
  console.log('✅ Ollama service is available');
  
  // List available models
  console.log('📋 Checking available models...');
  const availableModels = await listOllamaModels(baseUrl);
  console.log(`   Available models: ${availableModels.length > 0 ? availableModels.join(', ') : 'None'}`);
  
  if (availableModels.length === 0) {
    console.log('⚠️  No models found. You may need to pull a model first.');
    console.log(`💡 Try: ollama pull ${model}`);
  } else if (!availableModels.some(m => m.includes(model.split(':')[0]))) {
    console.log(`⚠️  Requested model "${model}" not found in available models.`);
    console.log(`💡 Try: ollama pull ${model}`);
  }
  console.log();
  
  // Split words into chunks
  const wordChunks = chunkArray(TEST_HEBREW_WORDS, CHUNK_SIZE);
  console.log(`📂 Created ${wordChunks.length} chunks for processing`);
  console.log();
  
  const results: TestResult[] = [];
  const startTime = Date.now();
  
  // Process each chunk
  for (let i = 0; i < wordChunks.length; i++) {
    const chunk = wordChunks[i];
    const chunkStartTime = Date.now();
    
    logChunkInfo(i, chunk, 'start');
    
    try {
      const abortController = new AbortController();
      
      // Add timeout for each chunk (60 seconds for local inference)
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, 60000);
      
      const wordsResult = await enrichWordsWithOllama(chunk, {
        baseUrl,
        model,
        temperature: 0.1,
        enableDetailedLogging: enableLogging,
        validateJsonResponse: validateJson,
        useSimplePrompt,
        abortController,
        toastFn: mockToast,
        retryConfig: {
          maxRetries: 2,
          baseDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2
        }
      });
      
      clearTimeout(timeoutId);
      
      const processingTime = Date.now() - chunkStartTime;
      
      logChunkInfo(i, chunk, 'success', {
        processingTime,
        wordCount: wordsResult.length
      });
      
      // Log detailed results for each word
      console.log(`   📋 Detailed results:`);
      wordsResult.forEach((word, idx) => {
        const hasTranscription = word.transcription && word.transcription.trim() !== '';
        const hasTranslation = word.russian && word.russian.trim() !== '';
        const hasConjugations = word.conjugations && Object.keys(word.conjugations).length > 0;
        const hasExamples = word.examples && word.examples.length > 0;
        
        console.log(`      ${idx + 1}. ${word.hebrew} (${word.category})`);
        console.log(`         Transcription: ${hasTranscription ? '✅' : '❌'} "${word.transcription}"`);
        console.log(`         Translation: ${hasTranslation ? '✅' : '❌'} "${word.russian}"`);
        console.log(`         Conjugations: ${hasConjugations ? '✅' : '❌'}`);
        console.log(`         Examples: ${hasExamples ? '✅' : '❌'} (${word.examples?.length || 0})`);
      });
      
      results.push({
        chunkIndex: i,
        words: chunk,
        success: true,
        parsedWords: wordsResult,
        processingTime
      });
      
    } catch (error) {
      const processingTime = Date.now() - chunkStartTime;
      let errorType: TestResult['errorType'] = 'api_error';
      let errorMessage = 'Unknown error';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        if (error.message.includes('Failed to parse') || error.message.includes('JSON')) {
          errorType = 'json_parse';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorType = 'network';
        } else if (error.message.includes('validation') || error.message.includes('Invalid Ollama response')) {
          errorType = 'validation';
        } else if (error.message.includes('Ollama') || error.message.includes('model not found')) {
          errorType = 'ollama_error';
        }
      }
      
      logChunkInfo(i, chunk, 'error', {
        errorType,
        error: errorMessage,
        processingTime
      });
      
      // Log detailed error analysis
      console.log(`   🔍 Error analysis:`);
      console.log(`      Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
      
      results.push({
        chunkIndex: i,
        words: chunk,
        success: false,
        error: errorMessage,
        errorType,
        processingTime
      });
    }
    
    // Add delay between chunks (except for the last one)
    if (i < wordChunks.length - 1) {
      let delayMs = delayBetweenChunks;
      
      if (useProgressiveDelay) {
        delayMs = delayBetweenChunks + (i * 500); // Increase by 0.5s per chunk
      }
      
      console.log(`   ⏸️ Waiting ${delayMs}ms before next chunk...`);
      await delay(delayMs);
    }
  }
  
  // Calculate statistics
  const totalTime = Date.now() - startTime;
  const statistics: TestStatistics = {
    totalChunks: results.length,
    successfulChunks: results.filter(r => r.success).length,
    failedChunks: results.filter(r => !r.success).length,
    totalWords: TEST_HEBREW_WORDS.length,
    successfulWords: results.filter(r => r.success).reduce((sum, r) => sum + r.words.length, 0),
    failedWords: results.filter(r => !r.success).reduce((sum, r) => sum + r.words.length, 0),
    totalProcessingTime: totalTime,
    averageChunkTime: results.reduce((sum, r) => sum + r.processingTime, 0) / results.length,
    jsonParseErrors: results.filter(r => r.errorType === 'json_parse').length,
    networkErrors: results.filter(r => r.errorType === 'network').length,
    apiErrors: results.filter(r => r.errorType === 'api_error').length,
    validationErrors: results.filter(r => r.errorType === 'validation').length,
    ollamaErrors: results.filter(r => r.errorType === 'ollama_error').length
  };
  
  // Print final statistics
  console.log('\n' + '=' .repeat(60));
  console.log('📊 FINAL TEST STATISTICS');
  console.log('=' .repeat(60));
  
  console.log(`📈 Overall Results:`);
  console.log(`   Total chunks processed: ${statistics.totalChunks}`);
  console.log(`   Successful chunks: ${statistics.successfulChunks} (${Math.round(statistics.successfulChunks / statistics.totalChunks * 100)}%)`);
  console.log(`   Failed chunks: ${statistics.failedChunks} (${Math.round(statistics.failedChunks / statistics.totalChunks * 100)}%)`);
  console.log();
  
  console.log(`📝 Word Processing:`);
  console.log(`   Total words: ${statistics.totalWords}`);
  console.log(`   Successfully processed: ${statistics.successfulWords} (${Math.round(statistics.successfulWords / statistics.totalWords * 100)}%)`);
  console.log(`   Failed to process: ${statistics.failedWords} (${Math.round(statistics.failedWords / statistics.totalWords * 100)}%)`);
  console.log();
  
  console.log(`⏱️ Timing:`);
  console.log(`   Total test time: ${Math.round(statistics.totalProcessingTime / 1000)}s`);
  console.log(`   Average chunk processing time: ${Math.round(statistics.averageChunkTime)}ms`);
  console.log();
  
  console.log(`🐛 Error Breakdown:`);
  console.log(`   JSON parsing errors: ${statistics.jsonParseErrors}`);
  console.log(`   Network errors: ${statistics.networkErrors}`);
  console.log(`   API errors: ${statistics.apiErrors}`);
  console.log(`   Validation errors: ${statistics.validationErrors}`);
  console.log(`   Ollama-specific errors: ${statistics.ollamaErrors}`);
  console.log();
  
  // Detailed error analysis
  const failedResults = results.filter(r => !r.success);
  if (failedResults.length > 0) {
    console.log(`🔍 DETAILED ERROR ANALYSIS:`);
    console.log('=' .repeat(40));
    
    failedResults.forEach((result, idx) => {
      console.log(`${idx + 1}. Chunk ${result.chunkIndex + 1} (${result.words.join(', ')})`);
      console.log(`   Error Type: ${result.errorType}`);
      console.log(`   Error Message: ${result.error}`);
      console.log(`   Processing Time: ${result.processingTime}ms`);
      console.log();
    });
  }
  
  // Recommendations
  console.log(`💡 RECOMMENDATIONS:`);
  console.log('=' .repeat(40));
  
  if (statistics.ollamaErrors > 0) {
    console.log(`🔧 Ollama Issues (${statistics.ollamaErrors} errors):`);
    console.log(`   - Check if Ollama is running: ollama serve`);
    console.log(`   - Verify the model is available: ollama list`);
    console.log(`   - Install missing models: ollama pull ${model}`);
    console.log(`   - Check Ollama logs for detailed error information`);
    console.log();
  }
  
  if (statistics.jsonParseErrors > 0) {
    console.log(`🔧 JSON Parsing Issues (${statistics.jsonParseErrors} errors):`);
    console.log(`   - Try using simpler prompt: USE_SIMPLE_PROMPT=true`);
    console.log(`   - Consider using a different model with better JSON support`);
    console.log(`   - Disable JSON validation for testing: VALIDATE_JSON=false`);
    console.log();
  }
  
  if (statistics.networkErrors > 0) {
    console.log(`🌐 Network Issues (${statistics.networkErrors} errors):`);
    console.log(`   - Check if Ollama URL is correct: ${baseUrl}`);
    console.log(`   - Verify Ollama is accessible from this machine`);
    console.log(`   - Check firewall settings if running remotely`);
    console.log();
  }
  
  if (statistics.failedChunks === 0) {
    console.log(`🎉 Perfect! All chunks processed successfully with Ollama!`);
  } else if (statistics.successfulChunks / statistics.totalChunks >= 0.8) {
    console.log(`✅ Good performance with ${Math.round(statistics.successfulChunks / statistics.totalChunks * 100)}% success rate using Ollama.`);
  } else {
    console.log(`⚠️ High failure rate (${Math.round(statistics.failedChunks / statistics.totalChunks * 100)}%). Review Ollama configuration and model selection.`);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🏁 Ollama test completed!');
  
  // Exit with appropriate code
  process.exit(statistics.failedChunks > 0 ? 1 : 0);
}

// CLI argument parsing
function parseCliArguments() {
  const args = process.argv.slice(2);
  const help = args.includes('--help') || args.includes('-h');
  
  if (help) {
    console.log(`
🧪 Ollama Chunks Test Script

Usage: npx tsx scripts/test-ollama-chunks.ts [options]

Options:
  --help, -h              Show this help message
  
Environment Variables:
  OLLAMA_API_URL          Ollama API URL (default: ${DEFAULT_OLLAMA_API_URL})
  OLLAMA_MODEL            Model identifier (default: ${DEFAULT_OLLAMA_MODEL})
  USE_SIMPLE_PROMPT       Use simplified prompt (true/false, default: false)
  DELAY_BETWEEN_CHUNKS    Delay between chunks in ms (default: ${DEFAULT_DELAY_BETWEEN_CHUNKS})
  PROGRESSIVE_DELAY       Use progressive delays (true/false, default: ${DEFAULT_PROGRESSIVE_DELAY})
  ENABLE_LOGGING          Enable detailed logging (true/false, default: true)
  VALIDATE_JSON           Validate JSON responses (true/false, default: true)

Examples:
  npx tsx scripts/test-ollama-chunks.ts
  OLLAMA_MODEL="llama3.1:latest" npx tsx scripts/test-ollama-chunks.ts
  USE_SIMPLE_PROMPT=true npx tsx scripts/test-ollama-chunks.ts
  OLLAMA_API_URL="http://remote-host:11434/api" npx tsx scripts/test-ollama-chunks.ts
  DELAY_BETWEEN_CHUNKS=500 npx tsx scripts/test-ollama-chunks.ts
  VALIDATE_JSON=false npx tsx scripts/test-ollama-chunks.ts

Prerequisites:
  1. Install Ollama: https://ollama.ai/
  2. Start Ollama: ollama serve
  3. Pull a model: ollama pull llama3.2:latest
    `);
    process.exit(0);
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  parseCliArguments();
  testOllamaChunks().catch((error) => {
    console.error('❌ Fatal error during Ollama test execution:', error);
    process.exit(1);
  });
}
