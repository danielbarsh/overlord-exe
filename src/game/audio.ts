/**
 * Procedural sci-fi audio — everything is synthesized with the Web Audio API. No files.
 */
class Sfx {
  private ctx?: AudioContext;
  private master?: GainNode;
  private noiseBuf?: AudioBuffer;
  private hum?: { osc: OscillatorNode[]; gain: GainNode };
  muted = false;

  private ensure(): AudioContext | undefined {
    if (this.muted) return undefined;
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.55;
        const comp = this.ctx.createDynamicsCompressor();
        this.master.connect(comp);
        comp.connect(this.ctx.destination);
        const len = this.ctx.sampleRate * 1.5;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return undefined;
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (m) this.laserHum(false);
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.05);
  }

  /** unlock on first user gesture */
  unlock() {
    this.ensure();
  }

  private tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; to?: number; delay?: number; attack?: number } = {}) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t0 + dur);
    const vol = opts.vol ?? 0.15;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + (opts.attack ?? 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, opts: { vol?: number; freq?: number; to?: number; type?: BiquadFilterType; delay?: number; q?: number } = {}) {
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.noiseBuf) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? 'lowpass';
    f.Q.value = opts.q ?? 1;
    f.frequency.setValueAtTime(opts.freq ?? 2000, t0);
    if (opts.to) f.frequency.exponentialRampToValueAtTime(Math.max(30, opts.to), t0 + dur);
    const g = ctx.createGain();
    const vol = opts.vol ?? 0.3;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  click() { this.tone(1800, 0.04, { type: 'square', vol: 0.06, to: 900 }); }
  key() { this.tone(2400 + Math.random() * 600, 0.018, { type: 'square', vol: 0.018 }); }
  hover() { this.tone(1200, 0.03, { type: 'sine', vol: 0.03 }); }
  compile() {
    [0, 0.07, 0.14, 0.21, 0.28].forEach((d, i) => this.tone(440 + i * 140, 0.06, { type: 'square', vol: 0.05, delay: d }));
  }
  buildOk() { this.tone(880, 0.09, { type: 'triangle', vol: 0.12 }); this.tone(1320, 0.14, { type: 'triangle', vol: 0.12, delay: 0.08 }); }
  error() {
    this.tone(160, 0.32, { type: 'sawtooth', vol: 0.16, to: 70 });
    this.tone(166, 0.32, { type: 'square', vol: 0.08, to: 72 });
  }
  denied() { [0, 0.18].forEach((d) => this.tone(220, 0.14, { type: 'square', vol: 0.12, delay: d })); }
  transmit() { for (let i = 0; i < 5; i++) this.tone(900 + Math.random() * 1400, 0.04, { type: 'square', vol: 0.04, delay: i * 0.045 }); }
  dash() { this.noise(0.35, { freq: 600, to: 4000, type: 'bandpass', vol: 0.4, q: 2 }); this.tone(300, 0.3, { type: 'sawtooth', vol: 0.05, to: 1200 }); }
  jump() { this.tone(240, 0.28, { type: 'square', vol: 0.09, to: 900 }); this.noise(0.25, { freq: 1500, type: 'highpass', vol: 0.12 }); }
  shield() {
    this.tone(500, 0.6, { type: 'sine', vol: 0.12, to: 1400, attack: 0.05 });
    this.tone(760, 0.6, { type: 'triangle', vol: 0.06, to: 2100, attack: 0.05 });
  }
  emp() {
    this.tone(1400, 0.5, { type: 'sawtooth', vol: 0.1, to: 50 });
    this.noise(0.7, { freq: 5000, to: 200, vol: 0.45 });
    this.tone(55, 0.6, { type: 'sine', vol: 0.3, delay: 0.05 });
  }
  pulse() {
    this.tone(1800, 0.12, { type: 'sawtooth', vol: 0.07, to: 400 });
    this.noise(0.12, { freq: 3500, type: 'bandpass', vol: 0.15, q: 3 });
  }
  droneDown() {
    this.noise(0.35, { freq: 1200, to: 100, vol: 0.35 });
    this.tone(400, 0.3, { type: 'square', vol: 0.05, to: 60 });
  }
  clank() { this.tone(180, 0.08, { type: 'square', vol: 0.08 }); this.noise(0.08, { freq: 2500, type: 'highpass', vol: 0.1 }); }
  tired() { this.tone(300, 0.5, { type: 'sine', vol: 0.12, to: 120 }); }
  zap() {
    this.noise(0.2, { freq: 3000, type: 'bandpass', vol: 0.4, q: 4 });
    this.tone(1600, 0.2, { type: 'sawtooth', vol: 0.08, to: 200 });
  }
  explode() {
    this.noise(1.2, { freq: 1800, to: 60, vol: 0.7 });
    this.tone(90, 0.8, { type: 'sine', vol: 0.4, to: 30 });
  }
  reassemble() {
    [0, 0.06, 0.12, 0.18, 0.24, 0.3].forEach((d, i) => this.tone(300 + i * 90, 0.05, { type: 'square', vol: 0.05, delay: d }));
    this.tone(1200, 0.2, { type: 'triangle', vol: 0.1, delay: 0.38 });
  }
  gateOpen() {
    this.noise(1.1, { freq: 200, to: 800, vol: 0.25 });
    this.tone(70, 1.1, { type: 'sawtooth', vol: 0.06, to: 140 });
  }
  granted() { [523, 659, 784].forEach((f, i) => this.tone(f, 0.14, { type: 'triangle', vol: 0.12, delay: i * 0.09 })); }
  victory() {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((f, i) => this.tone(f, i === notes.length - 1 ? 0.6 : 0.14, { type: 'square', vol: 0.08, delay: i * 0.11 }));
    notes.forEach((f, i) => this.tone(f / 2, 0.14, { type: 'triangle', vol: 0.08, delay: i * 0.11 }));
  }
  alarm() { [0, 0.3, 0.6].forEach((d) => this.tone(700, 0.25, { type: 'sawtooth', vol: 0.08, to: 400, delay: d })); }
  hint() { this.tone(1046, 0.1, { type: 'sine', vol: 0.1 }); this.tone(1568, 0.18, { type: 'sine', vol: 0.08, delay: 0.08 }); }
  aura() { this.tone(300 + Math.random() * 500, 0.035, { type: 'triangle', vol: 0.035 }); }
  glitch() { for (let i = 0; i < 6; i++) this.tone(100 + Math.random() * 2000, 0.03, { type: 'square', vol: 0.06, delay: i * 0.03 }); }
  teleport() { this.tone(200, 0.4, { type: 'sine', vol: 0.12, to: 1800 }); this.noise(0.3, { freq: 4000, type: 'highpass', vol: 0.08 }); }

  /** continuous hum while lasers are visible */
  laserHum(on: boolean) {
    const ctx = on ? this.ensure() : this.ctx;
    if (!ctx || !this.master) return;
    if (on && !this.hum) {
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      gain.gain.setTargetAtTime(0.03, ctx.currentTime, 0.2);
      const a = ctx.createOscillator();
      a.type = 'sawtooth';
      a.frequency.value = 58;
      const b = ctx.createOscillator();
      b.type = 'sine';
      b.frequency.value = 117;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 6;
      const lg = ctx.createGain();
      lg.gain.value = 4;
      lfo.connect(lg).connect(a.frequency);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 500;
      a.connect(f);
      b.connect(f);
      f.connect(gain).connect(this.master);
      [a, b, lfo].forEach((o) => o.start());
      this.hum = { osc: [a, b, lfo], gain };
    } else if (!on && this.hum) {
      const h = this.hum;
      this.hum = undefined;
      h.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.1);
      setTimeout(() => h.osc.forEach((o) => o.stop()), 500);
    }
  }
}

export const sfx = new Sfx();
