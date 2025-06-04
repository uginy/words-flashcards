# TTS Service - Technical Documentation

## Architecture Overview

The TTS (Text-to-Speech) service provides a flexible, extensible architecture for speech synthesis with multiple provider support and automatic fallback mechanisms.

## Core Components

### TTSManager
Central orchestrator that manages TTS providers and handles speech requests.

```typescript
class TTSManager {
  speak(text: string, options?: TTSOptions): Promise<void>
  stop(): void
  pause(): void
  resume(): void
  getAvailableVoices(): Promise<TTSVoice[]>
}
```

**Key Features:**
- Automatic language detection
- Provider fallback system
- Voice selection optimization
- Error handling and retry logic

### Provider Architecture

The system uses a provider pattern for extensibility:

```typescript
interface TTSProvider {
  readonly name: string
  isAvailable: boolean
  speak(text: string, options?: TTSOptions): Promise<void>
  stop(): void
  pause(): void
  resume(): void
  getAvailableVoices(): Promise<TTSVoice[]>
}
```

### Current Providers

#### 1. MicrosoftTTSProvider
**Features:**
- High-quality neural voices
- SSML support for advanced speech control
- 27+ languages support
- Prosody control (rate, pitch, volume)

**Technical Details:**
- **Authentication**: OAuth 2.0 token-based
- **Token Caching**: 9-minute token lifecycle
- **Audio Format**: MP3, 16kHz, 128kbps
- **Endpoint**: `{region}.tts.speech.microsoft.com`

**SSML Builder:**
```typescript
class MicrosoftSSMLBuilder implements SSMLBuilder {
  buildSSML(text: string, options: TTSOptions): string
}
```

**Voice Mapping:**
```typescript
const voiceMap = {
  'he-IL': ['he-IL-HilaNeural', 'he-IL-AvriNeural'],
  'ru-RU': ['ru-RU-SvetlanaNeural', 'ru-RU-DmitryNeural'],
  'en-US': ['en-US-JennyNeural', 'en-US-GuyNeural']
}
```

#### 2. SystemTTSProvider
**Features:**
- Browser's built-in Web Speech API
- No external dependencies
- Offline capability
- OS-native voices

**Technical Details:**
- **API**: `speechSynthesis` Web API
- **Compatibility**: Modern browsers
- **Voice Detection**: Runtime enumeration
- **Event Handling**: Promise-based wrapper

### Language Detection

```typescript
class LanguageDetector {
  detectLanguage(text: string): string
}
```

**Detection Algorithm:**
1. **Hebrew Detection**: Unicode range analysis (0x0590-0x05FF)
2. **Cyrillic Detection**: Unicode range analysis (0x0400-0x04FF)
3. **Default**: English for undetected text

**Supported Ranges:**
- Hebrew: `\u0590-\u05FF`
- Russian: `\u0400-\u04FF`
- English: Default fallback

## Configuration

### TTSOptions Interface
```typescript
interface TTSOptions {
  lang?: string        // Language code (auto-detected if not provided)
  voice?: string       // Voice hint for selection
  rate?: number        // Speech rate (0.1-10.0)
  pitch?: number       // Pitch (0.0-2.0)
  volume?: number      // Volume (0.0-1.0)
}
```

### Provider Configuration
```typescript
// Microsoft TTS
const microsoftProvider = new MicrosoftTTSProvider(apiKey, region)

// System TTS
const systemProvider = new SystemTTSProvider()

// Manager setup
const ttsManager = new TTSManager([microsoftProvider, systemProvider])
```

## Error Handling

### Error Types
1. **Configuration Errors**: Missing API keys, invalid regions
2. **Network Errors**: API failures, timeout issues
3. **Audio Errors**: Playback failures, format issues
4. **Permission Errors**: Browser restrictions, autoplay policies

### Fallback Strategy
```typescript
async speak(text: string, options: TTSOptions = {}): Promise<void> {
  for (const provider of this.providers) {
    if (provider.isAvailable) {
      try {
        await provider.speak(text, options)
        return
      } catch (error) {
        console.warn(`TTS error with ${provider.name}:`, error)
        continue
      }
    }
  }
  throw new Error('No TTS providers available')
}
```

## Extending the System

### Adding New Providers

1. **Implement TTSProvider Interface:**
```typescript
class CustomTTSProvider implements TTSProvider {
  readonly name = 'custom' as const
  
  get isAvailable(): boolean {
    return /* availability check */
  }
  
  async speak(text: string, options: TTSOptions): Promise<void> {
    // Implementation
  }
  
  // ... other methods
}
```

2. **Register Provider:**
```typescript
const customProvider = new CustomTTSProvider()
ttsManager.addProvider(customProvider)
```

### Adding New Languages

1. **Update Language Detector:**
```typescript
detectLanguage(text: string): string {
  // Add new language detection logic
  if (/* new language pattern */) return 'new-lang'
  // ... existing logic
}
```

2. **Update Voice Mappings:**
```typescript
const voiceMap = {
  'new-lang': ['voice1', 'voice2'],
  // ... existing mappings
}
```

### SSML Extensions

For advanced speech control with Microsoft TTS:

```typescript
buildAdvancedSSML(text: string, options: AdvancedTTSOptions): string {
  return `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis">
      <voice name="${options.voice}">
        <prosody rate="${options.rate}" pitch="${options.pitch}">
          ${options.emphasis ? `<emphasis level="strong">` : ''}
          ${this.escapeXml(text)}
          ${options.emphasis ? `</emphasis>` : ''}
        </prosody>
        ${options.pause ? `<break time="${options.pause}ms"/>` : ''}
      </voice>
    </speak>
  `
}
```

## Performance Optimization

### Token Caching
Microsoft TTS tokens are cached for 9 minutes to reduce API calls:

```typescript
private tokenCache: { token: string; expires: number } | null = null

private async getAccessToken(): Promise<string> {
  if (this.tokenCache && Date.now() < this.tokenCache.expires) {
    return this.tokenCache.token
  }
  // ... fetch new token
}
```

### Audio Optimization
- **Streaming**: Direct audio playback without buffering
- **Memory Management**: Automatic cleanup of audio URLs
- **Format Selection**: Optimal balance of quality and bandwidth

### Request Optimization
- **Batch Requests**: Group multiple short texts
- **Rate Limiting**: Respect API quotas
- **Retry Logic**: Exponential backoff for failures

## Testing

### Unit Tests
```typescript
describe('TTSManager', () => {
  it('should detect Hebrew text correctly', () => {
    const detector = new LanguageDetector()
    expect(detector.detectLanguage('שלום')).toBe('he-IL')
  })
  
  it('should fallback to system TTS when Microsoft fails', async () => {
    // Test implementation
  })
})
```

### Integration Tests
```typescript
describe('Microsoft TTS Integration', () => {
  it('should synthesize speech with valid API key', async () => {
    // Requires valid API credentials
  })
})
```

## Security Considerations

### API Key Management
- Store API keys securely (environment variables, secure storage)
- Implement key rotation mechanisms
- Monitor usage and quotas

### Content Sanitization
- Escape XML characters in SSML
- Validate input text length
- Filter malicious content

### Privacy
- No text logging by default
- Configurable data retention policies
- GDPR compliance considerations

## Monitoring and Analytics

### Usage Metrics
- Character count per provider
- Success/failure rates
- Response times
- Popular languages/voices

### Error Tracking
- Provider-specific error rates
- Network failure patterns
- User experience impact

## API Reference

### TTSManager Methods

#### `speak(text: string, options?: TTSOptions): Promise<void>`
Synthesizes and plays speech for the given text.

#### `stop(): void`
Stops current speech playback.

#### `pause(): void`
Pauses current speech (if supported).

#### `resume(): void`
Resumes paused speech (if supported).

#### `getAvailableVoices(): Promise<TTSVoice[]>`
Returns list of available voices from all providers.

### TTSProvider Methods

#### `isAvailable: boolean`
Indicates if provider is ready for use.

#### `speak(text: string, options: TTSOptions): Promise<void>`
Provider-specific speech synthesis.

#### `getAvailableVoices(): Promise<TTSVoice[]>`
Returns provider's available voices.

## Troubleshooting

### Common Issues

**"Provider not available"**
- Check API credentials
- Verify network connectivity
- Confirm browser support

**"Audio playback failed"**
- Check browser autoplay policies
- Verify audio format support
- Test with different browsers

**"Rate limit exceeded"**
- Monitor API usage
- Implement request queuing
- Consider upgrading API plan

### Debug Mode
Enable detailed logging:
```typescript
const ttsManager = new TTSManager(providers, { debug: true })
```

## Future Enhancements

### Planned Features
- **Voice Cloning**: Custom voice training
- **Emotion Control**: Emotional speech synthesis
- **Real-time Streaming**: Low-latency speech
- **Offline Mode**: Local TTS models

### Provider Roadmap
- **Google Cloud TTS**: Additional provider option
- **Amazon Polly**: Enterprise-grade voices
- **ElevenLabs**: AI-powered voice synthesis

## Contributing

### Development Setup
```bash
# Install dependencies
bun install

# Run tests
bun run test

# Build library
bun run build
```

### Code Style
- TypeScript strict mode
- ESLint + Prettier configuration
- Comprehensive JSDoc comments
- 100% test coverage target