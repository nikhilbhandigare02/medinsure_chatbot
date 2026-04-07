import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PiperTTS {
  constructor() {
    this.piperPath = null;
    this.modelPath = null;
    this.isInitialized = false;
    this.usePythonModule = false;
    this.init();
  }

  async init() {
    try {
      // First try to use Python module approach
      try {
        const result = await this.executeCommand('python -c "import piper; print(\'Piper module available\')"', { timeout: 5000 });
        if (result.includes('Piper module available')) {
          this.usePythonModule = true;
          console.log('Using Piper Python module');
        }
      } catch (error) {
        // Fall back to executable search
        this.piperPath = await this.findPiperExecutable();
        console.log(`Using Piper executable at: ${this.piperPath}`);
      }
      
      // Set default model path (you'll need to download models)
      this.modelPath = path.join(__dirname, '..', 'models', 'piper');
      
      // Ensure models directory exists
      if (!fs.existsSync(this.modelPath)) {
        fs.mkdirSync(this.modelPath, { recursive: true });
      }
      
      this.isInitialized = true;
      console.log('Piper TTS initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Piper TTS:', error);
      this.isInitialized = false;
    }
  }

  async findPiperExecutable() {
    const possiblePaths = [
      'piper',
      path.join(__dirname, '..', 'bin', 'piper'),
      path.join(__dirname, '..', 'piper', 'piper'),
      'C:\\Program Files\\Piper\\piper.exe',
      'C:\\piper\\piper.exe'
    ];

    for (const piperPath of possiblePaths) {
      try {
        const result = await this.executeCommand(`"${piperPath}" --help`, { timeout: 5000 });
        if (result.includes('Piper')) {
          console.log(`Found Piper at: ${piperPath}`);
          return piperPath;
        }
      } catch (error) {
        // Continue trying other paths
      }
    }

    throw new Error('Piper executable not found. Please install Piper TTS.');
  }

  async executeCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      const { timeout = 30000 } = options;
      
      const child = spawn(command, [], { 
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`Command timeout after ${timeout}ms`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  async synthesizeSpeech(text, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Piper TTS not initialized');
    }

    const {
      model = 'en_US-lessac-medium',
      outputFormat = 'wav',
      speed = 1.0,
      noiseScale = 0.667,
      noiseW = 0.8
    } = options;

    try {
      // Generate unique output file
      const outputFile = path.join(this.modelPath, `output_${Date.now()}.${outputFormat}`);
      
      // Check if model exists
      const modelFile = path.join(this.modelPath, `${model}.onnx`);
      if (!fs.existsSync(modelFile)) {
        throw new Error(`Model file not found: ${modelFile}. Please download the model first.`);
      }

      // Create a temporary file with the text
      const textFile = path.join(this.modelPath, `temp_text_${Date.now()}.txt`);
      fs.writeFileSync(textFile, text);

      let command;
      if (this.usePythonModule) {
        // Use Python module
        command = `python -c "
import piper
import sys

# Load voice
voice = piper.PiperVoice.load('${modelFile}')

# Synthesize
with open('${outputFile}', 'wb') as f:
    voice.synthesize('${text.replace(/'/g, "\\'")}', f)

print('Synthesis complete')
"`;
      } else {
        // Use executable
        command = `echo "${text.replace(/"/g, '\\"')}" | "${this.piperPath}" -m "${modelFile}" -o "${outputFile}" --speed ${speed} --noise_scale ${noiseScale} --noise_w ${noiseW}`;
      }

      // Execute synthesis
      await this.executeCommand(command);

      // Clean up temp file
      fs.unlinkSync(textFile);

      // Read the generated audio file
      const audioBuffer = fs.readFileSync(outputFile);
      
      // Clean up output file
      fs.unlinkSync(outputFile);

      return audioBuffer;

    } catch (error) {
      console.error('Error synthesizing speech:', error);
      throw error;
    }
  }

  async getAvailableModels() {
    try {
      const modelFiles = fs.readdirSync(this.modelPath)
        .filter(file => file.endsWith('.onnx'))
        .map(file => file.replace('.onnx', ''));
      
      return modelFiles;
    } catch (error) {
      console.error('Error getting available models:', error);
      return [];
    }
  }

  async downloadModel(modelName) {
    // This would need to be implemented to download models from Piper's model repository
    // For now, users will need to manually download models
    throw new Error('Model downloading not implemented. Please download models manually.');
  }
}

export default new PiperTTS();
