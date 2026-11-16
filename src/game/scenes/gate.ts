/**
 * Stage 1 scene — the outer security gate with a terminal kiosk and a ceiling turret.
 * Console output is "transmitted" from the robot to the kiosk.
 */
import { sfx } from '../audio';
import { FLOOR, START_X, W, roundRect } from '../engine/constants';
import { ease, type Engine } from '../engine/Engine';
import { failIndex, type SceneModule } from './types';

interface KLine { text: string; color: string; shown: number }
interface GateState {
  open: number;
  lines: KLine[];
  status: 'idle' | 'ok' | 'deny';
  prompt: string;
  label: string;
  alarm: number;
  turretAim: number;
  beam: number;
  packets: { k: number }[];
}

const KX = 560, KY = 190, KW = 190, KH = 150;
const GATE_X = 800;
const STAND_X = 430;

const st = (e: Engine) => e.s as GateState;

export const gateScene: SceneModule = {
  setup(e, level) {
    sfx.laserHum(false);
    e.s = {
      open: 0, lines: [], status: 'idle', alarm: 0, turretAim: 0, beam: 0, packets: [],
      prompt: String(level.sceneConfig?.prompt ?? 'ACCESS REQUIRED'),
      label: String(level.sceneConfig?.gateLabel ?? 'GATE'),
    } satisfies GateState;
    e.eyeColor = '#ff2bd6';
  },

  preview(e, level, i) {
    const s = st(e);
    s.lines = (level.tests[i]?.input ?? []).map((inp) => {
      const text = `AURA> ${inp}`;
      return { text, color: '#ff2bd6', shown: text.length };
    });
  },

  update(e, dt) {
    const s = st(e);
    if (s.alarm > 0 && Math.random() < dt * 3) e.eyeGlow = 0.6 + Math.random() * 0.4;
  },

  drawBack(e, ctx) {
    const s = st(e);
    const t = e.time;
    // light behind the gate when open
    if (s.open > 0) {
      const lg = ctx.createLinearGradient(GATE_X, 0, W + 100, 0);
      lg.addColorStop(0, `rgba(166,255,58,${0.35 * s.open})`);
      lg.addColorStop(1, 'rgba(166,255,58,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(GATE_X - 10, 60, 260, FLOOR - 60);
    }
    // gate frame
    ctx.fillStyle = '#1c2246';
    ctx.fillRect(GATE_X - 30, 50, 24, FLOOR - 50);
    ctx.fillRect(GATE_X + 130, 50, 24, FLOOR - 50);
    ctx.fillRect(GATE_X - 30, 40, 184, 26);
    ctx.fillStyle = '#ffb020';
    ctx.font = '700 12px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(s.label, GATE_X + 62, 58);
    // doors (slide up)
    const doorH = (FLOOR - 66) * (1 - s.open);
    ctx.save();
    ctx.beginPath();
    ctx.rect(GATE_X - 6, 66, 136, FLOOR - 66);
    ctx.clip();
    const dg = ctx.createLinearGradient(GATE_X, 0, GATE_X + 130, 0);
    dg.addColorStop(0, '#2a3160');
    dg.addColorStop(0.5, '#3b4580');
    dg.addColorStop(1, '#2a3160');
    ctx.fillStyle = dg;
    ctx.fillRect(GATE_X - 6, 66, 136, doorH);
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    for (let y = 66 + doorH - 40; y > 66; y -= 40) {
      ctx.beginPath();
      ctx.moveTo(GATE_X - 6, y);
      ctx.lineTo(GATE_X + 130, y);
      ctx.stroke();
    }
    // status light strip
    const col = s.status === 'ok' ? '#a6ff3a' : s.status === 'deny' ? '#ff3b5c' : '#ff2bd6';
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 16;
    ctx.fillRect(GATE_X + 58, 66 + doorH - 160, 8, 120);
    ctx.shadowBlur = 0;
    ctx.restore();

    // turret
    const tx = 640, ty = 44;
    ctx.fillStyle = '#2b3466';
    ctx.fillRect(tx - 20, 36, 40, 14);
    ctx.save();
    ctx.translate(tx, ty + 12);
    const target = Math.atan2(e.robot.y - (ty + 12), e.robot.x - tx);
    const idle = Math.PI / 2 + Math.sin(t * 0.8) * 0.5;
    const ang = idle + (target - idle) * s.turretAim;
    ctx.rotate(ang);
    ctx.fillStyle = '#3d4680';
    roundRect(ctx, -12, -12, 24, 24, 6);
    ctx.fill();
    ctx.fillStyle = '#58629e';
    ctx.fillRect(8, -5, 34, 10);
    ctx.fillStyle = s.alarm > 0 ? '#ff3b5c' : '#ff2bd6';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (s.beam > 0) {
      ctx.save();
      ctx.globalAlpha = s.beam;
      ctx.strokeStyle = '#ff3b5c';
      ctx.shadowColor = '#ff3b5c';
      ctx.shadowBlur = 24;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(tx + Math.cos(ang) * 42, ty + 12 + Math.sin(ang) * 42);
      ctx.lineTo(e.robot.x, e.robot.y);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      ctx.restore();
    }

    // kiosk pillar
    ctx.fillStyle = '#1e2552';
    ctx.fillRect(KX + KW / 2 - 18, KY + KH, 36, FLOOR - KY - KH);
    ctx.fillStyle = '#283066';
    ctx.fillRect(KX + KW / 2 - 40, FLOOR - 14, 80, 14);
    // kiosk screen
    const frame = s.status === 'ok' ? '#a6ff3a' : s.status === 'deny' ? '#ff3b5c' : '#22e4ff';
    ctx.save();
    ctx.shadowColor = frame;
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#050a1c';
    ctx.strokeStyle = frame;
    ctx.lineWidth = 3;
    roundRect(ctx, KX, KY, KW, KH, 10);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.save();
    roundRect(ctx, KX + 4, KY + 4, KW - 8, KH - 8, 8);
    ctx.clip();
    // scanlines
    ctx.fillStyle = 'rgba(34,228,255,.05)';
    for (let y = KY; y < KY + KH; y += 4) ctx.fillRect(KX, y + ((t * 20) % 4), KW, 1);
    ctx.textAlign = 'left';
    ctx.direction = 'ltr';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffb020';
    ctx.fillText(s.prompt.slice(0, 28), KX + 10, KY + 20);
    ctx.fillStyle = 'rgba(255,176,32,.4)';
    ctx.fillRect(KX + 10, KY + 26, KW - 20, 1);
    const visible = s.lines.slice(-5);
    // long lines (e.g. "AGENT Ghost IN SECTOR B7") get a smaller font instead of being cut
    const long = visible.some((l) => l.text.length > 22);
    const max = long ? 25 : 22;
    ctx.font = `600 ${long ? 11 : 13}px "JetBrains Mono", monospace`;
    visible.forEach((l, i) => {
      ctx.fillStyle = l.color;
      const txt = l.text.slice(0, Math.floor(l.shown));
      ctx.fillText(txt.length > max ? txt.slice(0, max - 1) + '…' : txt, KX + 10, KY + 46 + i * 19);
    });
    if (Math.sin(t * 6) > 0 && s.status === 'idle') {
      ctx.fillStyle = '#22e4ff';
      ctx.fillRect(KX + 10, KY + 46 + visible.length * 19 - 11, 8, 13);
    }
    if (s.status !== 'idle') {
      ctx.font = '900 13px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = frame;
      ctx.fillText(s.status === 'ok' ? 'ACCESS GRANTED' : 'ACCESS DENIED', KX + KW / 2, KY + KH - 14);
    }
    ctx.restore();

    // data packets robot → kiosk
    for (const p of s.packets) {
      const x0 = e.robot.x + 30, y0 = e.robot.y - 10;
      const x1 = KX + 20, y1 = KY + 60;
      for (let i = 0; i < 5; i++) {
        const k = Math.max(0, Math.min(1, p.k - i * 0.06));
        const x = x0 + (x1 - x0) * k;
        const y = y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * 40;
        ctx.fillStyle = `rgba(34,228,255,${1 - i * 0.18})`;
        ctx.shadowColor = '#22e4ff';
        ctx.shadowBlur = 10;
        ctx.fillRect(x - 3, y - 3, 6, 6);
      }
      ctx.shadowBlur = 0;
    }
  },

  drawFront(e, ctx) {
    const s = st(e);
    if (s.alarm > 0) {
      ctx.save();
      ctx.globalAlpha = s.alarm * (0.12 + 0.1 * Math.sin(e.time * 14));
      ctx.fillStyle = '#ff3b5c';
      ctx.fillRect(-200, -200, W + 400, 1000);
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
    const showInput = !!pb.level.sceneConfig?.showInput;
    if (r.x !== STAND_X) await e.moveRobot(STAND_X, 800);
    r.look = 0.8;
    for (let i = 0; i < pb.runs.length; i++) {
      const run = pb.runs[i];
      pb.onTestStart(i);
      e.setBanner(pb.level.tests[i].label, '#22e4ff');
      s.lines = [];
      s.status = 'idle';
      if (showInput && pb.level.tests[i].input) {
        for (const inp of pb.level.tests[i].input!) {
          s.lines.push({ text: `AURA> ${inp}`, color: '#ff2bd6', shown: 0 });
          sfx.aura();
          const line = s.lines[s.lines.length - 1];
          await e.animate(300, (k) => (line.shown = k * line.text.length), ease.linear);
        }
        await e.wait(250);
      }
      const outs = run.outputs.slice(0, 6);
      if (outs.length === 0) {
        r.eyes = 'tired';
        e.say('...?', '#9fe8ff');
        await e.wait(900);
        r.eyes = 'normal';
      }
      for (const out of outs) {
        const pkt = { k: 0 };
        s.packets.push(pkt);
        sfx.transmit();
        await e.animate(380, (k) => (pkt.k = k), ease.inOut);
        s.packets = s.packets.filter((p) => p !== pkt);
        const line: KLine = { text: '> ' + (out === '' ? ' ' : out), color: '#d8f7ff', shown: 0 };
        s.lines.push(line);
        await e.animate(Math.min(500, 60 + line.text.length * 25), (k) => (line.shown = k * line.text.length), ease.linear);
      }
      await e.wait(350);
      if (i === fail) {
        s.status = 'deny';
        sfx.denied();
        sfx.alarm();
        e.eyeGlow = 1;
        e.setBanner('✖ ' + pb.level.tests[i].label, '#ff3b5c');
        pb.onTestEnd(i, false);
        await e.animate(400, (k) => (s.alarm = k));
        await e.animate(500, (k) => (s.turretAim = k));
        r.eyes = 'angry';
        sfx.zap();
        await e.animate(250, (k) => (s.beam = k), ease.out);
        e.sparks(r.x, r.y, 20, '#ff3b5c');
        await e.explodeRobot();
        s.beam = 0;
        await e.reassembleRobot(START_X);
        await e.animate(500, (k) => {
          s.alarm = 1 - k;
          s.turretAim = 1 - k;
        });
        s.status = 'idle';
        s.lines = [];
        return;
      }
      s.status = 'ok';
      sfx.granted();
      e.setBanner('✔ ' + pb.level.tests[i].label, '#a6ff3a');
      pb.onTestEnd(i, true);
      e.sparks(KX + KW / 2, KY + KH / 2, 16, '#a6ff3a', 160);
      await e.wait(650);
    }
    // victory: open the gate and dash through
    sfx.gateOpen();
    e.shake(4, 900);
    e.eyeGlow = 0.1;
    await e.animate(1100, (k) => (s.open = k), ease.inOut);
    r.eyes = 'happy';
    e.say('יש!!!', '#a6ff3a');
    await e.wait(400);
    sfx.dash();
    r.trail = true;
    await e.moveRobot(W + 120, 700, ease.in);
    r.trail = false;
    sfx.victory();
    for (let i = 0; i < 4; i++) e.sparks(GATE_X + 60, 120 + i * 80, 18, ['#a6ff3a', '#22e4ff', '#ffb020', '#ff2bd6'][i], 300);
    e.setBanner('השער נפרץ!', '#a6ff3a');
    await e.wait(600);
  },
};

