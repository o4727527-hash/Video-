import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import {
  DURATION_SEC,
  FPS,
  DEFAULT_CONFIG,
  prepareWorldData,
  renderVoxFrame,
} from './voxRenderer.mjs';
import { synthesizeAudioPCM, AUDIO_SAMPLE_RATE } from './voxAudio.mjs';

const require = createRequire(import.meta.url);
const worldAtlas = require('world-atlas/countries-110m.json');

GlobalFonts.registerFromPath('/tmp/vox-render/fonts/Oswald.ttf', 'Oswald');
GlobalFonts.registerFromPath('/tmp/vox-render/fonts/PlusJakartaSans.ttf', 'Plus Jakarta Sans');
GlobalFonts.registerFromPath('/tmp/vox-render/fonts/SourceSerif4-Italic.ttf', 'Source Serif 4');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Bold.ttf', 'JetBrains Mono');

function writeWav(filePath, floatSamples, sampleRate) {
  const numSamples = floatSamples.length;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(1, 22);  // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, floatSamples[i]));
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  fs.writeFileSync(filePath, buffer);
}

console.log('Preparing world geometry...');
const world = prepareWorldData(worldAtlas);

console.log('Synthesizing audio track...');
const pcm = synthesizeAudioPCM(DURATION_SEC, AUDIO_SAMPLE_RATE);
const wavPath = '/tmp/vox-render/audio.wav';
writeWav(wavPath, pcm, AUDIO_SAMPLE_RATE);

// Render 1280x720 editorial thumbnail from Scene 1 peak moment (t=4.6s)
const thumbCanvas = createCanvas(1280, 720);
const thumbCtx = thumbCanvas.getContext('2d');
renderVoxFrame(thumbCtx, 4.6, 1280, 720, world, DEFAULT_CONFIG);
fs.writeFileSync('/tmp/vox-render/thumb_vox.jpg', thumbCanvas.toBuffer('image/jpeg', 92));
console.log('Saved thumb_vox.jpg');

// Stream 1080 frames (1920x1080 RGBA) directly to FFmpeg
const WIDTH = 1920;
const HEIGHT = 1080;
const totalFrames = DURATION_SEC * FPS;
const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

const outMp4 = '/tmp/vox-render/vox_explainer.mp4';
const ff = spawn('ffmpeg', [
  '-y',
  '-f', 'rawvideo',
  '-vcodec', 'rawvideo',
  '-pix_fmt', 'rgba',
  '-s', `${WIDTH}x${HEIGHT}`,
  '-r', String(FPS),
  '-i', '-',
  '-i', wavPath,
  '-c:v', 'libx264',
  '-preset', 'medium',
  '-crf', '18',
  '-pix_fmt', 'yuv420p',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-ac', '2',
  '-movflags', '+faststart',
  '-shortest',
  outMp4,
], { stdio: ['pipe', 'inherit', 'pipe'] });

let ffErr = '';
ff.stderr.on('data', (d) => { ffErr += d.toString(); });

for (let frame = 0; frame < totalFrames; frame++) {
  const t = frame / FPS;
  renderVoxFrame(ctx, t, WIDTH, HEIGHT, world, DEFAULT_CONFIG);
  const raw = Buffer.from(ctx.getImageData(0, 0, WIDTH, HEIGHT).data.buffer);
  const ok = ff.stdin.write(raw);
  if (!ok) {
    await new Promise((res) => ff.stdin.once('drain', res));
  }
  if (frame % 180 === 0) {
    console.log(`Rendered frame ${frame}/${totalFrames} (${Math.round((frame / totalFrames) * 100)}%)`);
  }
}

ff.stdin.end();
await new Promise((resolve, reject) => {
  ff.on('close', (code) => {
    if (code === 0) resolve();
    else reject(new Error(`FFmpeg exited with ${code}:\n${ffErr}`));
  });
});

console.log('Video render complete:', outMp4);
