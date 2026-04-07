import express from 'express';
import piperTTS from '../services/piperTTS.js';

const router = express.Router();

// Text-to-Speech endpoint
router.post('/synthesize', async (req, res) => {
  try {
    const { text, model, speed, noiseScale, noiseW } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const options = {
      model: model || 'en_US-lessac-medium',
      speed: speed || 1.0,
      noiseScale: noiseScale || 0.667,
      noiseW: noiseW || 0.8
    };

    const audioBuffer = await piperTTS.synthesizeSpeech(text, options);

    // Set appropriate headers for audio response
    res.set({
      'Content-Type': 'audio/wav',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'no-cache'
    });

    res.send(audioBuffer);

  } catch (error) {
    console.error('TTS synthesis error:', error);
    res.status(500).json({ 
      error: 'Failed to synthesize speech',
      details: error.message 
    });
  }
});

// Get available models
router.get('/models', async (req, res) => {
  try {
    const models = await piperTTS.getAvailableModels();
    res.json({ models });
  } catch (error) {
    console.error('Error getting models:', error);
    res.status(500).json({ error: 'Failed to get models' });
  }
});

// Check TTS service status
router.get('/status', async (req, res) => {
  try {
    const isInitialized = piperTTS.isInitialized;
    const models = await piperTTS.getAvailableModels();
    
    res.json({
      status: isInitialized ? 'ready' : 'not_initialized',
      models: models.length,
      availableModels: models
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      error: error.message 
    });
  }
});

export default router;
