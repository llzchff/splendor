import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem('splendor_muted') === '1';
    } catch {
      this.muted = false;
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem('splendor_muted', muted ? '1' : '0');
    } catch {
      // ignore storage errors
    }
  }

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
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
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private vibrate(style: ImpactStyle): void {
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style }).catch(() => {});
    }
  }

  playGemSelect(): void {
    this.tone(1180, 0.09, 'triangle', 0.11);
    this.tone(1760, 0.07, 'sine', 0.06, 0.015);
    this.vibrate(ImpactStyle.Light);
  }

  playGemTake(): void {
    this.tone(660, 0.12, 'triangle', 0.12, 0);
    this.tone(880, 0.14, 'triangle', 0.12, 0.06);
    this.tone(1320, 0.18, 'sine', 0.09, 0.12);
    this.vibrate(ImpactStyle.Medium);
  }

  playBuyCard(): void {
    // Warm Renaissance harp arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.tone(n, 0.28, 'triangle', 0.12, idx * 0.05);
    });
    this.vibrate(ImpactStyle.Medium);
  }

  playReserve(): void {
    this.tone(440, 0.12, 'sine', 0.1, 0);
    this.tone(587.33, 0.16, 'triangle', 0.1, 0.07);
    this.vibrate(ImpactStyle.Light);
  }

  playNobleOrCity(): void {
    const fanfare = [523.25, 659.25, 783.99, 987.77, 1046.5];
    fanfare.forEach((n, idx) => {
      this.tone(n, 0.36, 'triangle', 0.14, idx * 0.075);
    });
    this.vibrate(ImpactStyle.Heavy);
  }

  playStronghold(): void {
    this.tone(190, 0.15, 'sawtooth', 0.08, 0);
    this.tone(260, 0.14, 'triangle', 0.1, 0.05);
    this.vibrate(ImpactStyle.Medium);
  }

  playVictory(): void {
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
    chord.forEach((n, idx) => {
      this.tone(n, 0.55, 'triangle', 0.13, idx * 0.085);
    });
    this.vibrate(ImpactStyle.Heavy);
  }

  playError(): void {
    this.tone(210, 0.14, 'sawtooth', 0.08);
    this.tone(165, 0.16, 'sawtooth', 0.07, 0.08);
  }
}

export const soundEngine = new SoundEngine();
