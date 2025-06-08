# Ollama Integration Guide

This guide explains how to use Ollama as a local LLM provider for Hebrew word enrichment in the flashcards application.

## Overview

Ollama provides a local alternative to external API services like OpenRouter, offering:
- **Privacy**: All processing happens locally
- **No API costs**: Free to use after initial setup
- **No rate limits**: Limited only by your hardware
- **Offline capability**: Works without internet connection
- **Model flexibility**: Support for various open-source models

## Prerequisites

### 1. Install Ollama

Visit [ollama.ai](https://ollama.ai/) and download Ollama for your operating system.

#### macOS
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

#### Linux
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

#### Windows
Download the installer from the official website.

### 2. Start Ollama Service

```bash
ollama serve
```

This starts the Ollama API server on `http://localhost:11434` by default.

### 3. Pull Required Models

Pull one or more Hebrew-capable models:

```bash
# Recommended models for Hebrew processing
ollama pull llama3.2:latest
ollama pull llama3.1:latest
ollama pull qwen2.5:latest
ollama pull mistral:latest
```

## Configuration

### Environment Variables

You can configure Ollama integration using these environment variables:

```bash
# Ollama API URL (default: http://localhost:11434/api)
OLLAMA_API_URL="http://localhost:11434/api"

# Model to use (default: llama3.2:latest)
OLLAMA_MODEL="llama3.2:latest"

# Use simplified prompts for better compatibility
USE_SIMPLE_PROMPT=true

# Enable detailed logging
ENABLE_LOGGING=true

# Validate JSON responses
VALIDATE_JSON=true
```

### Available Models

The following models have been tested for Hebrew word enrichment:

| Model | Size | Performance | Hebrew Quality | Recommended |
|-------|------|-------------|----------------|-------------|
| `llama3.2:latest` | ~2GB | Good | Excellent | ✅ Yes |
| `llama3.1:latest` | ~4.7GB | Excellent | Excellent | ✅ Yes |
| `qwen2.5:latest` | ~4.4GB | Very Good | Good | ✅ Yes |
| `mistral:latest` | ~4.1GB | Good | Good | ⚠️ Maybe |
| `llama2:latest` | ~3.8GB | Fair | Fair | ❌ No |

## Usage

### Running Tests

Test the Ollama integration:

```bash
# Basic test
npm run test:ollama-chunks

# With custom model
OLLAMA_MODEL="llama3.1:latest" npm run test:ollama-chunks

# With simple prompts (for smaller models)
USE_SIMPLE_PROMPT=true npm run test:ollama-chunks

# With custom Ollama URL (for remote instances)
OLLAMA_API_URL="http://remote-host:11434/api" npm run test:ollama-chunks
```

### Integration in Application

```typescript
import { enrichWordsWithOllama } from './src/services/ollama';

// Basic usage
const words = await enrichWordsWithOllama(['שלום', 'בוקר טוב'], {
  model: 'llama3.2:latest',
  baseUrl: 'http://localhost:11434/api',
  enableDetailedLogging: true
});

// Advanced usage with custom options
const words = await enrichWordsWithOllama(hebrewWords, {
  baseUrl: 'http://localhost:11434/api',
  model: 'llama3.1:latest',
  temperature: 0.1,
  useSimplePrompt: false,
  validateJsonResponse: true,
  retryConfig: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  },
  toastFn: mockToast
});
```

## Troubleshooting

### Common Issues

#### 1. Ollama Service Not Available
**Error**: `Ollama service is not available`

**Solutions**:
- Ensure Ollama is running: `ollama serve`
- Check if the service is accessible: `curl http://localhost:11434/api/tags`
- Verify the URL configuration

#### 2. Model Not Found
**Error**: `model not found` or `404`

**Solutions**:
- List available models: `ollama list`
- Pull the required model: `ollama pull llama3.2:latest`
- Check model name spelling

#### 3. JSON Parsing Errors
**Error**: `Failed to parse JSON`

**Solutions**:
- Try using simple prompts: `USE_SIMPLE_PROMPT=true`
- Disable JSON validation for testing: `VALIDATE_JSON=false`
- Try a different model with better JSON support

#### 4. Poor Hebrew Quality
**Issue**: Incorrect transcriptions or translations

**Solutions**:
- Use larger models (llama3.1 vs llama3.2)
- Enable detailed prompts: `USE_SIMPLE_PROMPT=false`
- Lower temperature for more consistent results

### Performance Optimization

#### Hardware Requirements

| Model Size | RAM Required | VRAM (GPU) | CPU Cores | Performance |
|------------|-------------|------------|-----------|-------------|
| 2B params | 4GB | 2GB | 4+ | Fast |
| 7B params | 8GB | 4GB | 8+ | Good |
| 13B params | 16GB | 8GB | 16+ | Best |

#### GPU Acceleration

For better performance, ensure GPU acceleration is enabled:

```bash
# Check if GPU is detected
ollama list

# For NVIDIA GPUs, install CUDA drivers
# For Apple Silicon, GPU is automatically used
```

## Remote Ollama Setup

You can run Ollama on a remote server for better performance:

### Server Setup

```bash
# Start Ollama with external access
OLLAMA_HOST=0.0.0.0 ollama serve

# Or use environment file
echo "OLLAMA_HOST=0.0.0.0" > ~/.ollama/config
ollama serve
```

### Client Configuration

```bash
# Point to remote Ollama instance
OLLAMA_API_URL="http://remote-server:11434/api" npm run test:ollama-chunks
```

## Comparison with OpenRouter

| Feature | Ollama | OpenRouter |
|---------|--------|------------|
| **Cost** | Free | Pay-per-use |
| **Privacy** | Fully local | Data sent to provider |
| **Speed** | Hardware dependent | Network dependent |
| **Model variety** | Open-source only | Commercial + Open-source |
| **Setup complexity** | Medium | Low |
| **Offline usage** | ✅ Yes | ❌ No |
| **Rate limits** | None | Provider dependent |

## Best Practices

1. **Model Selection**: Start with `llama3.2:latest` for good balance of size and quality
2. **Resource Management**: Monitor system resources during processing
3. **Batch Processing**: Process words in smaller chunks for better memory usage
4. **Error Handling**: Implement fallbacks for model unavailability
5. **Monitoring**: Use detailed logging during initial setup and testing

## Advanced Configuration

### Custom Prompts

You can modify prompts in `src/services/ollama/prompts.ts` for specific use cases:

```typescript
export const customHebrewPrompt = `
Your custom prompt for Hebrew processing...
`;
```

### Model-Specific Settings

Different models may require different settings:

```typescript
const modelConfigs = {
  'llama3.2:latest': {
    temperature: 0.1,
    useSimplePrompt: false,
    maxRetries: 2
  },
  'qwen2.5:latest': {
    temperature: 0.15,
    useSimplePrompt: true,
    maxRetries: 3
  }
};
```

## Support

For issues and questions:
- Check Ollama documentation: [ollama.ai/docs](https://ollama.ai/docs)
- Review application logs for detailed error information
- Test with different models to isolate issues
- Use simple prompts as a fallback for problematic models
