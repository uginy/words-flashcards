#!/usr/bin/env node

import { writeFile } from 'fs/promises';
import { DEFAULT_OPENROUTER_API_KEY } from '../src/config/openrouter.ts';

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  architecture?: {
    modality: string;
    tokenizer: string;
    instruct_type?: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
  };
  per_request_limits?: {
    prompt_tokens?: string;
    completion_tokens?: string;
  };
}

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

// Фильтры для отбора подходящих моделей
const MODEL_FILTERS = {
  // Минимальная длина контекста для обработки Hebrew words с примерами
  MIN_CONTEXT_LENGTH: 4000,
  
  // Исключаем модели, которые явно не подходят
  EXCLUDE_PATTERNS: [
    /vision|image|multimodal/i,      // Визуальные модели
    /code|programming/i,             // Специализированные для кода
    /^.*:beta$/i,                    // Бета-версии
    /uncensored|nsfw/i,              // Нецензурированные
    /roleplay|rp/i,                  // Ролевые модели
    /instruct.*base/i,               // Базовые модели без fine-tuning
  ],
  
  // Предпочитаем модели с определенными паттернами
  PREFER_PATTERNS: [
    /instruct|chat|it$/i,            // Инструктированные модели
    /gemma|llama|qwen|phi/i,         // Проверенные архитектуры
  ],
  
  // Минимальные токены для ответа
  MIN_COMPLETION_TOKENS: 1000,
};

async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  const apiKey = process.env.OPENROUTER_API_KEY || DEFAULT_OPENROUTER_API_KEY;
  
  console.log('🔍 Fetching models from OpenRouter API...');
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid API response format');
    }
    
    console.log(`📦 Retrieved ${data.data.length} models from OpenRouter`);
    return data.data;
    
  } catch (error) {
    console.error('❌ Failed to fetch models:', error);
    throw error;
  }
}

function filterFreeModels(models: OpenRouterModel[]): FilteredModel[] {
  console.log('🔬 Filtering models for Hebrew word processing task...');
  
  const filtered: FilteredModel[] = [];
  let freeModelsCount = 0;
  let excludedByPatterns = 0;
  let excludedByContext = 0;
  let excludedByCompletion = 0;
  
  for (const model of models) {
    // Проверяем, что модель бесплатная
    const isFree = model.pricing.prompt === "0" && model.pricing.completion === "0";
    
    if (isFree) {
      freeModelsCount++;
      console.log(`  📋 Free model found: ${model.id} (context: ${model.context_length})`);
    }
    
    if (!isFree) {
      continue; // Пропускаем платные модели
    }
    
    // Базовые проверки
    const supportsText = !model.architecture?.modality || 
                        model.architecture.modality === 'text' || 
                        model.architecture.modality.includes('text');
    const isInstruct = model.architecture?.instruct_type !== null && model.architecture?.instruct_type !== undefined;
    const hasGoodContext = model.context_length >= MODEL_FILTERS.MIN_CONTEXT_LENGTH;
    
    if (!hasGoodContext) {
      excludedByContext++;
      console.log(`    ❌ Excluded ${model.id}: context too small (${model.context_length} < ${MODEL_FILTERS.MIN_CONTEXT_LENGTH})`);
      continue;
    }
    
    // Проверяем исключающие паттерны
    const shouldExclude = MODEL_FILTERS.EXCLUDE_PATTERNS.some(pattern => 
      pattern.test(model.id) || pattern.test(model.name) || 
      (model.description && pattern.test(model.description))
    );
    
    if (shouldExclude) {
      excludedByPatterns++;
      console.log(`    ❌ Excluded ${model.id}: matches exclude pattern`);
      continue; // Пропускаем модели по исключающим фильтрам
    }
    
    // Проверяем максимальные токены ответа
    const maxCompletionTokens = model.top_provider?.max_completion_tokens;
    const hasGoodCompletion = !maxCompletionTokens || maxCompletionTokens >= MODEL_FILTERS.MIN_COMPLETION_TOKENS;
    
    if (!hasGoodCompletion) {
      excludedByCompletion++;
      console.log(`    ❌ Excluded ${model.id}: completion tokens too small (${maxCompletionTokens} < ${MODEL_FILTERS.MIN_COMPLETION_TOKENS})`);
      continue;
    }
    
    // Определяем причину включения
    let reasonIncluded = '';
    const reasons: string[] = [];
    
    if (hasGoodContext) reasons.push('good-context');
    if (supportsText) reasons.push('text-support');
    if (isInstruct) reasons.push('instruct-type');
    if (hasGoodCompletion) reasons.push('good-completion');
    
    // Проверяем предпочтительные паттерны
    const isPreferred = MODEL_FILTERS.PREFER_PATTERNS.some(pattern => 
      pattern.test(model.id) || pattern.test(model.name)
    );
    if (isPreferred) reasons.push('preferred-arch');
    
    reasonIncluded = reasons.join(', ');
    
    // Включаем модель если она проходит базовые проверки
    if (supportsText && hasGoodContext && hasGoodCompletion) {
      console.log(`    ✅ Included ${model.id}: ${reasonIncluded}`);
      filtered.push({
        id: model.id,
        name: model.name,
        description: model.description,
        contextLength: model.context_length,
        isFree: true,
        supportsText,
        isInstruct,
        maxCompletionTokens,
        reasonIncluded,
      });
    } else {
      console.log(`    ⚠️ Not included ${model.id}:`);
      console.log(`       supportsText=${supportsText} (modality: ${model.architecture?.modality || 'undefined'})`);
      console.log(`       hasGoodContext=${hasGoodContext} (${model.context_length} >= ${MODEL_FILTERS.MIN_CONTEXT_LENGTH})`);
      console.log(`       hasGoodCompletion=${hasGoodCompletion} (max tokens: ${maxCompletionTokens || 'unlimited'})`);
    }
  }
  
  console.log(`📊 Filtering results:`);
  console.log(`  Total models: ${models.length}`);
  console.log(`  Free models: ${freeModelsCount}`);
  console.log(`  Excluded by context: ${excludedByContext}`);
  console.log(`  Excluded by patterns: ${excludedByPatterns}`);
  console.log(`  Excluded by completion tokens: ${excludedByCompletion}`);
  console.log(`  Final suitable models: ${filtered.length}`);
  
  return filtered;
}

function sortModelsByPriority(models: FilteredModel[]): FilteredModel[] {
  return models.sort((a, b) => {
    // Приоритет 1: Предпочтительные архитектуры
    const aIsPreferred = MODEL_FILTERS.PREFER_PATTERNS.some(pattern => 
      pattern.test(a.id) || pattern.test(a.name)
    );
    const bIsPreferred = MODEL_FILTERS.PREFER_PATTERNS.some(pattern => 
      pattern.test(b.id) || pattern.test(b.name)
    );
    
    if (aIsPreferred && !bIsPreferred) return -1;
    if (!aIsPreferred && bIsPreferred) return 1;
    
    // Приоритет 2: Instruct модели
    if (a.isInstruct && !b.isInstruct) return -1;
    if (!a.isInstruct && b.isInstruct) return 1;
    
    // Приоритет 3: Больше контекста
    if (a.contextLength !== b.contextLength) {
      return b.contextLength - a.contextLength;
    }
    
    // Приоритет 4: Больше токенов для ответа
    const aCompletion = a.maxCompletionTokens || 0;
    const bCompletion = b.maxCompletionTokens || 0;
    if (aCompletion !== bCompletion) {
      return bCompletion - aCompletion;
    }
    
    // Приоритет 5: Алфавитный порядок по ID
    return a.id.localeCompare(b.id);
  });
}

async function saveModelsToFile(models: FilteredModel[]): Promise<void> {
  const timestamp = new Date().toISOString();
  const filename = `/Users/eugene/projects/M/words-flashcards/scripts/free-models-list.json`;
  
  const output = {
    timestamp,
    totalModels: models.length,
    filters: MODEL_FILTERS,
    models: models,
  };
  
  const content = JSON.stringify(output, null, 2);
  
  // Сохраняем файл
  await writeFile(filename, content, 'utf-8');
  
  console.log(`💾 Saved ${models.length} models to: ${filename}`);
}

function printModelsSummary(models: FilteredModel[]): void {
  console.log('\n📊 MODELS SUMMARY');
  console.log('=' .repeat(80));
  
  // Группировка по архитектурам
  const architectures = new Map<string, number>();
  const instructCount = models.filter(m => m.isInstruct).length;
  
  models.forEach(model => {
    // Извлекаем архитектуру из ID
    const arch = model.id.split('/')[0] || 'unknown';
    architectures.set(arch, (architectures.get(arch) || 0) + 1);
  });
  
  console.log(`Total suitable free models: ${models.length}`);
  console.log(`Instruct models: ${instructCount} (${Math.round(instructCount/models.length*100)}%)`);
  console.log('\nBy architecture:');
  
  Array.from(architectures.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([arch, count]) => {
      console.log(`  ${arch}: ${count} models`);
    });
  
  console.log('\nTop 10 recommended models:');
  models.slice(0, 10).forEach((model, idx) => {
    const tokens = model.maxCompletionTokens ? `${model.maxCompletionTokens}t` : 'unlimited';
    console.log(`  ${idx + 1}. ${model.id}`);
    console.log(`     Context: ${model.contextLength}, Completion: ${tokens}`);
    console.log(`     Reason: ${model.reasonIncluded}`);
  });
  
  console.log('\n💡 Next step: Run benchmark test with these models');
  console.log('   bun run test:free-models-benchmark');
}

async function main(): Promise<void> {
  console.log('🚀 OpenRouter Free Models Discovery');
  console.log('=' .repeat(80));
  
  try {
    // 1. Получаем все модели
    const allModels = await fetchOpenRouterModels();
    
    // 2. Фильтруем бесплатные и подходящие
    const freeModels = filterFreeModels(allModels);
    
    // 3. Сортируем по приоритету
    const sortedModels = sortModelsByPriority(freeModels);
    
    // 4. Сохраняем в файл
    await saveModelsToFile(sortedModels);
    
    // 5. Выводим сводку
    printModelsSummary(sortedModels);
    
    console.log('\n✅ Models discovery completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// CLI help
function showHelp() {
  console.log(`
🔍 OpenRouter Free Models Discovery

Usage: npx tsx scripts/fetch-free-models.ts [options]

This script:
1. Fetches all available models from OpenRouter API
2. Filters for free models suitable for Hebrew word processing
3. Saves the filtered list to scripts/free-models-list.json
4. Provides recommendations based on model capabilities

Options:
  --help, -h              Show this help message

Environment Variables:
  OPENROUTER_API_KEY      OpenRouter API key (default: from config)

Filter Criteria:
  - Only free models (pricing: 0/0)
  - Minimum context length: ${MODEL_FILTERS.MIN_CONTEXT_LENGTH}
  - Text-based models only (no vision/multimodal)
  - Excludes beta, uncensored, roleplay models
  - Prefers instruct/chat models
  - Minimum completion tokens: ${MODEL_FILTERS.MIN_COMPLETION_TOKENS}

Output:
  scripts/free-models-list.json    Filtered models list for benchmarking
  
Next Step:
  bun run test:free-models-benchmark    Run performance tests
  `);
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }
  
  main().catch((error) => {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  });
}
