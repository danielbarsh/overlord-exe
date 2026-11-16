import type { GameApi } from './builtins';
import { check, type CheckResult } from './checker';
import { CompileError, type Diagnostic } from './errors';
import { Interpreter, type RunContext, type RunResult } from './interpreter';
import { checkBrackets, checkKeywordCasing, lex } from './lexer';
import { Parser } from './parser';

export type CompileResult =
  | { ok: true; checked: CheckResult; warnings: Diagnostic[] }
  | { ok: false; error: Diagnostic };

/** "Compile" C# source: lex → bracket check → casing check → parse → semantic check. */
export function compile(src: string, api: GameApi): CompileResult {
  try {
    const toks = lex(src);
    checkBrackets(toks);
    checkKeywordCasing(toks);
    const program = new Parser(toks).parseProgram();
    const checked = check(program, api);
    return { ok: true, checked, warnings: checked.warnings };
  } catch (e) {
    if (e instanceof CompileError) return { ok: false, error: e.diag };
    // parser bug safety net — never crash the game
    console.error(e);
    return {
      ok: false,
      error: { code: 'CS8000', message: 'Internal compiler panic: ' + String((e as Error)?.message ?? e), line: 1, col: 1, roast: 'syntax' },
    };
  }
}

/** Name of the class that holds AURA's harness Main (see compileWithHarness). */
export const HARNESS_CLASS = 'AuraHarness';

/**
 * Compile the student's classes with a *different* Main: AURA's harness code.
 * The student's own entry-point class is dropped. If AURA's code doesn't compile
 * (e.g. it touches a private field), the error comes back — that's the "attack blocked" signal.
 */
export function compileWithHarness(src: string, harnessBody: string, api: GameApi): CompileResult {
  try {
    const toks = lex(src);
    checkBrackets(toks);
    checkKeywordCasing(toks);
    const prog = new Parser(toks).parseProgram();
    const NL = String.fromCharCode(10);
    const body = harnessBody.split(NL).map((l) => '        ' + l).join(NL);
    const h = new Parser(lex(['class ' + HARNESS_CLASS, '{', '    static void Main()', '    {', body, '    }', '}', ''].join(NL))).parseProgram();
    const classes = prog.classes.filter((c) => c.name !== HARNESS_CLASS && !c.methods.some((m) => m.name === 'Main' && m.isStatic));
    const checked = check({ usings: prog.usings, classes: [...classes, ...h.classes] }, api);
    return { ok: true, checked, warnings: checked.warnings };
  } catch (e) {
    if (e instanceof CompileError) return { ok: false, error: e.diag };
    console.error(e);
    return { ok: false, error: { code: 'CS8000', message: String((e as Error)?.message ?? e), line: 1, col: 1, roast: 'syntax' } };
  }
}

export function execute(checked: CheckResult, ctx: RunContext): RunResult {
  return new Interpreter(checked, ctx).run();
}

export type { RunResult, RunContext, Diagnostic, CheckResult };
export type { GameApi } from './builtins';
export type { RobotAction, RunEvent, JsVal } from './interpreter';
export { RuntimeErr } from './errors';
export type { RoastKey } from './errors';
