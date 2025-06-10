# OpenRouter Models Tools Support Report

**Generated:** 2025-06-10T15:53:14.555Z
**Test Words:** לאכול, ספר, גדול
**Timeout:** 30000ms

## Summary

- 🟢 **Full Support (Tools + Direct):** 1
- 🟡 **Partial Support (Direct only):** 6
- 🔴 **No Support:** 1
- ⚫ **Errors:** 0

## Detailed Results

| Model | Support | Forced tool_choice | Adaptive tool_choice | Direct JSON | Recommended | Errors |
|-------|---------|-------------------|---------------------|-------------|-------------|--------|
| `meta-llama/llama-4-maverick:free` | 🟡 partial | ❌ 6050ms | ❌ 5063ms | ✅ 4377ms | direct | Failed to parse JSON from message content. The model may not have returned valid JSON.; Failed to parse JSON from message content. The model may not have returned valid JSON. |
| `meta-llama/llama-4-scout:free` | 🟡 partial | ❌ 14828ms | ❌ 5601ms | ✅ 4737ms | direct | Failed to process words: ספר, גדול; Failed to parse JSON from message content. The model may not have returned valid JSON. |
| `deepseek/deepseek-chat-v3-0324:free` | 🟢 full | ✅ 15147ms | ✅ 22417ms | ❌ 30002ms | adaptive | Timeout |
| `mistralai/mistral-small-3.1-24b-instruct:free` | 🟡 partial | ✅ 15125ms | ❌ 12568ms | ✅ 13599ms | forced | Failed to parse JSON from message content. The model may not have returned valid JSON. |
| `mistralai/devstral-small:free` | 🟡 partial | ❌ 11712ms | ❌ 9978ms | ✅ 12482ms | direct | Invalid JSON structure in function call arguments. Issues: JSON parse error: JSON Parse error: Unterminated string; Invalid JSON structure in function call arguments. Issues: Unmatched braces: 36 opening, 35 closing, Unmatched brackets: 8 opening, 7 closing, JSON parse error: JSON Parse error: Expected ']' |
| `meta-llama/llama-3.3-8b-instruct:free` | 🟡 partial | ❌ 6427ms | ❌ 5404ms | ✅ 5627ms | direct | Failed to parse JSON from message content. The model may not have returned valid JSON.; Failed to parse JSON from message content. The model may not have returned valid JSON. |
| `mistralai/mistral-7b-instruct:free` | 🔴 none | ❌ 13153ms | ❌ 8322ms | ❌ 9852ms | direct | 422 Provider returned error; Failed to process words: גדול; Failed to parse LLM response content as JSON. The model may not have returned valid JSON (direct JSON mode). |
| `meta-llama/llama-3.3-70b-instruct:free` | 🟡 partial | ❌ 9260ms | ❌ 8016ms | ✅ 7602ms | direct | Failed to parse JSON from message content. The model may not have returned valid JSON.; Failed to parse JSON from message content. The model may not have returned valid JSON. |

## Recommendations

### ✅ Recommended for Function Calling:
- `deepseek/deepseek-chat-v3-0324:free` - Full tools support (recommended: adaptive)

### ⚠️ Partial Support:
- `meta-llama/llama-4-maverick:free` - direct JSON only
- `meta-llama/llama-4-scout:free` - direct JSON only
- `mistralai/mistral-small-3.1-24b-instruct:free` - forced tool_choice only
- `mistralai/devstral-small:free` - direct JSON only
- `meta-llama/llama-3.3-8b-instruct:free` - direct JSON only
- `meta-llama/llama-3.3-70b-instruct:free` - direct JSON only

