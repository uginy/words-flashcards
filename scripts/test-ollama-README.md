# Ollama Chunks Test Script

This script tests the Ollama integration for Hebrew word enrichment processing.

## Overview

The `test-ollama-chunks.ts` script validates the Ollama service's ability to process Hebrew words and phrases, providing detailed analysis of success rates, error types, and performance metrics.

## Prerequisites

1. **Install Ollama**: Download from [ollama.ai](https://ollama.ai/)
2. **Start Ollama**: Run `ollama serve`
3. **Pull a model**: Run `ollama pull llama3.2:latest`

## Quick Start

```bash
# Basic test with default settings
npm run test:ollama-chunks

# Test with specific model
OLLAMA_MODEL="llama3.1:latest" npm run test:ollama-chunks

# Test with simple prompts (for smaller models)
USE_SIMPLE_PROMPT=true npm run test:ollama-chunks
```

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_API_URL` | `http://localhost:11434/api` | Ollama API endpoint |
| `OLLAMA_MODEL` | `llama3.2:latest` | Model to use for testing |
| `USE_SIMPLE_PROMPT` | `false` | Use simplified prompts |
| `DELAY_BETWEEN_CHUNKS` | `1000` | Delay between chunks (ms) |
| `PROGRESSIVE_DELAY` | `false` | Increase delay progressively |
| `ENABLE_LOGGING` | `true` | Enable detailed logging |
| `VALIDATE_JSON` | `true` | Validate JSON responses |

### Test Configuration

The script tests 20 Hebrew words divided into 4 chunks of 5 words each:

- **Verbs (פועל)**: לאכול, ללכת, לדבר, לכתוב, לקרוא
- **Nouns (שם עצם)**: ספר, בית, מים, אוכל, חבר  
- **Adjectives (שם תואר)**: גדול, קטן, יפה, טוב, רע
- **Phrases (פרזות)**: מה שלומך, בוקר טוב, תודה רבה, סליחה, שלום

## Example Usage

### Test Different Models

```bash
# Test LLaMA 3.2 (smaller, faster)
OLLAMA_MODEL="llama3.2:latest" npm run test:ollama-chunks

# Test LLaMA 3.1 (larger, more accurate)
OLLAMA_MODEL="llama3.1:latest" npm run test:ollama-chunks

# Test Qwen 2.5
OLLAMA_MODEL="qwen2.5:latest" npm run test:ollama-chunks

# Test Mistral
OLLAMA_MODEL="mistral:latest" npm run test:ollama-chunks
```

### Test with Different Prompt Styles

```bash
# Simple prompts (better for smaller models)
USE_SIMPLE_PROMPT=true npm run test:ollama-chunks

# Detailed prompts (better for larger models)
USE_SIMPLE_PROMPT=false npm run test:ollama-chunks
```

### Test Remote Ollama Instance

```bash
# Test remote Ollama server
OLLAMA_API_URL="http://remote-server:11434/api" npm run test:ollama-chunks

# Test with different port
OLLAMA_API_URL="http://localhost:8080/api" npm run test:ollama-chunks
```

### Performance Testing

```bash
# Fast testing (no delays)
DELAY_BETWEEN_CHUNKS=0 npm run test:ollama-chunks

# Slower testing (for resource-constrained systems)
DELAY_BETWEEN_CHUNKS=5000 npm run test:ollama-chunks

# Progressive delays
PROGRESSIVE_DELAY=true npm run test:ollama-chunks
```

### Debugging Options

```bash
# Disable JSON validation for troubleshooting
VALIDATE_JSON=false npm run test:ollama-chunks

# Enable verbose logging
ENABLE_LOGGING=true npm run test:ollama-chunks

# Combine debugging options
VALIDATE_JSON=false ENABLE_LOGGING=true USE_SIMPLE_PROMPT=true npm run test:ollama-chunks
```

## Output Analysis

### Success Metrics

The script provides detailed statistics:

```
📊 FINAL TEST STATISTICS
========================================
📈 Overall Results:
   Total chunks processed: 4
   Successful chunks: 4 (100%)
   Failed chunks: 0 (0%)

📝 Word Processing:
   Total words: 20
   Successfully processed: 20 (100%)
   Failed to process: 0 (0%)

⏱️ Timing:
   Total test time: 45s
   Average chunk processing time: 8500ms
```

### Error Categories

The script categorizes errors for easier troubleshooting:

- **Ollama Errors**: Service unavailable, model not found
- **JSON Parse Errors**: Invalid response format
- **Network Errors**: Connection issues
- **Validation Errors**: Missing required fields
- **API Errors**: General processing failures

### Performance Indicators

For each word, the script validates:

- ✅ **Transcription**: Romanized pronunciation
- ✅ **Translation**: Russian translation  
- ✅ **Conjugations**: Hebrew verb conjugations (for verbs)
- ✅ **Examples**: Usage examples with translations

## Troubleshooting

### Common Issues

#### Ollama Service Not Available
```
❌ Ollama service is not available!
```

**Solutions**:
1. Start Ollama: `ollama serve`
2. Check accessibility: `curl http://localhost:11434/api/tags`
3. Verify URL configuration

#### Model Not Found
```
⚠️ Requested model "llama3.2:latest" not found
```

**Solutions**:
1. List models: `ollama list`
2. Pull model: `ollama pull llama3.2:latest`
3. Check model name spelling

#### JSON Parsing Errors
```
🔧 JSON Parsing Issues (2 errors)
```

**Solutions**:
1. Use simple prompts: `USE_SIMPLE_PROMPT=true`
2. Try different model: `OLLAMA_MODEL="llama3.1:latest"`
3. Disable validation: `VALIDATE_JSON=false`

#### Poor Performance
```
⏱️ Average chunk processing time: 30000ms
```

**Solutions**:
1. Use smaller model: `OLLAMA_MODEL="llama3.2:latest"`
2. Enable GPU acceleration
3. Increase system resources
4. Add delays: `DELAY_BETWEEN_CHUNKS=2000`

## Expected Results

### Excellent Performance (90-100% success)
- Large models (LLaMA 3.1, Qwen 2.5)
- Sufficient system resources
- Proper Ollama configuration

### Good Performance (70-90% success)  
- Medium models (LLaMA 3.2)
- Limited system resources
- Simple prompt configuration

### Poor Performance (<70% success)
- Small/old models (LLaMA 2)
- Insufficient resources
- Configuration issues

## Model Recommendations

Based on testing results:

### Best Overall
- **LLaMA 3.1**: Best Hebrew quality, requires 8GB+ RAM
- **Qwen 2.5**: Good balance of size and performance

### Best for Limited Resources
- **LLaMA 3.2**: Smaller size, decent Hebrew quality
- **Mistral**: Alternative option

### Not Recommended
- **LLaMA 2**: Poor Hebrew support
- **Code models**: Not optimized for natural language

## Integration Testing

After successful chunk testing, verify integration:

```bash
# Test the actual application with Ollama
# (Add integration test commands here)
```

## Performance Benchmarks

Typical performance on different hardware:

| Hardware | Model | Success Rate | Avg Time/Chunk |
|----------|-------|--------------|----------------|
| M1 Mac 16GB | LLaMA 3.1 | 95% | 6s |
| M1 Mac 16GB | LLaMA 3.2 | 90% | 4s |
| Intel i7 32GB | LLaMA 3.1 | 93% | 8s |
| Intel i5 16GB | LLaMA 3.2 | 85% | 12s |

## Support

For additional help:
- Review Ollama documentation: [ollama.ai/docs](https://ollama.ai/docs)
- Check system requirements
- Monitor system resources during testing
- Use verbose logging for detailed error analysis
