import { useEffect, useRef } from 'react';

export type LogKind = 'cmd' | 'info' | 'ok' | 'err' | 'warn' | 'out' | 'in' | 'act' | 'aura' | 'dim' | 'test';
export interface LogLine {
  id: number;
  kind: LogKind;
  text: string;
}

const STYLE: Record<LogKind, string> = {
  cmd: 'text-[#c586c0]',
  info: 'text-[#8fb8ff]',
  ok: 'text-[#5dff9c]',
  err: 'text-[#ff6b81]',
  warn: 'text-[#ffcf5a]',
  out: 'text-[#e8e8f0]',
  in: 'text-[#ff8ae8]',
  act: 'text-[#ffb86b]',
  aura: 'text-[#ff8ae8] italic',
  dim: 'text-white/35',
  test: 'text-[#22e4ff] font-bold',
};

export function Terminal({ logs, onClear, running }: { logs: LogLine[]; onClear: () => void; running: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [logs]);
  return (
    <div className="flex h-[34%] min-h-[150px] shrink-0 flex-col border-t border-[#33334a] bg-[#14141d]" dir="ltr">
      <div className="flex h-8 shrink-0 items-center gap-4 border-b border-[#2a2a3a] px-3 text-[11px] font-semibold uppercase tracking-wider">
        <span className="border-b-2 border-neon-cyan pb-1 pt-1.5 text-white">Output</span>
        <span className="pb-1 pt-1.5 text-white/35">Terminal</span>
        <span className="pb-1 pt-1.5 text-white/35">Problems</span>
        <div className="flex-1" />
        {running && <span className="animate-pulse normal-case tracking-normal text-neon-cyan">● running…</span>}
        <button onClick={onClear} className="rounded px-1.5 py-0.5 normal-case tracking-normal text-white/45 hover:bg-white/10 hover:text-white" title="Clear">
          ⌫ clear
        </button>
      </div>
      <div ref={ref} className="min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-[12.5px] leading-[20px]">
        {logs.map((l) => (
          <div key={l.id} dir="auto" className={`whitespace-pre-wrap break-words ${STYLE[l.kind]}`} style={{ textAlign: 'start' }}>
            {l.text}
          </div>
        ))}
        <div className="text-neon-cyan">
          <span className="text-[#5dff9c]">rebel@aura-maint</span>:<span className="text-[#8fb8ff]">~/hack</span>$ <span className="inline-block h-3.5 w-2 translate-y-0.5 animate-pulse bg-white/70" />
        </div>
      </div>
    </div>
  );
}
