/**
 * Canvas engine: render loop, tweening (promise-based, cancellable), particles,
 * screen-shake, flashes and the hero robot. Scene modules draw props and choreograph playback.
 */
import { sfx } from '../audio';
import type { SceneModule } from '../scenes/types';
import type { SubLevel } from '../types';
import { drawBackground } from './background';
import { drawRobot, type RobotState } from './robot';

import { FLOOR, H, ROBOT_Y, START_X, W, roundRect } from './constants';

export { FLOOR, H, ROBOT_Y, START_X, W, roundRect };

export class Cancelled extends Error {
  constructor() {
    super('cancelled');
  }
}

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number; color: string;
  kind: 'spark' | 'smoke' | 'debris' | 'ring' | 'glow' | 'hex';
  rot?: number; vr?: number; g?: number; maxR?: number; lw?: number;
}

export interface FloatText { x: number; y: number; text: string; color: string; life: number; max: number; size: number; vy: number }

interface Anim {
  start: number;
  dur: number;
  fn: (k: number) => void;
  ease: (k: number) => number;
  resolve: () => void;
  reject: (e: unknown) => void;
}

export const ease = {
  linear: (k: number) => k,
  inOut: (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  out: (k: number) => 1 - Math.pow(1 - k, 3),
  in: (k: number) => k * k * k,
  back: (k: number) => 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2),
};

export function newRobot(): RobotState {
  return {
    x: START_X, y: ROBOT_Y, rot: 0, sx: 1, sy: 1, visible: true, alpha: 1, shield: 0, charge: 0,
    trail: false, history: [], eyes: 'normal', look: 0.3, hover: 1, tired: 0,
  };
}

export class Engine {
  canvas?: HTMLCanvasElement;
  ctx?: CanvasRenderingContext2D;
  private raf = 0;
  private ro?: ResizeObserver;
  private dpr = 1;
  private scale = 1;
  private ox = 0;
  private oy = 0;
  time = 0; // seconds
  private lastTs = 0;

  robot: RobotState = newRobot();
  particles: Particle[] = [];
  texts: FloatText[] = [];
  private anims: Anim[] = [];
  private shakeMag = 0;
  private shakeUntil = 0;
  private flashColor = '#fff';
  private flashA = 0;
  /** 0..1 — AURA's wall eye intensity / mood */
  eyeGlow = 0.4;
  eyeColor = '#ff2bd6';
  banner: { text: string; color: string; t: number } | null = null;

  scene?: SceneModule;
  level?: SubLevel;
  /** scene-owned mutable state */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  s: any = {};
  private gen = 0;
  busy = false;

  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement!);
    this.resize();
    this.lastTs = performance.now();
    const loop = (ts: number) => {
      const dt = Math.min(0.1, (ts - this.lastTs) / 1000); // cap keeps slow PCs near real time
      this.lastTs = ts;
      this.update(dt, ts);
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  detach() {
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.cancel();
  }

  private resize() {
    const c = this.canvas;
    if (!c?.parentElement) return;
    const r = c.parentElement.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.max(1, Math.floor(r.width * this.dpr));
    c.height = Math.max(1, Math.floor(r.height * this.dpr));
    c.style.width = r.width + 'px';
    c.style.height = r.height + 'px';
    // "cover" horizontally-biased: fill height, keep the action area visible
    this.scale = Math.min(c.width / W, c.height / H);
    this.ox = (c.width - W * this.scale) / 2;
    this.oy = (c.height - H * this.scale) / 2;
  }

  // ---------- scene control ----------
  setScene(scene: SceneModule, level: SubLevel) {
    this.cancel();
    this.scene?.teardown?.(this);
    this.scene = scene;
    this.level = level;
    this.s = {};
    this.robot = newRobot();
    this.particles = [];
    this.texts = [];
    this.banner = null;
    this.eyeGlow = 0.4;
    scene.setup(this, level);
  }

  /** Reset the current scene to its idle state (e.g. Reset button). */
  resetScene() {
    if (this.scene && this.level) this.setScene(this.scene, this.level);
  }

  /** Recon mode: reset the scene and show test case `i` without running anything. */
  preview(i: number) {
    if (!this.scene || !this.level) return;
    this.setScene(this.scene, this.level);
    const t = this.level.tests[i];
    if (!t) return;
    this.scene.preview?.(this, this.level, i);
    this.setBanner(`סיור: ${t.label}`, '#9fe8ff');
  }

  cancel() {
    this.gen++;
    const pending = this.anims;
    this.anims = [];
    pending.forEach((a) => a.reject(new Cancelled()));
    this.busy = false;
  }

  /** Generation token — scenes check it to stop after cancel */
  get token() {
    return this.gen;
  }

  animate(ms: number, fn: (k: number) => void = () => {}, e: (k: number) => number = ease.inOut): Promise<void> {
    const gen = this.gen;
    return new Promise<void>((resolve, reject) => {
      this.anims.push({
        start: this.time,
        dur: Math.max(0.001, ms / 1000),
        fn,
        ease: e,
        resolve: () => (gen === this.gen ? resolve() : reject(new Cancelled())),
        reject,
      });
    });
  }

  wait(ms: number) {
    return this.animate(ms);
  }

  // ---------- effects ----------
  shake(mag: number, ms: number) {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeUntil = Math.max(this.shakeUntil, this.time + ms / 1000);
  }

  flash(color: string, strength = 0.7) {
    this.flashColor = color;
    this.flashA = strength;
  }

  sparks(x: number, y: number, n: number, color: string, speed = 260) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random());
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.3 + Math.random() * 0.5, size: 1.5 + Math.random() * 2.5, color, kind: 'spark', g: 500 });
    }
  }

  smoke(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      this.particles.push({ x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 20, vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 50, life: 0, max: 1 + Math.random() * 1.2, size: 12 + Math.random() * 18, color: '#3a3f55', kind: 'smoke' });
    }
  }

  ring(x: number, y: number, color: string, maxR: number, dur = 0.6, lw = 4) {
    this.particles.push({ x, y, vx: 0, vy: 0, life: 0, max: dur, size: 0, color, kind: 'ring', maxR, lw });
  }

  glowBurst(x: number, y: number, color: string, size: number, dur = 0.4) {
    this.particles.push({ x, y, vx: 0, vy: 0, life: 0, max: dur, size, color, kind: 'glow' });
  }

  say(text: string, color = '#e6f6ff', x = this.robot.x, y = this.robot.y - 70) {
    this.texts.push({ x, y, text, color, life: 0, max: 1.6, size: 20, vy: -26 });
  }

  setBanner(text: string, color = '#22e4ff') {
    this.banner = { text, color, t: this.time };
  }

  // ---------- robot helpers ----------
  async moveRobot(x: number, ms: number, e = ease.inOut, yFn?: (k: number) => number) {
    const r = this.robot;
    const x0 = r.x;
    const y0 = r.y;
    r.look = Math.sign(x - x0) * 0.8;
    await this.animate(ms, (k) => {
      r.x = x0 + (x - x0) * k;
      if (yFn) r.y = y0 + yFn(k);
    }, e);
    r.look = 0.3;
  }

  async explodeRobot() {
    const r = this.robot;
    sfx.explode();
    this.shake(14, 600);
    this.flash('#ffb020', 0.8);
    this.eyeGlow = 1;
    r.visible = false;
    r.trail = false;
    r.shield = 0;
    this.glowBurst(r.x, r.y, '#ffb020', 120, 0.5);
    this.sparks(r.x, r.y, 60, '#ffd27a', 420);
    this.sparks(r.x, r.y, 25, '#22e4ff', 300);
    this.smoke(r.x, r.y, 14);
    const colors = ['#c9d4e6', '#8592ad', '#22e4ff', '#ff8a1f', '#2a3148'];
    for (let i = 0; i < 18; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
      const v = 250 + Math.random() * 350;
      this.particles.push({
        x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 2.2, size: 6 + Math.random() * 10,
        color: colors[i % colors.length], kind: 'debris', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 18, g: 900,
      });
    }
    this.say('💥 KABOOM', '#ffb020', r.x, r.y - 40);
    await this.wait(1200);
  }

  async reassembleRobot(x = START_X) {
    const r = this.robot;
    r.x = x;
    r.y = ROBOT_Y;
    r.rot = 0;
    // debris flies back in
    const pieces: Particle[] = [];
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 140 + Math.random() * 120;
      pieces.push({ x: x + Math.cos(a) * d, y: ROBOT_Y + Math.sin(a) * d * 0.6, vx: 0, vy: 0, life: 0, max: 0.9, size: 6 + Math.random() * 8, color: i % 3 ? '#9aa7c2' : '#22e4ff', kind: 'debris', rot: Math.random() * 6, vr: 0, g: 0 });
    }
    const starts = pieces.map((p) => ({ x: p.x, y: p.y }));
    this.particles.push(...pieces);
    sfx.reassemble();
    await this.animate(800, (k) => {
      pieces.forEach((p, i) => {
        p.x = starts[i].x + (x - starts[i].x) * k;
        p.y = starts[i].y + (ROBOT_Y - starts[i].y) * k;
        p.life = 0;
        p.rot = (p.rot ?? 0) + 0.3;
      });
    }, ease.in);
    pieces.forEach((p) => (p.life = p.max));
    r.visible = true;
    r.alpha = 1;
    r.eyes = 'dizzy';
    r.sx = 1.3;
    r.sy = 0.7;
    this.glowBurst(x, ROBOT_Y, '#22e4ff', 80, 0.35);
    this.sparks(x, ROBOT_Y, 20, '#22e4ff', 200);
    await this.animate(300, (k) => {
      r.sx = 1.3 - 0.3 * ease.back(k);
      r.sy = 0.7 + 0.3 * ease.back(k);
    }, ease.linear);
    r.sx = 1;
    r.sy = 1;
    this.say('...אני בסדר', '#9fe8ff', x, ROBOT_Y - 70);
    await this.wait(1100);
    r.eyes = 'normal';
    this.eyeGlow = 0.4;
  }

  async teleportRobot(x: number) {
    const r = this.robot;
    sfx.teleport();
    this.glowBurst(r.x, r.y, '#22e4ff', 70, 0.3);
    await this.animate(220, (k) => {
      r.sx = 1 - k * 0.8;
      r.sy = 1 + k * 1.2;
      r.alpha = 1 - k;
    });
    r.x = x;
    r.shield = 0;
    r.trail = false;
    r.history = [];
    this.glowBurst(x, r.y, '#22e4ff', 70, 0.3);
    await this.animate(260, (k) => {
      r.sx = 0.2 + k * 0.8;
      r.sy = 2.2 - k * 1.2;
      r.alpha = k;
    }, ease.out);
    r.sx = 1;
    r.sy = 1;
    r.alpha = 1;
  }

  // ---------- loop ----------
  private update(dt: number, _ts: number) {
    this.time += dt;
    // anims
    const done: Anim[] = [];
    for (const a of this.anims) {
      const k = Math.min(1, (this.time - a.start) / a.dur);
      a.fn(a.ease(k));
      if (k >= 1) done.push(a);
    }
    if (done.length) {
      this.anims = this.anims.filter((a) => !done.includes(a));
      done.forEach((a) => a.resolve());
    }
    // particles
    for (const p of this.particles) {
      p.life += dt;
      if (p.kind === 'spark' || p.kind === 'debris' || p.kind === 'smoke') {
        p.vy += (p.g ?? 0) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.kind === 'smoke') { p.vx *= 0.98; p.size += 10 * dt; }
        if (p.kind === 'debris') {
          p.rot = (p.rot ?? 0) + (p.vr ?? 0) * dt;
          if (p.y > FLOOR + 6 && (p.g ?? 0) > 0) {
            p.y = FLOOR + 6;
            p.vy *= -0.35;
            p.vx *= 0.6;
            p.vr = (p.vr ?? 0) * 0.6;
          }
        }
      }
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
    for (const t of this.texts) {
      t.life += dt;
      t.y += t.vy * dt;
    }
    this.texts = this.texts.filter((t) => t.life < t.max);
    // robot trail history
    const r = this.robot;
    if (r.trail) {
      r.history.unshift({ x: r.x, y: r.y, rot: r.rot });
      if (r.history.length > 10) r.history.pop();
    } else if (r.history.length) r.history.pop();
    if (this.flashA > 0) this.flashA = Math.max(0, this.flashA - dt * 2.2);
    if (this.time > this.shakeUntil) this.shakeMag = 0;
    this.scene?.update?.(this, dt);
  }

  private render() {
    const ctx = this.ctx;
    const c = this.canvas;
    if (!ctx || !c) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // backdrop beyond the letterbox
    const g = ctx.createLinearGradient(0, 0, 0, c.height);
    g.addColorStop(0, '#070a1a');
    g.addColorStop(1, '#02030a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);

    let sx = 0, sy = 0;
    if (this.shakeMag > 0) {
      const rem = Math.max(0, this.shakeUntil - this.time);
      const m = this.shakeMag * Math.min(1, rem * 3);
      sx = (Math.random() - 0.5) * m * 2;
      sy = (Math.random() - 0.5) * m * 2;
    }
    ctx.setTransform(this.scale, 0, 0, this.scale, this.ox + sx * this.scale, this.oy + sy * this.scale);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-200, -200, W + 400, H + 400);
    ctx.clip();

    drawBackground(this, ctx);
    this.scene?.drawBack(this, ctx);
    drawRobot(ctx, this.robot, this.time);
    this.scene?.drawFront?.(this, ctx);
    this.drawParticles(ctx);
    this.drawTexts(ctx);
    this.drawBanner(ctx);
    ctx.restore();

    // screen-space overlays
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.flashA > 0) {
      ctx.globalAlpha = this.flashA;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.globalAlpha = 1;
    }
    const v = ctx.createRadialGradient(c.width / 2, c.height / 2, c.height * 0.35, c.width / 2, c.height / 2, c.height * 0.95);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, c.width, c.height);
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const k = p.life / p.max;
      ctx.save();
      switch (p.kind) {
        case 'spark':
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.lineCap = 'round';
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
          ctx.stroke();
          break;
        case 'smoke':
          ctx.globalAlpha = 0.45 * (1 - k);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'debris':
          ctx.globalAlpha = k > 0.8 ? (1 - k) * 5 : 1;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot ?? 0);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
          ctx.strokeStyle = 'rgba(0,0,0,.4)';
          ctx.strokeRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
          break;
        case 'ring': {
          const r = (p.maxR ?? 100) * ease.out(k);
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = (p.lw ?? 4) * (1 - k * 0.6);
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'glow': {
          const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * (0.6 + k * 0.6));
          gr.addColorStop(0, p.color);
          gr.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.globalAlpha = 1 - k;
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = gr;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 1.2, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'hex':
          break;
      }
      ctx.restore();
    }
  }

  private drawTexts(ctx: CanvasRenderingContext2D) {
    for (const t of this.texts) {
      const k = t.life / t.max;
      ctx.save();
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : Math.min(1, k * 8);
      ctx.font = `700 ${t.size}px Rubik, sans-serif`;
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(5,6,15,.85)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
  }

  private drawBanner(ctx: CanvasRenderingContext2D) {
    const b = this.banner;
    if (!b) return;
    const age = this.time - b.t;
    const k = Math.min(1, age * 4);
    ctx.save();
    ctx.globalAlpha = k;
    ctx.font = '700 22px Rubik, sans-serif';
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    const w = ctx.measureText(b.text).width + 48;
    const x = W / 2, y = 556;
    ctx.fillStyle = 'rgba(5,8,20,.82)';
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 14;
    roundRect(ctx, x - w / 2, y - 22, w, 40, 8);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = b.color;
    ctx.fillText(b.text, x, y + 7);
    ctx.restore();
  }
}
