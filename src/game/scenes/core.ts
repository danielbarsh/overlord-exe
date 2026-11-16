/**
 * Stage 7 scene — "AURA CORE": AURA's giant core eye, ringed by shield nodes.
 *   test.scene.nodes: ('FIRE' | 'ICE' | 'VOID' + optional ':armor')[]   e.g. ['FIRE:2', 'ICE', 'VOID']
 * Robot.Freeze() beats FIRE, Robot.Burn() beats ICE, Robot.Hack() beats VOID — each hit removes one armor pip
 * from the first standing node. Robot.Deploy(bot) parks a squad bot in the bay. Robot.Shutdown() ends AURA.
 */
import { sfx } from '../audio';
import type { ObjSnapshot } from '../csharp/interpreter';
import { FLOOR, START_X, roundRect } from '../engine/constants';
import { ease, type Engine } from '../engine/Engine';
import { failIndex, type SceneModule } from './types';

type NodeType = 'FIRE' | 'ICE' | 'VOID';
interface CoreNode { type: NodeType; hp: number; max: number; x: number; y: number; alive: boolean; flash: number; alpha: number; n: number }
interface Beam { x0: number; y0: number; x1: number; y1: number; k: number; color: string; kind: string }
interface CoreState {
  nodes: CoreNode[];
  bay: ObjSnapshot[];
  beams: Beam[];
  eye: number; // 1 open … 0 closed
  rage: number;
  boss: boolean;
  dead: number;
}

const EYE_X = 790, EYE_Y = 230;
const NODE_COLORS: Record<NodeType, string> = { FIRE: '#ff7a1f', ICE: '#7fe3ff', VOID: '#b17dff' };
const BEATS: Record<string, NodeType> = { Freeze: 'FIRE', Burn: 'ICE', Hack: 'VOID' };
const BEAM_COLORS: Record<string, string> = { Freeze: '#bff4ff', Burn: '#ffb020', Hack: '#c9a2ff' };
const st = (e: Engine) => e.s as CoreState;

function makeNodes(raw: unknown): CoreNode[] {
  const list = Array.isArray(raw) ? (raw as string[]) : [];
  const n = list.length;
  return list.map((spec, i) => {
    const [type, armor] = spec.split(':');
    const hp = Math.max(1, Number(armor) || 1);
    // a numbered row from the robot toward the core: #1 is attacked first
    const step = n <= 1 ? 0 : Math.min(80, 340 / (n - 1));
    return { type: type as NodeType, hp, max: hp, x: 300 + i * step, y: 300 + (i % 2) * 34, alive: true, flash: 0, alpha: 1, n: i + 1 };
  });
}

function drawNode(ctx: CanvasRenderingContext2D, n: CoreNode, t: number) {
  if (n.alpha <= 0) return;
  const c = NODE_COLORS[n.type] ?? '#fff';
  ctx.save();
  ctx.globalAlpha = n.alpha;
  ctx.translate(n.x, n.y + Math.sin(t * 2 + n.x) * 4);
  ctx.shadowColor = c;
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#0a0b1c';
  ctx.strokeStyle = c;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k + Math.PI / 6;
    ctx.lineTo(Math.cos(a) * 32, Math.sin(a) * 32);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = c;
  ctx.font = '700 11px Orbitron, monospace';
  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  ctx.fillText(n.type, 0, 4);
  ctx.fillStyle = '#ffffff99';
  ctx.font = '700 12px "JetBrains Mono", monospace';
  ctx.fillText('#' + n.n, 0, 50);
  if (n.flash > 0) {
    ctx.globalAlpha = n.flash * n.alpha;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (n.alive) {
    for (let k = 0; k < n.max; k++) {
      ctx.fillStyle = k < n.hp ? c : '#ffffff22';
      ctx.fillRect(n.x - n.max * 7 + k * 14, n.y - 46, 11, 5);
    }
  }
}

export const coreScene: SceneModule = {
  setup(e, level) {
    sfx.laserHum(false);
    e.s = {
      nodes: makeNodes(level.tests[0]?.scene?.nodes), bay: [], beams: [], eye: 1, rage: 0,
      boss: !!level.sceneConfig?.boss, dead: 0,
    } satisfies CoreState;
    e.eyeColor = '#ffffff';
  },

  preview(e, level, i) {
    st(e).nodes = makeNodes(level.tests[i]?.scene?.nodes);
  },

  update(e, dt) {
    const s = st(e);
    s.rage = Math.max(0, s.rage - dt);
    for (const n of s.nodes) {
      n.flash = Math.max(0, n.flash - dt * 3);
      if (!n.alive) n.alpha = Math.max(0, n.alpha - dt * 1.5);
    }
  },

  drawBack(e, ctx) {
    const s = st(e);
    const t = e.time;
    // core eye
    ctx.save();
    const pulse = 0.7 + 0.3 * Math.sin(t * 2.2);
    const glow = ctx.createRadialGradient(EYE_X, EYE_Y, 10, EYE_X, EYE_Y, 260);
    glow.addColorStop(0, `rgba(255,255,255,${0.25 * s.eye * pulse})`);
    glow.addColorStop(0.5, `rgba(255,43,214,${0.12 * s.eye})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(EYE_X - 280, EYE_Y - 280, 560, 560);
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${(0.15 + i * 0.08) * (0.3 + s.eye * 0.7)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(EYE_X, EYE_Y, 95 + i * 22, t * (0.3 + i * 0.2), t * (0.3 + i * 0.2) + Math.PI * 1.4);
      ctx.stroke();
    }
    ctx.fillStyle = '#0b0b18';
    ctx.strokeStyle = '#ffffffaa';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(EYE_X, EYE_Y, 80, 80 * Math.max(0.04, s.eye), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (s.eye > 0.1) {
      const ic = s.rage > 0 ? '#ff3b5c' : '#ff2bd6';
      ctx.fillStyle = ic;
      ctx.shadowColor = ic;
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.ellipse(EYE_X + Math.sin(t * 0.7) * 12, EYE_Y, 28, 28 * s.eye, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(EYE_X + Math.sin(t * 0.7) * 12, EYE_Y, 8 * s.eye, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.font = '900 13px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.direction = 'ltr';
    ctx.fillText(s.dead > 0.5 ? 'AURA.EXE — OFFLINE' : 'AURA.EXE', EYE_X, EYE_Y + 130);
    ctx.restore();

    for (const n of s.nodes) drawNode(ctx, n, t);

    // squad bay
    s.bay.slice(0, 5).forEach((b, i) => {
      const x = 60 + i * 52;
      const y = FLOOR - 150;
      const c = /frost/i.test(b.cls) ? '#7fe3ff' : /flame/i.test(b.cls) ? '#ff7a1f' : '#c9d4e6';
      ctx.fillStyle = '#141a3a';
      ctx.strokeStyle = c;
      ctx.lineWidth = 2;
      roundRect(ctx, x - 20, y - 20, 40, 40, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x - 7, y - 3, 4, 0, Math.PI * 2);
      ctx.arc(x + 7, y - 3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '600 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.direction = 'ltr';
      ctx.fillText(b.cls.slice(0, 9), x, y + 34);
    });

    // beams
    for (const b of s.beams) {
      const x = b.x0 + (b.x1 - b.x0) * b.k;
      const y = b.y0 + (b.y1 - b.y0) * b.k;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 16;
      ctx.lineWidth = b.kind === 'Hack' ? 2 : 6;
      if (b.kind === 'Hack') ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(b.x0, b.y0);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.restore();
    }
  },

  async onCompileError(e) {
    const r = e.robot;
    r.eyes = 'dizzy';
    st(e).rage = 1.2;
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
      r.eyes = 'focused';
      s.nodes = makeNodes(test.scene?.nodes);
      s.bay = [];
      s.eye = 1;
      e.setBanner(test.label, '#ffffff');
      await e.wait(500);

      let shown = 0;
      let wrecked = false;
      const fast = run.actions.length > 14;
      for (const ev of run.events) {
        if (wrecked || shown++ > 50) break;
        if (ev.kind === 'out') {
          e.say(ev.text, '#a6ff3a');
          await e.wait(fast ? 150 : 300);
          continue;
        }
        if (ev.kind !== 'act') continue;
        const a = ev.action;
        if (a.name === 'Deploy') {
          const o = a.objs[0];
          if (o) s.bay.push(o);
          sfx.teleport();
          await e.wait(fast ? 200 : 380);
          continue;
        }
        if (a.name === 'Shutdown') {
          const standing = s.nodes.some((n) => n.alive);
          if (standing) {
            s.rage = 1.5;
            e.say('הצמתים עדיין מגינים עליה!', '#ff3b5c', EYE_X - 120, EYE_Y - 140);
            sfx.denied();
            await e.wait(700);
            wrecked = true;
          } else {
            sfx.glitch();
            e.shake(10, 900);
            await e.animate(1100, (k) => (s.eye = 1 - k), ease.in);
            e.flash('#ffffff', 0.8);
            e.glowBurst(EYE_X, EYE_Y, '#ffffff', 220, 0.8);
            s.dead = 1;
          }
          continue;
        }
        const target = s.nodes.find((n) => n.alive);
        const color = BEAM_COLORS[a.name];
        if (!color) {
          e.say(`${a.name}(${a.args.map(String).join(', ')})`, '#ffb020');
          await e.wait(350);
          continue;
        }
        const tx = target ? target.x : EYE_X;
        const ty = target ? target.y : EYE_Y;
        const beam: Beam = { x0: r.x + 30, y0: r.y - 10, x1: tx, y1: ty, k: 0, color, kind: a.name };
        s.beams.push(beam);
        a.name === 'Burn' ? sfx.zap() : a.name === 'Freeze' ? sfx.shield() : sfx.transmit();
        await e.animate(fast ? 160 : 300, (k) => (beam.k = k), ease.out);
        await e.wait(fast ? 60 : 140);
        s.beams = s.beams.filter((b) => b !== beam);
        if (!target) {
          e.say('אין צומת!', '#ffb020', EYE_X - 100, EYE_Y - 120);
          continue;
        }
        if (BEATS[a.name] === target.type) {
          target.hp--;
          target.flash = 1;
          e.sparks(tx, ty, 12, NODE_COLORS[target.type], 220);
          if (target.hp <= 0) {
            target.alive = false;
            sfx.droneDown();
            e.glowBurst(tx, ty, NODE_COLORS[target.type], 60, 0.4);
          } else sfx.clank();
        } else {
          // wrong element: the node shrugs it off
          s.rage = 1;
          sfx.denied();
          e.say('לא משפיע!', '#ff3b5c', tx, ty - 50);
          e.ring(tx, ty, '#ff3b5c', 50, 0.35, 3);
          await e.wait(400);
          wrecked = true;
        }
      }
      if (run.error) {
        e.say(run.error.exception, '#ff3b5c');
        await e.wait(500);
      }

      if (failing) {
        s.rage = 1.5;
        sfx.zap();
        e.flash('#ff2bd6', 0.5);
        const beam: Beam = { x0: EYE_X, y0: EYE_Y, x1: r.x, y1: r.y, k: 0, color: '#ff2bd6', kind: 'aura' };
        s.beams.push(beam);
        await e.animate(250, (k) => (beam.k = k), ease.in);
        s.beams = [];
        await e.explodeRobot();
        pb.onTestEnd(i, false);
        e.setBanner('✖ ' + test.label, '#ff3b5c');
        await e.reassembleRobot(START_X);
        s.eye = 1;
        s.dead = 0;
        return;
      }
      pb.onTestEnd(i, true);
      r.eyes = 'happy';
      e.setBanner('✔ ' + test.label, '#a6ff3a');
      await e.wait(600);
      if (i < pb.runs.length - 1) {
        s.eye = 1;
        s.dead = 0;
      }
    }

    sfx.victory();
    r.eyes = 'happy';
    for (let i = 0; i < 6; i++) e.sparks(EYE_X + (Math.random() - 0.5) * 200, EYE_Y + (Math.random() - 0.5) * 200, 16, ['#a6ff3a', '#ff2bd6', '#22e4ff', '#ffb020'][i % 4], 300);
    e.setBanner(s.boss ? 'AURA הושבתה. העולם חופשי!' : 'הליבה נחלשת!', '#a6ff3a');
    await e.wait(1200);
  },
};
