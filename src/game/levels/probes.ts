/**
 * "Probe" tests: someone else's Main() run against the student's classes (TestCase.harness).
 *  - AURA's attacks must be *blocked* — her code must fail to compile with a private-access error.
 *  - The rebels' checks must compile and Robot.Report(...) the expected values.
 * The probe code is shown on screen in recon, so the student can read exactly what will hit their class.
 */
import type { JsVal, RunResult } from '../csharp';
import type { TestCase, ValidateCtx, Verdict } from '../types';
import { fail } from './helpers';

export interface Probe {
  label: string;
  /** Main() body. Keep lines ≤ 36 chars — they are drawn on the scene's terminal. */
  code: string;
  /** true → AURA's attack: must NOT compile (private / private set) */
  blocked?: boolean;
  /** expected Robot.Report(...) values, in order */
  reports?: JsVal[];
  /** message when an attack that should be blocked compiled */
  breach?: string;
  /** tailored message for a wrong report sequence (return null for the generic one) */
  wrong?: (got: JsVal[]) => string | null;
  scene?: Record<string, unknown>;
}

export const reports = (run: RunResult): JsVal[] => run.actions.filter((a) => a.name === 'Report').map((a) => a.args[0] ?? null);
export const fmtVals = (v: JsVal[]) => (v.length ? v.map((x) => (typeof x === 'string' ? `"${x}"` : String(x))).join(', ') : '(כלום)');

export const probeTests = (list: Probe[]): TestCase[] => list.map((p) => ({ label: p.label, harness: p.code, scene: p.scene }));

export function judgeProbes(ctx: ValidateCtx, list: Probe[], offset = 0): Verdict | null {
  for (let k = 0; k < list.length; k++) {
    const i = offset + k;
    const p = list[k];
    const run = ctx.runs[i];
    if (p.blocked) {
      if (!run.blocked) return fail(`${p.label}: ${p.breach ?? 'הקוד של AURA עבר את חומת האש!'}`, i, { mood: 'laughing' });
      if (run.blocked.roast !== 'privateAccess')
        return fail(
          `${p.label}: הקוד של AURA נכשל, אבל לא בגלל הגנה (${run.blocked.code}: ${run.blocked.message}). כנראה שם של שדה או שיטה לא תואם לתדריך.`,
          i,
        );
      continue;
    }
    if (run.blocked) {
      const b = run.blocked;
      const tip =
        b.roast === 'privateAccess'
          ? ' חסמת גם את המורדים! מה שהם צריכים להשתמש בו חייב להיות `public`.'
          : b.roast === 'unknownMember' || b.roast === 'unknownName'
            ? ' כנראה חסרה שיטה, או שהשם שלה לא בדיוק כמו בתדריך.'
            : b.roast === 'wrongArgs'
              ? ' מספר הפרמטרים לא תואם למה שהקוד מעביר.'
              : '';
      return fail(`${p.label}: הקוד הזה אמור לעבוד, אבל הוא לא מתקמפל מול המחלקה שלך: ${b.code}: ${b.message}.${tip}`, i);
    }
    if (run.error) return fail(`${p.label}: התרסקות בזמן ריצה: ${run.error.exception}: ${run.error.message}`, i, { mood: 'laughing' });
    if (p.reports) {
      const got = reports(run);
      if (JSON.stringify(got) !== JSON.stringify(p.reports))
        return fail(`${p.label}: ${p.wrong?.(got) ?? `הצג הראה ${fmtVals(got)}, אבל היה צריך להראות ${fmtVals(p.reports)}.`}`, i);
    }
  }
  return null;
}
