/**
 * Stage 5 scene — "FIREWALL": the rebel data core sits behind a firewall.
 * AURA's terminal on the right shows her attack code (the test's `harness`).
 *  - harness test, run.blocked  → the packet hits the firewall: 🔒 the compiler rejected AURA's code
 *  - harness test, ran          → the packet gets through; Robot.Report(x) values light up on the core
 *  - normal test (student Main) → the robot itself sends the packet
 */
import { sfx } from '../audio';
import type { JsVal } from '../csharp';
import { FLOOR, START_X, roundRect } from '../engine/constants';
import { ease, type Engine } from '../engine/Engine';
import { failIndex, type SceneModule } from './types';

interface Packet { x0: number; y0: number; x1: number; y1: number; k: number; color: string }
interface FwState {
  code: string[];
  codeTitle: string;
  title: string;
  fields: [string, string][];
  readouts: string[];
  wall: number;
  wallColor: string;
  core: 'idle' | 'ok' | 'bad';
  glitch: number;
  packets: Packet[];
  boss: boolean;
  secured: number;
}

const CORE_X = 245, CORE_Y = 150, CORE_W = 230, CORE_H = 280;
const WALL_X = 515;
const TERM_X = 550, TERM_Y = 125, TERM_W = 400, TERM_H = 335;
const MAX_EVENTS = 40;

const st = (e: Engine) => e.s as FwState;
const fmt = (v: JsVal) => (v === null ? 'null' : typeof v === 'string' ? `"${v}"` : String(v));

function codeFor(harness?: string): { title: string; lines: string[] } {
  if (harness) return { title: 'AURA://inject.cs', lines: harness.split('\n') };
  return { title: 'rebel://Main()', lines: ['// your own Main() runs here', '// (the rebels test your class)'] };
}

async function sendPacket(e: Engine, p: Omit<Packet, 'k'>, ms: number) {
  const s = st(e);
  const pk: Packet = { ...p, k: 0 };
  s.packets.push(pk);
  await e.animate(ms, (k) => (pk.k = k), ease.inOut);
  s.packets = s.packets.filter((q) => q !== pk);
}

export const firewallScene: SceneModule = {
  setup(e, level) {
    sfx.laserHum(false);
    const c = codeFor(level.tests[0]?.harness);
    e.s = {
      code: c.lines, codeTitle: c.title, title: 'DATA CORE', fields: [], readouts: [], wall: 0, wallColor: '#b17dff',
      core: 'idle', glitch: 0, packets: [], boss: !!level.sceneConfig?.boss, secured: 0,
    } satisfies FwState;
    e.eyeColor = '#b17dff';
  },

  preview(e, level, i) {
    const s = st(e);
    const c = codeFor(level.tests[i]?.harness);
    s.code = c.lines;
    s.codeTitle = c.title;
  },

  update(e, dt) {
    const s = st(e);
    s.wall = Math.max(0, s.wall - dt * 1.6);
    s.glitch = Math.max(0, s.glitch - dt * 0.8);
  },

  drawBack(e, ctx) {
    const s = st(e);
    const t = e.time;

    // --- AURA terminal (her attack code) ---
    ctx.save();
    ctx.fillStyle = 'rgba(20,6,36,.92)';
    ctx.strokeStyle = '#b17dff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#b17dff';
    ctx.shadowBlur = 16;
    roundRect(ctx, TERM_X, TERM_Y, TERM_W, TERM_H, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#b17dff33';
    ctx.fillRect(TERM_X, TERM_Y, TERM_W, 30);
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.font = '700 13px Orbitron, monospace';
    ctx.fillStyle = '#e2c9ff';
    ctx.fillText(s.codeTitle, TERM_X + 14, TERM_Y + 20);
    const lines = s.code.slice(0, 13);
    const long = lines.some((l) => l.length > 38);
    ctx.font = `600 ${long ? 13 : 15}px "JetBrains Mono", monospace`;
    lines.forEach((l, i) => {
      ctx.fillStyle = l.trim().startsWith('//') ? '#6a9955' : '#f0e6ff';
      const max = long ? 44 : 38;
      ctx.fillText(l.length > max ? l.slice(0, max - 1) + '…' : l, TERM_X + 14, TERM_Y + 52 + i * 21);
    });
    ctx.restore();

    // --- firewall ---
    ctx.save();
    const wc = s.secured > 0 ? '#a6ff3a' : s.wallColor;
    const base = 0.25 + 0.08 * Math.sin(t * 3) + s.wall * 0.6;
    const g = ctx.createLinearGradient(WALL_X - 18, 0, WALL_X + 18, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, wc);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = Math.min(1, base);
    ctx.fillStyle = g;
    ctx.fillRect(WALL_X - 18, 40, 36, FLOOR - 40);
    ctx.globalAlpha = Math.min(1, base + 0.2);
    ctx.strokeStyle = wc;
    ctx.lineWidth = 1;
    for (let y = 50 + ((t * 30) % 24); y < FLOOR; y += 24) {
      ctx.beginPath();
      ctx.moveTo(WALL_X - 10, y);
      ctx.lineTo(WALL_X, y - 8);
      ctx.lineTo(WALL_X + 10, y);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = wc;
    ctx.font = '700 10px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FIREWALL', WALL_X, 34);

    // --- data core (the student's object) ---
    ctx.save();
    const cc = s.core === 'ok' ? '#a6ff3a' : s.core === 'bad' ? '#ff3b5c' : '#22e4ff';
    if (s.glitch > 0) ctx.translate((Math.random() - 0.5) * 10 * s.glitch, 0);
    ctx.fillStyle = 'rgba(6,14,34,.94)';
    ctx.strokeStyle = cc;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = cc;
    ctx.shadowBlur = 18;
    roundRect(ctx, CORE_X, CORE_Y, CORE_W, CORE_H, 12);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.font = '700 13px Orbitron, monospace';
    ctx.fillStyle = cc;
    ctx.fillText(s.title, CORE_X + 14, CORE_Y + 24);
    ctx.fillStyle = cc + '55';
    ctx.fillRect(CORE_X + 14, CORE_Y + 32, CORE_W - 28, 1);
    ctx.font = '600 14px "JetBrains Mono", monospace';
    s.fields.slice(0, 5).forEach(([k, v], i) => {
      ctx.fillStyle = '#9fd4ff';
      ctx.fillText(k, CORE_X + 14, CORE_Y + 56 + i * 21);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'right';
      ctx.fillText(v.length > 12 ? v.slice(0, 11) + '…' : v, CORE_X + CORE_W - 14, CORE_Y + 56 + i * 21);
      ctx.textAlign = 'left';
    });
    // readout screen
    const ry = CORE_Y + 168;
    ctx.fillStyle = '#02060f';
    roundRect(ctx, CORE_X + 12, ry, CORE_W - 24, 96, 8);
    ctx.fill();
    ctx.font = '700 10px Orbitron, monospace';
    ctx.fillStyle = '#ffb020';
    ctx.fillText('Robot.Report()', CORE_X + 22, ry + 16);
    ctx.font = '700 18px "JetBrains Mono", monospace';
    s.readouts.slice(-3).forEach((r, i) => {
      ctx.fillStyle = '#ffe9b0';
      ctx.fillText(r.length > 20 ? r.slice(0, 19) + '…' : r, CORE_X + 22, ry + 40 + i * 22);
    });
    if (s.core === 'bad') {
      ctx.fillStyle = `rgba(255,59,92,${0.15 + 0.1 * Math.sin(t * 20)})`;
      roundRect(ctx, CORE_X, CORE_Y, CORE_W, CORE_H, 12);
      ctx.fill();
    }
    ctx.restore();

    // cable robot → core
    ctx.strokeStyle = '#22e4ff44';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(START_X + 40, FLOOR - 4);
    ctx.lineTo(CORE_X + 40, FLOOR - 4);
    ctx.lineTo(CORE_X + 40, CORE_Y + CORE_H);
    ctx.stroke();

    // packets
    for (const p of s.packets) {
      for (let i = 0; i < 5; i++) {
        const k = Math.max(0, p.k - i * 0.05);
        const px = p.x0 + (p.x1 - p.x0) * k;
        const py = p.y0 + (p.y1 - p.y0) * k - Math.sin(k * Math.PI) * 30;
        ctx.globalAlpha = 1 - i * 0.18;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.fillRect(px - 4, py - 4, 8, 8);
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
  },

  async onCompileError(e) {
    const r = e.robot;
    r.eyes = 'dizzy';
    e.sparks(r.x, r.y - 20, 14, '#ff3b5c', 160);
    e.say('SYNTAX ERROR?!', '#ff3b5c');
    await e.animate(500, (k) => (r.rot = Math.sin(k * Math.PI * 6) * 0.2 * (1 - k)), ease.linear);
    r.rot = 0;
    await e.wait(500);
    r.eyes = 'normal';
  },

  async play(e, pb) {
    const s = st(e);
    const r = e.robot;
    const fail = failIndex(pb);
    if (r.x !== START_X) await e.teleportRobot(START_X);

    for (let i = 0; i < pb.runs.length; i++) {
      const test = pb.level.tests[i];
      const run = pb.runs[i];
      const failing = i === fail;
      pb.onTestStart(i);
      const c = codeFor(test.harness);
      s.code = c.lines;
      s.codeTitle = c.title;
      s.title = 'DATA CORE';
      s.fields = [];
      s.readouts = [];
      s.core = 'idle';
      r.eyes = 'focused';
      e.setBanner(test.label, test.harness ? '#b17dff' : '#22e4ff');
      await e.wait(500);

      if (test.harness) {
        sfx.aura();
        if (run.blocked) {
          await sendPacket(e, { x0: TERM_X, y0: TERM_Y + 120, x1: WALL_X + 6, y1: 220, color: '#ff2bd6' }, 650);
          s.wall = 1;
          s.wallColor = '#22e4ff';
          sfx.shield();
          e.sparks(WALL_X, 220, 26, '#d9b8ff', 260);
          e.ring(WALL_X, 220, '#22e4ff', 90, 0.5, 3);
          e.say(`🔒 ${run.blocked.code}`, '#9fe8ff', WALL_X, 180);
          await e.wait(700);
        } else {
          await sendPacket(e, { x0: TERM_X, y0: TERM_Y + 120, x1: CORE_X + CORE_W - 20, y1: CORE_Y + 90, color: '#ff2bd6' }, 800);
          e.sparks(CORE_X + CORE_W - 20, CORE_Y + 90, 14, '#ff2bd6', 200);
          sfx.transmit();
        }
      } else {
        sfx.transmit();
        await sendPacket(e, { x0: r.x + 30, y0: r.y - 10, x1: CORE_X + 30, y1: CORE_Y + 90, color: '#22e4ff' }, 600);
      }

      let shown = 0;
      for (const ev of run.events) {
        if (shown++ >= MAX_EVENTS) break;
        if (ev.kind === 'new') {
          s.title = `new ${ev.cls}()`;
          sfx.click();
          await e.wait(180);
        } else if (ev.kind === 'out') {
          e.texts.push({ x: CORE_X + CORE_W / 2, y: CORE_Y - 10, text: ev.text, color: '#a6ff3a', life: 0, max: 1.4, size: 15, vy: -18 });
          await e.wait(250);
        } else {
          const a = ev.action;
          const obj = a.objs.find(Boolean);
          if (obj) {
            s.title = `${obj.cls} #${obj.id}`;
            s.fields = Object.entries(obj.fields).map(([k, v]) => [k, fmt(v)]);
          }
          if (a.name === 'Report') {
            s.readouts.push(a.args.map((v) => (v === null ? 'null' : String(v))).join(', '));
            sfx.click();
            e.glowBurst(CORE_X + CORE_W / 2, CORE_Y + 210, '#ffb020', 40, 0.25);
          } else {
            e.say(`${a.name}()`, '#ffb020', CORE_X + CORE_W / 2, CORE_Y - 10);
          }
          await e.wait(420);
        }
      }
      if (run.error) {
        s.glitch = 1;
        e.say(run.error.exception, '#ff3b5c', CORE_X + CORE_W / 2, CORE_Y - 10);
        await e.wait(500);
      }

      if (failing) {
        s.core = 'bad';
        s.glitch = 1.2;
        sfx.glitch();
        sfx.alarm();
        e.flash('#ff3b5c', 0.35);
        e.shake(6, 400);
        r.eyes = 'dizzy';
        e.say(test.harness && !run.blocked ? 'AURA פרצה פנימה!' : 'הליבה פגומה!', '#ff3b5c', CORE_X + CORE_W / 2, CORE_Y + 40);
        await e.wait(1300);
        pb.onTestEnd(i, false);
        e.setBanner('✖ ' + test.label, '#ff3b5c');
        r.eyes = 'normal';
        return;
      }
      s.core = 'ok';
      sfx.granted();
      pb.onTestEnd(i, true);
      e.setBanner('✔ ' + test.label, '#a6ff3a');
      await e.wait(650);
      s.wallColor = '#b17dff';
    }

    // victory: firewall locks green
    r.eyes = 'happy';
    sfx.victory();
    await e.animate(700, (k) => (s.secured = k));
    e.ring(WALL_X, 250, '#a6ff3a', 400, 0.8, 5);
    for (let i = 0; i < 4; i++) e.sparks(WALL_X, 100 + i * 90, 14, '#a6ff3a', 260);
    e.setBanner(s.boss ? 'חומת האש נעולה!' : 'הליבה מוגנת!', '#a6ff3a');
    await e.wait(900);
  },
};
