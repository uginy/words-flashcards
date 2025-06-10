#!/usr/bin/env node

import { createOpenAIClient } from '../src/services/openrouter/api-client.js';
import { DEFAULT_OPENROUTER_API_KEY } from '../src/config/openrouter.js';
import * as fs from 'fs';

// Test configuration
const TIMEOUT_MS = 30000; // 30 seconds timeout
const DELAY_BETWEEN_MODELS = 2000; // 2 seconds delay between models
const TEST_WORDS = ['לאכול', 'ספר', 'גדול']; // Test words

// Models that support structured outputs
const MODELS_TO_TEST = [
  'google/gemma-3-27b-it:free',
  'google/gemma-3-12b-it:free', 
  'google/gemma-3-4b-it:free',
  'meta-llama/llama-4-scout:free',
  'meta-llama/llama-4-maverick:free',
  'meta-llama/llama-3.3-8b-instruct:free'
];

// JSON Schema for structured output
const HEBREW_WORDS_SCHEMA = {
  type: "object",
  properties: {
    processed_words: {
      type: "array",
      description: "An array of objects with Hebrew word details",
      items: {
        type: "object",
        properties: {
          hebrew: { 
            type: "string", 
            description: "The original Hebrew word/phrase" 
          },
          transcription: { 
            type: "string", 
            description: "Romanized transcription of the Hebrew word" 
          },
          russian: { 
            type: "string", 
            description: "Russian translation" 
          },
          category: { 
            type: "string", 
            enum: ["פועל", "שם עצם", "שם תואר", "פרזות", "אחר"],
            description: "Word category: פועל (verb), שם עצם (noun), שם תואר (adjective), פרזות (phrases), אחר (other)" 
          },
          conjugations: {
            type: ["object", "null"],
            description: "Hebrew conjugations for verbs, null for other word types",
            properties: {
              past: {
                type: ["object", "null"],
                additionalProperties: { type: "string" }
              },
              present: {
                type: ["object", "null"], 
                additionalProperties: { type: "string" }
              },
              future: {
                type: ["object", "null"],
                additionalProperties: { type: "string" }
              },
              imperative: {
                type: ["object", "null"],
                additionalProperties: { type: "string" }
              }
            },
            additionalProperties: false
          },
          examples: {
            type: ["array", "null"],
            description: "Array of 2-3 usage examples, null if none",
            items: {
              type: "object",
              properties: {
                hebrew: { type: "string", description: "Example sentence in Hebrew" },
                russian: { type: "string", description: "Russian translation" }
              },
              required: ["hebrew", "russian"],
              additionalProperties: false
            }
          }
        },
        required: ["hebrew", "transcription", "russian", "category"],
        additionalProperties: false
      }
    }
  },
  required: ["processed_words"],
  additionalProperties: false
};

// Result interface
interface StructuredOutputResult {
  modelName: string;
  success: boolean;
  responseTime: number;
  error?: string;
  wordsProcessed: number;
  schemaCompliant: boolean;
  validationIssues?: string[];
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

// Progress bar utility
function updateProgressBar(current: number, total: number, modelName: string) {
  const percentage = Math.round((current / total) * 100);
  const progressWidth = 20;
  const filled = Math.round((current / total) * progressWidth);
  const empty = progressWidth - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const status = `${colors.cyan}[${bar}]${colors.reset} ${percentage}% | ${colors.bright}${modelName}${colors.reset}`;

  process.stdout.write(`\r${status}`);
}

// Utility function to create delay
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Validate response against schema (basic validation)
function validateStructuredResponse(response: any): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!response || typeof response !== 'object') {
    issues.push('Response is not an object');
    return { isValid: false, issues };
  }

  if (!response.processed_words || !Array.isArray(response.processed_words)) {
    issues.push('Missing or invalid processed_words array');
    return { isValid: false, issues };
  }

  response.processed_words.forEach((word: any, index: number) => {
    if (!word.hebrew || typeof word.hebrew !== 'string') {
      issues.push(`Word ${index}: Missing or invalid hebrew field`);
    }
    if (!word.transcription || typeof word.transcription !== 'string') {
      issues.push(`Word ${index}: Missing or invalid transcription field`);
    }
    if (!word.russian || typeof word.russian !== 'string') {
      issues.push(`Word ${index}: Missing or invalid russian field`);
    }
    if (!word.category || typeof word.category !== 'string') {
      issues.push(`Word ${index}: Missing or invalid category field`);
    }
  });

  return { isValid: issues.length === 0, issues };
}

// Test a single model with structured outputs
async function testModel(modelName: string, modelIndex: number, totalModels: number): Promise<StructuredOutputResult> {
  console.log(`\n${colors.bright}${colors.blue}Testing model: ${modelName}${colors.reset}`);
  updateProgressBar(modelIndex, totalModels, modelName);

  const startTime = Date.now();
  let success = false;
  let error: string | undefined;
  let wordsProcessed = 0;
  let schemaCompliant = false;
  let validationIssues: string[] = [];

  const systemPrompt = `You are a Hebrew language expert. Process each Hebrew word/phrase by providing:
1. Original Hebrew text
2. Romanized transcription 
3. Russian translation
4. Category (פועל for verbs, שם עצם for nouns, שם תואר for adjectives, פרזות for phrases, אחר for other)
5. Conjugations (only for verbs - must be in Hebrew with Hebrew pronouns)
6. Usage examples (2-3 examples with Hebrew and Russian)

Ensure all Hebrew text uses proper Hebrew characters and all conjugations are in Hebrew.`;

  const userContent = `Process the following Hebrew words/phrases: ${TEST_WORDS.join(', ')}`;

  try {
    const openai = createOpenAIClient(DEFAULT_OPENROUTER_API_KEY);

    const completion = await Promise.race([
      openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'hebrew_words_processing',
            strict: true,
            schema: HEBREW_WORDS_SCHEMA
          }
        },
        stream: false
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS)
      )
    ]) as any;

    const responseTime = Date.now() - startTime;

    if (!completion.choices || completion.choices.length === 0 || !completion.choices[0].message) {
      throw new Error('Invalid response structure from model');
    }

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response content');
    }

    // Parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch (e) {
      throw new Error(`Failed to parse JSON response: ${e}`);
    }

    // Validate the response
    const validation = validateStructuredResponse(parsedResponse);
    schemaCompliant = validation.isValid;
    validationIssues = validation.issues;

    if (parsedResponse.processed_words && Array.isArray(parsedResponse.processed_words)) {
      wordsProcessed = parsedResponse.processed_words.length;
      success = wordsProcessed > 0;
    }

    console.log(`${colors.green}  ✅ SUCCESS: ${wordsProcessed} words processed (${responseTime}ms)${colors.reset}`);
    if (!schemaCompliant) {
      console.log(`${colors.yellow}  ⚠️  Schema validation issues: ${validationIssues.join(', ')}${colors.reset}`);
    }

    return {
      modelName,
      success,
      responseTime,
      wordsProcessed,
      schemaCompliant,
      validationIssues: schemaCompliant ? undefined : validationIssues
    };

  } catch (err) {
    const responseTime = Date.now() - startTime;
    error = err instanceof Error ? err.message : String(err);
    console.log(`${colors.red}  ❌ FAILED: ${error} (${responseTime}ms)${colors.reset}`);

    return {
      modelName,
      success: false,
      responseTime,
      error,
      wordsProcessed: 0,
      schemaCompliant: false,
      validationIssues: [error]
    };
  }
}

// Generate console report
function generateConsoleReport(results: StructuredOutputResult[]) {
  console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}                           STRUCTURED OUTPUTS TEST RESULTS                          ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════════════════════════════${colors.reset}\n`);

  results.forEach((result, index) => {
    let statusIcon = '';
    let statusColor = '';
    let statusText = '';

    if (result.success && result.schemaCompliant) {
      statusIcon = '🟢';
      statusColor = colors.green;
      statusText = 'Full Success';
    } else if (result.success && !result.schemaCompliant) {
      statusIcon = '🟡';
      statusColor = colors.yellow;
      statusText = 'Partial Success';
    } else {
      statusIcon = '🔴';
      statusColor = colors.red;
      statusText = 'Failed';
    }

    console.log(`${colors.bright}${index + 1}. ${result.modelName}${colors.reset}`);
    console.log(`   ${statusIcon} ${statusColor}${statusText}${colors.reset} | Words: ${result.wordsProcessed}/${TEST_WORDS.length} | Time: ${result.responseTime}ms`);
    
    if (result.error) {
      console.log(`   ${colors.red}Error: ${result.error}${colors.reset}`);
    }
    
    if (result.validationIssues && result.validationIssues.length > 0) {
      console.log(`   ${colors.yellow}Issues: ${result.validationIssues.join(', ')}${colors.reset}`);
    }
    
    console.log('');
  });

  // Summary statistics
  const fullSuccess = results.filter(r => r.success && r.schemaCompliant).length;
  const partialSuccess = results.filter(r => r.success && !r.schemaCompliant).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`${colors.bright}${colors.cyan}SUMMARY:${colors.reset}`);
  console.log(`🟢 Full Success (Schema Compliant): ${colors.green}${fullSuccess}${colors.reset}`);
  console.log(`🟡 Partial Success (Schema Issues): ${colors.yellow}${partialSuccess}${colors.reset}`);
  console.log(`🔴 Failed: ${colors.red}${failed}${colors.reset}`);
  console.log(`\nTotal models tested: ${colors.bright}${results.length}${colors.reset}`);
}

// Generate markdown report
function generateMarkdownReport(results: StructuredOutputResult[]): string {
  const timestamp = new Date().toISOString();

  let markdown = `# OpenRouter Models Structured Outputs Support Report\n\n`;
  markdown += `**Generated:** ${timestamp}\n`;
  markdown += `**Test Words:** ${TEST_WORDS.join(', ')}\n`;
  markdown += `**Timeout:** ${TIMEOUT_MS}ms\n\n`;

  markdown += `## Summary\n\n`;
  const fullSuccess = results.filter(r => r.success && r.schemaCompliant).length;
  const partialSuccess = results.filter(r => r.success && !r.schemaCompliant).length;
  const failed = results.filter(r => !r.success).length;

  markdown += `- 🟢 **Full Success (Schema Compliant):** ${fullSuccess}\n`;
  markdown += `- 🟡 **Partial Success (Schema Issues):** ${partialSuccess}\n`;
  markdown += `- 🔴 **Failed:** ${failed}\n\n`;

  markdown += `## Detailed Results\n\n`;
  markdown += `| Model | Status | Words Processed | Response Time | Schema Compliant | Issues |\n`;
  markdown += `|-------|--------|----------------|---------------|------------------|--------|\n`;

  results.forEach(result => {
    const statusIcon = result.success && result.schemaCompliant ? '🟢' : 
                      result.success && !result.schemaCompliant ? '🟡' : '🔴';
    const status = result.success && result.schemaCompliant ? 'Full Success' :
                  result.success && !result.schemaCompliant ? 'Partial Success' : 'Failed';
    const issues = result.error || (result.validationIssues && result.validationIssues.length > 0 ? 
                   result.validationIssues.join('; ') : '-');

    markdown += `| \`${result.modelName}\` | ${statusIcon} ${status} | ${result.wordsProcessed}/${TEST_WORDS.length} | ${result.responseTime}ms | ${result.schemaCompliant ? '✅' : '❌'} | ${issues} |\n`;
  });

  markdown += `\n## Recommendations\n\n`;

  const successfulModels = results.filter(r => r.success && r.schemaCompliant);
  const partialModels = results.filter(r => r.success && !r.schemaCompliant);

  if (successfulModels.length > 0) {
    markdown += `### ✅ Recommended for Structured Outputs:\n`;
    successfulModels.forEach(model => {
      markdown += `- \`${model.modelName}\` - Full schema compliance, ${model.wordsProcessed}/${TEST_WORDS.length} words processed\n`;
    });
    markdown += `\n`;
  }

  if (partialModels.length > 0) {
    markdown += `### ⚠️ Partial Support:\n`;
    partialModels.forEach(model => {
      markdown += `- \`${model.modelName}\` - Works but has schema compliance issues\n`;
    });
    markdown += `\n`;
  }

  return markdown;
}

// Save results to files
async function saveResults(results: StructuredOutputResult[]) {
  // Save JSON results
  const jsonPath = 'structured-outputs-results.json';
  await fs.promises.writeFile(jsonPath, JSON.stringify(results, null, 2));
  console.log(`${colors.green}✅ JSON results saved to: ${jsonPath}${colors.reset}`);

  // Save markdown report
  const markdownReport = generateMarkdownReport(results);
  const markdownPath = 'structured-outputs-report.md';
  await fs.promises.writeFile(markdownPath, markdownReport);
  console.log(`${colors.green}✅ Markdown report saved to: ${markdownPath}${colors.reset}`);
}

// Main testing function
async function runStructuredOutputsTest() {
  console.log(`${colors.bright}${colors.magenta}🧪 Starting OpenRouter Structured Outputs Test${colors.reset}`);
  console.log(`${colors.gray}Testing ${MODELS_TO_TEST.length} models with words: ${TEST_WORDS.join(', ')}${colors.reset}\n`);

  const results: StructuredOutputResult[] = [];
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
        success: false,
        responseTime: 0,
        error: error instanceof Error ? error.message : String(error),
        wordsProcessed: 0,
        schemaCompliant: false,
        validationIssues: [error instanceof Error ? error.message : String(error)]
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
runStructuredOutputsTest().catch((error) => {
  console.error(`${colors.red}❌ Test failed:${colors.reset}`, error);
  process.exit(1);
});
