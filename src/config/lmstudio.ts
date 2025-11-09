// LM Studio config: default values for local LM Studio instance

export const DEFAULT_LMSTUDIO_API_URL = "http://localhost:1234/v1";
export const DEFAULT_LMSTUDIO_MODEL = "local-model";
export const DEFAULT_LMSTUDIO_CHAT_ENDPOINT = "/chat/completions";

// LM Studio-specific settings
export const DEFAULT_LMSTUDIO_TIMEOUT = 60000; // 60 seconds for local inference
export const DEFAULT_LMSTUDIO_TEMPERATURE = 0.1; // Low temperature for consistent translations
export const DEFAULT_LMSTUDIO_MAX_TOKENS = 4000;

// Available LM Studio models for Hebrew processing (ordered by recommendation)
export const RECOMMENDED_LMSTUDIO_MODELS = [
  "local-model",      // Default local model
  "gemma-2-9b",       // Good for quality
  "llama-3.2-3b",     // Good for speed
  "qwen2.5-7b",       // Alternative option
];

// Model ratings based on testing
export const LMSTUDIO_MODEL_RATINGS = {
  "local-model": {
    quality: 4,
    speed: 4,
    categories: 4,
    examples: 4,
    recommended: true,
    description: "Default local model for Hebrew-Russian translation"
  },
  "gemma-2-9b": {
    quality: 5,
    speed: 3,
    categories: 5,
    examples: 4,
    recommended: true,
    description: "High quality for Hebrew processing"
  },
  "llama-3.2-3b": {
    quality: 3,
    speed: 5,
    categories: 3,
    examples: 3,
    recommended: false,
    description: "Fastest but basic categories"
  }
};
