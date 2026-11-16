import { FLOOR, roundRect } from './constants';

export type RobotEyes = 'normal' | 'happy' | 'dizzy' | 'tired' | 'angry' | 'focused';

export interface RobotState {
  x: number;
  y: number;
  rot: number;
  sx: number;
  sy: number;
  visible: boolean;
  alpha: number;
  /** 0..1 shield bubble strength */
  shield: number;
  /** 0..1 EMP charge glow */
  charge: number;
  trail: boolean;
  history: { x: number; y: number; rot: number }[];
  eyes: RobotEyes;
  /** -1..1 eye direction */
  look: number;
  /** hover bob amplitude multiplier */
  hover: number;
  /** 0..1 — for the loops stage: "exhausted" robot sags and sweats */
  tired: number;
}

export function drawRobot(ctx: CanvasRenderingContext2D, r: RobotState, t: number) {
  if (!r.visible) return;
  const bob = Math.sin(t * 3) * 5 * r.hover * (1 - r.tired * 0.7) + r.tired * 10;
  const y = r.y + bob;

  // floor shadow
  const h = Math.max(0, FLOOR - (y + 34));
  ctx.save();
  ctx.globalAlpha = 0.45 * r.alpha * Math.max(0.15, 1 - h / 260);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(r.x, FLOOR + 6, 34 * Math.max(0.4, 1 - h / 400), 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // dash trail ghosts
  r.history.forEach((p, i) => {
    ctx.save();
    ctx.globalAlpha = 0.25 * (1 - i / r.history.length) * r.alpha;
    ctx.translate(p.x, p.y + bob);
    ctx.rotate(p.rot);
    ctx.fillStyle = '#22e4ff';
    roundRect(ctx, -32, -28, 64, 56, 16);
    ctx.fill();
    ctx.restore();
  });

  ctx.save();
  ctx.globalAlpha = r.alpha;
  ctx.translate(r.x, y);
  ctx.rotate(r.rot);
  ctx.scale(r.sx, r.sy);

  // charge glow
  if (r.charge > 0) {
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 90);
    g.addColorStop(0, `rgba(120,240,255,${0.8 * r.charge})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.arc(0, 0, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  // thruster flame
  const fl = 18 + Math.sin(t * 40) * 4 + Math.random() * 4;
  const fg = ctx.createLinearGradient(0, 26, 0, 26 + fl + 10);
  fg.addColorStop(0, 'rgba(160,250,255,.95)');
  fg.addColorStop(0.5, 'rgba(34,228,255,.6)');
  fg.addColorStop(1, 'rgba(34,228,255,0)');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(-12, 26);
  ctx.quadraticCurveTo(0, 26 + fl * 2, 12, 26);
  ctx.fill();

  // side fins
  ctx.fillStyle = '#56627e';
  roundRect(ctx, -44, -6, 14, 26, 5);
  ctx.fill();
  roundRect(ctx, 30, -6, 14, 26, 5);
  ctx.fill();
  ctx.fillStyle = '#22e4ff';
  ctx.fillRect(-41, 2, 8, 3);
  ctx.fillRect(33, 2, 8, 3);

  // antenna
  ctx.strokeStyle = '#8b97b3';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(10, -28);
  ctx.quadraticCurveTo(14, -44, 8 + Math.sin(t * 4) * 3, -52);
  ctx.stroke();
  const blink = Math.sin(t * 6) > 0 ? 1 : 0.35;
  ctx.fillStyle = `rgba(255,138,31,${blink})`;
  ctx.shadowColor = '#ff8a1f';
  ctx.shadowBlur = 12 * blink;
  ctx.beginPath();
  ctx.arc(8 + Math.sin(t * 4) * 3, -53, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // body
  const bg = ctx.createLinearGradient(0, -30, 0, 30);
  bg.addColorStop(0, '#eef3fb');
  bg.addColorStop(0.55, '#a7b3cb');
  bg.addColorStop(1, '#5c6884');
  ctx.fillStyle = bg;
  ctx.shadowColor = '#22e4ff';
  ctx.shadowBlur = 16;
  roundRect(ctx, -32, -30, 64, 58, 18);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(20,30,60,.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // rebel stripe
  ctx.fillStyle = '#ff8a1f';
  ctx.fillRect(-32, 14, 64, 6);
  ctx.fillStyle = '#1a2035';
  ctx.font = '700 9px Orbitron, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('R-7', -16, 26);

  // visor
  const vg = ctx.createLinearGradient(0, -22, 0, 6);
  vg.addColorStop(0, '#0b1030');
  vg.addColorStop(1, '#151b45');
  ctx.fillStyle = vg;
  roundRect(ctx, -25, -21, 50, 26, 11);
  ctx.fill();
  ctx.strokeStyle = 'rgba(34,228,255,.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  drawEyes(ctx, r, t);

  // sweat when tired
  if (r.tired > 0.3) {
    ctx.fillStyle = 'rgba(120,200,255,.9)';
    const sy = -24 + ((t * 40) % 30);
    ctx.beginPath();
    ctx.ellipse(28, sy, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // shield bubble (not scaled)
  if (r.shield > 0.01) {
    ctx.save();
    ctx.translate(r.x, y);
    const rad = 62 + Math.sin(t * 8) * 1.5;
    ctx.globalAlpha = r.shield;
    const sg = ctx.createRadialGradient(0, 0, rad * 0.6, 0, 0, rad);
    sg.addColorStop(0, 'rgba(34,228,255,0.02)');
    sg.addColorStop(1, 'rgba(34,228,255,0.35)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,245,255,.9)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#22e4ff';
    ctx.shadowBlur = 16;
    ctx.stroke();
    // hex pattern
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(140,245,255,.35)';
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, Math.PI * 2);
    ctx.clip();
    const s = 16;
    const off = (t * 10) % (s * 1.5);
    for (let hy = -rad - s; hy < rad + s; hy += s * 0.866) {
      const row = Math.round(hy / (s * 0.866));
      for (let hx = -rad - s * 2; hx < rad + s; hx += s * 1.5) {
        hex(ctx, hx + (row % 2 ? s * 0.75 : 0) + off, hy, s / 2);
      }
    }
    ctx.restore();
  }
}

function hex(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawEyes(ctx: CanvasRenderingContext2D, r: RobotState, t: number) {
  const lx = r.look * 4;
  const blink = (t % 4) > 3.88 ? 0.15 : 1;
  ctx.save();
  ctx.fillStyle = '#5ff3ff';
  ctx.strokeStyle = '#5ff3ff';
  ctx.shadowColor = '#22e4ff';
  ctx.shadowBlur = 10;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  const ex = [-11 + lx, 11 + lx];
  const ey = -8;
  switch (r.eyes) {
    case 'happy':
      ex.forEach((x) => {
        ctx.beginPath();
        ctx.arc(x, ey + 3, 6, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      });
      break;
    case 'dizzy':
      ex.forEach((x, i) => {
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 4; a += 0.3) {
          const rr = a * 0.55;
          const aa = a + t * 8 * (i ? -1 : 1);
          const px = x + Math.cos(aa) * rr, py = ey + Math.sin(aa) * rr;
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.lineWidth = 1.6;
        ctx.stroke();
      });
      break;
    case 'tired':
      ex.forEach((x) => {
        roundRect(ctx, x - 6, ey - 1, 12, 5, 2);
        ctx.fill();
      });
      ctx.strokeStyle = '#0b1030';
      break;
    case 'angry':
      ex.forEach((x, i) => {
        ctx.beginPath();
        ctx.moveTo(x - 6, ey - (i ? 4 : -2));
        ctx.lineTo(x + 6, ey + (i ? -2 : 4) - 2);
        ctx.lineTo(x + 6, ey + 5);
        ctx.lineTo(x - 6, ey + 5);
        ctx.closePath();
        ctx.fill();
      });
      break;
    case 'focused':
      ex.forEach((x) => {
        roundRect(ctx, x - 7, ey - 2, 14, 6, 3);
        ctx.fill();
      });
      break;
    default:
      ex.forEach((x) => {
        roundRect(ctx, x - 5, ey - 7 * blink, 10, 14 * blink, 4);
        ctx.fill();
      });
  }
  ctx.restore();
}
