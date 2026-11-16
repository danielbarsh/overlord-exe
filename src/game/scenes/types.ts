import type { RunResult } from '../csharp';
import type { Engine } from '../engine/Engine';
import type { SubLevel, Verdict } from '../types';

export interface Playback {
  level: SubLevel;
  runs: RunResult[];
  verdict: Verdict;
  onTestStart: (i: number) => void;
  onTestEnd: (i: number, ok: boolean) => void;
}

/**
 * A scene draws level-specific props and turns a run into animation.
 * Register new scenes in scenes/index.ts.
 */
export interface SceneModule {
  setup(e: Engine, level: SubLevel): void;
  teardown?(e: Engine): void;
  update?(e: Engine, dt: number): void;
  drawBack(e: Engine, ctx: CanvasRenderingContext2D): void;
  drawFront?(e: Engine, ctx: CanvasRenderingContext2D): void;
  /** Animate the result. Must resolve when done; throws Cancelled if interrupted. */
  play(e: Engine, pb: Playback): Promise<void>;
  /** Show test case `i` statically so the student can scout it before writing code. */
  preview?(e: Engine, level: SubLevel, i: number): void;
  /** small reaction when the code didn't compile */
  onCompileError?(e: Engine): Promise<void>;
}

/** Index of the test that should end in failure (or -1 if all pass) */
export function failIndex(pb: Playback): number {
  if (pb.verdict.ok) return -1;
  return pb.verdict.failedTest ?? pb.runs.length - 1;
}
