// OpenRouter config: default values for API key and model

export const DEFAULT_OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
export const DEFAULT_OPENROUTER_API_KEY = "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";
export const DEFAULT_OPENROUTER_MODEL = "google/gemma-3-27b-it:free";

// Batch processing settings
export const DEFAULT_BATCH_SIZE = 5; // Number of words per request
export const DEFAULT_BATCH_DELAY = 2000; // Delay between batches in milliseconds
export const DEFAULT_PROGRESSIVE_DELAY = true; // Use progressive delays
export const DEFAULT_MAX_DELAY_SECONDS = 10; // Maximum delay per batch in seconds
