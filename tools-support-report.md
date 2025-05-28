# OpenRouter Models Tools Support Report

**Generated:** 2025-05-28T09:36:01.266Z
**Test Words:** לאכול, ספר, גדול
**Timeout:** 30000ms

## Summary

- 🟢 **Full Support (Tools + Direct):** 3
- 🟡 **Partial Support (Direct only):** 1
- 🔴 **No Support:** 0
- ⚫ **Errors:** 0

## Detailed Results

| Model | Support | Forced tool_choice | Adaptive tool_choice | Direct JSON | Recommended | Errors |
|-------|---------|-------------------|---------------------|-------------|-------------|--------|
| `meta-llama/llama-4-maverick:free` | 🟢 full | ✅ 5874ms | ✅ 5522ms | ✅ 4863ms | adaptive | - |
| `meta-llama/llama-4-scout:free` | 🟢 full | ✅ 4800ms | ✅ 5062ms | ✅ 4882ms | adaptive | - |
| `meta-llama/llama-3.3-8b-instruct:free` | 🟡 partial | ❌ 5594ms | ❌ 5647ms | ✅ 4944ms | direct | Failed to parse JSON from message content. The model may not have returned valid JSON.; Failed to parse JSON from message content. The model may not have returned valid JSON. |
| `meta-llama/llama-3.3-70b-instruct:free` | 🟢 full | ✅ 7263ms | ✅ 7087ms | ❌ 30002ms | adaptive | Timeout |

## Recommendations

### ✅ Recommended for Function Calling:
- `meta-llama/llama-4-maverick:free` - Full tools support (recommended: adaptive)
- `meta-llama/llama-4-scout:free` - Full tools support (recommended: adaptive)
- `meta-llama/llama-3.3-70b-instruct:free` - Full tools support (recommended: adaptive)

### ⚠️ Partial Support:
- `meta-llama/llama-3.3-8b-instruct:free` - direct JSON only

