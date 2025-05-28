# LLM API Improvements

## Overview

This document describes the improvements made to the LLM enrichment functionality to solve issues with subsequent chunks returning incorrect JSON responses.

## Problems Addressed

1. **JSON Response Issues**: Subsequent chunks were returning malformed JSON like `{` instead of complete responses
2. **Connection Reuse Issues**: Reusing the same OpenAI client instance across multiple requests
3. **No Retry Mechanism**: Single-point failures without recovery attempts
4. **Limited Error Handling**: Poor visibility into failure causes
5. **No Rate Limiting**: Requests fired rapidly without proper delays

## Solutions Implemented

### 1. Fresh OpenAI Client Creation

**Problem**: Reusing the same OpenAI client instance could lead to connection state issues.

**Solution**: Create a new OpenAI client for each API call.

```typescript
// Before: Single client reused
const openai = new OpenAI({ ... });

// After: New client for each request
const createOpenAIClient = () => {
  logger("Creating new OpenAI client instance");
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  });
};
```

### 2. Exponential Backoff Retry Mechanism

**Problem**: Network hiccups or temporary API issues caused immediate failures.

**Solution**: Implemented configurable retry with exponential backoff.

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2
};
```

### 3. Enhanced JSON Validation

**Problem**: Invalid JSON responses like `{` were not caught before parsing.

**Solution**: Pre-validation of JSON strings before parsing.

```typescript
function validateJsonString(jsonString: string): boolean {
  const trimmed = jsonString.trim();
  
  // Check for incomplete objects/arrays
  if (trimmed === '{' || trimmed === '[' || trimmed === '') {
    return false;
  }
  
  // Check for unmatched brackets
  const openBraces = (trimmed.match(/\{/g) || []).length;
  const closeBraces = (trimmed.match(/\}/g) || []).length;
  // ... additional validation
}
```

### 4. Detailed Logging System

**Problem**: Limited visibility into what was happening during processing.

**Solution**: Comprehensive logging with configurable detail levels.

```typescript
interface LLMEnrichmentOptions {
  retryConfig?: Partial<RetryConfig>;
  enableDetailedLogging?: boolean;
  validateJsonResponse?: boolean;
}

const logger = (message: string) => {
  if (enableLogging) {
    console.log(`[LLM Enrichment] ${message}`);
  }
};
```

### 5. Progressive Delays Between Chunks

**Problem**: Rapid-fire requests to the API could lead to rate limiting or degraded responses.

**Solution**: Progressive delays between chunk processing.

```typescript
// Add progressive delay between chunks (2-5 seconds, increasing with chunk number)
if (i > 0) {
  const delaySeconds = Math.min(2 + i * 0.5, 5); // Start at 2s, increase by 0.5s per chunk, max 5s
  const delayMs = delaySeconds * 1000;
  console.log(`⏱️ DEBUG: Waiting ${delaySeconds}s before processing chunk ${i + 1}...`);
  
  // Cancellation-aware delay
  await new Promise<void>((resolve) => {
    // Implementation with cancellation checking
  });
}
```

## API Changes

### Enhanced `enrichWordsWithLLM` Function

The function signature has been extended with optional parameters:

```typescript
export async function enrichWordsWithLLM(
  hebrewWords: string[],
  apiKey: string,
  modelIdentifier: string,
  toastFn?: ToastFunction,
  modelSupportsToolsExplicit?: boolean,
  abortController?: AbortController,
  options?: LLMEnrichmentOptions  // New optional parameter
): Promise<Word[]>
```

### New Options Interface

```typescript
interface LLMEnrichmentOptions {
  retryConfig?: Partial<RetryConfig>;
  enableDetailedLogging?: boolean;
  validateJsonResponse?: boolean;
}
```

## Usage Examples

### Basic Usage (Backward Compatible)

```typescript
// Existing code continues to work unchanged
const words = await enrichWordsWithLLM(
  hebrewWords,
  apiKey,
  model,
  toastFn
);
```

### Enhanced Usage with New Features

```typescript
const words = await enrichWordsWithLLM(
  hebrewWords,
  apiKey,
  model,
  toastFn,
  undefined,
  abortController,
  {
    retryConfig: {
      maxRetries: 5,
      baseDelay: 2000,
      maxDelay: 20000
    },
    enableDetailedLogging: true,
    validateJsonResponse: true
  }
);
```

## Configuration

### Retry Configuration

- `maxRetries`: Maximum number of retry attempts (default: 3)
- `baseDelay`: Initial delay in milliseconds (default: 1000)
- `maxDelay`: Maximum delay cap in milliseconds (default: 10000)
- `backoffMultiplier`: Exponential backoff multiplier (default: 2)

### Logging

- `enableDetailedLogging`: Enable comprehensive logging (default: false)

### Validation

- `validateJsonResponse`: Pre-validate JSON before parsing (default: true)

## Error Handling Improvements

### Error Classification

Errors are now classified into specific types:
- Authentication/API key errors (no retry)
- Network errors (retry with backoff)
- JSON parsing errors (retry with validation)
- Abort errors (immediate termination)

### Enhanced Error Messages

```typescript
logger(`Error occurred: ${error instanceof Error ? error.message : String(error)}`);
logger('Request was aborted by user');
```

## Testing

### Updated Test Script

The test script now uses the enhanced options:

```typescript
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
```

### Running Tests

```bash
# Run with default settings
bun run scripts/test-api-chunks.ts

# Run with enhanced logging
FORCE_TOOL_SUPPORT=true bun run scripts/test-api-chunks.ts

# Run with specific model
OPENROUTER_MODEL="anthropic/claude-3-sonnet" bun run scripts/test-api-chunks.ts
```

## Expected Improvements

1. **Reduced JSON Parse Errors**: Enhanced validation catches malformed responses
2. **Better Reliability**: Retry mechanism handles temporary failures
3. **Improved Debugging**: Detailed logging helps identify issues
4. **Rate Limit Compliance**: Progressive delays prevent API throttling
5. **Cleaner Connections**: Fresh client instances avoid state pollution

## Backward Compatibility

All changes are backward compatible. Existing code will continue to work without modifications, while new features are available through optional parameters.

## Monitoring

Enable detailed logging to monitor improvements:

```typescript
const options = {
  enableDetailedLogging: true,
  validateJsonResponse: true
};
```

Look for log messages like:
- `[LLM Enrichment] Creating new OpenAI client instance`
- `[LLM Enrichment] Retry attempt 1/3`
- `[LLM Enrichment] JSON validation failed for response content`
- `[LLM Enrichment] Successfully parsed response content`