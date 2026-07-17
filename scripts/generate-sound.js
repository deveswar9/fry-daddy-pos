import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateWav() {
  const sampleRate = 44100;
  const duration = 0.6; // 0.6 seconds
  const numSamples = sampleRate * duration;
  const buffer = Buffer.alloc(44 + numSamples * 2); // 16-bit mono PCM

  // Write WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4); // ChunkSize
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(1, 22); // NumChannels (1 = Mono)
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40); // Subchunk2Size

  // Write PCM data: a nice minor-third double chime (A5 to C6)
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    
    // Tone 1: 880 Hz (A5), starts at 0s, decays exponentially
    if (t >= 0) {
      const decay1 = Math.exp(-8 * t);
      sample += Math.sin(2 * Math.PI * 880 * t) * decay1 * 0.45;
    }
    // Tone 2: 1046.50 Hz (C6), starts at 0.12s, decays exponentially
    if (t >= 0.12) {
      const t2 = t - 0.12;
      const decay2 = Math.exp(-5 * t2);
      sample += Math.sin(2 * Math.PI * 1046.50 * t2) * decay2 * 0.5;
    }

    // Clip amplitude to prevent distortion
    sample = Math.max(-1, Math.min(1, sample));
    // Convert to 16-bit signed integer PCM
    const pcmValue = Math.floor(sample * 32767);
    buffer.writeInt16LE(pcmValue, offset);
    offset += 2;
  }

  const outputPath = path.join(__dirname, '..', 'public', 'notification.wav');
  // Ensure the public directory exists
  const publicDir = path.dirname(outputPath);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, buffer);
  console.log(`WAV file successfully generated at: ${outputPath}`);
}

generateWav();
