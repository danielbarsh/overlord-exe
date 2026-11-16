/** Tiny C# syntax highlighter → HTML, line-preserving. */
const KW = new Set([
  'using', 'namespace', 'class', 'static', 'void', 'public', 'private', 'protected', 'internal', 'new', 'true', 'false',
  'null', 'this', 'base', 'override', 'virtual', 'abstract', 'readonly', 'const', 'var', 'get', 'set',
]);
const CTL = new Set(['if', 'else', 'for', 'foreach', 'in', 'while', 'do', 'return', 'break', 'continue', 'switch', 'case']);
const TYPES = new Set(['int', 'string', 'bool', 'double', 'float', 'char', 'long', 'object', 'String']);
const API = new Set(['Robot', 'Sensor']);

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const span = (cls: string, s: string) => `<span class="tok-${cls}">${esc(s)}</span>`;

export function highlight(src: string): string {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const rest = src.slice(i);
    let m: RegExpMatchArray | null;
    if (rest.startsWith('//')) {
      const end = src.indexOf('\n', i);
      const s = src.slice(i, end < 0 ? n : end);
      out += span('com', s);
      i += s.length;
      continue;
    }
    if (rest.startsWith('/*')) {
      const end = src.indexOf('*/', i + 2);
      const s = src.slice(i, end < 0 ? n : end + 2);
      out += s.split('\n').map((l) => span('com', l)).join('\n');
      i += s.length;
      continue;
    }
    if ((m = rest.match(/^(\$|@)?"(?:\\.|[^"\\\n])*"?/))) {
      out += span('str', m[0]);
      i += m[0].length;
      continue;
    }
    if ((m = rest.match(/^'(?:\\.|[^'\\\n])*'?/))) {
      out += span('str', m[0]);
      i += m[0].length;
      continue;
    }
    if ((m = rest.match(/^\d+(\.\d+)?[fFdDmM]?/))) {
      out += span('num', m[0]);
      i += m[0].length;
      continue;
    }
    if ((m = rest.match(/^[A-Za-z_]\w*/))) {
      const w = m[0];
      const after = src.slice(i + w.length).match(/^\s*\(/);
      let cls = 'id';
      if (CTL.has(w)) cls = 'ctl';
      else if (KW.has(w)) cls = 'kw';
      else if (TYPES.has(w)) cls = 'type';
      else if (API.has(w)) cls = 'api';
      else if (after) cls = 'fn';
      else if (/^[A-Z]/.test(w)) cls = 'cls';
      out += span(cls, w);
      i += w.length;
      continue;
    }
    if (c === '\n' || c === ' ' || c === '\t') {
      out += c;
      i++;
      continue;
    }
    out += span('p', c);
    i++;
  }
  return out;
}
