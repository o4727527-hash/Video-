// Procedural Vox-style soundtrack + SFX synthesizer
// Works both in browser Web Audio API (live preview) and offline Float32Array PCM buffer (MP4 export)

export const AUDIO_SAMPLE_RATE = 48000;

const C_MAJOR_9 = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
const PROGRESSION = [
  [261.63, 329.63, 392.0, 493.88], // Cmaj7
  [220.0, 261.63, 329.63, 392.0],  // Am7
  [174.61, 220.0, 261.63, 349.23], // Fmaj7
  [196.0, 246.94, 293.66, 392.0],  // G6
];

// Deterministic PRNG for noise/marker swipe
function pseudoNoise(i: number): number {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

export function synthesizeAudioPCM(durationSec: number, sampleRate = AUDIO_SAMPLE_RATE): Float32Array {
  const totalSamples = Math.floor(durationSec * sampleRate);
  const out = new Float32Array(totalSamples);
  const beatDur = 60 / 112; // 112 BPM upbeat editorial pulse

  const addTone = (
    startTime: number,
    dur: number,
    freqStart: number,
    freqEnd: number,
    amp: number,
    harmonic = 0.25
  ) => {
    const s0 = Math.floor(startTime * sampleRate);
    const len = Math.floor(dur * sampleRate);
    for (let i = 0; i < len; i++) {
      const idx = s0 + i;
      if (idx < 0 || idx >= totalSamples) break;
      const t = i / sampleRate;
      const env = Math.min(1, t / 0.008) * Math.exp(-t * (5.5 / dur));
      const freq = freqStart + (freqEnd - freqStart) * (i / len);
      const val =
        Math.sin(2 * Math.PI * freq * t) +
        harmonic * Math.sin(4 * Math.PI * freq * t) * Math.exp(-t * 14);
      out[idx] += val * env * amp;
    }
  };

  const addSwipeSFX = (startTime: number, dur: number, amp: number, pitchShift = 1) => {
    const s0 = Math.floor(startTime * sampleRate);
    const len = Math.floor(dur * sampleRate);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const idx = s0 + i;
      if (idx < 0 || idx >= totalSamples) break;
      const p = i / len;
      const env = Math.sin(p * Math.PI);
      const n = pseudoNoise(idx);
      lp = lp * 0.82 + n * 0.18;
      const sweepTone = Math.sin(2 * Math.PI * (340 + p * 420 * pitchShift) * (i / sampleRate));
      out[idx] += (lp * 0.7 + sweepTone * 0.3) * env * amp;
    }
  };

  // 1. Marimba arpeggio groove + warm bass pulse
  const totalBeats = Math.floor(durationSec / (beatDur / 2));
  for (let b = 0; b < totalBeats; b++) {
    const time = b * (beatDur / 2);
    if (time > durationSec - 0.6) break;
    const bar = Math.floor(b / 8) % PROGRESSION.length;
    const chord = PROGRESSION[bar];
    const note = chord[b % chord.length];
    const fadeOut = time > durationSec - 2.5 ? Math.max(0, (durationSec - time) / 2.5) : 1;

    // Plucked felt marimba note
    addTone(time, 0.32, note * 2, note * 2, 0.075 * fadeOut, 0.15);

    // Warm root bass on downbeats
    if (b % 4 === 0) {
      addTone(time, 0.45, chord[0] * 0.5, chord[0] * 0.495, 0.12 * fadeOut, 0.05);
    }
  }

  // 2. Synced Editorial Motion SFX
  addTone(0.25, 0.18, 120, 58, 0.22, 0.1); // Card slam
  addSwipeSFX(1.05, 0.55, 0.14, 1.1); // Yellow highlight sweep
  [2.7, 2.95, 3.2, 3.45].forEach((tStamp, idx) => {
    addTone(tStamp, 0.09, C_MAJOR_9[idx] * 2, C_MAJOR_9[idx] * 2, 0.12, 0.2);
  });
  addTone(4.1, 0.28, 520, 680, 0.12, 0.3); // Red circle callout

  // Scene transitions
  [5.45, 11.95, 19.45, 26.95, 32.45].forEach((tCut) => {
    addSwipeSFX(tCut, 0.32, 0.18, 0.85);
    addTone(tCut + 0.04, 0.22, 160, 75, 0.16, 0.05);
  });

  // Scene 2 highlight + rhumb ping
  addSwipeSFX(8.3, 0.55, 0.13, 1.15);
  addTone(9.1, 0.22, 659.25, 659.25, 0.1, 0.25);

  // Scene 3 Tissot pops
  [12.9, 14.0, 15.2, 16.5].forEach((tPop, idx) => {
    addTone(tPop, 0.14, 380 + idx * 110, 460 + idx * 140, 0.14, 0.2);
  });

  // Scene 4 Greenland shrink + 14x chime
  addSwipeSFX(21.5, 0.85, 0.11, 0.65);
  addTone(23.7, 0.55, 523.25, 523.25, 0.13, 0.35);
  addTone(23.82, 0.55, 659.25, 659.25, 0.11, 0.35);

  // Scene 6 outro highlight
  addSwipeSFX(33.25, 0.6, 0.12, 1.0);

  // Soft limiter
  for (let i = 0; i < totalSamples; i++) {
    out[i] = Math.tanh(out[i] * 1.15);
  }
  return out;
}

// Browser live playback helper using AudioBufferSourceNode
export class VoxAudioPlayer {
  private ctx: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;

  private ensureInit() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx({ sampleRate: AUDIO_SAMPLE_RATE });
      this.gain = this.ctx.createGain();
      this.gain.connect(this.ctx.destination);
      const pcm = synthesizeAudioPCM(36, AUDIO_SAMPLE_RATE);
      this.buffer = this.ctx.createBuffer(1, pcm.length, AUDIO_SAMPLE_RATE);
      this.buffer.getChannelData(0).set(pcm);
    }
  }

  public start(offsetSec: number, playbackRate = 1, muted = false) {
    this.stop();
    this.ensureInit();
    if (!this.ctx || !this.buffer || !this.gain) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    this.gain.gain.value = muted ? 0 : 0.85;
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    src.playbackRate.value = playbackRate;
    src.connect(this.gain);
    src.start(0, Math.max(0, Math.min(35.9, offsetSec)));
    this.source = src;
  }

  public setMuted(muted: boolean) {
    if (this.gain) {
      this.gain.gain.value = muted ? 0 : 0.85;
    }
  }

  public stop() {
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        // ignore if already stopped
      }
      this.source.disconnect();
      this.source = null;
    }
  }

  public dispose() {
    this.stop();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
