import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private bgmEnabled = true;
  private bgmTimer: ReturnType<typeof setInterval> | null = null;
  private bgmStep = 0;

  constructor() {
    try {
      this.muted = localStorage.getItem('splendor_muted') === '1';
      this.bgmEnabled = localStorage.getItem('splendor_bgm') !== '0';
    } catch {
      this.muted = false;
      this.bgmEnabled = true;
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  isBgmEnabled(): boolean {
    return this.bgmEnabled;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem('splendor_muted', muted ? '1' : '0');
    } catch {
      // ignore
    }
    if (muted) this.stopBgm();
    else if (this.bgmEnabled) this.startBgm();
  }

  setBgmEnabled(enabled: boolean): void {
    this.bgmEnabled = enabled;
    try {
      localStorage.setItem('splendor_bgm', enabled ? '1' : '0');
    } catch {
      // ignore
    }
    if (enabled && !this.muted) this.startBgm();
    else this.stopBgm();
  }

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Gentle procedural Renaissance lute/harp arpeggio in D Dorian mode.
   */
  startBgm(): void {
    if (this.muted || !this.bgmEnabled || this.bgmTimer || typeof window === 'undefined') return;
    // D Dorian Renaissance progression (Dm - C - G - Am - F - C - Dm - A)
    const chords: number[][] = [
      [293.66, 349.23, 440.0, 587.33],
      [261.63, 329.63, 392.0, 523.25],
      [196.0, 293.66, 392.0, 493.88],
      [220.0, 261.63, 329.63, 440.0],
      [174.61, 261.63, 349.23, 440.0],
      [261.63, 329.63, 392.0, 523.25],
      [293.66, 349.23, 440.0, 523.25],
      [220.0, 293.66, 329.63, 440.0],
    ];
    const pattern = [0, 1, 2, 3, 2, 1, 3, 2];

    this.bgmTimer = setInterval(() => {
      if (this.muted || !this.bgmEnabled) return;
      const ctx = this.getContext();
      if (!ctx || ctx.state !== 'running') return;

      const bar = Math.floor(this.bgmStep / 8) % chords.length;
      const beat = this.bgmStep % 8;
      const freq = chords[bar][pattern[beat]];
      this.bgmStep++;

      // Warm plucked lute string via low-pass triangle
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(380, now + 0.75);

      gain.gain.setValueAtTime(0.0005, now);
      gain.gain.linearRampToValueAtTime(beat === 0 ? 0.036 : 0.022, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.85);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.9);
    }, 520);
  }

  stopBgm(): void {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainPeak = 0.14,
    delay = 0
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;
    if (this.bgmEnabled && !this.bgmTimer) this.startBgm();

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /**
   * Realistic heavy ceramic poker-chip click sound.
   */
  private chipClack(delay = 0, pitch = 1): void {
    const ctx = this.getContext();
    if (!ctx) return;
    if (this.bgmEnabled && !this.bgmTimer) this.startBgm();

    const now = ctx.currentTime + delay;
    // Short filtered noise burst for ceramic impact
    const bufLen = Math.floor(ctx.sampleRate * 0.028);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.22));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2600 * pitch, now);
    bp.Q.setValueAtTime(4.5, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);

    noise.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);

    // Subtle ceramic ring overtone
    this.tone(1880 * pitch, 0.06, 'sine', 0.065, delay);
    this.tone(3120 * pitch, 0.045, 'triangle', 0.035, delay + 0.004);
  }

  private vibrate(style: ImpactStyle): void {
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style }).catch(() => {});
    }
  }

  playGemSelect(): void {
    this.chipClack(0, 1.05);
    this.vibrate(ImpactStyle.Light);
  }

  playGemTake(): void {
    this.chipClack(0, 0.92);
    this.chipClack(0.065, 1.06);
    this.chipClack(0.13, 1.18);
    this.vibrate(ImpactStyle.Medium);
  }

  playBuyCard(): void {
    this.chipClack(0, 0.95);
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.tone(n, 0.34, 'triangle', 0.11, 0.04 + idx * 0.055);
    });
    this.vibrate(ImpactStyle.Medium);
  }

  playReserve(): void {
    this.tone(440, 0.14, 'sine', 0.1, 0);
    this.chipClack(0.06, 1.25);
    this.tone(659.25, 0.2, 'triangle', 0.1, 0.09);
    this.vibrate(ImpactStyle.Light);
  }

  playNobleOrCity(): void {
    const fanfare = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.5];
    fanfare.forEach((n, idx) => {
      this.tone(n, 0.42, 'triangle', 0.13, idx * 0.07);
    });
    this.vibrate(ImpactStyle.Heavy);
  }

  playStronghold(): void {
    this.tone(175, 0.18, 'sawtooth', 0.09, 0);
    this.tone(245, 0.16, 'triangle', 0.1, 0.05);
    this.vibrate(ImpactStyle.Medium);
  }

  playVictory(): void {
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
    chord.forEach((n, idx) => {
      this.tone(n, 0.65, 'triangle', 0.13, idx * 0.085);
    });
    this.vibrate(ImpactStyle.Heavy);
  }

  playError(): void {
    this.tone(210, 0.14, 'sawtooth', 0.08);
    this.tone(165, 0.16, 'sawtooth', 0.07, 0.08);
  }
}

export const soundEngine = new SoundEngine();
