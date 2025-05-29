#!/usr/bin/env node

import { enrichWordsWithLLM } from '../src/services/openrouter/index.ts';
import { DEFAULT_OPENROUTER_API_KEY, DEFAULT_OPENROUTER_MODEL } from '../src/config/openrouter.ts';
import type { Word } from '../src/types/index.ts';

// Test configuration
const CHUNK_SIZE = 5;
const DEFAULT_DELAY_BETWEEN_CHUNKS = 2000; // 2 seconds to prevent rate limiting
const DEFAULT_PROGRESSIVE_DELAY = true; // Whether to use progressive delays

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
  errorType?: 'network' | 'json_parse' | 'api_error' | 'validation';
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

// Analyze raw response for common JSON issues
function analyzeRawResponse(response: unknown): { hasJsonIssues: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (typeof response === 'string') {
    // Check for common JSON parsing issues
    if (response.includes('```json')) {
      issues.push('Response wrapped in markdown code blocks');
    }
    if (response.startsWith('{') && !response.endsWith('}')) {
      issues.push('Incomplete JSON object (missing closing brace)');
    }
    if (response.includes('{"')) {
      issues.push('Potential incomplete JSON (found opening quote after brace)');
    }
    if (response.match(/[{,]\s*$/)) {
      issues.push('JSON ends with incomplete structure');
    }
    // Check for the specific issue mentioned in task: "{"
    if (response.trim() === '{') {
      issues.push('Response is only an opening brace "{"');
    }
  }
  
  return {
    hasJsonIssues: issues.length > 0,
    issues
  };
}

// Main test function
async function testApiChunks(): Promise<void> {
  console.log('🧪 Starting API Chunks Test');
  console.log('=' .repeat(60));
  
  // Configuration
  const apiKey = process.env.OPENROUTER_API_KEY || DEFAULT_OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
  const forceToolSupport = process.env.FORCE_TOOL_SUPPORT === 'true';
  const delayBetweenChunks = parseInt(process.env.DELAY_BETWEEN_CHUNKS || String(DEFAULT_DELAY_BETWEEN_CHUNKS));
  const useProgressiveDelay = process.env.PROGRESSIVE_DELAY !== 'false'; // Default to true unless explicitly disabled
  const maxDelaySeconds = parseInt(process.env.MAX_DELAY_SECONDS || '10'); // Maximum delay in seconds
  
  console.log(`📋 Test Configuration:`);
  console.log(`   🔑 API Key: ${apiKey.substring(0, 12)}...`);
  console.log(`   🤖 Model: ${model}`);
  console.log(`   📦 Chunk size: ${CHUNK_SIZE} words`);
  console.log(`   ⏰ Base delay between chunks: ${delayBetweenChunks}ms`);
  console.log(`   📈 Progressive delay: ${useProgressiveDelay ? 'Enabled' : 'Disabled'}`);
  if (useProgressiveDelay) {
    console.log(`   ⏱️ Max delay per chunk: ${maxDelaySeconds}s`);
  }
  console.log(`   🛠️ Force tool support: ${forceToolSupport ? 'Yes' : 'Auto-detect'}`);
  console.log(`   📊 Total test words: ${TEST_HEBREW_WORDS.length}`);
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
      
      // Add timeout for each chunk (30 seconds)
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, 30000);
      
      // Enhanced test with new retry and validation options
      const llmOptions = {
        retryConfig: {
          maxRetries: 3,
          baseDelay: 1500,
          maxDelay: 15000,
          backoffMultiplier: 2.5
        },
        enableDetailedLogging: true,
        validateJsonResponse: true
      };

      const wordsResult = await enrichWordsWithLLM(
        chunk,
        apiKey,
        model,
        mockToast,
        forceToolSupport ? true : undefined,
        abortController,
        llmOptions
      );
      
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
        } else if (error.message.includes('validation') || error.message.includes('Invalid LLM response')) {
          errorType = 'validation';
        }
      }
      
      logChunkInfo(i, chunk, 'error', {
        errorType,
        error: errorMessage,
        processingTime
      });
      
      // Try to extract and analyze raw response for debugging
      console.log(`   🔍 Error analysis:`);
      console.log(`      Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
      
      // Analyze potential JSON issues in the error message
      const analysis = analyzeRawResponse(errorMessage);
      if (analysis.hasJsonIssues) {
        console.log(`   🚨 Potential JSON issues detected:`);
        analysis.issues.forEach(issue => console.log(`      - ${issue}`));
      }
      
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
        // Progressive delay: start with base delay, increase by 0.5s per chunk, up to max
        const progressiveDelaySeconds = Math.min(
          delayBetweenChunks / 1000 + (i * 0.5),
          maxDelaySeconds
        );
        delayMs = progressiveDelaySeconds * 1000;
      }
      
      console.log(`   ⏸️ Waiting ${delayMs}ms (${(delayMs/1000).toFixed(1)}s) before next chunk...`);
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
    validationErrors: results.filter(r => r.errorType === 'validation').length
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
  
  if (statistics.jsonParseErrors > 0) {
    console.log(`🔧 JSON Parsing Issues (${statistics.jsonParseErrors} errors):`);
    console.log(`   - Consider switching to a model with better JSON compliance`);
    console.log(`   - Try enabling/disabling tool support mode`);
    console.log(`   - Check if model supports structured output`);
    console.log();
  }
  
  if (statistics.networkErrors > 0) {
    console.log(`🌐 Network Issues (${statistics.networkErrors} errors):`);
    console.log(`   - Check internet connection`);
    console.log(`   - Verify API endpoint accessibility`);
    console.log(`   - Consider increasing timeout values`);
    console.log();
  }
  
  if (statistics.apiErrors > 0) {
    console.log(`🔑 API Issues (${statistics.apiErrors} errors):`);
    console.log(`   - Verify API key is valid and has sufficient credits`);
    console.log(`   - Check if selected model is available`);
    console.log(`   - Review rate limiting policies`);
    console.log();
  }
  
  if (statistics.failedChunks === 0) {
    console.log(`🎉 Perfect! All chunks processed successfully!`);
  } else if (statistics.successfulChunks / statistics.totalChunks >= 0.8) {
    console.log(`✅ Good performance with ${Math.round(statistics.successfulChunks / statistics.totalChunks * 100)}% success rate.`);
  } else {
    console.log(`⚠️ High failure rate (${Math.round(statistics.failedChunks / statistics.totalChunks * 100)}%). Review API configuration and model selection.`);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🏁 Test completed!');
  
  // Exit with appropriate code
  process.exit(statistics.failedChunks > 0 ? 1 : 0);
}

// CLI argument parsing
function parseCliArguments() {
  const args = process.argv.slice(2);
  const help = args.includes('--help') || args.includes('-h');
  
  if (help) {
    console.log(`
🧪 API Chunks Test Script

Usage: npx tsx scripts/test-api-chunks.ts [options]

Options:
  --help, -h              Show this help message
  
Environment Variables:
  OPENROUTER_API_KEY      OpenRouter API key (default: from config)
  OPENROUTER_MODEL        Model identifier (default: from config)
  FORCE_TOOL_SUPPORT      Force tool support mode (true/false)
  DELAY_BETWEEN_CHUNKS    Base delay between chunks in ms (default: ${DEFAULT_DELAY_BETWEEN_CHUNKS})
  PROGRESSIVE_DELAY       Use progressive delays (true/false, default: ${DEFAULT_PROGRESSIVE_DELAY})
  MAX_DELAY_SECONDS       Maximum delay per chunk in seconds (default: 10)

Examples:
  npx tsx scripts/test-api-chunks.ts
  OPENROUTER_MODEL="anthropic/claude-3-sonnet" npx tsx scripts/test-api-chunks.ts
  FORCE_TOOL_SUPPORT=true npx tsx scripts/test-api-chunks.ts
  DELAY_BETWEEN_CHUNKS=5000 npx tsx scripts/test-api-chunks.ts
  PROGRESSIVE_DELAY=false DELAY_BETWEEN_CHUNKS=3000 npx tsx scripts/test-api-chunks.ts
  MAX_DELAY_SECONDS=15 npx tsx scripts/test-api-chunks.ts
    `);
    process.exit(0);
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  parseCliArguments();
  testApiChunks().catch((error) => {
    console.error('❌ Fatal error during test execution:', error);
    process.exit(1);
  });
}