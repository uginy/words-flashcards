#!/usr/bin/env node

import { enrichWordsWithLLM } from '../src/services/openrouter.js';
import { DEFAULT_OPENROUTER_API_KEY } from '../src/config/openrouter.js';
import type { Word } from '../src/types/index.js';
import * as fs from 'fs';

// Test configuration
const TIMEOUT_MS = 30000; // 30 seconds timeout
const DELAY_BETWEEN_MODELS = 5000; // 5 seconds delay between models
const TEST_WORDS = ['לאכול', 'ספר', 'גדול']; // Reduced to 3 words for faster testing

// List of models to test (focus on successful ones for demonstration)
const MODELS_TO_TEST = [
  'meta-llama/llama-4-maverick:free', // Full support
  'meta-llama/llama-4-scout:free',
  'meta-llama/llama-3.3-8b-instruct:free',
  'meta-llama/llama-3.3-70b-instruct:free',
];

// Result interface
interface ToolsSupportResult {
  modelName: string;
  toolsSupport: 'full' | 'none' | 'partial' | 'error';
  forcedToolChoiceSuccess: boolean;
  adaptiveToolChoiceSuccess: boolean;
  directJsonSuccess: boolean;
  forcedToolChoiceError?: string;
  adaptiveToolChoiceError?: string;
  directJsonError?: string;
  forcedToolChoiceResponseTime: number;
  adaptiveToolChoiceResponseTime: number;
  directJsonResponseTime: number;
  recommendedMode: 'forced' | 'adaptive' | 'direct';
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Mock toast function for testing
const mockToast = () => {
  // Silent mock for testing
};

// Progress bar utility
function updateProgressBar(current: number, total: number, modelName: string, phase: string) {
  const percentage = Math.round((current / total) * 100);
  const progressWidth = 20;
  const filled = Math.round((current / total) * progressWidth);
  const empty = progressWidth - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const status = `${colors.cyan}[${bar}]${colors.reset} ${percentage}% | ${colors.bright}${modelName}${colors.reset} - ${phase}`;

  process.stdout.write(`\r${status}`);
}

// Utility function to create delay
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Test a single model in both modes
async function testModel(modelName: string, modelIndex: number, totalModels: number): Promise<ToolsSupportResult> {
  console.log(`\n${colors.bright}${colors.blue}Testing model: ${modelName}${colors.reset}`);

  let forcedToolChoiceSuccess = false;
  let adaptiveToolChoiceSuccess = false;
  let directJsonSuccess = false;
  let forcedToolChoiceError: string | undefined;
  let adaptiveToolChoiceError: string | undefined;
  let directJsonError: string | undefined;
  let forcedToolChoiceResponseTime = 0;
  let adaptiveToolChoiceResponseTime = 0;
  let directJsonResponseTime = 0;

  // Test with tools enabled (with tool_choice forced)
  updateProgressBar(modelIndex * 3, totalModels * 3, modelName, 'Tools Mode (with tool_choice)');
  const toolsStartTime = Date.now();
  try {

    const toolsResult = await Promise.race([
      enrichWordsWithLLM(
        TEST_WORDS,
        DEFAULT_OPENROUTER_API_KEY,
        modelName,
        mockToast,
        true, // Force tools mode
        undefined, // abortController
        {
          forceToolChoice: true, // Force tool_choice usage
          preferSimpleToolSchema: true, // Use simplified schema
          enableDetailedLogging: true
        }
      ),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS)
      )
    ]) as Word[];

    forcedToolChoiceResponseTime = Date.now() - toolsStartTime;

    if (toolsResult && Array.isArray(toolsResult) && toolsResult.length > 0) {
      forcedToolChoiceSuccess = true;
      console.log(`${colors.green}  ✅ Forced tool_choice: SUCCESS (${forcedToolChoiceResponseTime}ms)${colors.reset}`);
    } else {
      forcedToolChoiceError = 'Empty or invalid response';
      console.log(`${colors.red}  ❌ Forced tool_choice: FAILED - Empty response${colors.reset}`);
    }
  } catch (error) {
    forcedToolChoiceResponseTime = Date.now() - toolsStartTime;
    forcedToolChoiceError = error instanceof Error ? error.message : String(error);
    console.log(`${colors.red}  ❌ Forced tool_choice: FAILED - ${forcedToolChoiceError}${colors.reset}`);
  }

  // Small delay between modes
  await delay(1000);

  // Test with tools enabled but without forced tool_choice (adaptive mode)
  updateProgressBar(modelIndex * 3 + 1, totalModels * 3, modelName, 'Tools Mode (adaptive)');
  const directStartTime = Date.now();
  try {

    const directResult = await Promise.race([
      enrichWordsWithLLM(
        TEST_WORDS,
        DEFAULT_OPENROUTER_API_KEY,
        modelName,
        mockToast,
        true, // Use tools mode
        undefined, // abortController
        {
          forceToolChoice: false, // Don't force tool_choice - let model decide
          preferSimpleToolSchema: true, // Use simplified schema
          enableDetailedLogging: true
        }
      ),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS)
      )
    ]) as Word[];

    adaptiveToolChoiceResponseTime = Date.now() - directStartTime;

    if (directResult && Array.isArray(directResult) && directResult.length > 0) {
      adaptiveToolChoiceSuccess = true;
      console.log(`${colors.green}  ✅ Adaptive tool_choice: SUCCESS (${adaptiveToolChoiceResponseTime}ms)${colors.reset}`);
    } else {
      adaptiveToolChoiceError = 'Empty or invalid response';
      console.log(`${colors.red}  ❌ Adaptive tool_choice: FAILED - Empty response${colors.reset}`);
    }
  } catch (error) {
    adaptiveToolChoiceResponseTime = Date.now() - directStartTime;
    adaptiveToolChoiceError = error instanceof Error ? error.message : String(error);
    console.log(`${colors.red}  ❌ Adaptive tool_choice: FAILED - ${adaptiveToolChoiceError}${colors.reset}`);
  }

  // Small delay between modes
  await delay(1000);

  // Test with direct JSON mode (no tools)
  updateProgressBar(modelIndex * 3 + 2, totalModels * 3, modelName, 'Direct JSON Mode');
  const directJsonStartTime = Date.now();
  try {

    const directJsonResult = await Promise.race([
      enrichWordsWithLLM(
        TEST_WORDS,
        DEFAULT_OPENROUTER_API_KEY,
        modelName,
        mockToast,
        false, // Disable tools mode - use direct JSON
        undefined, // abortController
        {
          enableDetailedLogging: true
        }
      ),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS)
      )
    ]) as Word[];

    directJsonResponseTime = Date.now() - directJsonStartTime;

    if (directJsonResult && Array.isArray(directJsonResult) && directJsonResult.length > 0) {
      directJsonSuccess = true;
      console.log(`${colors.green}  ✅ Direct JSON: SUCCESS (${directJsonResponseTime}ms)${colors.reset}`);
    } else {
      directJsonError = 'Empty or invalid response';
      console.log(`${colors.red}  ❌ Direct JSON: FAILED - Empty response${colors.reset}`);
    }
  } catch (error) {
    directJsonResponseTime = Date.now() - directJsonStartTime;
    directJsonError = error instanceof Error ? error.message : String(error);
    console.log(`${colors.red}  ❌ Direct JSON: FAILED - ${directJsonError}${colors.reset}`);
  }

  // Determine support level and recommended mode
  let toolsSupport: 'full' | 'none' | 'partial' | 'error';
  let recommendedMode: 'forced' | 'adaptive' | 'direct';

  if (forcedToolChoiceSuccess && adaptiveToolChoiceSuccess) {
    toolsSupport = 'full';
    recommendedMode = 'adaptive'; // Prefer adaptive when both work (more compatible)
  } else if (!forcedToolChoiceSuccess && adaptiveToolChoiceSuccess) {
    toolsSupport = 'partial';
    recommendedMode = 'adaptive';
  } else if (forcedToolChoiceSuccess && !adaptiveToolChoiceSuccess) {
    toolsSupport = 'partial'; // Works only with forced tool_choice
    recommendedMode = 'forced';
  } else if (directJsonSuccess) {
    toolsSupport = 'partial'; // Works only with direct JSON
    recommendedMode = 'direct';
  } else {
    toolsSupport = 'error';
    recommendedMode = 'direct'; // Default fallback
  }

  if (!forcedToolChoiceSuccess && !adaptiveToolChoiceSuccess && !directJsonSuccess) {
    toolsSupport = 'none';
  }

  return {
    modelName,
    toolsSupport,
    forcedToolChoiceSuccess,
    adaptiveToolChoiceSuccess,
    directJsonSuccess,
    forcedToolChoiceError,
    adaptiveToolChoiceError,
    directJsonError,
    forcedToolChoiceResponseTime,
    adaptiveToolChoiceResponseTime,
    directJsonResponseTime,
    recommendedMode,
  };
}

// Generate console report with colored output
function generateConsoleReport(results: ToolsSupportResult[]) {
  console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}                              TOOLS SUPPORT TEST RESULTS                            ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════════════════════════════${colors.reset}\n`);

  results.forEach((result, index) => {
    let supportIcon = '';
    let supportColor = '';
    let supportText = '';

    switch (result.toolsSupport) {
      case 'full':
        supportIcon = '🟢';
        supportColor = colors.green;
        supportText = 'Full Support';
        break;
      case 'partial':
        supportIcon = '🟡';
        supportColor = colors.yellow;
        supportText = 'Partial Support';
        break;
      case 'none':
        supportIcon = '🔴';
        supportColor = colors.red;
        supportText = 'No Support';
        break;
      case 'error':
        supportIcon = '⚫';
        supportColor = colors.gray;
        supportText = 'Error';
        break;
    }

    console.log(`${colors.bright}${index + 1}. ${result.modelName}${colors.reset}`);
    console.log(`   ${supportIcon} ${supportColor}${supportText}${colors.reset} | Recommended: ${colors.cyan}${result.recommendedMode}${colors.reset}`);
    console.log(`   Forced: ${result.forcedToolChoiceSuccess ? colors.green + '✅' : colors.red + '❌'} ${result.forcedToolChoiceResponseTime}ms${colors.reset} | Adaptive: ${result.adaptiveToolChoiceSuccess ? colors.green + '✅' : colors.red + '❌'} ${result.adaptiveToolChoiceResponseTime}ms${colors.reset} | Direct: ${result.directJsonSuccess ? colors.green + '✅' : colors.red + '❌'} ${result.directJsonResponseTime}ms${colors.reset}`);

    if (result.forcedToolChoiceError) {
      console.log(`   ${colors.red}Forced Error: ${result.forcedToolChoiceError}${colors.reset}`);
    }
    if (result.adaptiveToolChoiceError) {
      console.log(`   ${colors.red}Adaptive Error: ${result.adaptiveToolChoiceError}${colors.reset}`);
    }
    if (result.directJsonError) {
      console.log(`   ${colors.red}Direct Error: ${result.directJsonError}${colors.reset}`);
    }
    console.log('');
  });

  // Summary statistics
  const fullSupport = results.filter(r => r.toolsSupport === 'full').length;
  const partialSupport = results.filter(r => r.toolsSupport === 'partial').length;
  const noSupport = results.filter(r => r.toolsSupport === 'none').length;
  const errors = results.filter(r => r.toolsSupport === 'error').length;

  console.log(`${colors.bright}${colors.cyan}SUMMARY:${colors.reset}`);
  console.log(`🟢 Full Support (Tools + Direct): ${colors.green}${fullSupport}${colors.reset}`);
  console.log(`🟡 Partial Support (Direct only): ${colors.yellow}${partialSupport}${colors.reset}`);
  console.log(`🔴 No Support: ${colors.red}${noSupport}${colors.reset}`);
  console.log(`⚫ Errors: ${colors.gray}${errors}${colors.reset}`);
  console.log(`\nTotal models tested: ${colors.bright}${results.length}${colors.reset}`);
}

// Generate markdown report
function generateMarkdownReport(results: ToolsSupportResult[]): string {
  const timestamp = new Date().toISOString();

  let markdown = `# OpenRouter Models Tools Support Report\n\n`;
  markdown += `**Generated:** ${timestamp}\n`;
  markdown += `**Test Words:** ${TEST_WORDS.join(', ')}\n`;
  markdown += `**Timeout:** ${TIMEOUT_MS}ms\n\n`;

  markdown += `## Summary\n\n`;
  const fullSupport = results.filter(r => r.toolsSupport === 'full').length;
  const partialSupport = results.filter(r => r.toolsSupport === 'partial').length;
  const noSupport = results.filter(r => r.toolsSupport === 'none').length;
  const errors = results.filter(r => r.toolsSupport === 'error').length;

  markdown += `- 🟢 **Full Support (Tools + Direct):** ${fullSupport}\n`;
  markdown += `- 🟡 **Partial Support (Direct only):** ${partialSupport}\n`;
  markdown += `- 🔴 **No Support:** ${noSupport}\n`;
  markdown += `- ⚫ **Errors:** ${errors}\n\n`;

  markdown += `## Detailed Results\n\n`;
  markdown += `| Model | Support | Forced tool_choice | Adaptive tool_choice | Direct JSON | Recommended | Errors |\n`;
  markdown += `|-------|---------|-------------------|---------------------|-------------|-------------|--------|\n`;

  results.forEach(result => {
    const supportIcon = {
      'full': '🟢',
      'partial': '🟡',
      'none': '🔴',
      'error': '⚫'
    }[result.toolsSupport];

    const forcedStatus = result.forcedToolChoiceSuccess ? `✅ ${result.forcedToolChoiceResponseTime}ms` : `❌ ${result.forcedToolChoiceResponseTime}ms`;
    const adaptiveStatus = result.adaptiveToolChoiceSuccess ? `✅ ${result.adaptiveToolChoiceResponseTime}ms` : `❌ ${result.adaptiveToolChoiceResponseTime}ms`;
    const directStatus = result.directJsonSuccess ? `✅ ${result.directJsonResponseTime}ms` : `❌ ${result.directJsonResponseTime}ms`;
    const errors = [result.forcedToolChoiceError, result.adaptiveToolChoiceError, result.directJsonError].filter(Boolean).join('; ') || '-';

    markdown += `| \`${result.modelName}\` | ${supportIcon} ${result.toolsSupport} | ${forcedStatus} | ${adaptiveStatus} | ${directStatus} | ${result.recommendedMode} | ${errors} |\n`;
  });

  markdown += `\n## Recommendations\n\n`;

  const fullSupportModels = results.filter(r => r.toolsSupport === 'full');
  const partialSupportModels = results.filter(r => r.toolsSupport === 'partial');

  if (fullSupportModels.length > 0) {
    markdown += `### ✅ Recommended for Function Calling:\n`;
    fullSupportModels.forEach(model => {
      markdown += `- \`${model.modelName}\` - Full tools support (recommended: ${model.recommendedMode})\n`;
    });
    markdown += `\n`;
  }

  if (partialSupportModels.length > 0) {
    markdown += `### ⚠️ Partial Support:\n`;
    partialSupportModels.forEach(model => {
      let mode = '';
      if (model.recommendedMode === 'forced') {
        mode = 'forced tool_choice only';
      } else if (model.recommendedMode === 'adaptive') {
        mode = 'adaptive mode only';
      } else if (model.recommendedMode === 'direct') {
        mode = 'direct JSON only';
      }
      markdown += `- \`${model.modelName}\` - ${mode}\n`;
    });
    markdown += `\n`;
  }

  return markdown;
}

// Save results to files
async function saveResults(results: ToolsSupportResult[]) {
  // Save JSON results
  const jsonPath = 'tools-support-results.json';
  await fs.promises.writeFile(jsonPath, JSON.stringify(results, null, 2));
  console.log(`${colors.green}✅ JSON results saved to: ${jsonPath}${colors.reset}`);

  // Save markdown report
  const markdownReport = generateMarkdownReport(results);
  const markdownPath = 'tools-support-report.md';
  await fs.promises.writeFile(markdownPath, markdownReport);
  console.log(`${colors.green}✅ Markdown report saved to: ${markdownPath}${colors.reset}`);
}

// Main testing function
async function runToolsSupportTest() {
  console.log(`${colors.bright}${colors.magenta}🧪 Starting OpenRouter Tools Support Test${colors.reset}`);
  console.log(`${colors.gray}Testing ${MODELS_TO_TEST.length} models with words: ${TEST_WORDS.join(', ')}${colors.reset}\n`);

  const results: ToolsSupportResult[] = [];
  const startTime = Date.now();

  for (let i = 0; i < MODELS_TO_TEST.length; i++) {
    const modelName = MODELS_TO_TEST[i];

    try {
      const result = await testModel(modelName, i, MODELS_TO_TEST.length);
      results.push(result);
    } catch (error) {
      console.log(`${colors.red}❌ Critical error testing ${modelName}: ${error}${colors.reset}`);
      results.push({
        modelName,
        toolsSupport: 'error',
        forcedToolChoiceSuccess: false,
        adaptiveToolChoiceSuccess: false,
        directJsonSuccess: false,
        forcedToolChoiceError: error instanceof Error ? error.message : String(error),
        adaptiveToolChoiceError: error instanceof Error ? error.message : String(error),
        directJsonError: error instanceof Error ? error.message : String(error),
        forcedToolChoiceResponseTime: 0,
        adaptiveToolChoiceResponseTime: 0,
        directJsonResponseTime: 0,
        recommendedMode: 'direct',
      });
    }

    // Delay between models (except for the last one)
    if (i < MODELS_TO_TEST.length - 1) {
      console.log(`${colors.gray}⏳ Waiting ${DELAY_BETWEEN_MODELS}ms before next model...${colors.reset}`);
      await delay(DELAY_BETWEEN_MODELS);
    }
  }

  const totalTime = Date.now() - startTime;
  console.log(`\n${colors.bright}${colors.green}🎉 Testing completed in ${Math.round(totalTime / 1000)}s${colors.reset}`);

  // Generate and display console report
  generateConsoleReport(results);

  // Save results to files
  await saveResults(results);

  console.log(`\n${colors.bright}${colors.cyan}📊 Test Summary:${colors.reset}`);
  console.log(`${colors.gray}• Total models tested: ${results.length}${colors.reset}`);
  console.log(`${colors.gray}• Total test time: ${Math.round(totalTime / 1000)}s${colors.reset}`);
  console.log(`${colors.gray}• Average time per model: ${Math.round(totalTime / results.length / 1000)}s${colors.reset}`);
}

// Error handling and cleanup
process.on('unhandledRejection', (reason, promise) => {
  console.error(`${colors.red}Unhandled Rejection at:${colors.reset}`, promise, `${colors.red}reason:${colors.reset}`, reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(`${colors.red}Uncaught Exception:${colors.reset}`, error);
  process.exit(1);
});

// Graceful shutdown on Ctrl+C
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}⏹️  Test interrupted by user${colors.reset}`);
  process.exit(0);
});

// Run the test
runToolsSupportTest().catch((error) => {
  console.error(`${colors.red}❌ Test failed:${colors.reset}`, error);
  process.exit(1);
});