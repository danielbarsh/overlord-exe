import { Fragment, useMemo } from 'react';

type Seg = { kind: 'text' | 'code' | 'bold'; text: string };

function parse(src: string): Seg[] {
  const out: Seg[] = [];
  const re = /`([^`]+)`|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ kind: 'text', text: src.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ kind: 'code', text: m[1] });
    else out.push({ kind: 'bold', text: m[2] });
    last = re.lastIndex;
  }
  if (last < src.length) out.push({ kind: 'text', text: src.slice(last) });
  return out;
}

export function plainLength(src: string): number {
  return parse(src).reduce((n, s) => n + s.text.length, 0);
}

/** Renders `inline code` and **bold**. `limit` reveals only the first N visible chars (typewriter). */
export function RichText({ text, limit }: { text: string; limit?: number }) {
  const segs = useMemo(() => parse(text), [text]);
  let remaining = limit ?? Infinity;
  return (
    <>
      {segs.map((s, i) => {
        if (remaining <= 0) return null;
        const t = s.text.slice(0, remaining);
        remaining -= s.text.length;
        if (s.kind === 'code') return <code key={i} className="inline">{t}</code>;
        if (s.kind === 'bold') return <strong key={i} className="font-bold text-white">{t}</strong>;
        return <Fragment key={i}>{t}</Fragment>;
      })}
    </>
  );
}
