import { useLayoutEffect, useMemo, useRef } from 'react';
import { sfx } from '../game/audio';
import { highlight } from './highlight';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  onCursor: (line: number, col: number) => void;
  errorLine: number | null;
  activeLine: number;
  disabled?: boolean;
}

const LINE_H = 22;
const INDENT = '    ';

export function CodeEditor({ value, onChange, onRun, onCursor, errorLine, activeLine, disabled }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const html = useMemo(() => highlight(value) + '\n', [value]);
  const lines = value.split('\n');
  const longest = Math.max(...lines.map((l) => l.length));

  const reportCursor = () => {
    const ta = taRef.current;
    if (!ta) return;
    const before = ta.value.slice(0, ta.selectionStart);
    const ls = before.split('\n');
    onCursor(ls.length, ls[ls.length - 1].length + 1);
  };

  // keep the caret line visible when typing near the bottom
  useLayoutEffect(() => {
    reportCursor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  /** insert text at the selection, preserving native undo where possible */
  const insert = (text: string, selectBackFrom?: number) => {
    const ta = taRef.current!;
    ta.focus();
    const ok = document.execCommand?.('insertText', false, text);
    if (!ok) {
      const { selectionStart: s, selectionEnd: e } = ta;
      const v = ta.value.slice(0, s) + text + ta.value.slice(e);
      onChange(v);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = s + text.length;
      });
    }
    if (selectBackFrom !== undefined) {
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = ta.selectionStart - selectBackFrom;
      });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onRun();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        const s = ta.selectionStart;
        const lineStart = ta.value.lastIndexOf('\n', s - 1) + 1;
        const m = ta.value.slice(lineStart).match(/^ {1,4}/);
        if (m) {
          ta.setSelectionRange(lineStart, lineStart + m[0].length);
          document.execCommand('delete');
        }
      } else insert(INDENT);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const s = ta.selectionStart;
      const lineStart = ta.value.lastIndexOf('\n', s - 1) + 1;
      const cur = ta.value.slice(lineStart, s);
      const indent = cur.match(/^\s*/)?.[0] ?? '';
      const prevChar = ta.value.slice(0, s).trimEnd().slice(-1);
      const nextChar = ta.value[s];
      if (prevChar === '{' && nextChar === '}') {
        insert('\n' + indent + INDENT + '\n' + indent, indent.length + 1);
      } else {
        insert('\n' + indent + (prevChar === '{' ? INDENT : ''));
      }
      return;
    }
    if (e.key === '}') {
      const s = ta.selectionStart;
      const lineStart = ta.value.lastIndexOf('\n', s - 1) + 1;
      const cur = ta.value.slice(lineStart, s);
      if (/^\s+$/.test(cur) && cur.length >= 4) {
        e.preventDefault();
        ta.setSelectionRange(s - 4, s);
        insert('}');
        return;
      }
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) sfx.key();
  };

  return (
    <div className="relative flex min-h-0 flex-1 overflow-auto bg-ide-bg" dir="ltr">
      {/* gutter */}
      <div className="sticky left-0 z-10 shrink-0 select-none bg-ide-bg pb-10 pt-[10px] text-right font-mono text-[13px] text-[#6e7191]" style={{ minHeight: '100%' }}>
        {lines.map((_, i) => (
          <div
            key={i}
            className={`relative h-[22px] pl-4 pr-3 leading-[22px] ${i + 1 === activeLine ? 'text-[#c6c6d6]' : ''}`}
          >
            {errorLine === i + 1 && <span className="absolute left-1.5 top-[7px] h-2 w-2 rounded-full bg-neon-red shadow-[0_0_8px_#ff3b5c]" />}
            {i + 1}
          </div>
        ))}
      </div>
      <div className="relative min-h-full flex-1" style={{ minWidth: `calc(${longest + 4}ch + 40px)`, height: lines.length * LINE_H + 60 }}>
        {/* active line + error line highlights */}
        <div className="pointer-events-none absolute inset-x-0 bg-white/[0.04]" style={{ top: 10 + (activeLine - 1) * LINE_H, height: LINE_H }} />
        {errorLine && (
          <div
            className="pointer-events-none absolute inset-x-0 border-y border-neon-red/40 bg-neon-red/15"
            style={{ top: 10 + (errorLine - 1) * LINE_H, height: LINE_H }}
          >
            <div
              className="absolute bottom-0 left-3 right-0 h-[3px] opacity-80"
              style={{ background: 'repeating-linear-gradient(135deg, #ff3b5c 0 2px, transparent 2px 5px)' }}
            />
          </div>
        )}
        <pre aria-hidden className="editor-layer pointer-events-none absolute inset-0 text-[#d4d4d4]" dangerouslySetInnerHTML={{ __html: html }} />
        <textarea
          ref={taRef}
          aria-label="C# code editor"
          className="editor-layer editor-input absolute inset-0 h-full w-full"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          wrap="off"
          readOnly={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onKeyUp={reportCursor}
          onClick={reportCursor}
          onSelect={reportCursor}
          style={{ height: Math.max(lines.length * LINE_H + 60, 0), minHeight: '100%' }}
        />
      </div>
    </div>
  );
}
