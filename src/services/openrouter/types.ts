import type { Word, WordCategory } from "../../types";

export type ToastFunction = (opts: {
  title: string;
  description: string;
  variant?: 'default' | 'destructive' | 'warning'
}) => void;

// Enhanced retry configuration interface
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

// Enhanced options interface for enrichWordsWithLLM
export interface LLMEnrichmentOptions {
  retryConfig?: Partial<RetryConfig>;
  enableDetailedLogging?: boolean;
  validateJsonResponse?: boolean;
  forceToolChoice?: boolean; // NEW: Force tool_choice usage
  preferSimpleToolSchema?: boolean; // NEW: Use simplified tool definitions
}

// Interface for the expected structure of a single item from the LLM batch response
export interface LLMBatchResponseItem {
  category: WordCategory;
  hebrew: string;
  transcription: string;
  russian: string;
  conjugations?: {
    past: { [pronoun: string]: string } | null;
    present: { [pronoun: string]: string } | null;
    future: { [pronoun: string]: string } | null;
    imperative: { [pronoun: string]: string } | null;
  } | null;
  examples?: { hebrew: string; russian: string }[] | null;
}

// biome-ignore lint/style/useExportType: <explanation>
export { Word, WordCategory };