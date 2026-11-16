import type { RunResult } from './csharp';
import { roast } from './roasts';
import type { TestCase, ValidateCtx, Verdict } from './types';

const norm = (s: string) => s.replace(/\s+$/, '');
const show = (arr: string[]) => (arr.length ? arr.join(' → ') : '(כלום)');

/** Runtime crash in any test → verdict */
export function runtimeVerdict(runs: RunResult[]): Verdict | null {
  const i = runs.findIndex((r) => r.error);
  if (i < 0) return null;
  const err = runs[i].error!;
  return {
    ok: false,
    failedTest: i,
    mood: err.roast === 'infiniteLoop' ? 'glitch' : 'laughing',
    message: roast(err.roast, err.extra),
    details: [`Unhandled exception. System.${err.exception}: ${err.message}`, err.line ? `   at HackProtocol.Main() line ${err.line}` : ''],
  };
}

export function compareOutputs(run: RunResult, expected: string[]): string | null {
  const got = run.outputs.map(norm);
  const exp = expected.map(norm);
  for (let i = 0; i < Math.max(got.length, exp.length); i++) {
    if (got[i] === undefined) return `חסרה שורת פלט ${i + 1}: ציפיתי ל-"${exp[i]}"`;
    if (exp[i] === undefined) return `יש שורת פלט מיותרת: "${got[i]}"`;
    if (got[i] !== exp[i]) {
      if (got[i].toLowerCase() === exp[i].toLowerCase()) return `שורה ${i + 1}: "${got[i]}" — כמעט! האותיות הגדולות/קטנות לא תואמות ל-"${exp[i]}"`;
      if (got[i].replace(/\s/g, '') === exp[i].replace(/\s/g, '')) return `שורה ${i + 1}: "${got[i]}" — הרווחים לא תואמים ל-"${exp[i]}"`;
      return `שורה ${i + 1}: הדפסת "${got[i]}" אבל השער ציפה ל-"${exp[i]}"`;
    }
  }
  return null;
}

export function compareActions(run: RunResult, expected: string[]): string | null {
  const got = run.actions.map((a) => a.name);
  if (got.length === expected.length && got.every((g, i) => g === expected[i])) return null;
  return `צפוי: ${show(expected)} | בפועל: ${show(got)}`;
}

/** Default validator: checks every test's expect.outputs / expect.actions */
export function defaultValidate(ctx: ValidateCtx): Verdict {
  const crash = runtimeVerdict(ctx.runs);
  if (crash) return crash;
  for (let i = 0; i < ctx.tests.length; i++) {
    const t: TestCase = ctx.tests[i];
    const run = ctx.runs[i];
    if (t.expect?.outputs) {
      const d = compareOutputs(run, t.expect.outputs);
      if (d) return { ok: false, failedTest: i, message: d, details: [`[${t.label}] ${d}`], mood: 'smug' };
    }
    if (t.expect?.actions) {
      const d = compareActions(run, t.expect.actions);
      if (d) return { ok: false, failedTest: i, message: d, details: [`[${t.label}] ${d}`], mood: 'smug' };
    }
  }
  return { ok: true };
}

/** Student produced identical output/actions for tests that should differ → hardcoding */
export function looksHardcoded(ctx: ValidateCtx, by: 'outputs' | 'actions'): boolean {
  if (ctx.runs.length < 2) return false;
  const key = (r: RunResult) => (by === 'outputs' ? r.outputs.join('\n') : r.actions.map((a) => a.name).join(','));
  const expKey = (t: TestCase) => (by === 'outputs' ? (t.expect?.outputs ?? []).join('\n') : (t.expect?.actions ?? []).join(','));
  const allSame = ctx.runs.every((r) => key(r) === key(ctx.runs[0]));
  const expDiffer = new Set(ctx.tests.map(expKey)).size > 1;
  return allSame && expDiffer;
}
