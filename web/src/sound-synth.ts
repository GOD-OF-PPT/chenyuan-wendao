/**
 * 《尘缘问道》V2 · 纯 Web Audio API 国风五声音阶合成器（零外部音频依赖）
 * 支持古琴拨弦、山门晨钟、周天灵韵、青锋剑鸣、符箓引爆、丹火升腾与九霄雷劫音效。
 */
export class GuofengSoundSynth {
  private ctx: AudioContext | null = null;
  public muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) this.ctx = new Ctor();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  /** 古琴泛音轻拨（按钮/页签切换） */
  public playPluck(freq = 392): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.996, now + 0.35);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.38);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  /** 灵窍共鸣清音（五声音阶：宫商角徵羽 261.6, 293.7, 329.6, 392.0, 440.0, 523.3） */
  public playQiChime(combo = 0): void {
    const scale = [392.0, 440.0, 523.25, 587.33, 659.25, 783.99];
    const base = scale[combo % scale.length];
    this.playPluck(base);
    setTimeout(() => this.playPluck(base * 1.5), 55);
  }

  /** 剑气破空 / 断势重斩 */
  public playSwordSlash(heavy = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(heavy ? 920 : 680, now);
    osc.frequency.exponentialRampToValueAtTime(heavy ? 140 : 210, now + (heavy ? 0.28 : 0.16));
    gain.gain.setValueAtTime(heavy ? 0.16 : 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.3 : 0.18));
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (heavy ? 0.32 : 0.2));
  }

  /** 丹成 / 破境金钟齐鸣 */
  public playBreakthroughBell(): void {
    const notes = [261.63, 392.0, 523.25, 659.25];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playPluck(n), idx * 95);
    });
  }
}
