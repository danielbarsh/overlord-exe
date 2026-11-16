import { compile, execute, type Diagnostic, type RunResult } from './csharp';
import type { CodeStats } from './csharp/checker';
import type { SubLevel, Verdict } from './types';
import { defaultValidate } from './validate';

export type LevelOutcome =
  | { phase: 'compile'; error: Diagnostic }
  | { phase: 'run'; runs: RunResult[]; verdict: Verdict; warnings: Diagnostic[]; stats: CodeStats };

/** Compile the student's code, run every test case, and validate. Pure — no UI. */
export function evaluateLevel(level: SubLevel, source: string): LevelOutcome {
  const c = compile(source, level.api);
  if (!c.ok) return { phase: 'compile', error: c.error };
  const runs = level.tests.map((t) =>
    execute(c.checked, { api: level.api, input: t.input, sensors: t.sensors }),
  );
  const ctx = { runs, tests: level.tests, stats: c.checked.stats, source };
  const verdict = level.validate?.(ctx) ?? defaultValidate(ctx);
  return { phase: 'run', runs, verdict, warnings: c.warnings, stats: c.checked.stats };
}
