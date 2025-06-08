// Ollama config: default values for local Ollama instance

export const DEFAULT_OLLAMA_API_URL = "http://localhost:11434/api";
export const DEFAULT_OLLAMA_MODEL = "gemma3:4b";
export const DEFAULT_OLLAMA_CHAT_ENDPOINT = "/chat";
export const DEFAULT_OLLAMA_GENERATE_ENDPOINT = "/generate";

// Ollama-specific settings
export const DEFAULT_OLLAMA_TIMEOUT = 60000; // 60 seconds for local inference
export const DEFAULT_OLLAMA_TEMPERATURE = 0.1; // Low temperature for consistent translations
export const DEFAULT_OLLAMA_MAX_TOKENS = 4000;

// Available Ollama models for Hebrew processing (ordered by recommendation)
export const RECOMMENDED_OLLAMA_MODELS = [
  "gemma3:4b",        // Best overall: quality + speed + categories
  "llama3.2:latest",  // Good for speed, basic translations
  "llama3.1:latest",  // Good for quality, but slow
  "qwen2.5:latest",   // Alternative option
  "mistral:latest",   // Basic support
];

// Model ratings based on testing
export const OLLAMA_MODEL_RATINGS = {
  "gemma3:4b": {
    quality: 5,
    speed: 4,
    categories: 5,
    examples: 4,
    recommended: true,
    description: "Best overall for Hebrew-Russian translation"
  },
  "llama3.2:latest": {
    quality: 3,
    speed: 5,
    categories: 1,
    examples: 1,
    recommended: false,
    description: "Fastest but generic categories"
  },
  "llama3.1:latest": {
    quality: 2,
    speed: 1,
    categories: 1,
    examples: 4,
    recommended: false,
    description: "Slow but detailed responses"
  }
};
