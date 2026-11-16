import { compile, compileWithHarness, execute, type Diagnostic, type RunResult } from './csharp';
import type { CodeStats } from './csharp/checker';
import type { SubLevel, Verdict } from './types';
import { defaultValidate } from './validate';

export type LevelOutcome =
  | { phase: 'compile'; error: Diagnostic }
  | { phase: 'run'; runs: RunResult[]; verdict: Verdict; warnings: Diagnostic[]; stats: CodeStats };

function blockedRun(d: Diagnostic): RunResult {
  return {
    outputs: [], outputVars: [], actions: [], events: [], vars: {}, objects: [], steps: 0, inputReads: 0, sensorReads: {},
    blocked: { code: d.code, message: d.message, roast: d.roast, line: d.line },
  };
}

/** Compile the student's code, run every test case, and validate. Pure — no UI. */
export function evaluateLevel(level: SubLevel, source: string): LevelOutcome {
  const c = compile(source, level.api);
  if (!c.ok) return { phase: 'compile', error: c.error };
  const runs = level.tests.map((t) => {
    if (!t.harness) return execute(c.checked, { api: level.api, input: t.input, sensors: t.sensors });
    // AURA runs her own Main against the student's classes
    const h = compileWithHarness(source, t.harness, level.api);
    if (!h.ok) return blockedRun(h.error);
    return execute(h.checked, { api: level.api, input: t.input, sensors: t.sensors });
  });
  const ctx = { runs, tests: level.tests, stats: c.checked.stats, source };
  const verdict = level.validate?.(ctx) ?? defaultValidate(ctx);
  return { phase: 'run', runs, verdict, warnings: c.warnings, stats: c.checked.stats };
}
