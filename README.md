# פרוטוקול קריסה · Overlord.exe

A Hebrew sci-fi game that teaches 9th graders C#. There's no real compiler: a simulated C# toolchain (lexer → parser → type checker → interpreter) runs the student's code, and the resulting output and `Robot.*()` calls drive the canvas animations.

```bash
npm install
npm run dev              # http://localhost:5173   (add ?unlock=all to open every level)
npm run test:solutions   # checks that each level's solution passes, its starter code fails, and classic mistakes are caught
npm run build
```

## Layout
| Path | What |
|---|---|
| `src/game/stagesConfig.ts` | **All level content**: 7 stages × 4 sub-levels (warm-up, practice, practice, boss). Briefs describe the world (`rules`, `tools`), not the code; players scout each test case with the recon bar. All 7 stages are playable (28 levels). |
| `src/game/levels/` | Per-stage level files (`stage3.ts`, `stage4.ts`) and shared helpers (`main`, `fail`) |
| `src/game/types.ts` | `Stage`, `SubLevel`, `TestCase`, `Verdict` |
| `src/game/csharp/` | Simulated C#: `lexer`, `parser`, `checker` (CS-style errors), `interpreter` |
| `src/game/roasts.ts` | AURA's Hebrew roasts for each kind of error, plus her general lines |
| `src/game/validate.ts` | Default validator and helpers (output/action compare, hardcoding detection) |
| `src/game/engine/` | Canvas engine (cancellable promise-based tweens, particles, shake, robot) |
| `src/game/scenes/` | Scene modules: `gate` (stage 1), `lasers` (stage 2), `assembly` (stage 3), `blueprint` (stage 4), `firewall` (stage 5, also 7-3), `chasm` (stage 6), `core` (stage 7), and the scene registry |
| `src/game/audio.ts` | Web Audio sound effects, all synthesized |
| `src/components/` | HUD bar + hints, AURA hologram, code editor, terminal, stage map |

## Adding levels
0. A test case can carry `harness`: a `Main()` body (AURA's attack or the rebels' check) compiled against the student's classes instead of their own Main. If it fails to compile, the run has `blocked` (e.g. a private-access error means the attack was stopped). See `levels/probes.ts`; stage 5 is built on it.
1. Create `src/game/levels/stageN.ts` (copy `stage3.ts` as a template) and plug its array into the stage's `levels` in `stagesConfig.ts`. Each needs `api` (allowed `Robot` actions and `Sensor` getters), `tests`, `hints` and a `solution`.
2. Reuse a scene, or add a new `SceneModule` in `src/game/scenes/` and register it in `scenes/index.ts`.
3. A validator can return `tag` on its verdict to trigger a special failure animation. Stage 3 uses `tag: 'exhausted'` when `ctx.stats.calls['Robot.EMP']` shows copy-pasted calls.
4. `Sensor` values given as an array act as a queue: each call returns the next value, then repeats the last one.
5. When an object is passed to a Robot call (e.g. `Robot.Deploy(bot)`), `action.objs` keeps a snapshot of its fields at that moment, and `ctx.stats.classInfo` describes every class (fields with access, constructors, methods, base class). Stages 4–7 use both.
6. A run stops with `RobotOverheatException` after 300 robot actions, so infinite loops end quickly.
7. The interpreter already supports `for`/`while`/`foreach`, arrays, classes, constructors, `private`/`public`, auto-properties (incl. `private set`), `protected`, inheritance with `: base(...)` (CS7036 if missing), and `virtual`/`override` with real C# dispatch (a same-name method without `override` hides, with a CS0114 warning).
