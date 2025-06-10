# OpenRouter Models Structured Outputs Support Report

**Generated:** 2025-06-10T16:08:20.582Z
**Test Words:** לאכול, ספר, גדול
**Timeout:** 30000ms

## Summary

- 🟢 **Full Success (Schema Compliant):** 1
- 🟡 **Partial Success (Schema Issues):** 0
- 🔴 **Failed:** 5

## Detailed Results

| Model | Status | Words Processed | Response Time | Schema Compliant | Issues |
|-------|--------|----------------|---------------|------------------|--------|
| `google/gemma-3-27b-it:free` | 🔴 Failed | 0/3 | 1593ms | ❌ | 400 Provider returned error |
| `google/gemma-3-12b-it:free` | 🔴 Failed | 0/3 | 1258ms | ❌ | 400 Provider returned error |
| `google/gemma-3-4b-it:free` | 🔴 Failed | 0/3 | 1458ms | ❌ | 400 Provider returned error |
| `meta-llama/llama-4-scout:free` | 🟢 Full Success | 3/3 | 8206ms | ✅ | - |
| `meta-llama/llama-4-maverick:free` | 🔴 Failed | 0/3 | 1735ms | ❌ | Empty response content |
| `meta-llama/llama-3.3-8b-instruct:free` | 🔴 Failed | 0/3 | 1109ms | ❌ | Empty response content |

## Recommendations

### ✅ Recommended for Structured Outputs:
- `meta-llama/llama-4-scout:free` - Full schema compliance, 3/3 words processed

