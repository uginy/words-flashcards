// OpenRouter config: default values for API key and model

export const DEFAULT_OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
export const DEFAULT_OPENROUTER_API_KEY = "";
export const DEFAULT_OPENROUTER_MODEL = "meta-llama/llama-3.3-8b-instruct:free";

// Batch processing settings
export const DEFAULT_BATCH_SIZE = 5; // Number of words per request
export const DEFAULT_BATCH_DELAY = 2000; // Delay between batches in milliseconds
export const DEFAULT_PROGRESSIVE_DELAY = true; // Use progressive delays
export const DEFAULT_MAX_DELAY_SECONDS = 10; // Maximum delay per batch in seconds
