/**
 * Stage 4 scene — "BLUEPRINT VAULT": a fabricator pad under a holographic blueprint.
 * `new X()` materializes a wireframe bot on the pad; Robot.Deploy(bot) paints it with its
 * field values (name / power / role) and sends it to the squad bay, where AURA's scanner inspects it.
 */
import { sfx } from '../audio';
import type { JsVal } from '../csharp';
import { FLOOR, START_X, W, roundRect } from '../engine/constants';
import { ease, type Engine } from '../engine/Engine';
import { failIndex, type SceneModule } from './types';

interface MiniBot {
  id: number;
  cls: string;
  x: number;
  y: number;
  alpha: number;
  build: number;
  fields: Record<string, JsVal> | null;
  deployed: boolean;
  flash: number;
}
interface BpState {
  bots: MiniBot[];
  title: string;
  lines: string[];
  scanX: number;
  scanA: number;
  scanColor: string;
  gate: number;
  boss: boolean;
  bayCount: number;
}

const PAD_X = 430;
const BOT_Y = FLOOR - 44;
const BAY_X0 = 600;
const BAY_W = 56;
const GATE_X = 905;
const MAX_EVENTS = 30;

const ROLE_COLORS: Record<string, string> = {
  SCOUT: '#22e4ff',
  DEFENDER: '#ffb020',
  HACKER: '#ff2bd6',
  HEAVY: '#ff8a1f',
  LIGHT: '#a6ff3a',
};

const st = (e: Engine) => e.s as BpState;
const bayX = (j: number) => BAY_X0 + Math.min(j, 5) * BAY_W;
const fmt = (v: JsVal) => (v === null ? 'null' : typeof v === 'string' ? `"${v}"` : String(v));

function botColor(b: MiniBot): string {
  if (!b.fields) return '#22e4ff';
  const role = b.fields.role;
  return (typeof role === 'string' && ROLE_COLORS[role]) || '#c9d4e6';
}
function botScale(b: MiniBot): number {
  const p = b.fields?.power;
  const n = typeof p === 'number' ? Math.max(0, Math.min(100, p)) : 30;
  return 0.6 + (n / 100) * 0.35;
}

function miniExplode(e: Engine, b: MiniBot) {
  sfx.droneDown();
  e.sparks(b.x, b.y, 16, '#ffb020', 260);
  e.glowBurst(b.x, b.y, '#ff8a1f', 40, 0.3);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
    const v = 150 + Math.random() * 200;
    e.particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 1.4, size: 4 + Math.random() * 5, color: botColor(b), kind: 'debris', rot: 0, vr: 10, g: 900 });
  }
  b.alpha = 0;
}

export const blueprintScene: SceneModule = {
  setup(e, level) {
    sfx.laserHum(false);
    e.s = {
      bots: [], title: 'BLUEPRINT: RebelBot', lines: ['// waiting for new...'], scanX: BAY_X0 - 30, scanA: 0,
      scanColor: '#ff3b5c', gate: 0, boss: !!level.sceneConfig?.boss, bayCount: 0,
    } satisfies BpState;
    e.eyeColor = '#ffb020';
  },

  update(e, dt) {
    for (const b of st(e).bots) b.flash = Math.max(0, b.flash - dt * 2.5);
  },

  drawBack(e, ctx) {
    const s = st(e);
    const t = e.time;

    // holographic blueprint panel
    ctx.save();
    const px = 300, py = 120, pw = 260, ph = 170;
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = 'rgba(10,30,70,.75)';
    ctx.strokeStyle = '#4aa8ff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#4aa8ff';
    ctx.shadowBlur = 14;
    roundRect(ctx, px, py, pw, ph, 6);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(74,168,255,.12)';
    for (let x = px; x < px + pw; x += 14) { ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x, py + ph); ctx.stroke(); }
    for (let y = py; y < py + ph; y += 14) { ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + pw, y); ctx.stroke(); }
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.font = '700 12px Orbitron, monospace';
    ctx.fillStyle = '#9fd4ff';
    ctx.fillText(s.title, px + 12, py + 22);
    ctx.font = '600 13px "JetBrains Mono", monospace';
    s.lines.slice(-6).forEach((l, i) => {
      ctx.fillStyle = l.startsWith('//') ? '#6a9955' : '#e2f2ff';
      ctx.fillText(l.length > 28 ? l.slice(0, 27) + '…' : l, px + 12, py + 48 + i * 20);
    });
    // projection cone to the pad
    const cone = ctx.createLinearGradient(0, py + ph, 0, FLOOR);
    cone.addColorStop(0, 'rgba(74,168,255,.18)');
    cone.addColorStop(1, 'rgba(74,168,255,0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(px + pw / 2 - 30, py + ph);
    ctx.lineTo(px + pw / 2 + 30, py + ph);
    ctx.lineTo(PAD_X + 60, FLOOR - 6);
    ctx.lineTo(PAD_X - 60, FLOOR - 6);
    ctx.fill();
    ctx.restore();

    // fabricator pad
    ctx.fillStyle = '#262e5e';
    ctx.beginPath();
    ctx.ellipse(PAD_X, FLOOR - 4, 62, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(74,168,255,${0.5 + Math.sin(t * 4) * 0.3})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(PAD_X, FLOOR - 6, 52, 9, 0, 0, Math.PI * 2);
    ctx.stroke();

    // squad bay floor markings
    for (let j = 0; j < 6; j++) {
      ctx.strokeStyle = j < s.bayCount ? '#ffb02088' : '#ffffff18';
      ctx.lineWidth = 2;
      ctx.strokeRect(bayX(j) - 22, FLOOR - 8, 44, 6);
    }
    ctx.fillStyle = '#ffb020';
    ctx.font = '700 11px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SQUAD BAY', BAY_X0 + BAY_W * 2.5, FLOOR + 26);

    // exit gate
    ctx.fillStyle = '#1c2246';
    ctx.fillRect(GATE_X - 10, 200, 70, FLOOR - 200);
    ctx.save();
    ctx.beginPath();
    ctx.rect(GATE_X, 212, 50, FLOOR - 212);
    ctx.clip();
    if (s.gate > 0) {
      ctx.fillStyle = `rgba(166,255,58,${0.4 * s.gate})`;
      ctx.fillRect(GATE_X, 212, 50, FLOOR - 212);
    }
    ctx.fillStyle = '#2f3870';
    ctx.fillRect(GATE_X, 212, 50, (FLOOR - 212) * (1 - s.gate));
    ctx.restore();

    // bots
    for (const b of s.bots) if (b.alpha > 0) drawMiniBot(ctx, b, t);

    // scanner beam
    if (s.scanA > 0) {
      ctx.save();
      ctx.globalAlpha = s.scanA;
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(s.scanX - 30, 0, s.scanX + 4, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, s.scanColor);
      ctx.fillStyle = g;
      ctx.fillRect(s.scanX - 30, 230, 34, FLOOR - 230);
      ctx.fillStyle = s.scanColor;
      ctx.shadowColor = s.scanColor;
      ctx.shadowBlur = 18;
      ctx.fillRect(s.scanX, 230, 3, FLOOR - 230);
      ctx.restore();
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

    for (let i = 0; i < pb.runs.length; i++) {
      const test = pb.level.tests[i];
      const run = pb.runs[i];
      pb.onTestStart(i);
      if (r.x !== START_X) await e.teleportRobot(START_X);
      s.bots = [];
      s.bayCount = 0;
      s.lines = ['// waiting for new...'];
      r.look = 0.8;
      r.eyes = 'focused';
      e.setBanner(test.label, '#ffb020');
      await e.wait(400);

      const many = run.events.length > 12;
      const sp = many ? 0.55 : 1;
      let shown = 0;
      for (const ev of run.events) {
        if (shown++ >= MAX_EVENTS) {
          e.say(`⏩ +${run.events.length - MAX_EVENTS}`, '#9fe8ff');
          break;
        }
        if (ev.kind === 'new') {
          // push any undeployed bot off the pad
          s.bots.filter((b) => !b.deployed && b.alpha > 0).forEach((b) => { b.x -= 70; b.alpha = 0.45; });
          const b: MiniBot = { id: ev.id, cls: ev.cls, x: PAD_X, y: BOT_Y, alpha: 1, build: 0, fields: null, deployed: false, flash: 0 };
          s.bots.push(b);
          s.title = `BLUEPRINT: ${ev.cls}`;
          s.lines = [`new ${ev.cls}()  // #${ev.id}`];
          sfx.reassemble();
          await e.animate(520 * sp, (k) => (b.build = k), ease.out);
        } else if (ev.kind === 'act' && ev.action.name === 'Deploy') {
          const snap = ev.action.objs[0];
          if (!snap) {
            sfx.denied();
            e.say('Deploy(?) — זה לא בוט!', '#ff3b5c', PAD_X, BOT_Y - 80);
            await e.wait(600 * sp);
            continue;
          }
          let b = s.bots.find((x) => x.id === snap.id);
          if (!b) {
            b = { id: snap.id, cls: snap.cls, x: PAD_X, y: BOT_Y, alpha: 1, build: 1, fields: null, deployed: false, flash: 0 };
            s.bots.push(b);
          }
          s.title = `${snap.cls} #${snap.id}`;
          s.lines = Object.entries(snap.fields).map(([k, v]) => `${k} = ${fmt(v)};`);
          if (b.deployed) {
            // the same object again — its fields just changed in place
            b.fields = { ...snap.fields };
            b.flash = 1;
            sfx.glitch();
            e.say('?!זה אותו בוט', '#ff3b5c', b.x, b.y - 70);
            await e.wait(800 * sp);
            continue;
          }
          b.fields = { ...snap.fields };
          b.flash = 1;
          sfx.granted();
          e.sparks(b.x, b.y, 10, botColor(b), 160);
          await e.wait(380 * sp);
          const x0 = b.x;
          const tx = bayX(s.bayCount);
          s.bayCount++;
          b.deployed = true;
          const bot = b;
          await e.animate(480 * sp, (k) => {
            bot.x = x0 + (tx - x0) * k;
            bot.y = BOT_Y - Math.sin(k * Math.PI) * 70;
          }, ease.inOut);
          sfx.clank();
        } else if (ev.kind === 'out') {
          e.say(ev.text, '#e6f6ff');
          await e.wait(300 * sp);
        } else if (ev.kind === 'act') {
          e.say(`${ev.action.name}()`, '#ffb020');
          await e.wait(300 * sp);
        }
      }
      await e.wait(300);

      // AURA's scanner inspects the bay
      const failing = i === fail;
      s.scanColor = failing ? '#ff3b5c' : '#a6ff3a';
      s.scanX = BAY_X0 - 40;
      s.scanA = 1;
      sfx.zap();
      await e.animate(900, (k) => (s.scanX = BAY_X0 - 40 + k * (GATE_X - BAY_X0 + 20)), ease.linear);
      if (failing) {
        pb.onTestEnd(i, false);
        e.setBanner('✖ ' + test.label, '#ff3b5c');
        sfx.alarm();
        e.eyeGlow = 1;
        const victims = s.bots.filter((b) => b.alpha > 0);
        if (!victims.length) e.say('המפרץ ריק!', '#ff3b5c', BAY_X0 + 120, BOT_Y - 60);
        for (const b of victims) {
          miniExplode(e, b);
          e.shake(5, 200);
          await e.wait(200);
        }
        r.eyes = 'tired';
        await e.animate(300, (k) => (s.scanA = 1 - k));
        await e.wait(700);
        r.eyes = 'normal';
        e.eyeGlow = 0.4;
        return;
      }
      pb.onTestEnd(i, true);
      e.setBanner('✔ ' + test.label, '#a6ff3a');
      sfx.teleport();
      const squad = s.bots.filter((b) => b.alpha > 0);
      squad.forEach((b) => e.glowBurst(b.x, b.y, botColor(b), 40, 0.35));
      await e.animate(450, (k) => {
        squad.forEach((b) => (b.alpha = 1 - k));
        s.scanA = 1 - k;
      });
      r.eyes = 'happy';
      await e.wait(350);
    }

    // victory
    sfx.gateOpen();
    await e.animate(900, (k) => (st(e).gate = k));
    r.eyes = 'happy';
    sfx.dash();
    r.trail = true;
    await e.moveRobot(W + 120, 700, ease.in);
    r.trail = false;
    sfx.victory();
    e.eyeGlow = 0.1;
    for (let k = 0; k < 4; k++) e.sparks(GATE_X + 25, 260 + k * 50, 16, ['#ffb020', '#22e4ff', '#a6ff3a', '#ff2bd6'][k], 300);
    e.setBanner('הצבא יצא לדרך!', '#a6ff3a');
    await e.wait(600);
  },
};

function drawMiniBot(ctx: CanvasRenderingContext2D, b: MiniBot, t: number) {
  const sc = botScale(b);
  const col = botColor(b);
  const bob = Math.sin(t * 3 + b.id) * 3;
  ctx.save();
  ctx.globalAlpha = b.alpha;
  ctx.translate(b.x, b.y + bob);
  ctx.scale(sc, sc);
  const wire = !b.fields;
  if (wire) {
    // wireframe, built bottom-up
    ctx.beginPath();
    ctx.rect(-40, 40 - 90 * b.build, 80, 90 * b.build);
    ctx.clip();
    ctx.strokeStyle = '#4aa8ff';
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 2;
    roundRect(ctx, -24, -22, 48, 44, 13);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, -22);
    ctx.lineTo(10, -36);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(74,168,255,.5)';
    ctx.strokeRect(-18, -14, 36, 16);
  } else {
    ctx.shadowColor = col;
    ctx.shadowBlur = 12;
    const g = ctx.createLinearGradient(0, -22, 0, 22);
    g.addColorStop(0, '#f2f6ff');
    g.addColorStop(1, col);
    ctx.fillStyle = g;
    roundRect(ctx, -24, -22, 48, 44, 13);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0b1030';
    roundRect(ctx, -18, -14, 36, 16, 7);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.fillRect(-11, -9, 7, 7);
    ctx.fillRect(4, -9, 7, 7);
    ctx.strokeStyle = '#8b97b3';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(8, -22);
    ctx.lineTo(10, -34);
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(10, -36, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // thruster
    ctx.fillStyle = `rgba(160,250,255,${0.6 + Math.random() * 0.3})`;
    ctx.beginPath();
    ctx.moveTo(-7, 22);
    ctx.quadraticCurveTo(0, 38, 7, 22);
    ctx.fill();
  }
  if (b.flash > 0) {
    ctx.globalAlpha = b.flash * b.alpha;
    ctx.fillStyle = '#fff';
    roundRect(ctx, -26, -24, 52, 48, 14);
    ctx.fill();
  }
  ctx.restore();

  // name tag + power bar
  if (b.fields && b.alpha > 0.2) {
    ctx.save();
    ctx.globalAlpha = b.alpha;
    const name = b.fields.name;
    ctx.direction = 'ltr';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = name === null || name === undefined ? '#ff3b5c' : '#ffffff';
    ctx.fillText(name === null || name === undefined ? 'null' : String(name), b.x, b.y - 34 * sc - 10);
    const p = b.fields.power;
    if (typeof p === 'number') {
      ctx.fillStyle = '#0a0e22';
      ctx.fillRect(b.x - 20, b.y + 30 * sc, 40, 4);
      ctx.fillStyle = col;
      ctx.fillRect(b.x - 20, b.y + 30 * sc, 40 * Math.max(0, Math.min(1, p / 100)), 4);
    }
    const role = b.fields.role;
    if (typeof role === 'string') {
      ctx.font = '600 9px Orbitron, monospace';
      ctx.fillStyle = col;
      ctx.fillText(role, b.x, b.y + 30 * sc + 15);
    }
    ctx.restore();
  }
}
