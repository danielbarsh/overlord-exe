import { FLOOR, H, W } from './constants';
import type { Engine } from './Engine';

// deterministic pseudo-random for static decor
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

interface Rack { x: number; y: number; w: number; h: number; leds: { x: number; y: number; c: string; p: number }[] }
let racks: Rack[] | null = null;
function getRacks(): Rack[] {
  if (racks) return racks;
  const r = rng(42);
  racks = [];
  for (let i = 0; i < 9; i++) {
    const w = 60 + r() * 30;
    const h = 170 + r() * 120;
    const x = i * 112 - 10 + r() * 20;
    const y = FLOOR - 60 - h;
    const leds = [];
    for (let j = 0; j < 14; j++) {
      leds.push({ x: 8 + r() * (w - 16), y: 10 + r() * (h - 20), c: ['#22e4ff', '#ff2bd6', '#a6ff3a', '#ffb020'][Math.floor(r() * 4)], p: r() * 10 });
    }
    racks.push({ x, y, w, h, leds });
  }
  return racks;
}

export function drawBackground(e: Engine, ctx: CanvasRenderingContext2D) {
  const t = e.time;
  // wall
  const wall = ctx.createLinearGradient(0, 0, 0, FLOOR);
  wall.addColorStop(0, '#0b0f26');
  wall.addColorStop(1, '#170c2e');
  ctx.fillStyle = wall;
  ctx.fillRect(-200, -200, W + 400, FLOOR + 200);

  // AURA eye on the back wall
  const ex = W / 2, ey = 150;
  const pulse = 0.5 + Math.sin(t * 1.6) * 0.15;
  const glow = e.eyeGlow;
  ctx.save();
  const eg = ctx.createRadialGradient(ex, ey, 10, ex, ey, 170);
  eg.addColorStop(0, hexA(e.eyeColor, 0.35 * glow + 0.05));
  eg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = eg;
  ctx.fillRect(ex - 200, ey - 200, 400, 400);
  ctx.strokeStyle = hexA(e.eyeColor, 0.25 + glow * 0.4);
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(ex, ey, 42 + i * 22, t * (i % 2 ? -0.4 : 0.3) + i, t * (i % 2 ? -0.4 : 0.3) + i + Math.PI * 1.4);
    ctx.stroke();
  }
  ctx.fillStyle = hexA(e.eyeColor, 0.5 + glow * 0.5 * pulse);
  ctx.shadowColor = e.eyeColor;
  ctx.shadowBlur = 30 * glow;
  ctx.beginPath();
  ctx.ellipse(ex, ey, 26, 26 * (0.35 + 0.65 * pulse), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0b0f26';
  ctx.beginPath();
  ctx.arc(ex + Math.sin(t * 0.7) * 6, ey, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // server racks
  for (const rk of getRacks()) {
    ctx.fillStyle = '#0e1330';
    ctx.fillRect(rk.x, rk.y, rk.w, rk.h);
    ctx.strokeStyle = 'rgba(80,100,180,.25)';
    ctx.strokeRect(rk.x + 0.5, rk.y + 0.5, rk.w - 1, rk.h - 1);
    for (let yy = rk.y + 12; yy < rk.y + rk.h; yy += 14) {
      ctx.fillStyle = 'rgba(60,70,130,.18)';
      ctx.fillRect(rk.x + 4, yy, rk.w - 8, 2);
    }
    for (const l of rk.leds) {
      const on = Math.sin(t * 3 + l.p * 7) > 0.2;
      ctx.fillStyle = on ? l.c : 'rgba(255,255,255,.06)';
      ctx.fillRect(rk.x + l.x, rk.y + l.y, 3, 3);
    }
  }

  // ceiling pipes
  ctx.fillStyle = '#121734';
  ctx.fillRect(-200, -200, W + 400, 236);
  ctx.fillStyle = '#1b2148';
  ctx.fillRect(-200, 26, W + 400, 10);
  ctx.fillStyle = '#242c5c';
  ctx.fillRect(-200, 12, W + 400, 6);
  for (let x = 40; x < W; x += 160) {
    ctx.fillStyle = '#2b3466';
    ctx.fillRect(x, 8, 14, 34);
    const lg = ctx.createLinearGradient(0, 40, 0, 200);
    lg.addColorStop(0, 'rgba(120,160,255,.10)');
    lg.addColorStop(1, 'rgba(120,160,255,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(x - 4, 40);
    ctx.lineTo(x + 18, 40);
    ctx.lineTo(x + 60, 220);
    ctx.lineTo(x - 46, 220);
    ctx.fill();
  }

  // floor
  const fl = ctx.createLinearGradient(0, FLOOR, 0, H);
  fl.addColorStop(0, '#141a3c');
  fl.addColorStop(1, '#05060f');
  ctx.fillStyle = fl;
  ctx.fillRect(-200, FLOOR, W + 400, H - FLOOR + 200);
  // perspective grid
  ctx.save();
  ctx.strokeStyle = 'rgba(34,228,255,.18)';
  ctx.lineWidth = 1;
  const vx = W / 2, vy = FLOOR - 260;
  for (let i = -14; i <= 14; i++) {
    const bx = vx + i * 90;
    ctx.beginPath();
    const k = (FLOOR - vy) / (H + 60 - vy);
    ctx.moveTo(vx + (bx - vx) * k, FLOOR);
    ctx.lineTo(bx, H + 60);
    ctx.stroke();
  }
  const scroll = (t * 0.25) % 1;
  for (let j = 0; j < 9; j++) {
    const p = Math.pow((j + scroll) / 9, 2);
    const y = FLOOR + p * (H - FLOOR + 40);
    ctx.globalAlpha = 0.3 + p * 0.7;
    ctx.beginPath();
    ctx.moveTo(-200, y);
    ctx.lineTo(W + 200, y);
    ctx.stroke();
  }
  ctx.restore();
  // floor edge neon
  ctx.fillStyle = '#22e4ff';
  ctx.shadowColor = '#22e4ff';
  ctx.shadowBlur = 12;
  ctx.fillRect(-200, FLOOR - 1, W + 400, 2);
  ctx.shadowBlur = 0;
  // hazard stripes
  ctx.save();
  ctx.beginPath();
  ctx.rect(-200, FLOOR + 2, W + 400, 8);
  ctx.clip();
  for (let x = -200; x < W + 200; x += 24) {
    ctx.fillStyle = '#ffb020';
    ctx.beginPath();
    ctx.moveTo(x, FLOOR + 10);
    ctx.lineTo(x + 12, FLOOR + 2);
    ctx.lineTo(x + 20, FLOOR + 2);
    ctx.lineTo(x + 8, FLOOR + 10);
    ctx.fill();
  }
  ctx.restore();
}

export function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
}
