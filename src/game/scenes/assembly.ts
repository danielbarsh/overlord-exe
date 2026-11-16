/**
 * Stage 3 scene — "DRONE FOUNDRY": an assembly line delivers drones toward the robot,
 * each Robot.EMP() fires a pulse at the first live drone. Tanks take 3 hits.
 * verdict.tag === 'exhausted' → the robot slows down, sweats and collapses (copy-paste punishment).
 */
import { sfx } from '../audio';
import { FLOOR, ROBOT_Y, START_X, W, roundRect } from '../engine/constants';
import { ease, type Engine } from '../engine/Engine';
import { failIndex, type SceneModule } from './types';

/** DECOY = a hologram: EMP passes straight through it, and it never blocks the exit */
type DroneType = 'SCOUT' | 'TANK' | 'DECOY';
interface Drone {
  type: DroneType;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  alive: boolean;
  flash: number;
  /** falling after destruction */
  vy: number;
  rot: number;
  alpha: number;
}
interface Pulse { x0: number; y0: number; x1: number; y1: number; k: number }
interface FoundryState {
  drones: Drone[];
  belt: number;
  beltSpeed: number;
  pulses: Pulse[];
  hatch: 'red' | 'green';
  destroyed: number;
  boss: boolean;
}

const BELT_X0 = 250;
const HATCH_X = 880;
const SLOT_X0 = 340;
const SLOT_W = 66;
const DRONE_Y = FLOOR - 78;
const MAX_ANIMATED = 26;

const st = (e: Engine) => e.s as FoundryState;
const slotX = (i: number) => SLOT_X0 + i * SLOT_W;
const isReal = (d: Drone) => d.alive && d.type !== 'DECOY';

function makeDrones(types: DroneType[], offscreen: boolean): Drone[] {
  return types.map((type, i) => ({
    type,
    hp: type === 'TANK' ? 3 : 1,
    maxHp: type === 'TANK' ? 3 : 1,
    x: offscreen ? HATCH_X + 80 + i * SLOT_W : slotX(i),
    y: DRONE_Y,
    alive: true,
    flash: 0,
    vy: 0,
    rot: 0,
    alpha: 1,
  }));
}

/** tween every live drone to its belt slot */
async function advanceBelt(e: Engine, ms: number) {
  const s = st(e);
  const live = s.drones.filter((d) => d.alive);
  const from = live.map((d) => d.x);
  s.beltSpeed = 160;
  await e.animate(ms, (k) => live.forEach((d, i) => (d.x = from[i] + (slotX(i) - from[i]) * k)), ease.out);
  s.beltSpeed = 25;
}

export const assemblyScene: SceneModule = {
  setup(e, level) {
    sfx.laserHum(false);
    const first = (level.tests[0]?.scene?.drones as DroneType[] | undefined) ?? [];
    e.s = {
      drones: makeDrones(first, false),
      belt: 0,
      beltSpeed: 25,
      pulses: [],
      hatch: 'red',
      destroyed: 0,
      boss: !!level.sceneConfig?.boss,
    } satisfies FoundryState;
    e.eyeColor = '#a6ff3a';
  },

  preview(e, level, i) {
    st(e).drones = makeDrones((level.tests[i]?.scene?.drones as DroneType[] | undefined) ?? [], false);
  },

  update(e, dt) {
    const s = st(e);
    s.belt = (s.belt + s.beltSpeed * dt) % 40;
    for (const d of s.drones) {
      d.flash = Math.max(0, d.flash - dt * 4);
      if (!d.alive && d.alpha > 0) {
        d.vy += 900 * dt;
        d.y += d.vy * dt;
        d.rot += dt * 6;
        if (d.y > FLOOR + 40) d.alpha = Math.max(0, d.alpha - dt * 3);
      }
    }
  },

  drawBack(e, ctx) {
    const s = st(e);
    const t = e.time;
    // foundry status board
    ctx.save();
    ctx.fillStyle = '#0a1024';
    ctx.strokeStyle = '#a6ff3a66';
    ctx.lineWidth = 2;
    roundRect(ctx, 560, 210, 220, 64, 8);
    ctx.fill();
    ctx.stroke();
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.font = '700 11px Orbitron, monospace';
    ctx.fillStyle = '#a6ff3a';
    ctx.fillText(s.boss ? 'MAIN ASSEMBLY LINE' : 'DRONE FOUNDRY', 574, 230);
    ctx.font = '600 13px "JetBrains Mono", monospace';
    const live = s.drones.filter(isReal).length;
    ctx.fillStyle = live ? '#ff3b5c' : '#a6ff3a';
    ctx.fillText(`ACTIVE: ${live}`, 574, 252);
    ctx.fillStyle = '#9fe8ff';
    ctx.fillText(`DOWN: ${s.destroyed}`, 680, 252);
    ctx.fillStyle = s.beltSpeed > 0 ? '#ffb020' : '#666';
    ctx.fillText(s.beltSpeed > 0 ? '▶ LINE RUNNING' : '■ LINE STOPPED', 574, 268);
    ctx.restore();

    // hatch (where drones come from)
    ctx.fillStyle = '#1c2246';
    ctx.fillRect(HATCH_X - 14, 250, 110, FLOOR - 250);
    ctx.fillStyle = '#05060f';
    ctx.fillRect(HATCH_X, 300, 90, FLOOR - 300);
    const hc = s.hatch === 'green' ? '#a6ff3a' : '#ff3b5c';
    ctx.fillStyle = hc;
    ctx.shadowColor = hc;
    ctx.shadowBlur = 14;
    ctx.fillRect(HATCH_X + 6, 284, 78, 6);
    ctx.shadowBlur = 0;
    // warning stripes on hatch frame
    for (let y = 300; y < FLOOR; y += 18) {
      ctx.fillStyle = (Math.floor(y / 18) % 2 ? '#ffb020' : '#1c2246');
      ctx.fillRect(HATCH_X - 14, y, 10, 18);
    }

    // conveyor belt
    const by = FLOOR - 34;
    ctx.fillStyle = '#20264d';
    ctx.fillRect(BELT_X0, by, W - BELT_X0 + 20, 28);
    ctx.fillStyle = '#2d3566';
    ctx.fillRect(BELT_X0, by, W - BELT_X0 + 20, 5);
    ctx.save();
    ctx.beginPath();
    ctx.rect(BELT_X0, by + 6, W - BELT_X0 + 20, 16);
    ctx.clip();
    ctx.strokeStyle = 'rgba(166,255,58,.35)';
    ctx.lineWidth = 3;
    for (let x = BELT_X0 - 40 + (40 - s.belt); x < W + 40; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x + 10, by + 8);
      ctx.lineTo(x, by + 14);
      ctx.lineTo(x + 10, by + 20);
      ctx.stroke();
    }
    ctx.restore();
    for (let x = BELT_X0 + 14; x < W; x += 56) {
      ctx.fillStyle = '#121734';
      ctx.beginPath();
      ctx.arc(x, by + 28, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3d4680';
      ctx.beginPath();
      ctx.moveTo(x, by + 28);
      ctx.lineTo(x + Math.cos(-t * 4) * 6, by + 28 + Math.sin(-t * 4) * 6);
      ctx.stroke();
    }

    // drones (clipped so queued ones hide inside the hatch)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, HATCH_X + 4, H_CLIP);
    ctx.clip();
    for (const d of s.drones) if (d.alpha > 0) drawDrone(ctx, d, t);
    ctx.restore();

    // pulses
    for (const p of s.pulses) {
      const x = p.x0 + (p.x1 - p.x0) * p.k;
      const y = p.y0 + (p.y1 - p.y0) * p.k;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, 0, x, y, 22);
      g.addColorStop(0, 'rgba(220,255,255,1)');
      g.addColorStop(0.4, 'rgba(34,228,255,.8)');
      g.addColorStop(1, 'rgba(34,228,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(34,228,255,.5)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - (p.x1 - p.x0) * 0.12, y - (p.y1 - p.y0) * 0.12);
      ctx.stroke();
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
      const exhausted = failing && pb.verdict.tag === 'exhausted';
      pb.onTestStart(i);

      // load a fresh batch from the hatch
      if (r.x !== START_X || !r.visible) await e.teleportRobot(START_X);
      r.tired = 0;
      r.eyes = 'focused';
      s.hatch = 'red';
      s.destroyed = 0;
      s.drones = makeDrones((test.scene?.drones as DroneType[]) ?? [], true);
      e.setBanner(test.label, '#a6ff3a');
      if (s.drones.length) {
        sfx.clank();
        await advanceBelt(e, 700 + Math.min(6, s.drones.length) * 60);
      } else {
        e.say('הפס ריק...', '#9fe8ff', 600, 360);
        await e.wait(500);
      }
      await e.wait(250);

      const events = run.events;
      const acts = run.actions.length;
      const fast = acts > 10;
      let animated = 0;
      let shots = 0;
      let outN = 0;
      let collapsed = false;
      let exploded = false;
      let escaped = false;

      for (const ev of events) {
        if (collapsed || exploded) break;
        if (ev.kind === 'out') {
          if (animated < MAX_ANIMATED) {
            e.texts.push({ x: START_X + 30, y: ROBOT_Y - 80 - (outN % 3) * 22, text: ev.text, color: '#a6ff3a', life: 0, max: 1.3, size: 15, vy: -20 });
            outN++;
          }
          continue;
        }
        if (ev.kind !== 'act') continue;
        const name = ev.action.name;
        if (name === 'EMP') {
          shots++;
          const target = s.drones.find(isReal);
          const ghost = target ? undefined : s.drones.find((d) => d.alive && d.type === 'DECOY');
          if (animated >= MAX_ANIMATED) {
            // fast-forward the rest without animation
            if (target) hit(e, target, false);
            continue;
          }
          animated++;
          if (exhausted) {
            r.tired = Math.min(1, shots / 4);
            r.eyes = 'tired';
            if (shots >= 4) {
              collapsed = true;
              break;
            }
          }
          const slow = 1 + r.tired * 2.2;
          const scale = (fast ? 0.45 : 1) * slow;
          await e.animate(90 * scale, (k) => (r.charge = k), ease.in);
          sfx.pulse();
          r.charge = 0;
          const aim = target ?? ghost;
          const tx = aim ? aim.x : HATCH_X + 40;
          const ty = aim ? aim.y : DRONE_Y;
          const p: Pulse = { x0: r.x + 30, y0: r.y, x1: tx, y1: ty, k: 0 };
          s.pulses.push(p);
          r.x -= 6; // recoil
          await e.animate(Math.max(90, (tx - r.x) * 0.45) * (fast ? 0.6 : 1), (k) => (p.k = k), ease.linear);
          r.x += 6;
          s.pulses = s.pulses.filter((q) => q !== p);
          if (target) {
            hit(e, target, true);
            if (!target.alive) await advanceBelt(e, fast ? 140 : 240);
          } else if (ghost) {
            ghost.flash = 1;
            e.say('הולוגרמה! הפולס עבר דרכה', '#ffb020', ghost.x, DRONE_Y - 60);
          } else {
            e.sparks(HATCH_X + 10, DRONE_Y, 12, '#9ff6ff', 200);
            e.say('פספוס! אין רחפן', '#ffb020', HATCH_X - 60, DRONE_Y - 50);
          }
          await e.wait((fast ? 60 : 160) * slow);
        } else if (name === 'Dash') {
          if (animated >= MAX_ANIMATED) {
            const remaining = acts - animated;
            if (remaining > 0) e.say(`⏩ +${remaining} פעולות`, '#9fe8ff', START_X + 60, ROBOT_Y - 110);
          }
          r.eyes = 'happy';
          sfx.dash();
          r.trail = true;
          const blocked = s.drones.some(isReal);
          if (blocked) {
            const first = s.drones.find(isReal)!;
            await e.moveRobot(first.x - 50, 380, ease.in);
            r.trail = false;
            e.say('בום!', '#ff3b5c');
            await e.explodeRobot();
            exploded = true;
          } else {
            s.hatch = 'green';
            await e.moveRobot(W + 120, 650, ease.in);
            r.trail = false;
            escaped = true;
          }
        } else {
          e.say(`${name}()`, '#ffb020');
          await e.wait(400);
        }
      }
      if (animated >= MAX_ANIMATED && !escaped && !exploded && !collapsed) {
        const remaining = acts - animated;
        if (remaining > 0) e.say(`⏩ +${remaining} פולסים`, '#9fe8ff', START_X + 60, ROBOT_Y - 110);
        await e.wait(500);
      }

      if (failing) {
        pb.onTestEnd(i, false);
        e.setBanner('✖ ' + test.label, '#ff3b5c');
        if (collapsed) {
          // the copy-paste punishment: robot runs out of steam
          sfx.tired();
          e.say('😵 מותש... יותר מדי פקודות', '#ffb020');
          await e.animate(700, (k) => {
            r.rot = k * 1.35;
            r.y = ROBOT_Y + k * 38;
          }, ease.in);
          sfx.clank();
          e.shake(5, 300);
          e.smoke(r.x, FLOOR - 10, 6);
          await e.wait(400);
          e.say('Zzz', '#9fe8ff', r.x + 30, r.y - 40);
          await e.wait(1300);
          r.rot = 0;
          r.y = ROBOT_Y;
          r.tired = 0;
          r.eyes = 'normal';
          await e.teleportRobot(START_X);
        } else if (!exploded) {
          const live = s.drones.filter((d) => isReal(d) && d.x < HATCH_X);
          if (live.length) {
            // surviving drones swarm the robot
            e.say('הם עדיין פעילים!', '#ff3b5c', 600, 330);
            sfx.alarm();
            const from = live.map((d) => ({ x: d.x, y: d.y }));
            await e.animate(600, (k) => live.forEach((d, j) => {
              d.x = from[j].x + (r.x + 20 - from[j].x) * k;
              d.y = from[j].y + (r.y - from[j].y) * k + Math.sin(k * Math.PI) * -60;
            }), ease.in);
          } else {
            sfx.zap();
            e.flash('#ff3b5c', 0.4);
          }
          await e.explodeRobot();
          await e.reassembleRobot(START_X);
        } else {
          await e.reassembleRobot(START_X);
        }
        r.eyes = 'normal';
        return;
      }

      pb.onTestEnd(i, true);
      e.setBanner('✔ ' + test.label, '#a6ff3a');
      if (!escaped) {
        r.eyes = 'happy';
        e.sparks(r.x, r.y - 30, 12, '#a6ff3a', 150);
      }
      await e.wait(500);
      r.eyes = 'normal';
    }

    // victory: line stops, hatch opens
    s.beltSpeed = 0;
    s.hatch = 'green';
    sfx.gateOpen();
    e.shake(4, 600);
    e.eyeGlow = 0.1;
    if (r.x < W) {
      r.eyes = 'happy';
      sfx.dash();
      r.trail = true;
      await e.moveRobot(W + 120, 650, ease.in);
      r.trail = false;
    }
    sfx.victory();
    for (let k = 0; k < 4; k++) e.sparks(HATCH_X + 40, 320 + k * 35, 16, ['#a6ff3a', '#22e4ff', '#ffb020', '#ff2bd6'][k], 300);
    e.setBanner('פס הייצור הושבת!', '#a6ff3a');
    await e.wait(600);
  },
};

const H_CLIP = 700;

function hit(e: Engine, d: Drone, fx: boolean) {
  const s = st(e);
  d.hp--;
  d.flash = 1;
  if (fx) {
    e.ring(d.x, d.y, '#9ff6ff', 46, 0.35, 3);
    e.sparks(d.x, d.y, d.hp > 0 ? 8 : 18, d.hp > 0 ? '#ffb020' : '#9ff6ff', 220);
  }
  if (d.hp <= 0) {
    d.alive = false;
    d.vy = -180;
    s.destroyed++;
    if (fx) {
      sfx.droneDown();
      e.glowBurst(d.x, d.y, '#22e4ff', 50, 0.3);
      e.smoke(d.x, d.y, 3);
    }
  } else if (fx) sfx.clank();
}

function drawDrone(ctx: CanvasRenderingContext2D, d: Drone, t: number) {
  if (d.type === 'DECOY') return drawDecoy(ctx, d, t);
  const tank = d.type === 'TANK';
  const sc = tank ? 1.3 : 1;
  const bob = d.alive ? Math.sin(t * 5 + d.x * 0.05) * 3 : 0;
  ctx.save();
  ctx.globalAlpha = d.alpha;
  ctx.translate(d.x, d.y + bob);
  ctx.rotate(d.rot);
  ctx.scale(sc, sc);
  // rotors
  ctx.strokeStyle = '#3d4680';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-20, -8);
  ctx.lineTo(20, -8);
  ctx.stroke();
  for (const rx of [-20, 20]) {
    ctx.fillStyle = d.alive ? 'rgba(180,190,255,.35)' : '#3d4680';
    ctx.beginPath();
    ctx.ellipse(rx, -11, d.alive ? 12 * Math.abs(Math.sin(t * 40 + rx)) + 3 : 10, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // body
  ctx.fillStyle = tank ? '#4a3c2a' : '#2d3355';
  ctx.strokeStyle = tank ? '#ffb020' : '#ff3b5c';
  ctx.lineWidth = 1.5;
  roundRect(ctx, -15, -6, 30, 18, 7);
  ctx.fill();
  ctx.stroke();
  if (tank) {
    ctx.fillStyle = '#7a6440';
    ctx.fillRect(-15, 2, 30, 4);
    ctx.fillRect(-11, -6, 4, 18);
    ctx.fillRect(7, -6, 4, 18);
  }
  // eye
  const ec = d.alive ? '#ff3b5c' : '#333';
  ctx.fillStyle = ec;
  ctx.shadowColor = ec;
  ctx.shadowBlur = d.alive ? 10 : 0;
  ctx.beginPath();
  ctx.arc(0, 3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  if (d.flash > 0) {
    ctx.globalAlpha = d.flash * d.alpha;
    ctx.fillStyle = '#e8ffff';
    roundRect(ctx, -16, -12, 32, 26, 8);
    ctx.fill();
  }
  ctx.restore();
  // tank HP pips
  if (tank && d.alive) {
    for (let k = 0; k < d.maxHp; k++) {
      ctx.fillStyle = k < d.hp ? '#ffb020' : '#ffffff22';
      ctx.fillRect(d.x - 14 + k * 10, d.y - 34, 8, 4);
    }
  }
}

/** holographic decoy — flickering, see-through, no armor */
function drawDecoy(ctx: CanvasRenderingContext2D, d: Drone, t: number) {
  const bob = Math.sin(t * 5 + d.x * 0.05) * 3;
  const flick = 0.35 + 0.2 * Math.sin(t * 23 + d.x) + (Math.random() < 0.05 ? -0.25 : 0);
  ctx.save();
  ctx.globalAlpha = Math.max(0.1, flick) * d.alpha;
  ctx.translate(d.x, d.y + bob);
  ctx.strokeStyle = '#7ff3ff';
  ctx.shadowColor = '#22e4ff';
  ctx.shadowBlur = 12;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  roundRect(ctx, -15, -6, 30, 18, 7);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-20, -8);
  ctx.lineTo(20, -8);
  ctx.stroke();
  ctx.setLineDash([]);
  // scanlines
  ctx.fillStyle = 'rgba(127,243,255,.35)';
  for (let y = -5; y < 12; y += 4) ctx.fillRect(-14, y + ((t * 30) % 4), 28, 1);
  if (d.flash > 0) {
    ctx.globalAlpha = d.flash;
    ctx.translate((Math.random() - 0.5) * 8, 0);
    ctx.strokeRect(-16, -8, 32, 22);
  }
  ctx.restore();
}
