/**
 * Stage 2 scene — a laser corridor. Each test case sets the laser color/power,
 * the robot performs the Robot.*() actions the student's code produced.
 */
import { sfx } from '../audio';
import { FLOOR, START_X, W, roundRect } from '../engine/constants';
import { ease, type Engine } from '../engine/Engine';
import { failIndex, type SceneModule } from './types';

const LX = 500;
const EXIT_X = 840;
const CROSS_TO = 770;

type LaserColor = 'RED' | 'BLUE' | 'GREEN' | 'OFF' | string;
interface LaserState {
  color: LaserColor;
  power: number | null;
  /** 0..1 — EMP'd emitter */
  disabled: number;
  /** 0..1 — beams fading in on a new scan */
  on: number;
  exit: number;
  boss: boolean;
}
const st = (e: Engine) => e.s as LaserState;

const COLORS: Record<string, string> = { RED: '#ff3b5c', BLUE: '#3b8bff', GREEN: '#a6ff3a', YELLOW: '#ffd23b' };

function beamAlpha(s: LaserState, t: number) {
  return s.on * (1 - s.disabled) * (0.75 + Math.sin(t * 30) * 0.08 + (s.disabled > 0 ? Math.random() * 0.3 : 0));
}

export const laserScene: SceneModule = {
  setup(e, level) {
    const first = level.tests[0]?.scene ?? {};
    e.s = {
      color: (first.color as string) ?? 'RED',
      power: (first.power as number) ?? null,
      disabled: 0,
      on: 1,
      exit: 0,
      boss: !!level.sceneConfig?.boss,
    } satisfies LaserState;
    e.eyeColor = '#ff3b5c';
    sfx.laserHum(true);
  },

  teardown() {
    sfx.laserHum(false);
  },

  preview(e, level, i) {
    const s = st(e);
    const sc = level.tests[i]?.scene ?? {};
    s.color = (sc.color as string) ?? 'RED';
    s.power = (sc.power as number) ?? null;
  },

  update(e) {
    const s = st(e);
    const r = e.robot;
    // shield sparks while pushing through red beams
    if ((s.color === 'RED' || s.color === 'YELLOW') && s.on > 0.5 && s.disabled < 0.5 && r.visible && Math.abs(r.x - LX) < 50 && r.shield > 0.5 && Math.random() < 0.7) {
      e.sparks(LX + (Math.random() - 0.5) * 20, r.y + (Math.random() - 0.5) * 60, 2, '#ffb0c0', 220);
    }
  },

  drawBack(e, ctx) {
    const s = st(e);
    const t = e.time;
    // reactor glow for the boss
    if (s.boss) {
      const p = 0.6 + Math.sin(t * 2.5) * 0.2;
      const g = ctx.createRadialGradient(LX, 260, 20, LX, 260, 300);
      g.addColorStop(0, `rgba(255,120,40,${0.35 * p})`);
      g.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = g;
      ctx.fillRect(LX - 320, -40, 640, 560);
      ctx.strokeStyle = `rgba(255,160,60,${0.4 * p})`;
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(LX, 260, 90 + i * 40, t * (i + 1) * 0.4, t * (i + 1) * 0.4 + Math.PI);
        ctx.stroke();
      }
    }
    // exit door
    ctx.fillStyle = '#1c2246';
    ctx.fillRect(EXIT_X - 10, 150, 110, FLOOR - 150);
    ctx.save();
    ctx.beginPath();
    ctx.rect(EXIT_X, 160, 90, FLOOR - 160);
    ctx.clip();
    if (s.exit > 0) {
      ctx.fillStyle = `rgba(166,255,58,${0.4 * s.exit})`;
      ctx.fillRect(EXIT_X, 160, 90, FLOOR - 160);
    }
    ctx.fillStyle = '#2f3870';
    const dh = (FLOOR - 160) * (1 - s.exit);
    ctx.fillRect(EXIT_X, 160, 90, dh);
    ctx.fillStyle = s.exit > 0 ? '#a6ff3a' : '#ff3b5c';
    ctx.fillRect(EXIT_X + 40, 160 + dh - 30, 10, 10);
    ctx.restore();
    ctx.fillStyle = '#ffb020';
    ctx.font = '700 11px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', EXIT_X + 45, 145);

    // emitters
    const col = COLORS[s.color] ?? '#555';
    const active = s.color !== 'OFF' && s.on > 0.05;
    const emColor = active && s.disabled < 0.5 ? col : '#333a55';
    // top emitter
    ctx.fillStyle = '#262e5e';
    roundRect(ctx, LX - 46, 60, 92, 34, 8);
    ctx.fill();
    ctx.fillStyle = emColor;
    ctx.shadowColor = emColor;
    ctx.shadowBlur = active ? 14 : 0;
    ctx.fillRect(LX - 30, 88, 60, 6);
    ctx.shadowBlur = 0;
    // floor emitter
    ctx.fillStyle = '#262e5e';
    roundRect(ctx, LX - 46, FLOOR - 12, 92, 18, 6);
    ctx.fill();
    ctx.fillStyle = emColor;
    ctx.fillRect(LX - 30, FLOOR - 12, 60, 4);
    // side posts for BLUE low beams
    ctx.fillStyle = '#262e5e';
    ctx.fillRect(LX - 86, FLOOR - 70, 12, 70);
    ctx.fillRect(LX + 74, FLOOR - 70, 12, 70);

    // power readout
    ctx.save();
    ctx.direction = 'ltr';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = active ? col : '#666';
    // shows exactly what Sensor.ReadColor() returns
    ctx.fillText(s.color, LX, 74);
    if (s.power !== null) {
      const pw = s.power / 100;
      ctx.fillStyle = '#0a0e22';
      ctx.fillRect(LX - 36, 78, 72, 6);
      ctx.fillStyle = pw > 0.8 ? '#ff3b5c' : pw > 0.5 ? '#ffb020' : '#a6ff3a';
      ctx.fillRect(LX - 36, 78, 72 * pw, 6);
      ctx.fillStyle = '#fff';
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.fillText(`PWR ${s.power}%`, LX, 112);
    }
    ctx.restore();
  },

  drawFront(e, ctx) {
    const s = st(e);
    const t = e.time;
    if (s.color === 'OFF') return;
    const col = COLORS[s.color] ?? '#fff';
    const a = beamAlpha(s, t);
    if (a <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a;
    ctx.strokeStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 22;
    if (s.color === 'BLUE') {
      for (let i = 0; i < 3; i++) {
        const y = FLOOR - 16 - i * 18;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(LX - 74, y);
        ctx.lineTo(LX + 74, y);
        ctx.stroke();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#e0ecff';
        ctx.stroke();
        ctx.strokeStyle = col;
      }
    } else {
      const xs = [LX - 18, LX, LX + 18];
      const dashed = s.color === 'GREEN';
      if (dashed) ctx.setLineDash([10, 12]);
      ctx.lineDashOffset = -t * 60;
      xs.forEach((x, i) => {
        const wob = Math.sin(t * 9 + i) * 1.5;
        ctx.lineWidth = dashed ? 2.5 : 5;
        ctx.globalAlpha = a * (dashed ? 0.5 : 1);
        ctx.beginPath();
        ctx.moveTo(x + wob, 94);
        ctx.lineTo(x - wob, FLOOR - 12);
        ctx.stroke();
        if (!dashed) {
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#ffe3ea';
          ctx.stroke();
          ctx.strokeStyle = col;
        }
      });
      ctx.setLineDash([]);
    }
    ctx.restore();
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
      pb.onTestStart(i);
      // new scan: lasers re-arm with the test's color/power
      if (r.x !== START_X || i > 0) await e.teleportRobot(START_X);
      r.shield = 0;
      await e.animate(200, (k) => (s.on = 1 - k));
      s.color = (test.scene?.color as string) ?? 'RED';
      s.power = (test.scene?.power as number) ?? null;
      s.disabled = 0;
      sfx.zap();
      await e.animate(350, (k) => (s.on = k), ease.out);
      e.setBanner(test.label, COLORS[s.color] ?? '#22e4ff');
      await e.wait(450);

      const failing = i === fail;
      let exploded = false;
      let crossed = false;
      for (const act of pb.runs[i].actions) {
        if (exploded || crossed) break;
        switch (act.name) {
          case 'Shield':
            sfx.shield();
            e.ring(r.x, r.y, '#22e4ff', 70, 0.4, 3);
            await e.animate(400, (k) => (r.shield = k), ease.out);
            break;
          case 'EMP':
            r.eyes = 'focused';
            await e.animate(350, (k) => (r.charge = k), ease.in);
            sfx.emp();
            e.shake(8, 400);
            e.flash('#9ff6ff', 0.35);
            e.ring(r.x, r.y, '#9ff6ff', 520, 0.7, 6);
            e.ring(r.x, r.y, '#22e4ff', 380, 0.55, 3);
            r.charge = 0;
            await e.wait(260);
            e.sparks(LX, 90, 24, '#9ff6ff', 300);
            e.sparks(LX, FLOOR - 10, 24, '#9ff6ff', 300);
            await e.animate(400, (k) => (s.disabled = k), ease.linear);
            e.say('EMP!', '#9ff6ff', LX, 140);
            r.eyes = 'normal';
            break;
          case 'Dash':
          case 'Jump': {
            const jump = act.name === 'Jump';
            if (jump) sfx.jump();
            else sfx.dash();
            r.trail = true;
            if (failing) {
              // stop at the laser and get zapped
              await e.moveRobot(LX - 10, jump ? 420 : 300, jump ? ease.out : ease.in, jump ? (k) => -Math.sin(k * Math.PI * 0.6) * 90 : undefined);
              r.trail = false;
              sfx.zap();
              e.flash(COLORS[s.color] ?? '#fff', 0.5);
              e.sparks(r.x, r.y, 30, COLORS[s.color] ?? '#fff');
              await e.explodeRobot();
              exploded = true;
            } else {
              await e.moveRobot(CROSS_TO, jump ? 750 : 480, jump ? ease.inOut : ease.in, jump ? (k) => -Math.sin(k * Math.PI) * 170 : undefined);
              if (jump) r.rot = 0;
              r.trail = false;
              crossed = true;
            }
            break;
          }
          case 'Wait':
            e.say('...', '#9fe8ff');
            await e.wait(700);
            break;
          default:
            e.say(`${act.name}()`, '#ffb020');
            await e.wait(500);
        }
      }
      if (failing) {
        if (!exploded) {
          // never crossed / wrong combo — AURA zaps it on the spot
          r.eyes = 'tired';
          e.say(crossed ? '?!' : 'אמ... מה עכשיו?', '#9fe8ff');
          await e.wait(700);
          sfx.zap();
          e.flash('#ff3b5c', 0.5);
          await e.explodeRobot();
        }
        pb.onTestEnd(i, false);
        e.setBanner('✖ ' + test.label, '#ff3b5c');
        await e.reassembleRobot(START_X);
        return;
      }
      pb.onTestEnd(i, true);
      r.eyes = 'happy';
      e.setBanner('✔ ' + test.label, '#a6ff3a');
      e.sparks(r.x, r.y - 30, 12, '#a6ff3a', 150);
      await e.wait(450);
      r.eyes = 'normal';
      r.shield = 0;
    }
    // victory
    sfx.gateOpen();
    await e.animate(900, (k) => (s.exit = k));
    r.eyes = 'happy';
    sfx.dash();
    r.trail = true;
    await e.moveRobot(W + 120, 650, ease.in);
    r.trail = false;
    sfx.victory();
    sfx.laserHum(false);
    await e.animate(500, (k) => (s.on = 1 - k));
    s.color = 'OFF';
    e.setBanner('המסדרון נפרץ!', '#a6ff3a');
    for (let i = 0; i < 4; i++) e.sparks(EXIT_X + 45, 200 + i * 60, 16, ['#a6ff3a', '#22e4ff', '#ffb020', '#ff2bd6'][i], 300);
    await e.wait(600);
  },
};

