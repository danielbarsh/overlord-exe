/**
 * Stage 6 scene — "REACTOR CHASM": a course of segments between the robot and the exit.
 *   test.scene.course: ('bridge' | 'wall' | 'gap:N')[]   (gap:0 is a bridge)
 *   test.scene.sign:   optional name on the hangar sign
 * Robot.Launch(bot) dresses the robot as the bot's class (JetBot → jetpack, ClimbBot → claws).
 * Walk / Fly / Climb each cross the next segment; the wrong move for a segment ends in disaster.
 * Refuel → fuel pump effect, Report(x) → floating text.
 */
import { sfx } from '../audio';
import { FLOOR, H, ROBOT_Y, START_X, W, roundRect } from '../engine/constants';
import { ease, type Engine } from '../engine/Engine';
import { failIndex, type SceneModule } from './types';

type Seg = { kind: 'bridge' | 'wall' | 'gap'; w: number };
interface ChasmState {
  course: Seg[];
  sign: string;
  botCls: string;
  botName: string;
  flame: number;
  exit: number;
  boss: boolean;
}

const C0 = 250;
const C1 = 850;
const st = (e: Engine) => e.s as ChasmState;

function parseCourse(raw: unknown): Seg[] {
  const list = Array.isArray(raw) ? (raw as string[]) : ['gap:4'];
  return list.map((c) => {
    if (c === 'wall') return { kind: 'wall', w: 0 };
    if (c.startsWith('gap:')) {
      const w = Number(c.slice(4)) || 0;
      return w === 0 ? { kind: 'bridge', w: 0 } : { kind: 'gap', w };
    }
    return { kind: 'bridge', w: 0 };
  });
}
const segW = (s: ChasmState) => (C1 - C0) / Math.max(1, s.course.length);
const segX = (s: ChasmState, i: number) => C0 + i * segW(s);

const isJet = (cls: string) => /jet/i.test(cls);
const isClimb = (cls: string) => /climb/i.test(cls);

export const chasmScene: SceneModule = {
  setup(e, level) {
    sfx.laserHum(false);
    const sc = level.tests[0]?.scene ?? {};
    e.s = {
      course: parseCourse(sc.course), sign: String(sc.sign ?? ''), botCls: '', botName: '', flame: 0, exit: 0,
      boss: !!level.sceneConfig?.boss,
    } satisfies ChasmState;
    e.eyeColor = '#ff2bd6';
  },

  preview(e, level, i) {
    const s = st(e);
    const sc = level.tests[i]?.scene ?? {};
    s.course = parseCourse(sc.course);
    s.sign = String(sc.sign ?? '');
  },

  drawBack(e, ctx) {
    const s = st(e);
    const t = e.time;
    const sw = segW(s);

    s.course.forEach((seg, i) => {
      const x = segX(s, i);
      if (seg.kind === 'gap') {
        // the pit: cut the floor away, reactor glow below
        ctx.fillStyle = '#05030c';
        ctx.fillRect(x + 4, FLOOR - 2, sw - 8, H - FLOOR + 10);
        const g = ctx.createLinearGradient(0, FLOOR, 0, H);
        g.addColorStop(0, 'rgba(255,43,214,0)');
        g.addColorStop(1, `rgba(255,43,214,${0.45 + 0.15 * Math.sin(t * 3 + i)})`);
        ctx.fillStyle = g;
        ctx.fillRect(x + 4, FLOOR, sw - 8, H - FLOOR);
        ctx.strokeStyle = '#ff2bd6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 4, FLOOR - 2);
        ctx.lineTo(x + 4, H);
        ctx.moveTo(x + sw - 4, FLOOR - 2);
        ctx.lineTo(x + sw - 4, H);
        ctx.stroke();
        // width ruler
        ctx.fillStyle = '#ff9be9';
        ctx.font = '700 16px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.direction = 'ltr';
        ctx.fillText(`GAP ${seg.w}`, x + sw / 2, FLOOR - 46);
        for (let k = 0; k < seg.w; k++) {
          ctx.fillStyle = '#ff2bd6aa';
          ctx.fillRect(x + 10 + ((sw - 20) / seg.w) * k, FLOOR - 36, Math.max(2, (sw - 20) / seg.w - 3), 5);
        }
      } else if (seg.kind === 'wall') {
        const wx = x + sw / 2 - 22;
        ctx.fillStyle = '#2b2350';
        ctx.fillRect(wx, 40, 44, FLOOR - 40);
        ctx.fillStyle = '#3a3070';
        for (let y = 50; y < FLOOR; y += 26) ctx.fillRect(wx + ((y / 26) % 2 ? 0 : 10), y, 34, 3);
        ctx.strokeStyle = '#ff2bd6';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(wx, 40, 44, FLOOR - 40);
        ctx.fillStyle = '#ff9be9';
        ctx.font = '700 13px Orbitron, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('WALL', x + sw / 2, 30);
      } else {
        ctx.fillStyle = '#9fe8ff88';
        ctx.font = '700 13px Orbitron, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('BRIDGE', x + sw / 2, FLOOR - 46);
        ctx.strokeStyle = '#22e4ff55';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 6, FLOOR - 22);
        ctx.lineTo(x + sw - 6, FLOOR - 22);
        ctx.stroke();
      }
    });

    // exit door
    const ex = C1 + 30;
    ctx.fillStyle = '#1c2246';
    ctx.fillRect(ex - 6, 200, 78, FLOOR - 200);
    ctx.fillStyle = s.exit > 0 ? `rgba(166,255,58,${0.3 + 0.4 * s.exit})` : '#2f3870';
    ctx.fillRect(ex, 210 + (FLOOR - 210) * s.exit * 0.9, 66, (FLOOR - 210) * (1 - s.exit * 0.9));
    ctx.fillStyle = '#ffb020';
    ctx.font = '700 11px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', ex + 33, 192);

    // hangar sign
    if (s.sign) {
      ctx.save();
      ctx.fillStyle = 'rgba(20,6,30,.9)';
      ctx.strokeStyle = '#ff2bd6';
      ctx.lineWidth = 1.5;
      roundRect(ctx, 40, 70, 190, 54, 8);
      ctx.fill();
      ctx.stroke();
      ctx.direction = 'ltr';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff9be9';
      ctx.font = '700 10px Orbitron, monospace';
      ctx.fillText('HANGAR ORDER', 135, 88);
      ctx.fillStyle = '#fff';
      ctx.font = '700 15px "JetBrains Mono", monospace';
      ctx.fillText(s.sign, 135, 112);
      ctx.restore();
    }

    // jetpack behind the robot
    const r = e.robot;
    if (r.visible && isJet(s.botCls)) {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.rot);
      ctx.fillStyle = '#5a6488';
      roundRect(ctx, -46, -18, 18, 44, 6);
      ctx.fill();
      ctx.fillStyle = '#ff2bd6';
      ctx.fillRect(-44, -10, 14, 4);
      if (s.flame > 0) {
        const fl = 20 + Math.random() * 18;
        const g = ctx.createLinearGradient(0, 26, 0, 26 + fl * s.flame);
        g.addColorStop(0, '#fff6c0');
        g.addColorStop(0.4, '#ffb020');
        g.addColorStop(1, 'rgba(255,43,214,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-44, 26);
        ctx.lineTo(-30, 26);
        ctx.lineTo(-37, 26 + fl * s.flame);
        ctx.fill();
      }
      ctx.restore();
    }
  },

  drawFront(e, ctx) {
    const s = st(e);
    const r = e.robot;
    if (!r.visible) return;
    if (isClimb(s.botCls)) {
      ctx.strokeStyle = '#ffb020';
      ctx.lineWidth = 4;
      for (const dx of [-30, 30]) {
        ctx.beginPath();
        ctx.moveTo(r.x + dx, r.y + 6);
        ctx.lineTo(r.x + dx * 1.35, r.y - 6);
        ctx.lineTo(r.x + dx * 1.5, r.y + 2);
        ctx.stroke();
      }
    }
    if (s.botName) {
      ctx.save();
      ctx.direction = 'ltr';
      ctx.textAlign = 'center';
      ctx.font = '700 12px "JetBrains Mono", monospace';
      const label = `${s.botCls} "${s.botName}"`;
      const w = ctx.measureText(label).width + 14;
      ctx.fillStyle = 'rgba(10,8,24,.8)';
      roundRect(ctx, r.x - w / 2, r.y - 92, w, 20, 6);
      ctx.fill();
      ctx.fillStyle = isJet(s.botCls) ? '#ff9be9' : isClimb(s.botCls) ? '#ffcf5a' : '#c9d4e6';
      ctx.fillText(label, r.x, r.y - 78);
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
      const failing = i === fail;
      pb.onTestStart(i);
      if (r.x !== START_X || !r.visible) await e.teleportRobot(START_X);
      r.y = ROBOT_Y;
      r.rot = 0;
      r.eyes = 'focused';
      s.course = parseCourse(test.scene?.course);
      s.sign = String(test.scene?.sign ?? '');
      s.botCls = '';
      s.botName = '';
      s.exit = 0;
      e.setBanner(test.label, '#ff2bd6');
      await e.wait(500);

      let seg = 0;
      let dead = false;
      const sw = segW(s);
      let shown = 0;
      for (const ev of run.events) {
        if (dead || shown++ > 40) break;
        if (ev.kind === 'out') {
          e.say(ev.text, '#a6ff3a');
          await e.wait(300);
          continue;
        }
        if (ev.kind !== 'act') continue;
        const a = ev.action;
        const obj = a.objs.find(Boolean);
        if (a.name === 'Launch' || (obj && !s.botCls)) {
          if (obj) {
            s.botCls = obj.cls;
            s.botName = String(obj.fields.name ?? obj.fields.Name ?? '');
          }
          sfx.teleport();
          e.glowBurst(r.x, r.y, '#ff2bd6', 70, 0.35);
          await e.wait(450);
          continue;
        }
        if (a.name === 'Refuel') {
          sfx.shield();
          e.ring(r.x, r.y, '#ffb020', 60, 0.4, 3);
          e.say('⛽ FUEL 100', '#ffb020');
          await e.wait(500);
          continue;
        }
        if (a.name === 'Report') {
          e.say(a.args.map(String).join(', '), '#ffcf5a');
          await e.wait(400);
          continue;
        }
        if (a.name !== 'Walk' && a.name !== 'Fly' && a.name !== 'Climb') {
          e.say(`${a.name}()`, '#ffb020');
          await e.wait(400);
          continue;
        }
        const here = s.course[seg];
        if (!here) {
          e.say('?!', '#9fe8ff');
          await e.wait(300);
          continue;
        }
        const x0 = segX(s, seg);
        const xEnd = x0 + sw;
        if (a.name === 'Walk') {
          sfx.dash();
          if (here.kind === 'gap') {
            await e.moveRobot(x0 + sw / 2, 500, ease.in);
            e.say('אוי...', '#ff9be9');
            sfx.tired();
            await e.animate(600, (k) => (r.y = ROBOT_Y + k * k * 220), ease.linear);
            e.flash('#ff2bd6', 0.5);
            await e.explodeRobot();
            dead = true;
          } else if (here.kind === 'wall') {
            await e.moveRobot(x0 + sw / 2 - 52, 400, ease.in);
            sfx.clank();
            e.shake(6, 300);
            r.eyes = 'dizzy';
            e.say('בונק!', '#ffb020');
            await e.wait(600);
            dead = true;
          } else {
            await e.moveRobot(xEnd - 10, 520, ease.inOut);
          }
        } else if (a.name === 'Fly') {
          if (!isJet(s.botCls) && s.botCls) {
            e.say('אין לי מנוע!', '#ffb020');
            await e.wait(500);
            dead = true;
          } else if (here.kind === 'wall') {
            s.flame = 1;
            sfx.jump();
            await e.moveRobot(x0 + sw / 2 - 50, 450, ease.in, (k) => -k * 120);
            sfx.clank();
            e.shake(8, 300);
            s.flame = 0;
            await e.animate(400, (k) => (r.y = ROBOT_Y - 120 + k * 120), ease.in);
            await e.explodeRobot();
            dead = true;
          } else {
            s.flame = 1;
            r.trail = true;
            sfx.jump();
            await e.moveRobot(xEnd - 10, 750, ease.inOut, (k) => -Math.sin(k * Math.PI) * 150);
            r.trail = false;
            s.flame = 0;
            r.rot = 0;
          }
        } else {
          // Climb
          if (here.kind === 'wall') {
            const wx = x0 + sw / 2;
            await e.moveRobot(wx - 52, 350, ease.inOut);
            sfx.clank();
            await e.animate(700, (k) => (r.y = ROBOT_Y - k * (ROBOT_Y - 20)), ease.inOut);
            await e.moveRobot(wx + 52, 350, ease.inOut);
            await e.animate(500, (k) => (r.y = 20 + k * (ROBOT_Y - 20)), ease.in);
            await e.moveRobot(xEnd - 10, 300, ease.out);
          } else if (here.kind === 'gap') {
            await e.moveRobot(x0 + sw / 2, 450, ease.in);
            e.say('אין במה לטפס!', '#ffb020');
            await e.animate(600, (k) => (r.y = ROBOT_Y + k * k * 220), ease.linear);
            await e.explodeRobot();
            dead = true;
          } else {
            await e.moveRobot(xEnd - 10, 600, ease.inOut);
          }
        }
        if (!dead) seg++;
      }
      if (run.error) {
        e.say(run.error.exception, '#ff3b5c');
        await e.wait(500);
      }

      if (failing) {
        if (!dead) {
          r.eyes = 'tired';
          e.say(seg < s.course.length ? 'נתקעתי באמצע...' : 'הסורק דחה אותי', '#9fe8ff');
          await e.wait(700);
          sfx.zap();
          e.flash('#ff2bd6', 0.4);
          await e.explodeRobot();
        }
        pb.onTestEnd(i, false);
        e.setBanner('✖ ' + test.label, '#ff3b5c');
        await e.reassembleRobot(START_X);
        r.y = ROBOT_Y;
        return;
      }
      pb.onTestEnd(i, true);
      r.eyes = 'happy';
      e.setBanner('✔ ' + test.label, '#a6ff3a');
      e.sparks(r.x, r.y - 30, 12, '#a6ff3a', 150);
      await e.wait(500);
    }

    // victory
    sfx.gateOpen();
    await e.animate(800, (k) => (s.exit = k));
    r.trail = true;
    sfx.dash();
    await e.moveRobot(W + 120, 650, ease.in);
    r.trail = false;
    sfx.victory();
    e.setBanner(s.boss ? 'התהום נחצתה!' : 'עברנו!', '#a6ff3a');
    for (let i = 0; i < 4; i++) e.sparks(C1 + 60, 220 + i * 60, 14, ['#a6ff3a', '#ff2bd6', '#ffb020', '#22e4ff'][i], 280);
    await e.wait(700);
  },
};
