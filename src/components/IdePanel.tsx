import { useState } from 'react';
import { sfx } from '../game/audio';
import { CodeEditor } from './CodeEditor';
import { Terminal, type LogLine } from './Terminal';

interface Props {
  code: string;
  dirty: boolean;
  onChange: (v: string) => void;
  onRun: () => void;
  onReset: () => void;
  running: boolean;
  logs: LogLine[];
  onClearLogs: () => void;
  errorLine: number | null;
  errorCount: number;
  warnCount: number;
}

export function IdePanel(p: Props) {
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  return (
    <section className="flex h-full min-h-0 flex-col bg-ide-bg" dir="ltr" aria-label="סביבת פיתוח C#">
      {/* window chrome */}
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-black/40 bg-[#16161f] px-3 text-[12px] text-white/55">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 text-center font-mono tracking-wide">
          HackProtocol.cs — <span className="text-neon-pink/80">Visual Hack Studio</span> <span className="text-white/30">[AURA maintenance port :1337]</span>
        </div>
      </div>
      {/* toolbar */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[#2a2a3a] bg-[#1b1b26] px-3">
        <button
          onClick={() => { sfx.click(); p.onRun(); }}
          disabled={p.running}
          className="btn-run flex items-center gap-2 rounded-lg px-4 py-2 font-bold text-white transition"
        >
          <span className="text-lg leading-none">▶</span>
          <span dir="rtl" className="text-[15px]">הרץ קוד</span>
          <span className="font-orb text-[11px] tracking-wider opacity-85">/ COMPILE &amp; RUN</span>
        </button>
        <button
          onClick={() => { sfx.click(); p.onReset(); }}
          disabled={p.running}
          className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[13px] text-white/75 hover:border-neon-red/60 hover:text-white disabled:opacity-40"
          title="Reset to starter code"
        >
          ↺ <span dir="rtl">איפוס</span>
        </button>
        <div className="flex-1" />
        <span className="hidden text-[11px] text-white/35 md:inline">
          <kbd className="rounded border border-white/20 px-1">Ctrl</kbd>+<kbd className="rounded border border-white/20 px-1">Enter</kbd> to run
        </span>
      </div>
      {/* tabs */}
      <div className="flex h-9 shrink-0 items-end bg-ide-side text-[13px]">
        <div className="flex h-full items-center gap-2 border-t-2 border-neon-cyan bg-ide-bg px-4 text-white">
          <span className="font-bold text-[#a179dc]">C#</span>
          HackProtocol.cs
          {p.dirty ? <span className="h-2 w-2 rounded-full bg-white/70" title="modified" /> : <span className="text-white/40">×</span>}
        </div>
        <div className="flex h-full items-center gap-2 border-r border-black/30 px-4 text-white/35" title="Nice try.">
          🔒 AURA_core.dll
        </div>
      </div>
      <CodeEditor
        value={p.code}
        onChange={p.onChange}
        onRun={p.onRun}
        errorLine={p.errorLine}
        activeLine={cursor.line}
        onCursor={(line, col) => setCursor((c) => (c.line === line && c.col === col ? c : { line, col }))}
        disabled={p.running}
      />
      <Terminal logs={p.logs} onClear={p.onClearLogs} running={p.running} />
      {/* status bar */}
      <div className="flex h-6 shrink-0 items-center gap-4 bg-ide-status px-3 text-[11.5px] text-white/90">
        <span>⎇ rebel/main</span>
        <span className={p.errorCount ? 'font-bold text-[#ffd0d6]' : ''}>⊗ {p.errorCount}</span>
        <span>⚠ {p.warnCount}</span>
        <div className="flex-1" />
        <span>Ln {cursor.line}, Col {cursor.col}</span>
        <span className="hidden sm:inline">Spaces: 4</span>
        <span className="hidden sm:inline">UTF-8</span>
        <span>C# 12 · .NET 8 (simulated)</span>
      </div>
    </section>
  );
}
