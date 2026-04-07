import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003';

export const usePiper = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [availableModels, setAvailableModels] = useState([]);
  const [ttsStatus, setTtsStatus] = useState('unknown');

  const recognitionRef = useRef(null);
  const currentAudioRef = useRef(null);

  // Initialize Speech Recognition (keeping this part as it's browser-native)
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcriptPart + ' ';
        } else {
          interim += transcriptPart;
        }
      }

      if (final) {
        setTranscript(prev => prev + final);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setError(`Recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Check TTS service status and get models
  useEffect(() => {
    const checkTTSStatus = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/tts/status`);
        setTtsStatus(response.data.status);
        setAvailableModels(response.data.availableModels || []);
      } catch (err) {
        console.error('TTS status check failed:', err);
        setTtsStatus('error');
        setError('Failed to connect to TTS service');
      }
    };

    checkTTSStatus();
  }, []);

  // Start listening
  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        setTranscript('');
        setInterimTranscript('');
        setError(null);
        recognitionRef.current.start();
      } catch (err) {
        console.error('Error starting recognition:', err);
        setError('Failed to start speech recognition');
      }
    }
  }, [isListening]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  // Speak text using Piper TTS
  const speak = useCallback(async (text, options = {}) => {
    if (!text || text.trim() === '') {
      return Promise.resolve();
    }

    try {
      // Stop any current audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      setIsSpeaking(true);
      setError(null);

      const response = await axios.post(`${API_BASE_URL}/api/tts/synthesize`, {
        text: text.trim(),
        model: options.model || 'en_US-lessac-medium',
        speed: options.speed || 1.0,
        noiseScale: options.noiseScale || 0.667,
        noiseW: options.noiseW || 0.8
      }, {
        responseType: 'blob'
      });

      // Create audio blob and play
      const audioBlob = new Blob([response.data], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      currentAudioRef.current = audio;

      return new Promise((resolve, reject) => {
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          resolve();
        };

        audio.onerror = (event) => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          setError('Audio playback failed');
          reject(new Error('Audio playback failed'));
        };

        audio.play().catch(err => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          setError('Failed to play audio');
          reject(err);
        });
      });

    } catch (err) {
      setIsSpeaking(false);
      const errorMessage = err.response?.data?.error || err.message || 'Speech synthesis failed';
      setError(errorMessage);
      return Promise.reject(new Error(errorMessage));
    }
  }, []);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // Refresh available models
  const refreshModels = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tts/models`);
      setAvailableModels(response.data.models || []);
    } catch (err) {
      console.error('Failed to refresh models:', err);
    }
  }, []);

  return {
    isListening,
    isSpeaking,
    transcript,
    interimTranscript,
    error,
    availableModels,
    ttsStatus,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    resetTranscript,
    refreshModels,
    fullTranscript: transcript + interimTranscript
  };
};
