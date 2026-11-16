import { cerr } from './errors';

export type TokType = 'ident' | 'kw' | 'num' | 'str' | 'interp' | 'char' | 'op' | 'eof';

export interface InterpCode {
  code: string;
  line: number;
  col: number;
}
export type InterpPart = string | InterpCode;

export interface Tok {
  t: TokType;
  v: string;
  line: number;
  col: number;
  /** position just after the token (for "; expected" placement) */
  endLine: number;
  endCol: number;
  parts?: InterpPart[];
  isDouble?: boolean;
}

export const KEYWORDS = new Set([
  'using', 'namespace', 'class', 'static', 'void', 'public', 'private', 'protected', 'internal',
  'int', 'string', 'bool', 'double', 'float', 'char', 'long', 'object', 'var',
  'if', 'else', 'for', 'foreach', 'in', 'while', 'do', 'return', 'new', 'true', 'false', 'null',
  'break', 'continue', 'override', 'virtual', 'abstract', 'base', 'this', 'readonly', 'const',
]);

const OPS = [
  '==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=', '=>',
  '+', '-', '*', '/', '%', '=', '<', '>', '!', '(', ')', '{', '}', '[', ']', ';', ',', '.', ':', '?',
];

const HEBREW = /[֐-׿]/;

export function lex(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  let line = 1;
  let col = 1;
  const n = src.length;

  const adv = (k = 1) => {
    for (let j = 0; j < k; j++) {
      if (src[i] === '\n') {
        line++;
        col = 1;
      } else col++;
      i++;
    }
  };
  const push = (t: TokType, v: string, sl: number, sc: number, extra: Partial<Tok> = {}) =>
    toks.push({ t, v, line: sl, col: sc, endLine: line, endCol: col, ...extra });

  while (i < n) {
    const c = src[i];
    // whitespace
    if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
      adv();
      continue;
    }
    // comments
    if (c === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') adv();
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const sl = line, sc = col;
      adv(2);
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) adv();
      if (i >= n) throw cerr('CS1035', 'End-of-file found, \'*/\' expected', sl, sc, 'syntax');
      adv(2);
      continue;
    }
    const sl = line, sc = col;

    // smart quotes from copy-paste
    if (c === '“' || c === '”' || c === '„' || c === '‘' || c === '’') {
      throw cerr('CS1056', `Unexpected character '${c}'`, sl, sc, 'smartQuotes');
    }

    // interpolated string $"..."
    if (c === '$' && src[i + 1] === '"') {
      adv(2);
      const parts: InterpPart[] = [];
      let buf = '';
      while (true) {
        if (i >= n || src[i] === '\n') throw cerr('CS1010', 'Newline in constant', sl, sc, 'unclosedString');
        const ch = src[i];
        if (ch === '"') {
          adv();
          break;
        }
        if (ch === '\\') {
          buf += escapeChar(src[i + 1]);
          adv(2);
          continue;
        }
        if (ch === '{' && src[i + 1] === '{') { buf += '{'; adv(2); continue; }
        if (ch === '}' && src[i + 1] === '}') { buf += '}'; adv(2); continue; }
        if (ch === '{') {
          if (buf) parts.push(buf);
          buf = '';
          adv();
          const cl = line, cc = col;
          let depth = 1;
          let code = '';
          while (i < n && src[i] !== '\n') {
            if (src[i] === '{') depth++;
            if (src[i] === '}') { depth--; if (depth === 0) break; }
            if (src[i] === '"') {
              // nested simple string inside the hole
              code += src[i]; adv();
              while (i < n && src[i] !== '"' && src[i] !== '\n') { code += src[i]; adv(); }
            }
            code += src[i];
            adv();
          }
          if (src[i] !== '}') throw cerr('CS8076', 'Missing close delimiter \'}\' for interpolated expression', cl, cc, 'unclosedBrace');
          adv();
          // allow format specifiers {x:0.00} -> drop them
          const colonAt = code.indexOf(':');
          if (colonAt > 0 && !code.includes('?')) code = code.slice(0, colonAt);
          parts.push({ code, line: cl, col: cc });
          continue;
        }
        buf += ch;
        adv();
      }
      if (buf) parts.push(buf);
      push('interp', '$"…"', sl, sc, { parts });
      continue;
    }

    // verbatim string @"..."
    if (c === '@' && src[i + 1] === '"') {
      adv(2);
      let s = '';
      while (true) {
        if (i >= n) throw cerr('CS1039', 'Unterminated string literal', sl, sc, 'unclosedString');
        if (src[i] === '"' && src[i + 1] === '"') { s += '"'; adv(2); continue; }
        if (src[i] === '"') { adv(); break; }
        s += src[i];
        adv();
      }
      push('str', s, sl, sc);
      continue;
    }

    // regular string
    if (c === '"') {
      adv();
      let s = '';
      while (true) {
        if (i >= n || src[i] === '\n') throw cerr('CS1010', 'Newline in constant', sl, sc, 'unclosedString');
        if (src[i] === '\\') {
          s += escapeChar(src[i + 1]);
          adv(2);
          continue;
        }
        if (src[i] === '"') { adv(); break; }
        s += src[i];
        adv();
      }
      push('str', s, sl, sc);
      continue;
    }

    // char literal
    if (c === "'") {
      adv();
      let s = '';
      if (src[i] === '\\') { s = escapeChar(src[i + 1]); adv(2); }
      else if (src[i] !== "'" && src[i] !== '\n') { s = src[i]; adv(); }
      if (src[i] !== "'") throw cerr('CS1012', 'Too many characters in character literal', sl, sc, 'unclosedString');
      adv();
      push('char', s, sl, sc);
      continue;
    }

    // numbers
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      let s = '';
      let isDouble = false;
      while (i < n && /[0-9_]/.test(src[i])) { if (src[i] !== '_') s += src[i]; adv(); }
      if (src[i] === '.' && /[0-9]/.test(src[i + 1] ?? '')) {
        isDouble = true;
        s += '.';
        adv();
        while (i < n && /[0-9]/.test(src[i])) { s += src[i]; adv(); }
      }
      if (/[fFdDmM]/.test(src[i] ?? '')) { isDouble = true; adv(); }
      push('num', s, sl, sc, { isDouble });
      continue;
    }

    // identifiers / keywords
    if (/[A-Za-z_]/.test(c)) {
      let s = '';
      while (i < n && /[A-Za-z0-9_]/.test(src[i])) { s += src[i]; adv(); }
      push(KEYWORDS.has(s) ? 'kw' : 'ident', s, sl, sc);
      continue;
    }

    if (HEBREW.test(c)) {
      let s = '';
      while (i < n && /[֐-׿ ]/.test(src[i]) && src[i] !== '\n') { s += src[i]; adv(); }
      throw cerr('CS1056', `Unexpected character '${s.trim()}'`, sl, sc, 'hebrewInCode', { text: s.trim() });
    }

    // operators / punctuation
    let matched = '';
    for (const op of OPS) {
      if (src.startsWith(op, i)) { matched = op; break; }
    }
    if (matched) {
      adv(matched.length);
      push('op', matched, sl, sc);
      continue;
    }
    throw cerr('CS1056', `Unexpected character '${c}'`, sl, sc, 'syntax', { text: c });
  }
  toks.push({ t: 'eof', v: '<EOF>', line, col, endLine: line, endCol: col });
  return toks;
}

function escapeChar(c: string | undefined): string {
  switch (c) {
    case 'n': return '\n';
    case 't': return '\t';
    case 'r': return '';
    case '0': return '\0';
    case '"': return '"';
    case "'": return "'";
    case '\\': return '\\';
    default: return c ?? '';
  }
}

/**
 * Bracket balance pass — produces friendly errors for unclosed / extra brackets
 * before the parser gets confused.
 */
export function checkBrackets(toks: Tok[]): void {
  const stack: Tok[] = [];
  const pairs: Record<string, string> = { ')': '(', '}': '{', ']': '[' };
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    if (t.t !== 'op') continue;
    if (t.v === '(' || t.v === '{' || t.v === '[') {
      stack.push(t);
      continue;
    }
    if (t.v === ')' || t.v === '}' || t.v === ']') {
      const top = stack[stack.length - 1];
      if (!top) {
        if (t.v === '}')
          throw cerr('CS1022', 'Type or namespace definition, or end-of-file expected', t.line, t.col, 'extraBrace', { line: String(t.line) });
        throw cerr('CS1525', `Invalid expression term '${t.v}'`, t.line, t.col, 'extraParen', { line: String(t.line) });
      }
      if (top.v !== pairs[t.v]) {
        const prev = toks[k - 1] ?? t;
        if (top.v === '(')
          throw cerr('CS1026', ') expected', prev.endLine, prev.endCol, 'unclosedParen', { line: String(top.line) });
        if (top.v === '[')
          throw cerr('CS1003', "Syntax error, ']' expected", prev.endLine, prev.endCol, 'syntax');
        // top is '{' but got ')' or ']'
        throw cerr('CS1525', `Invalid expression term '${t.v}'`, t.line, t.col, 'extraParen', { line: String(t.line) });
      }
      stack.pop();
    }
  }
  if (stack.length) {
    const top = stack[stack.length - 1];
    const last = toks[toks.length - 2] ?? top;
    if (top.v === '{')
      throw cerr('CS1513', '} expected', last.endLine, last.endCol, 'unclosedBrace', { line: String(top.line) });
    if (top.v === '(')
      throw cerr('CS1026', ') expected', top.line, top.col, 'unclosedParen', { line: String(top.line) });
    throw cerr('CS1003', "Syntax error, ']' expected", top.line, top.col, 'syntax');
  }
}

/** Keywords students commonly mis-capitalize */
const CASE_SENSITIVE_KWS = [
  'if', 'else', 'int', 'static', 'void', 'class', 'while', 'for', 'foreach', 'return', 'bool',
  'double', 'using', 'new', 'true', 'false', 'public', 'private', 'protected', 'break', 'continue',
  'override', 'virtual', 'base', 'this', 'null', 'var', 'char',
];
export function checkKeywordCasing(toks: Tok[]): void {
  for (const t of toks) {
    if (t.t !== 'ident') continue;
    const lower = t.v.toLowerCase();
    if (CASE_SENSITIVE_KWS.includes(lower) && t.v !== lower) {
      throw cerr('CS0246', `The type or namespace name '${t.v}' could not be found`, t.line, t.col, 'casing', {
        name: t.v,
        suggest: lower,
      });
    }
  }
}
