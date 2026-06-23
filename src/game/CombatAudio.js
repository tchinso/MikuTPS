export class CombatAudio {
  constructor(volume = 0.8) {
    this.volume = volume;
    this.context = null;
    this.lastPlayed = new Map();
  }

  unlock() {
    if (!this.context) {
      const AudioContext = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext({ latencyHint: 'interactive' });
    }
    if (this.context.state === 'suspended') this.context.resume().catch(() => {});
  }

  play(type) {
    const context = this.context;
    if (!context || context.state !== 'running' || this.volume <= 0) return;
    const preset = presets[type];
    if (!preset) return;
    const now = context.currentTime;
    const previous = this.lastPlayed.get(type) ?? -Infinity;
    if (now - previous < (preset.throttle ?? 0)) return;
    this.lastPlayed.set(type, now);

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = preset.wave;
    oscillator.frequency.setValueAtTime(preset.from, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, preset.to), now + preset.duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(preset.gain * this.volume, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + preset.duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + preset.duration + 0.01);
  }

  destroy() {
    this.context?.close?.().catch(() => {});
    this.context = null;
  }
}

const presets = {
  shot: { wave: 'square', from: 360, to: 95, duration: 0.045, gain: 0.025, throttle: 0.045 },
  hit: { wave: 'triangle', from: 510, to: 250, duration: 0.038, gain: 0.018, throttle: 0.035 },
  weak: { wave: 'sine', from: 960, to: 480, duration: 0.085, gain: 0.035, throttle: 0.055 },
  break: { wave: 'sawtooth', from: 120, to: 38, duration: 0.18, gain: 0.085, throttle: 0.12 },
  kill: { wave: 'triangle', from: 260, to: 74, duration: 0.11, gain: 0.042, throttle: 0.045 },
  skill: { wave: 'sine', from: 680, to: 130, duration: 0.24, gain: 0.065, throttle: 0.15 },
  dodge: { wave: 'sine', from: 210, to: 720, duration: 0.1, gain: 0.032, throttle: 0.08 },
  hurt: { wave: 'sawtooth', from: 145, to: 62, duration: 0.13, gain: 0.05, throttle: 0.12 }
};
