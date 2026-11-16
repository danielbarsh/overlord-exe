/**
 * Shared error types for the simulated C# toolchain.
 * `roast` is a key into AURA's roast table (see game/roasts.ts).
 */
export type RoastKey =
  | 'missingSemicolon'
  | 'unclosedBrace'
  | 'unclosedParen'
  | 'extraBrace'
  | 'extraParen'
  | 'unclosedString'
  | 'smartQuotes'
  | 'hebrewInCode'
  | 'casing'
  | 'unknownName'
  | 'unknownMember'
  | 'typeMismatch'
  | 'readLineToInt'
  | 'doubleToInt'
  | 'stringMath'
  | 'assignInCondition'
  | 'conditionNotBool'
  | 'badStatement'
  | 'missingParens'
  | 'syntax'
  | 'wrongArgs'
  | 'privateAccess'
  | 'duplicateVar'
  | 'unassigned'
  | 'missingMain'
  | 'missingReturn'
  | 'varNoInit'
  | 'divideByZero'
  | 'formatException'
  | 'infiniteLoop'
  | 'nullRef'
  | 'indexOutOfRange'
  | 'outsideMain'
  | 'emptyIf'
  | 'hidesMethod'
  | 'notVirtual'
  | 'needsBaseCtor';

export interface Diagnostic {
  /** C# compiler code, e.g. CS1002 */
  code: string;
  /** English compiler-style message (shown in the terminal) */
  message: string;
  line: number;
  col: number;
  roast: RoastKey;
  /** Placeholders for the Hebrew roast: {name}, {suggest}, {line}... */
  extra?: Record<string, string>;
}

export class CompileError extends Error {
  diag: Diagnostic;
  constructor(d: Diagnostic) {
    super(d.message);
    this.diag = d;
  }
}

export function cerr(
  code: string,
  message: string,
  line: number,
  col: number,
  roast: RoastKey,
  extra?: Record<string, string>,
): CompileError {
  return new CompileError({ code, message, line, col, roast, extra });
}

/** A runtime exception inside the student's program (FormatException etc.) */
export class RuntimeErr extends Error {
  exception: string;
  line: number;
  roast: RoastKey;
  extra?: Record<string, string>;
  constructor(exception: string, message: string, line: number, roast: RoastKey, extra?: Record<string, string>) {
    super(message);
    this.exception = exception;
    this.line = line;
    this.roast = roast;
    this.extra = extra;
  }
}
