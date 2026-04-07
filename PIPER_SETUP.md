# Piper TTS Setup Guide

## Overview
This project now uses Piper TTS for text-to-speech functionality instead of the browser's native Web Speech API. Piper provides higher quality, more natural-sounding speech synthesis.

## Installation Requirements

### 1. Install Piper TTS
You need to install Piper TTS on your system:

#### Windows:
```bash
# Download Piper from GitHub releases
# Visit: https://github.com/rhasspy/piper/releases
# Download the latest Windows release and extract it

# Or install via pip (requires Python)
pip install piper-tts

# Or use conda
conda install -c conda-forge piper-tts
```

#### Linux/Mac:
```bash
# Install via pip
pip install piper-tts

# Or download from GitHub releases
wget https://github.com/rhasspy/piper/releases/latest/download/piper_linux_x86_64.tar.gz
tar -xzf piper_linux_x86_64.tar.gz
```

### 2. Download Voice Models
Piper requires voice models (ONNX files) to generate speech:

```bash
# Download English models (example)
mkdir -p server/models/piper

# Download a model (you can choose from available models)
# Example: Lessac medium quality male voice
wget https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx -O server/models/piper/en_US-lessac-medium.onnx

# Download the corresponding model config
wget https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json -O server/models/piper/en_US-lessac-medium.onnx.json
```

### 3. Available Models
Some popular English models:
- `en_US-lessac-medium` - Male voice, medium quality
- `en_US-lessac-low` - Male voice, low quality (faster)
- `en_US-amy-medium` - Female voice, medium quality
- `en_US-amy-low` - Female voice, low quality (faster)
- `en_GB-cori-medium` - British female voice

## Configuration

### Environment Variables
Add these to your `.env` file (optional):
```env
# Piper executable path (if not in PATH)
PIPER_PATH=C:\piper\piper.exe

# Default model to use
PIPER_DEFAULT_MODEL=en_US-lessac-medium

# Audio quality settings
PIPER_SPEED=1.0
PIPER_NOISE_SCALE=0.667
PIPER_NOISE_W=0.8
```

### API Endpoints
The TTS service provides these endpoints:

#### POST /api/tts/synthesize
```json
{
  "text": "Hello, how are you?",
  "model": "en_US-lessac-medium",
  "speed": 1.0,
  "noiseScale": 0.667,
  "noiseW": 0.8
}
```

Returns: Audio data (WAV format)

#### GET /api/tts/status
Returns TTS service status and available models.

#### GET /api/tts/models
Returns list of available voice models.

## Usage in React Components

```javascript
import { usePiper } from '../hooks/usePiper';

const MyComponent = () => {
  const { speak, isSpeaking, error, availableModels } = usePiper();

  const handleSpeak = async () => {
    try {
      await speak("Hello world!", { model: "en_US-lessac-medium" });
    } catch (err) {
      console.error("Speech failed:", err);
    }
  };

  return (
    <div>
      <button onClick={handleSpeak} disabled={isSpeaking}>
        {isSpeaking ? "Speaking..." : "Speak"}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
};
```

## Troubleshooting

### Common Issues:

1. **"Piper executable not found"**
   - Ensure Piper is installed and in your PATH
   - Or set PIPER_PATH environment variable

2. **"Model file not found"**
   - Download voice models to `server/models/piper/`
   - Ensure both `.onnx` and `.onnx.json` files are present

3. **"Failed to connect to TTS service"**
   - Ensure the backend server is running
   - Check that the TTS routes are properly configured

4. **Audio playback issues**
   - Ensure browser supports audio playback
   - Check browser audio permissions

### Testing the Setup:

1. Start the backend server:
```bash
cd server
npm start
```

2. Test TTS status:
```bash
curl http://localhost:3003/api/tts/status
```

3. Test speech synthesis:
```bash
curl -X POST http://localhost:3003/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world"}' \
  --output test.wav
```

## Migration from Web Speech API

The new implementation:
- ✅ Higher quality speech synthesis
- ✅ More voice options
- ✅ Better consistency across browsers
- ✅ Server-side processing (reduces client load)
- ✅ Configurable voice parameters

The old Web Speech API has been completely removed and replaced with Piper TTS.
