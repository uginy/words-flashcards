#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { enrichWordsWithLLM } from '../src/services/openrouter/index.ts';
import { DEFAULT_OPENROUTER_API_KEY, DEFAULT_BATCH_SIZE, DEFAULT_BATCH_DELAY } from '../src/config/openrouter.ts';
import type { Word } from '../src/types/index.ts';

// Test configuration - use values from config as defaults
const DELAY_BETWEEN_MODELS = DEFAULT_BATCH_DELAY; // Use default batch delay between model tests
const REQUEST_TIMEOUT = 120000; // 120 seconds per request (all words at once)
const CHUNK_SIZE = DEFAULT_BATCH_SIZE; // Use default batch size for testing

// Test Hebrew verbs (פועל) for consistency
const TEST_HEBREW_VERBS = [
  'לאכול', 
  'ללכת',
  'לדבר',
  'לכתוב',
  'לקרוא',
];

interface FilteredModel {
  id: string;
  name: string;
  description?: string;
  contextLength: number;
  isFree: boolean;
  supportsText: boolean;
  isInstruct: boolean;
  maxCompletionTokens?: number;
  reasonIncluded: string;
}

interface ModelsListFile {
  timestamp: string;
  totalModels: number;
  filters: any;
  models: FilteredModel[];
}

// Load models from file
async function loadModelsFromFile(): Promise<FilteredModel[]> {
  const filename = '/Users/eugene/projects/M/words-flashcards/scripts/free-models-list.json';
  
  try {
    const content = await readFile(filename, 'utf-8');
    const data: ModelsListFile = JSON.parse(content);
    
    console.log(`📂 Loaded ${data.models.length} models from ${filename}`);
    console.log(`📅 Models list created: ${new Date(data.timestamp).toLocaleString()}`);
    
    return data.models;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      console.error('❌ Models file not found. Please run: bun run fetch-free-models');
      console.error('   This will fetch and filter the latest free models from OpenRouter.');
    } else {
      console.error('❌ Failed to load models file:', error);
    }
    throw error;
  }
}

interface WordTestResult {
  word: string;
  success: boolean;
  responseTime: number;
  error?: string;
  errorType?: 'timeout' | 'json_parse' | 'api_error' | 'validation' | 'network';
  parsedWord?: Word;
  qualityScore?: number; // 0-10 scale
}

interface ModelBenchmarkResult {
  modelName: string;
  totalWords: number;
  successfulWords: number;
  failedWords: number;
  successRate: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  totalErrors: number;
  errorBreakdown: {
    timeout: number;
    json_parse: number;
    api_error: number;
    validation: number;
    network: number;
  };
  averageQualityScore: number;
  overallScore: number; // Combined metric
  wordResults: WordTestResult[];
}

// Mock toast function for logging
const mockToast = (opts: { title: string; description: string; variant?: string }) => {
  // Silent for benchmarking
};

// Quality assessment function
function assessWordQuality(word: Word, originalHebrew: string): number {
  let score = 0;
  
  // Hebrew word matches (2 points)
  if (word.hebrew === originalHebrew) {
    score += 2;
  }
  
  // Has transcription (1 point)
  if (word.transcription && word.transcription.trim() !== '') {
    score += 1;
  }
  
  // Has Russian translation (2 points)
  if (word.russian && word.russian.trim() !== '') {
    score += 2;
  }
  
  // Category is verb (1 point)
  if (word.category === 'פועל') {
    score += 1;
  }
  
  // Has conjugations (2 points)
  if (word.conjugations && Object.keys(word.conjugations).length > 0) {
    score += 2;
  }
  
  // Has examples (2 points)
  if (word.examples && word.examples.length > 0) {
    score += 2;
  }
  
  return score; // Max 10 points
}

// Calculate overall model score
function calculateOverallScore(result: ModelBenchmarkResult): number {
  const successWeight = 0.4;
  const speedWeight = 0.2;
  const qualityWeight = 0.4;
  
  // Success rate (0-40 points)
  const successScore = result.successRate * 40;
  
  // Speed score (0-20 points) - faster is better, penalize over 30s
  const avgTimeSeconds = result.averageResponseTime / 1000;
  const speedScore = Math.max(0, 20 - (avgTimeSeconds / 30) * 20);
  
  // Quality score (0-40 points)
  const qualityScore = (result.averageQualityScore / 10) * 40;
  
  return successScore + speedScore + qualityScore;
}

// Test single word with a model
async function testWordWithModel(
  word: string, 
  model: string, 
  apiKey: string
): Promise<WordTestResult> {
  const startTime = Date.now();
  
  try {
    const abortController = new AbortController();
    
    // Set timeout
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, REQUEST_TIMEOUT);
    
    const wordsResult = await enrichWordsWithLLM(
      [word],
      apiKey,
      model,
      mockToast,
      undefined, // auto-detect tool support
      abortController
    );
    
    clearTimeout(timeoutId);
    
    const responseTime = Date.now() - startTime;
    
    if (wordsResult && wordsResult.length > 0) {
      const parsedWord = wordsResult[0];
      const qualityScore = assessWordQuality(parsedWord, word);
      
      return {
        word,
        success: true,
        responseTime,
        parsedWord,
        qualityScore
      };
    } else {
      return {
        word,
        success: false,
        responseTime,
        error: 'Empty response',
        errorType: 'validation'
      };
    }
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    let errorType: WordTestResult['errorType'] = 'api_error';
    let errorMessage = 'Unknown error';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.name === 'AbortError' || errorMessage.includes('timeout')) {
        errorType = 'timeout';
      } else if (errorMessage.includes('Failed to parse') || errorMessage.includes('JSON')) {
        errorType = 'json_parse';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorType = 'network';
      } else if (errorMessage.includes('validation') || errorMessage.includes('Invalid LLM response')) {
        errorType = 'validation';
      }
    }
    
    return {
      word,
      success: false,
      responseTime,
      error: errorMessage,
      errorType
    };
  }
}

// Test all words with a single model
async function benchmarkModel(model: string, apiKey: string): Promise<ModelBenchmarkResult> {
  console.log(`\n🧪 Testing model: ${model}`);
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  console.log(`   Testing all ${TEST_HEBREW_VERBS.length} words: ${TEST_HEBREW_VERBS.join(', ')}`);
  
  let wordResults: WordTestResult[] = [];
  let responseTime = 0;
  let success = false;
  let errorMessage = '';
  let errorType: WordTestResult['errorType'] = 'api_error';
  
  try {
    const abortController = new AbortController();
    
    // Add timeout for the request (120 seconds for all words)
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 120000);
    
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
      TEST_HEBREW_VERBS,
      apiKey,
      model,
      mockToast,
      undefined, // auto-detect tool support
      abortController,
      llmOptions
    );
    
    clearTimeout(timeoutId);
    responseTime = Date.now() - startTime;
    
    if (wordsResult && wordsResult.length > 0) {
      success = true;
      
      // Create word results for each word
      TEST_HEBREW_VERBS.forEach((word, idx) => {
        const parsedWord = wordsResult[idx];
        if (parsedWord) {
          const qualityScore = assessWordQuality(parsedWord, word);
          wordResults.push({
            word,
            success: true,
            responseTime: responseTime, // Same response time for all words in batch
            parsedWord,
            qualityScore
          });
        } else {
          wordResults.push({
            word,
            success: false,
            responseTime: responseTime,
            error: 'Missing word in response',
            errorType: 'validation'
          });
        }
      });
      
      console.log(`   ✅ Success (${responseTime}ms for all words)`);
      
      // Log detailed results for each word
      console.log(`   📋 Detailed results:`);
      wordsResult.forEach((word, idx) => {
        const hasTranscription = word.transcription && word.transcription.trim() !== '';
        const hasTranslation = word.russian && word.russian.trim() !== '';
        const hasConjugations = word.conjugations && Object.keys(word.conjugations).length > 0;
        const hasExamples = word.examples && word.examples.length > 0;
        const qualityScore = wordResults[idx]?.qualityScore || 0;
        
        console.log(`      ${idx + 1}. ${word.hebrew} (${word.category}) - Quality: ${qualityScore}/10`);
        console.log(`         Transcription: ${hasTranscription ? '✅' : '❌'} "${word.transcription}"`);
        console.log(`         Translation: ${hasTranslation ? '✅' : '❌'} "${word.russian}"`);
        console.log(`         Conjugations: ${hasConjugations ? '✅' : '❌'}`);
        console.log(`         Examples: ${hasExamples ? '✅' : '❌'} (${word.examples?.length || 0})`);
      });
      
    } else {
      // Empty response - mark all words as failed
      TEST_HEBREW_VERBS.forEach(word => {
        wordResults.push({
          word,
          success: false,
          responseTime: responseTime,
          error: 'Empty response',
          errorType: 'validation'
        });
      });
      errorMessage = 'Empty response';
      errorType = 'validation';
    }
    
  } catch (error) {
    responseTime = Date.now() - startTime;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.name === 'AbortError' || errorMessage.includes('timeout')) {
        errorType = 'timeout';
      } else if (errorMessage.includes('Failed to parse') || errorMessage.includes('JSON')) {
        errorType = 'json_parse';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorType = 'network';
      } else if (errorMessage.includes('validation') || errorMessage.includes('Invalid LLM response')) {
        errorType = 'validation';
      }
    }
    
    // Mark all words as failed with the same error
    TEST_HEBREW_VERBS.forEach(word => {
      wordResults.push({
        word,
        success: false,
        responseTime: responseTime,
        error: errorMessage,
        errorType
      });
    });
    
    console.log(`   ❌ Failed (${responseTime}ms, ${errorType}: ${errorMessage})`);
  }
  
  // Calculate metrics
  const successfulWords = wordResults.filter(r => r.success).length;
  const failedWords = wordResults.filter(r => !r.success).length;
  const successRate = successfulWords / TEST_HEBREW_VERBS.length;
  
  const responseTimes = wordResults.map(r => r.responseTime);
  const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  const minResponseTime = Math.min(...responseTimes);
  const maxResponseTime = Math.max(...responseTimes);
  
  const errorBreakdown = {
    timeout: wordResults.filter(r => r.errorType === 'timeout').length,
    json_parse: wordResults.filter(r => r.errorType === 'json_parse').length,
    api_error: wordResults.filter(r => r.errorType === 'api_error').length,
    validation: wordResults.filter(r => r.errorType === 'validation').length,
    network: wordResults.filter(r => r.errorType === 'network').length
  };
  
  const qualityScores = wordResults
    .filter(r => r.success && r.qualityScore !== undefined)
    .map(r => r.qualityScore!);
  const averageQualityScore = qualityScores.length > 0 
    ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length 
    : 0;
  
  const result: ModelBenchmarkResult = {
    modelName: model,
    totalWords: TEST_HEBREW_VERBS.length,
    successfulWords,
    failedWords,
    successRate,
    averageResponseTime,
    minResponseTime,
    maxResponseTime,
    totalErrors: failedWords,
    errorBreakdown,
    averageQualityScore,
    overallScore: 0, // Will be calculated
    wordResults
  };
  
  result.overallScore = calculateOverallScore(result);
  
  return result;
}

// Format time in human readable format
function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
}

// Print benchmark results table
function printBenchmarkTable(results: ModelBenchmarkResult[]): void {
  console.log('\n' + '=' .repeat(120));
  console.log('📊 BENCHMARK RESULTS TABLE');
  console.log('=' .repeat(120));
  
  // Table header
  console.log('| Model                                    | Success | Quality | Avg Time | Overall | Errors           |');
  console.log('|------------------------------------------|---------|---------|----------|---------|------------------|');
  
  // Sort by overall score (descending)
  const sortedResults = [...results].sort((a, b) => b.overallScore - a.overallScore);
  
  sortedResults.forEach((result, index) => {
    const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
    const modelName = result.modelName.padEnd(38);
    const successRate = `${(result.successRate * 100).toFixed(0)}%`.padStart(7);
    const qualityScore = `${result.averageQualityScore.toFixed(1)}/10`.padStart(7);
    const avgTime = formatTime(result.averageResponseTime).padStart(8);
    const overallScore = `${result.overallScore.toFixed(0)}`.padStart(7);
    
    // Error summary
    const errors: string[] = [];
    if (result.errorBreakdown.timeout > 0) errors.push(`T:${result.errorBreakdown.timeout}`);
    if (result.errorBreakdown.json_parse > 0) errors.push(`J:${result.errorBreakdown.json_parse}`);
    if (result.errorBreakdown.api_error > 0) errors.push(`A:${result.errorBreakdown.api_error}`);
    if (result.errorBreakdown.validation > 0) errors.push(`V:${result.errorBreakdown.validation}`);
    if (result.errorBreakdown.network > 0) errors.push(`N:${result.errorBreakdown.network}`);
    const errorSummary = errors.join(',').padEnd(14);
    
    console.log(`|${rank}${modelName} | ${successRate} | ${qualityScore} | ${avgTime} | ${overallScore} | ${errorSummary} |`);
  });
  
  console.log('|------------------------------------------|---------|---------|----------|---------|------------------|');
  console.log('| Legend: T=Timeout, J=JSON, A=API, V=Validation, N=Network                                         |');
  console.log('=' .repeat(120));
}

// Print detailed analysis
function printDetailedAnalysis(results: ModelBenchmarkResult[]): void {
  console.log('\n📈 DETAILED ANALYSIS');
  console.log('=' .repeat(60));
  
  const sortedResults = [...results].sort((a, b) => b.overallScore - a.overallScore);
  const topModel = sortedResults[0];
  
  console.log(`🏆 Best Model: ${topModel.modelName}`);
  console.log(`   Overall Score: ${topModel.overallScore.toFixed(1)}/100`);
  console.log(`   Success Rate: ${(topModel.successRate * 100).toFixed(1)}%`);
  console.log(`   Average Quality: ${topModel.averageQualityScore.toFixed(1)}/10`);
  console.log(`   Average Response Time: ${formatTime(topModel.averageResponseTime)}`);
  console.log();
  
  // Speed analysis
  const fastestModel = sortedResults.reduce((fastest, current) => 
    current.averageResponseTime < fastest.averageResponseTime ? current : fastest
  );
  console.log(`⚡ Fastest Model: ${fastestModel.modelName}`);
  console.log(`   Average Response Time: ${formatTime(fastestModel.averageResponseTime)}`);
  console.log();
  
  // Quality analysis
  const bestQualityModel = sortedResults.reduce((best, current) => 
    current.averageQualityScore > best.averageQualityScore ? current : best
  );
  console.log(`💎 Highest Quality: ${bestQualityModel.modelName}`);
  console.log(`   Average Quality Score: ${bestQualityModel.averageQualityScore.toFixed(1)}/10`);
  console.log();
  
  // Reliability analysis
  const mostReliableModel = sortedResults.reduce((reliable, current) => 
    current.successRate > reliable.successRate ? current : reliable
  );
  console.log(`🔒 Most Reliable: ${mostReliableModel.modelName}`);
  console.log(`   Success Rate: ${(mostReliableModel.successRate * 100).toFixed(1)}%`);
  console.log();
  
  // Error analysis
  const totalErrors = results.reduce((sum, r) => sum + r.totalErrors, 0);
  const totalTimeouts = results.reduce((sum, r) => sum + r.errorBreakdown.timeout, 0);
  const totalJsonErrors = results.reduce((sum, r) => sum + r.errorBreakdown.json_parse, 0);
  
  console.log(`📊 Error Statistics:`);
  console.log(`   Total Errors: ${totalErrors}`);
  console.log(`   Timeouts: ${totalTimeouts} (${((totalTimeouts/totalErrors)*100).toFixed(1)}%)`);
  console.log(`   JSON Parse Errors: ${totalJsonErrors} (${((totalJsonErrors/totalErrors)*100).toFixed(1)}%)`);
  console.log();
  
  // Recommendations
  console.log(`💡 Recommendations:`);
  console.log(`   🎯 For production use: ${topModel.modelName}`);
  console.log(`   ⚡ For speed-critical tasks: ${fastestModel.modelName}`);
  console.log(`   💎 For highest quality output: ${bestQualityModel.modelName}`);
  console.log(`   🔒 For maximum reliability: ${mostReliableModel.modelName}`);
}

// Main benchmark function
async function benchmarkFreeModels(): Promise<void> {
  console.log('🧪 Starting Free Models Benchmark');
  console.log('=' .repeat(80));
  
  const apiKey = process.env.OPENROUTER_API_KEY || DEFAULT_OPENROUTER_API_KEY;
  console.log(`🔑 API Key: ${apiKey.substring(0, 12)}...`);
  
  // Load models from file
  const freeModels = await loadModelsFromFile();
  
  console.log(`📊 Models to test: ${freeModels.length}`);
  console.log(`📝 Words per model: ${TEST_HEBREW_VERBS.length}`);
  console.log(`⏰ Delay between models: ${DELAY_BETWEEN_MODELS}ms`);
  console.log(`🕐 Request timeout: ${REQUEST_TIMEOUT}ms`);
  console.log();
  
  const results: ModelBenchmarkResult[] = [];
  const startTime = Date.now();
  
  for (let i = 0; i < freeModels.length; i++) {
    const model = freeModels[i];
    
    try {
      const result = await benchmarkModel(model.id, apiKey);
      results.push(result);
      
      console.log(`   📊 Model completed: ${result.successfulWords}/${result.totalWords} success, ` +
                 `quality: ${result.averageQualityScore.toFixed(1)}/10, ` +
                 `time: ${formatTime(result.averageResponseTime)}`);
      
    } catch (error) {
      console.log(`   ❌ Model failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Create failed result
      const failedResult: ModelBenchmarkResult = {
        modelName: model.id,
        totalWords: TEST_HEBREW_VERBS.length,
        successfulWords: 0,
        failedWords: TEST_HEBREW_VERBS.length,
        successRate: 0,
        averageResponseTime: REQUEST_TIMEOUT,
        minResponseTime: REQUEST_TIMEOUT,
        maxResponseTime: REQUEST_TIMEOUT,
        totalErrors: TEST_HEBREW_VERBS.length,
        errorBreakdown: {
          timeout: 0,
          json_parse: 0,
          api_error: TEST_HEBREW_VERBS.length,
          validation: 0,
          network: 0
        },
        averageQualityScore: 0,
        overallScore: 0,
        wordResults: TEST_HEBREW_VERBS.map(word => ({
          word,
          success: false,
          responseTime: REQUEST_TIMEOUT,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: 'api_error' as const
        }))
      };
      results.push(failedResult);
    }
    
    // Add delay between models (except for the last one)
    if (i < freeModels.length - 1) {
      console.log(`   ⏸️ Waiting ${DELAY_BETWEEN_MODELS}ms before next model...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MODELS));
    }
  }
  
  const totalTime = Date.now() - startTime;
  
  // Print results
  printBenchmarkTable(results);
  printDetailedAnalysis(results);
  
  console.log('\n' + '=' .repeat(80));
  console.log(`🏁 Benchmark completed in ${formatTime(totalTime)}`);
  console.log(`📊 Tested ${results.length} models with ${TEST_HEBREW_VERBS.length} words each`);
  console.log(`📈 Total API calls: ${results.length * TEST_HEBREW_VERBS.length}`);
  
  // Exit with appropriate code
  const hasSuccessfulModels = results.some(r => r.successfulWords > 0);
  process.exit(hasSuccessfulModels ? 0 : 1);
}

// CLI argument parsing
function parseCliArguments() {
  const args = process.argv.slice(2);
  const help = args.includes('--help') || args.includes('-h');
  
  if (help) {
    console.log(`
🧪 Free Models Benchmark Script

Usage: npx tsx scripts/test-free-models-benchmark.ts [options]

Options:
  --help, -h              Show this help message
  
Environment Variables:
  OPENROUTER_API_KEY      OpenRouter API key (default: from config)

Description:
  Tests all free OpenRouter models with Hebrew verbs to determine the best model
  for word enrichment in our flashcards application.

Examples:
  npx tsx scripts/test-free-models-benchmark.ts
  OPENROUTER_API_KEY="your-key" npx tsx scripts/test-free-models-benchmark.ts
    `);
    process.exit(0);
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  parseCliArguments();
  benchmarkFreeModels().catch((error) => {
    console.error('❌ Fatal error during benchmark:', error);
    process.exit(1);
  });
}
