#!/usr/bin/env node

import { enrichWordsWithLLM } from '../src/services/openrouter.ts';
import { DEFAULT_OPENROUTER_API_KEY } from '../src/config/openrouter.ts';
import type { Word } from '../src/types/index.ts';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Test configuration
const CHUNK_SIZE = 5;
const DEFAULT_DELAY_BETWEEN_MODELS = 3000; // 10 seconds between models to prevent rate limiting
const DEFAULT_DELAY_BETWEEN_CHUNKS = 1000; // 2 seconds between chunks
const CHAMPIONSHIP_RESULTS_DIR = './championship-results';

// Free models list from OpenRouter
const FREE_MODELS = [
  'mistralai/devstral-small:free',
  'google/gemma-3n-e4b-it:free',
  'meta-llama/llama-3.3-8b-instruct:free',
  'nousresearch/deephermes-3-mistral-24b-preview:free',
  'microsoft/phi-4-reasoning-plus:free',
  'microsoft/phi-4-reasoning:free',
  'opengvlab/internvl3-14b:free',
  'opengvlab/internvl3-2b:free',
  'deepseek/deepseek-prover-v2:free',
  'qwen/qwen3-30b-a3b:free',
  'qwen/qwen3-8b:free',
  'qwen/qwen3-14b:free',
  'qwen/qwen3-32b:free',
  'qwen/qwen3-235b-a22b:free',
  'tngtech/deepseek-r1t-chimera:free',
  'microsoft/mai-ds-r1:free',
  'thudm/glm-z1-32b:free',
  'thudm/glm-4-32b:free',
  'shisa-ai/shisa-v2-llama3.3-70b:free',
  'arliai/qwq-32b-arliai-rpr-v1:free',
  'agentica-org/deepcoder-14b-preview:free',
  'moonshotai/kimi-vl-a3b-thinking:free',
  'nvidia/llama-3.3-nemotron-super-49b-v1:free',
  'nvidia/llama-3.1-nemotron-ultra-253b-v1:free',
  'meta-llama/llama-4-maverick:free',
  'meta-llama/llama-4-scout:free',
  'deepseek/deepseek-v3-base:free',
  'qwen/qwen2.5-vl-3b-instruct:free',
  'qwen/qwen2.5-vl-32b-instruct:free',
  'deepseek/deepseek-chat-v3-0324:free',
  'featherless/qwerky-72b:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'open-r1/olympiccoder-32b:free',
  'google/gemma-3-1b-it:free',
  'google/gemma-3-4b-it:free',
  'google/gemma-3-12b-it:free',
  'rekaai/reka-flash-3:free',
  'google/gemma-3-27b-it:free',
  'deepseek/deepseek-r1-zero:free',
  'qwen/qwq-32b:free',
  'moonshotai/moonlight-16b-a3b-instruct:free',
  'nousresearch/deephermes-3-llama-3-8b-preview:free',
  'cognitivecomputations/dolphin3.0-r1-mistral-24b:free',
  'cognitivecomputations/dolphin3.0-mistral-24b:free',
  'qwen/qwen2.5-vl-72b-instruct:free',
  'mistralai/mistral-small-24b-instruct-2501:free',
  'deepseek/deepseek-r1-distill-qwen-32b:free',
  'deepseek/deepseek-r1-distill-qwen-14b:free',
  'deepseek/deepseek-r1-distill-llama-70b:free',
  'deepseek/deepseek-r1:free',
  'deepseek/deepseek-chat:free',
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen-2.5-coder-32b-instruct:free',
  'qwen/qwen-2.5-7b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'meta-llama/llama-3.2-1b-instruct:free',
  'meta-llama/llama-3.2-11b-vision-instruct:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'qwen/qwen-2.5-vl-7b-instruct:free',
  'meta-llama/llama-3.1-405b:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'mistralai/mistral-nemo:free',
  'google/gemma-2-9b-it:free',
  'mistralai/mistral-7b-instruct:free'
];

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

interface ModelTestResult {
  modelName: string;
  successRate: number;
  wordSuccessRate: number;
  averageResponseTime: number;
  jsonParseErrors: number;
  qualityScore: number;
  totalScore: number;
  errors: string[];
  rawResults: TestStatistics;
  testDuration: number;
  isAvailable: boolean;
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

// Progress bar utility
function displayProgress(current: number, total: number, modelName: string) {
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * 30);
  const progressBar = '█'.repeat(filled) + '░'.repeat(30 - filled);
  
  process.stdout.write(`\r🏆 Championship Progress: [${progressBar}] ${percentage}% (${current}/${total}) - Testing: ${modelName}`);
  
  if (current === total) {
    console.log(); // New line when complete
  }
}

// Calculate quality score based on word enrichment
function calculateQualityScore(parsedWords: Word[]): number {
  if (!parsedWords || parsedWords.length === 0) return 0;
  
  let totalScore = 0;
  const maxScorePerWord = 4; // transcription + translation + conjugations + examples
  
  parsedWords.forEach(word => {
    let wordScore = 0;
    
    // Transcription score
    if (word.transcription && word.transcription.trim() !== '') {
      wordScore += 1;
    }
    
    // Translation score
    if (word.russian && word.russian.trim() !== '') {
      wordScore += 1;
    }
    
    // Conjugations score
    if (word.conjugations && Object.keys(word.conjugations).length > 0) {
      wordScore += 1;
    }
    
    // Examples score
    if (word.examples && word.examples.length > 0) {
      wordScore += 1;
    }
    
    totalScore += wordScore;
  });
  
  return (totalScore / (parsedWords.length * maxScorePerWord)) * 100;
}

// Calculate composite score for ranking
function calculateTotalScore(result: Omit<ModelTestResult, 'totalScore'>): number {
  const weights = {
    successRate: 0.3,        // 30% - Most important
    wordSuccessRate: 0.25,   // 25% - Word-level success
    qualityScore: 0.25,      // 25% - Quality of enrichment
    responseTime: 0.1,       // 10% - Speed (inverted, lower is better)
    jsonStability: 0.1       // 10% - JSON parsing reliability
  };
  
  // Normalize response time (lower is better, max 10 seconds)
  const normalizedResponseTime = Math.max(0, 100 - (result.averageResponseTime / 100));
  
  // JSON stability score (lower errors is better)
  const jsonStabilityScore = Math.max(0, 100 - (result.jsonParseErrors * 20));
  
  const totalScore = 
    (result.successRate * weights.successRate) +
    (result.wordSuccessRate * weights.wordSuccessRate) +
    (result.qualityScore * weights.qualityScore) +
    (normalizedResponseTime * weights.responseTime) +
    (jsonStabilityScore * weights.jsonStability);
  
  return Math.round(totalScore * 100) / 100;
}

// Test single model
async function testSingleModel(modelName: string, apiKey: string): Promise<ModelTestResult> {
  console.log(`\n🤖 Testing model: ${modelName}`);
  console.log('=' .repeat(80));
  
  const startTime = Date.now();
  const wordChunks = chunkArray(TEST_HEBREW_WORDS, CHUNK_SIZE);
  const results: TestResult[] = [];
  const errors: string[] = [];
  
  // Test model availability first
  try {
    const testChunk = wordChunks[0];
    const abortController = new AbortController();
    
    // Quick availability test with timeout
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 15000); // 15 seconds timeout for availability test
    
    await enrichWordsWithLLM(
      [testChunk[0]], // Test with just one word
      apiKey,
      modelName,
      mockToast,
      undefined,
      abortController,
      {
        retryConfig: {
          maxRetries: 1,
          baseDelay: 1000,
          maxDelay: 5000,
          backoffMultiplier: 2
        },
        enableDetailedLogging: false,
        validateJsonResponse: true
      }
    );
    
    clearTimeout(timeoutId);
    console.log(`✅ Model ${modelName} is available, proceeding with full test...`);
    
  } catch (error) {
    const testDuration = Date.now() - startTime;
    console.log(`❌ Model ${modelName} is not available: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return {
      modelName,
      successRate: 0,
      wordSuccessRate: 0,
      averageResponseTime: 0,
      jsonParseErrors: 0,
      qualityScore: 0,
      totalScore: 0,
      errors: [`Model unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`],
      rawResults: {
        totalChunks: 0,
        successfulChunks: 0,
        failedChunks: 0,
        totalWords: 0,
        successfulWords: 0,
        failedWords: 0,
        totalProcessingTime: testDuration,
        averageChunkTime: 0,
        jsonParseErrors: 0,
        networkErrors: 1,
        apiErrors: 0,
        validationErrors: 0
      },
      testDuration,
      isAvailable: false
    };
  }
  
  // Process all chunks
  for (let i = 0; i < wordChunks.length; i++) {
    const chunk = wordChunks[i];
    const chunkStartTime = Date.now();
    
    console.log(`  📦 Processing chunk ${i + 1}/${wordChunks.length}: [${chunk.join(', ')}]`);
    
    try {
      const abortController = new AbortController();
      
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, 30000); // 30 seconds timeout per chunk
      
      const llmOptions = {
        retryConfig: {
          maxRetries: 2,
          baseDelay: 1500,
          maxDelay: 10000,
          backoffMultiplier: 2
        },
        enableDetailedLogging: false,
        validateJsonResponse: true
      };

      const wordsResult = await enrichWordsWithLLM(
        chunk,
        apiKey,
        modelName,
        mockToast,
        undefined,
        abortController,
        llmOptions
      );
      
      clearTimeout(timeoutId);
      
      const processingTime = Date.now() - chunkStartTime;
      
      console.log(`    ✅ Success - ${wordsResult.length} words processed in ${processingTime}ms`);
      
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
      
      console.log(`    ❌ Failed - ${errorType}: ${errorMessage} (${processingTime}ms)`);
      errors.push(`Chunk ${i + 1}: ${errorMessage}`);
      
      results.push({
        chunkIndex: i,
        words: chunk,
        success: false,
        error: errorMessage,
        errorType,
        processingTime
      });
    }
    
    // Small delay between chunks
    if (i < wordChunks.length - 1) {
      await delay(DEFAULT_DELAY_BETWEEN_CHUNKS);
    }
  }
  
  const testDuration = Date.now() - startTime;
  
  // Calculate statistics
  const statistics: TestStatistics = {
    totalChunks: results.length,
    successfulChunks: results.filter(r => r.success).length,
    failedChunks: results.filter(r => !r.success).length,
    totalWords: TEST_HEBREW_WORDS.length,
    successfulWords: results.filter(r => r.success).reduce((sum, r) => sum + r.words.length, 0),
    failedWords: results.filter(r => !r.success).reduce((sum, r) => sum + r.words.length, 0),
    totalProcessingTime: testDuration,
    averageChunkTime: results.reduce((sum, r) => sum + r.processingTime, 0) / results.length,
    jsonParseErrors: results.filter(r => r.errorType === 'json_parse').length,
    networkErrors: results.filter(r => r.errorType === 'network').length,
    apiErrors: results.filter(r => r.errorType === 'api_error').length,
    validationErrors: results.filter(r => r.errorType === 'validation').length
  };
  
  // Calculate quality score
  const allParsedWords = results
    .filter(r => r.success && r.parsedWords)
    .flatMap(r => r.parsedWords!);
  
  const qualityScore = calculateQualityScore(allParsedWords);
  
  const modelResult: Omit<ModelTestResult, 'totalScore'> = {
    modelName,
    successRate: statistics.totalChunks > 0 ? (statistics.successfulChunks / statistics.totalChunks) * 100 : 0,
    wordSuccessRate: statistics.totalWords > 0 ? (statistics.successfulWords / statistics.totalWords) * 100 : 0,
    averageResponseTime: statistics.averageChunkTime,
    jsonParseErrors: statistics.jsonParseErrors,
    qualityScore,
    errors,
    rawResults: statistics,
    testDuration,
    isAvailable: true
  };
  
  const totalScore = calculateTotalScore(modelResult);
  
  console.log(`  📊 Results: Success Rate: ${modelResult.successRate.toFixed(1)}%, Quality: ${qualityScore.toFixed(1)}%, Total Score: ${totalScore}`);
  
  return {
    ...modelResult,
    totalScore
  };
}

// Save results to files
function saveResults(results: ModelTestResult[], timestamp: string) {
  // Create results directory
  try {
    writeFileSync(join(CHAMPIONSHIP_RESULTS_DIR, '.gitkeep'), '');
  } catch {
    // Directory might already exist
  }
  
  // Save detailed JSON results
  const detailedResults = {
    timestamp,
    testConfiguration: {
      chunkSize: CHUNK_SIZE,
      totalWords: TEST_HEBREW_WORDS.length,
      totalModels: FREE_MODELS.length,
      testedModels: results.length,
      delayBetweenModels: DEFAULT_DELAY_BETWEEN_MODELS
    },
    results: results.sort((a, b) => b.totalScore - a.totalScore),
    testWords: TEST_HEBREW_WORDS
  };
  
  const jsonPath = join(CHAMPIONSHIP_RESULTS_DIR, `championship-results-${timestamp}.json`);
  writeFileSync(jsonPath, JSON.stringify(detailedResults, null, 2));
  console.log(`💾 Detailed results saved to: ${jsonPath}`);
  
  // Generate markdown report
  const markdownReport = generateMarkdownReport(results, timestamp);
  const mdPath = join(CHAMPIONSHIP_RESULTS_DIR, `championship-report-${timestamp}.md`);
  writeFileSync(mdPath, markdownReport);
  console.log(`📄 Markdown report saved to: ${mdPath}`);
}

// Generate markdown report
function generateMarkdownReport(results: ModelTestResult[], timestamp: string): string {
  const availableResults = results.filter(r => r.isAvailable);
  const unavailableResults = results.filter(r => !r.isAvailable);
  const topResults = availableResults.slice(0, 10);
  
  let markdown = `# OpenRouter Free Models Championship Report

**Generated:** ${new Date(timestamp).toLocaleString()}  
**Total Models Tested:** ${results.length}  
**Available Models:** ${availableResults.length}  
**Unavailable Models:** ${unavailableResults.length}  

## 🏆 Top 10 Champions

| Rank | Model | Total Score | Success Rate | Word Success | Quality Score | Avg Response Time | JSON Errors |
|------|-------|-------------|--------------|--------------|---------------|------------------|-------------|
`;

  topResults.forEach((result, index) => {
    markdown += `| ${index + 1} | \`${result.modelName}\` | **${result.totalScore}** | ${result.successRate.toFixed(1)}% | ${result.wordSuccessRate.toFixed(1)}% | ${result.qualityScore.toFixed(1)}% | ${result.averageResponseTime.toFixed(0)}ms | ${result.jsonParseErrors} |\n`;
  });

  markdown += `\n## 📊 Scoring Methodology

The **Total Score** is calculated using weighted metrics:
- **Success Rate** (30%) - Percentage of successfully processed chunks
- **Word Success Rate** (25%) - Percentage of successfully processed words  
- **Quality Score** (25%) - Average quality of word enrichment (transcription + translation + conjugations + examples)
- **Response Time** (10%) - Processing speed (lower is better)
- **JSON Stability** (10%) - Reliability of JSON parsing (fewer errors is better)

## 🥇 Champion Analysis

### ${topResults[0]?.modelName || 'No available models'}
- **Total Score:** ${topResults[0]?.totalScore || 0}
- **Success Rate:** ${topResults[0]?.successRate.toFixed(1) || 0}%
- **Quality Score:** ${topResults[0]?.qualityScore.toFixed(1) || 0}%
- **Average Response Time:** ${topResults[0]?.averageResponseTime.toFixed(0) || 0}ms

${topResults[0] ? (topResults[0].errors.length > 0 ? `**Errors encountered:**\n${topResults[0].errors.map(e => `- ${e}`).join('\n')}` : '**No errors encountered** ✅') : ''}

## 💡 Recommendations

`;

  if (topResults.length > 0) {
    markdown += `### For Production Use:
1. **${topResults[0].modelName}** - Overall champion with ${topResults[0].totalScore} total score
2. **${topResults[1]?.modelName || 'N/A'}** - Strong alternative with ${topResults[1]?.totalScore || 0} total score
3. **${topResults[2]?.modelName || 'N/A'}** - Reliable backup option with ${topResults[2]?.totalScore || 0} total score

### Performance Insights:
- **Fastest Model:** ${availableResults.sort((a, b) => a.averageResponseTime - b.averageResponseTime)[0]?.modelName || 'N/A'} (${availableResults.sort((a, b) => a.averageResponseTime - b.averageResponseTime)[0]?.averageResponseTime.toFixed(0) || 0}ms)
- **Most Reliable:** ${availableResults.sort((a, b) => a.jsonParseErrors - b.jsonParseErrors)[0]?.modelName || 'N/A'} (${availableResults.sort((a, b) => a.jsonParseErrors - b.jsonParseErrors)[0]?.jsonParseErrors || 0} JSON errors)
- **Highest Quality:** ${availableResults.sort((a, b) => b.qualityScore - a.qualityScore)[0]?.modelName || 'N/A'} (${availableResults.sort((a, b) => b.qualityScore - a.qualityScore)[0]?.qualityScore.toFixed(1) || 0}% quality)
`;
  } else {
    markdown += `### No models available for testing
All tested models were unavailable or failed during testing.
`;
  }

  if (unavailableResults.length > 0) {
    markdown += `\n## ❌ Unavailable Models (${unavailableResults.length})

The following models were not available during testing:
${unavailableResults.map(r => `- \`${r.modelName}\``).join('\n')}
`;
  }

  markdown += `\n## 📈 Full Results

| Model | Score | Success | Words | Quality | Time | JSON Errors | Available |
|-------|-------|---------|-------|---------|------|-------------|-----------|
`;

  results.forEach(result => {
    const available = result.isAvailable ? '✅' : '❌';
    markdown += `| \`${result.modelName}\` | ${result.totalScore} | ${result.successRate.toFixed(1)}% | ${result.wordSuccessRate.toFixed(1)}% | ${result.qualityScore.toFixed(1)}% | ${result.averageResponseTime.toFixed(0)}ms | ${result.jsonParseErrors} | ${available} |\n`;
  });

  markdown += `\n---
*Generated by OpenRouter Free Models Championship Test*  
*Test Duration: ~${Math.round((results.reduce((sum, r) => sum + r.testDuration, 0)) / 60000)} minutes*
`;

  return markdown;
}

// Main championship function
async function runModelChampionship(): Promise<void> {
  console.log('🏆 OPENROUTER FREE MODELS CHAMPIONSHIP');
  console.log('=' .repeat(80));
  console.log(`📊 Testing ${FREE_MODELS.length} free models`);
  console.log(`📝 Using ${TEST_HEBREW_WORDS.length} Hebrew test words`);
  console.log(`📦 Chunk size: ${CHUNK_SIZE} words per chunk`);
  console.log(`⏰ Delay between models: ${DEFAULT_DELAY_BETWEEN_MODELS}ms`);
  console.log('=' .repeat(80));
  
  const apiKey = process.env.OPENROUTER_API_KEY || DEFAULT_OPENROUTER_API_KEY;
  const results: ModelTestResult[] = [];
  const startTime = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  
  console.log(`🔑 Using API Key: ${apiKey.substring(0, 12)}...`);
  console.log();
  
  // Test each model
  for (let i = 0; i < FREE_MODELS.length; i++) {
    const modelName = FREE_MODELS[i];
    
    displayProgress(i, FREE_MODELS.length, modelName);
    
    try {
      const result = await testSingleModel(modelName, apiKey);
      results.push(result);
      
      // Log intermediate ranking
      const currentRanking = results
        .filter(r => r.isAvailable)
        .sort((a, b) => b.totalScore - a.totalScore);
      
      if (currentRanking.length > 0) {
        console.log(`  🏆 Current leader: ${currentRanking[0].modelName} (Score: ${currentRanking[0].totalScore})`);
      }
      
    } catch (error) {
      console.log(`\n❌ Fatal error testing ${modelName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      results.push({
        modelName,
        successRate: 0,
        wordSuccessRate: 0,
        averageResponseTime: 0,
        jsonParseErrors: 0,
        qualityScore: 0,
        totalScore: 0,
        errors: [`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        rawResults: {
          totalChunks: 0,
          successfulChunks: 0,
          failedChunks: 0,
          totalWords: 0,
          successfulWords: 0,
          failedWords: 0,
          totalProcessingTime: 0,
          averageChunkTime: 0,
          jsonParseErrors: 0,
          networkErrors: 0,
          apiErrors: 1,
          validationErrors: 0
        },
        testDuration: 0,
        isAvailable: false
      });
    }
    
    // Delay between models (except for the last one)
    if (i < FREE_MODELS.length - 1) {
      console.log(`\n  ⏸️ Waiting ${DEFAULT_DELAY_BETWEEN_MODELS}ms before next model...`);
      await delay(DEFAULT_DELAY_BETWEEN_MODELS);
    }
  }
  
  displayProgress(FREE_MODELS.length, FREE_MODELS.length, 'Championship Complete!');
  
  const totalTime = Date.now() - startTime;
  
  // Sort results by total score
  results.sort((a, b) => b.totalScore - a.totalScore);
  
  // Print championship results
  console.log('\n' + '=' .repeat(80));
  console.log('🏆 CHAMPIONSHIP RESULTS');
  console.log('=' .repeat(80));
  
  const availableResults = results.filter(r => r.isAvailable);
  const unavailableResults = results.filter(r => !r.isAvailable);
  
  console.log(`📊 Championship Statistics:`);
  console.log(`   Total models tested: ${results.length}`);
  console.log(`   Available models: ${availableResults.length}`);
  console.log(`   Unavailable models: ${unavailableResults.length}`);
  console.log(`   Total test duration: ${Math.round(totalTime / 60000)} minutes`);
  console.log();
  
  if (availableResults.length > 0) {
    console.log(`🥇 TOP 10 CHAMPIONS:`);
    console.log('=' .repeat(80));
    
    const topTen = availableResults.slice(0, 10);
    topTen.forEach((result, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      console.log(`${medal} ${result.modelName}`);
      console.log(`    💯 Total Score: ${result.totalScore}`);
      console.log(`    ✅ Success Rate: ${result.successRate.toFixed(1)}%`);
      console.log(`    📝 Word Success: ${result.wordSuccessRate.toFixed(1)}%`);
      console.log(`    🌟 Quality Score: ${result.qualityScore.toFixed(1)}%`);
      console.log(`    ⚡ Avg Response: ${result.averageResponseTime.toFixed(0)}ms`);
      console.log(`    🔧 JSON Errors: ${result.jsonParseErrors}`);
      console.log();
    });
    
    console.log(`🏆 CHAMPION: ${availableResults[0].modelName}`);
    console.log(`   With a total score of ${availableResults[0].totalScore}, this model`);
    console.log(`   achieved ${availableResults[0].successRate.toFixed(1)}% success rate and`);
    console.log(`   ${availableResults[0].qualityScore.toFixed(1)}% quality score!`);
  } else {
    console.log(`❌ No models were available for testing.`);
  }
  
  // Save results
  console.log('\n' + '=' .repeat(80));
  console.log('💾 SAVING RESULTS');
  console.log('=' .repeat(80));
  
  try {
    saveResults(results, timestamp);
    console.log(`✅ Results saved successfully!`);
  } catch (error) {
    console.error(`❌ Failed to save results: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('🏁 CHAMPIONSHIP COMPLETE!');
  console.log('=' .repeat(80));
  
  // Exit with appropriate code
  const hasAvailableModels = availableResults.length > 0;
  process.exit(hasAvailableModels ? 0 : 1);
}

// CLI argument parsing
function parseCliArguments() {
  const args = process.argv.slice(2);
  const help = args.includes('--help') || args.includes('-h');
  
  if (help) {
    console.log(`
🏆 OpenRouter Free Models Championship Test

Tests all ${FREE_MODELS.length} free models from OpenRouter and creates a ranking based on:
- Success Rate (30%)
- Word Success Rate (25%) 
- Quality Score (25%)
- Response Time (10%)
- JSON Stability (10%)

Usage: bun run test:model-championship
   or: npx tsx scripts/test-api-chunks-best-model.ts [options]

Options:
  --help, -h              Show this help message
  
Environment Variables:
  OPENROUTER_API_KEY      OpenRouter API key (default: from config)

Results:
  championship-results/   Directory with detailed JSON and markdown reports
  
Test Configuration:
  - Chunk size: ${CHUNK_SIZE} words
  - Test words: ${TEST_HEBREW_WORDS.length} Hebrew words
  - Delay between models: ${DEFAULT_DELAY_BETWEEN_MODELS}ms
  - Delay between chunks: ${DEFAULT_DELAY_BETWEEN_CHUNKS}ms
    `);
    process.exit(0);
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  parseCliArguments();
  runModelChampionship().catch((error) => {
    console.error('❌ Fatal error during championship:', error);
    process.exit(1);
  });
}