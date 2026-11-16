import type { CodeStats } from './csharp/checker';
import type { GameApi, JsVal, RunResult } from './csharp';

export type AuraMood = 'neutral' | 'smug' | 'laughing' | 'shocked' | 'glitch' | 'angry' | 'panic' | 'thinking';

/** Scenes are registered in game/scenes/index.ts — add new ids there for stages 3–7. */
export type SceneId = 'gate' | 'lasers' | 'assembly' | 'blueprint' | (string & {});

export type Tier = 'warmup' | 'practice' | 'boss';

export interface TestCase {
  /** Hebrew label shown on the canvas / terminal, e.g. "סריקה 2: לייזר כחול" */
  label: string;
  /** lines returned by Console.ReadLine() in order */
  input?: string[];
  /** values returned by Sensor.X() — an array is a queue (next value per call, then sticks on the last) */
  sensors?: Record<string, JsVal | JsVal[]>;
  /** used by the default validator */
  expect?: {
    outputs?: string[];
    actions?: string[];
  };
  /** free-form data for the scene (laser color, enemy count, ...) */
  scene?: Record<string, unknown>;
}

export interface Verdict {
  ok: boolean;
  /** index of the first failing test (for the animation) */
  failedTest?: number;
  /** Hebrew roast/explanation shown by AURA */
  message?: string;
  /** short lines for the terminal */
  details?: string[];
  mood?: AuraMood;
  /** scene-specific effect for the failure animation, e.g. 'exhausted' (stage 3) */
  tag?: string;
}

export interface ValidateCtx {
  runs: RunResult[];
  tests: TestCase[];
  stats: CodeStats;
  source: string;
}

export interface Hint {
  text: string;
  code?: string;
}

export interface SubLevel {
  /** unique id, e.g. "1-2" */
  id: string;
  tier: Tier;
  title: string;
  /** Hebrew mission brief. Supports `inline code` and **bold**. */
  brief: string;
  objectives: string[];
  starterCode: string;
  scene: SceneId;
  sceneConfig?: Record<string, unknown>;
  api: GameApi;
  tests: TestCase[];
  /** optional custom validator; falls back to defaultValidate (expect.outputs / expect.actions) */
  validate?: (ctx: ValidateCtx) => Verdict | null;
  hints: [Hint, Hint, Hint];
  aura: { intro: string; win: string };
  /** reference solution — used by scripts/verifySolutions.ts */
  solution: string;
}

export interface Stage {
  id: number;
  title: string;
  topic: string;
  codename: string;
  description: string;
  /** accent color for the HUD */
  color: string;
  levels: SubLevel[];
}
