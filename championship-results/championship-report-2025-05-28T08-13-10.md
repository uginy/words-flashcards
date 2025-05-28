# OpenRouter Free Models Championship Report

**Generated:** Invalid Date  
**Total Models Tested:** 65  
**Available Models:** 15  
**Unavailable Models:** 50  

## 🏆 Top 10 Champions

| Rank | Model | Total Score | Success Rate | Word Success | Quality Score | Avg Response Time | JSON Errors |
|------|-------|-------------|--------------|--------------|---------------|------------------|-------------|
| 1 | `meta-llama/llama-4-scout:free` | **87.15** | 100.0% | 100.0% | 81.3% | 8163ms | 0 |
| 2 | `meta-llama/llama-3.3-8b-instruct:free` | **74.75** | 75.0% | 75.0% | 83.3% | 7337ms | 0 |
| 3 | `qwen/qwen-2.5-7b-instruct:free` | **73.76** | 75.0% | 75.0% | 71.7% | 5404ms | 0 |
| 4 | `opengvlab/internvl3-14b:free` | **72.66** | 75.0% | 75.0% | 75.0% | 7342ms | 0 |
| 5 | `tngtech/deepseek-r1t-chimera:free` | **70** | 75.0% | 75.0% | 75.0% | 16353ms | 0 |
| 6 | `mistralai/mistral-7b-instruct:free` | **68.42** | 75.0% | 75.0% | 76.7% | 13432ms | 1 |
| 7 | `meta-llama/llama-3.3-70b-instruct:free` | **68** | 75.0% | 75.0% | 75.0% | 22198ms | 1 |
| 8 | `opengvlab/internvl3-2b:free` | **62.72** | 50.0% | 50.0% | 75.0% | 3527ms | 0 |
| 9 | `meta-llama/llama-3.2-3b-instruct:free` | **61.75** | 50.0% | 50.0% | 90.0% | 6251ms | 1 |
| 10 | `nousresearch/deephermes-3-mistral-24b-preview:free` | **59.44** | 50.0% | 50.0% | 75.0% | 6811ms | 0 |

## 📊 Scoring Methodology

The **Total Score** is calculated using weighted metrics:
- **Success Rate** (30%) - Percentage of successfully processed chunks
- **Word Success Rate** (25%) - Percentage of successfully processed words  
- **Quality Score** (25%) - Average quality of word enrichment (transcription + translation + conjugations + examples)
- **Response Time** (10%) - Processing speed (lower is better)
- **JSON Stability** (10%) - Reliability of JSON parsing (fewer errors is better)

## 🥇 Champion Analysis

### meta-llama/llama-4-scout:free
- **Total Score:** 87.15
- **Success Rate:** 100.0%
- **Quality Score:** 81.3%
- **Average Response Time:** 8163ms

**No errors encountered** ✅

## 💡 Recommendations

### For Production Use:
1. **meta-llama/llama-4-scout:free** - Overall champion with 87.15 total score
2. **meta-llama/llama-3.3-8b-instruct:free** - Strong alternative with 74.75 total score
3. **qwen/qwen-2.5-7b-instruct:free** - Reliable backup option with 73.76 total score

### Performance Insights:
- **Fastest Model:** opengvlab/internvl3-2b:free (3527ms)
- **Most Reliable:** opengvlab/internvl3-2b:free (0 JSON errors)
- **Highest Quality:** meta-llama/llama-3.2-3b-instruct:free (90.0% quality)

## ❌ Unavailable Models (50)

The following models were not available during testing:
- `google/gemma-3n-e4b-it:free`
- `microsoft/phi-4-reasoning-plus:free`
- `microsoft/phi-4-reasoning:free`
- `deepseek/deepseek-prover-v2:free`
- `qwen/qwen3-30b-a3b:free`
- `qwen/qwen3-8b:free`
- `qwen/qwen3-14b:free`
- `qwen/qwen3-32b:free`
- `qwen/qwen3-235b-a22b:free`
- `microsoft/mai-ds-r1:free`
- `thudm/glm-z1-32b:free`
- `thudm/glm-4-32b:free`
- `shisa-ai/shisa-v2-llama3.3-70b:free`
- `arliai/qwq-32b-arliai-rpr-v1:free`
- `agentica-org/deepcoder-14b-preview:free`
- `moonshotai/kimi-vl-a3b-thinking:free`
- `nvidia/llama-3.3-nemotron-super-49b-v1:free`
- `nvidia/llama-3.1-nemotron-ultra-253b-v1:free`
- `meta-llama/llama-4-maverick:free`
- `deepseek/deepseek-v3-base:free`
- `qwen/qwen2.5-vl-3b-instruct:free`
- `qwen/qwen2.5-vl-32b-instruct:free`
- `deepseek/deepseek-chat-v3-0324:free`
- `featherless/qwerky-72b:free`
- `open-r1/olympiccoder-32b:free`
- `google/gemma-3-1b-it:free`
- `google/gemma-3-4b-it:free`
- `google/gemma-3-12b-it:free`
- `rekaai/reka-flash-3:free`
- `google/gemma-3-27b-it:free`
- `deepseek/deepseek-r1-zero:free`
- `qwen/qwq-32b:free`
- `moonshotai/moonlight-16b-a3b-instruct:free`
- `cognitivecomputations/dolphin3.0-r1-mistral-24b:free`
- `cognitivecomputations/dolphin3.0-mistral-24b:free`
- `qwen/qwen2.5-vl-72b-instruct:free`
- `mistralai/mistral-small-24b-instruct-2501:free`
- `deepseek/deepseek-r1-distill-qwen-32b:free`
- `deepseek/deepseek-r1-distill-llama-70b:free`
- `deepseek/deepseek-r1:free`
- `deepseek/deepseek-chat:free`
- `google/gemini-2.0-flash-exp:free`
- `qwen/qwen-2.5-coder-32b-instruct:free`
- `meta-llama/llama-3.2-1b-instruct:free`
- `qwen/qwen-2.5-72b-instruct:free`
- `qwen/qwen-2.5-vl-7b-instruct:free`
- `meta-llama/llama-3.1-405b:free`
- `meta-llama/llama-3.1-8b-instruct:free`
- `mistralai/mistral-nemo:free`
- `google/gemma-2-9b-it:free`

## 📈 Full Results

| Model | Score | Success | Words | Quality | Time | JSON Errors | Available |
|-------|-------|---------|-------|---------|------|-------------|-----------|
| `meta-llama/llama-4-scout:free` | 87.15 | 100.0% | 100.0% | 81.3% | 8163ms | 0 | ✅ |
| `meta-llama/llama-3.3-8b-instruct:free` | 74.75 | 75.0% | 75.0% | 83.3% | 7337ms | 0 | ✅ |
| `qwen/qwen-2.5-7b-instruct:free` | 73.76 | 75.0% | 75.0% | 71.7% | 5404ms | 0 | ✅ |
| `opengvlab/internvl3-14b:free` | 72.66 | 75.0% | 75.0% | 75.0% | 7342ms | 0 | ✅ |
| `tngtech/deepseek-r1t-chimera:free` | 70 | 75.0% | 75.0% | 75.0% | 16353ms | 0 | ✅ |
| `mistralai/mistral-7b-instruct:free` | 68.42 | 75.0% | 75.0% | 76.7% | 13432ms | 1 | ✅ |
| `meta-llama/llama-3.3-70b-instruct:free` | 68 | 75.0% | 75.0% | 75.0% | 22198ms | 1 | ✅ |
| `opengvlab/internvl3-2b:free` | 62.72 | 50.0% | 50.0% | 75.0% | 3527ms | 0 | ✅ |
| `meta-llama/llama-3.2-3b-instruct:free` | 61.75 | 50.0% | 50.0% | 90.0% | 6251ms | 1 | ✅ |
| `nousresearch/deephermes-3-mistral-24b-preview:free` | 59.44 | 50.0% | 50.0% | 75.0% | 6811ms | 0 | ✅ |
| `mistralai/mistral-small-3.1-24b-instruct:free` | 54.88 | 50.0% | 50.0% | 77.5% | 18431ms | 1 | ✅ |
| `mistralai/devstral-small:free` | 54.25 | 50.0% | 50.0% | 75.0% | 13068ms | 1 | ✅ |
| `nousresearch/deephermes-3-llama-3-8b-preview:free` | 54.25 | 50.0% | 50.0% | 75.0% | 10023ms | 1 | ✅ |
| `deepseek/deepseek-r1-distill-qwen-14b:free` | 38.5 | 25.0% | 25.0% | 75.0% | 13654ms | 2 | ✅ |
| `meta-llama/llama-3.2-11b-vision-instruct:free` | 36.5 | 25.0% | 25.0% | 75.0% | 17583ms | 3 | ✅ |
| `google/gemma-3n-e4b-it:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `microsoft/phi-4-reasoning-plus:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `microsoft/phi-4-reasoning:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `deepseek/deepseek-prover-v2:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `qwen/qwen3-30b-a3b:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `qwen/qwen3-8b:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `qwen/qwen3-14b:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `qwen/qwen3-32b:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `qwen/qwen3-235b-a22b:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `microsoft/mai-ds-r1:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `thudm/glm-z1-32b:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `thudm/glm-4-32b:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `shisa-ai/shisa-v2-llama3.3-70b:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `arliai/qwq-32b-arliai-rpr-v1:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `agentica-org/deepcoder-14b-preview:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `moonshotai/kimi-vl-a3b-thinking:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `nvidia/llama-3.3-nemotron-super-49b-v1:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `nvidia/llama-3.1-nemotron-ultra-253b-v1:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `meta-llama/llama-4-maverick:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `deepseek/deepseek-v3-base:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `qwen/qwen2.5-vl-3b-instruct:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `qwen/qwen2.5-vl-32b-instruct:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `deepseek/deepseek-chat-v3-0324:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `featherless/qwerky-72b:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `open-r1/olympiccoder-32b:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `google/gemma-3-1b-it:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `google/gemma-3-4b-it:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `google/gemma-3-12b-it:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `rekaai/reka-flash-3:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `google/gemma-3-27b-it:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `deepseek/deepseek-r1-zero:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `qwen/qwq-32b:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `moonshotai/moonlight-16b-a3b-instruct:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `cognitivecomputations/dolphin3.0-r1-mistral-24b:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `cognitivecomputations/dolphin3.0-mistral-24b:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `qwen/qwen2.5-vl-72b-instruct:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `mistralai/mistral-small-24b-instruct-2501:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `deepseek/deepseek-r1-distill-qwen-32b:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `deepseek/deepseek-r1-distill-llama-70b:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `deepseek/deepseek-r1:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `deepseek/deepseek-chat:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `google/gemini-2.0-flash-exp:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `qwen/qwen-2.5-coder-32b-instruct:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `meta-llama/llama-3.2-1b-instruct:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `qwen/qwen-2.5-72b-instruct:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `qwen/qwen-2.5-vl-7b-instruct:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `meta-llama/llama-3.1-405b:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `meta-llama/llama-3.1-8b-instruct:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `mistralai/mistral-nemo:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |
| `google/gemma-2-9b-it:free` | 0 | 0.0% | 0.0% | 0.0% | 0ms | 0 | ❌ |

---
*Generated by OpenRouter Free Models Championship Test*  
*Test Duration: ~23 minutes*
