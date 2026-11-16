import { useEffect, useRef, useState } from 'react';
import { sfx } from '../game/audio';
import { STAGES, TIER_LABEL, type LevelRef } from '../game/stagesConfig';
import type { Hint } from '../game/types';
import { RichText } from './RichText';

interface Props {
  current: LevelRef;
  completed: Set<string>;
  hintsRevealed: number;
  onRevealHint: (tier: number) => void;
  onOpenMap: () => void;
  muted: boolean;
  onToggleMute: () => void;
}

const HINT_TITLES = ['רמז קריצה', 'רמז שלד', 'רמז הצלה'];
const HINT_ICONS = ['😉', '🦴', '🛟'];

export function HudBar({ current, completed, hintsRevealed, onRevealHint, onOpenMap, muted, onToggleMute }: Props) {
  const { stage, level, subIdx } = current;
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [level.id]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative z-50 flex h-[68px] shrink-0 items-center gap-4 border-b border-neon-cyan/25 bg-gradient-to-b from-[#0d1230] to-[#080b1d] px-4 shadow-[0_4px_24px_#0008]">
      {/* stage info */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline gap-2 truncate">
          <span className="font-orb text-[10px] font-bold tracking-[0.25em]" style={{ color: stage.color }}>
            {stage.codename}
          </span>
          <span className="truncate text-[15px] font-bold text-white">
            שלב {stage.id}: {stage.title}
            <span className="mx-2 text-white/30">|</span>
            <span className="text-white/85">
              תת-שלב {subIdx + 1} מתוך {stage.levels.length}
            </span>
          </span>
          <span
            className="hidden shrink-0 rounded-full border px-2 py-px text-[11px] font-bold xl:inline"
            style={{ borderColor: stage.color + '88', color: stage.color }}
          >
            {TIER_LABEL[level.tier]}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* sub-level dots */}
          <div className="flex items-center gap-1.5" aria-label="התקדמות בתת-שלבים">
            {stage.levels.map((l, i) => {
              const done = completed.has(l.id);
              const cur = i === subIdx;
              return (
                <div key={l.id} className="flex items-center gap-1.5">
                  <div
                    title={`${i + 1}. ${l.title}`}
                    className={`grid h-5 w-5 place-items-center rounded-full border-2 text-[10px] font-bold transition-all ${cur ? 'scale-110' : ''}`}
                    style={{
                      borderColor: done || cur ? stage.color : '#ffffff30',
                      background: done ? stage.color : 'transparent',
                      color: done ? '#05060f' : cur ? stage.color : '#ffffff60',
                      boxShadow: cur ? `0 0 10px ${stage.color}` : undefined,
                    }}
                  >
                    {l.tier === 'boss' ? '☠' : done ? '✓' : i + 1}
                  </div>
                  {i < stage.levels.length - 1 && <div className="h-0.5 w-4 rounded" style={{ background: done ? stage.color : '#ffffff20' }} />}
                </div>
              );
            })}
          </div>
          {/* 7-stage track */}
          <div className="hidden items-center gap-1 lg:flex" aria-label="7 שכבות הגנה">
            {STAGES.map((s) => {
              const allDone = s.levels.length > 0 && s.levels.every((l) => completed.has(l.id));
              const isCur = s.id === stage.id;
              return (
                <div
                  key={s.id}
                  title={`שלב ${s.id}: ${s.title}`}
                  className="h-1.5 w-5 rounded-full"
                  style={{
                    background: allDone ? s.color : isCur ? s.color + '99' : '#ffffff18',
                    boxShadow: isCur ? `0 0 8px ${s.color}` : undefined,
                  }}
                />
              );
            })}
            <span className="ms-1 text-[10px] text-white/40">7 שכבות</span>
          </div>
        </div>
      </div>

      {/* controls */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => { sfx.click(); onOpenMap(); }}
          className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[13px] text-white/80 hover:border-neon-cyan/60 hover:text-white"
          title="מפת שלבים"
        >
          🗺️ <span className="hidden sm:inline">מפה</span>
        </button>
        <button
          onClick={() => { onToggleMute(); sfx.click(); }}
          className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[13px] text-white/80 hover:border-neon-cyan/60"
          title={muted ? 'הפעל צלילים' : 'השתק'}
          aria-label={muted ? 'הפעל צלילים' : 'השתק'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
        <div className="relative" ref={popRef}>
          <button
            onClick={() => { sfx.hint(); setOpen((o) => !o); }}
            className="hint-btn grid h-11 w-11 animate-pulse place-items-center rounded-full bg-gradient-to-b from-[#ffcf5a] to-[#ff9a0a] font-orb text-2xl font-black text-[#1a0d00] hover:animate-none hover:brightness-110"
            aria-label="רמזים"
            aria-expanded={open}
            title="רמזים"
          >
            ?
          </button>
          {open && (
            <HintPopover hints={level.hints} revealed={hintsRevealed} onReveal={onRevealHint} />
          )}
        </div>
      </div>
    </div>
  );
}

function HintPopover({ hints, revealed, onReveal }: { hints: Hint[]; revealed: number; onReveal: (tier: number) => void }) {
  return (
    <div className="animate-pop absolute left-0 top-[calc(100%+10px)] z-50 w-[min(380px,80vw)] rounded-xl border border-neon-amber/50 bg-[#110d05]/95 p-3 shadow-[0_0_30px_#ffb02044,0_20px_40px_#000a] backdrop-blur-md">
      <div className="absolute -top-[7px] left-4 h-3 w-3 rotate-45 border-l border-t border-neon-amber/50 bg-[#110d05]" />
      <div className="mb-2 flex items-center justify-between">
        <div className="font-bold text-neon-amber">מערכת רמזים מורדת</div>
        <div className="text-[11px] text-white/45">AURA רואה הכל 👁️</div>
      </div>
      <div className="flex flex-col gap-2">
        {hints.map((h, i) => {
          const isOpen = i < revealed;
          const canOpen = i === revealed;
          return (
            <div
              key={i}
              className={`rounded-lg border p-2.5 text-[13px] leading-relaxed ${isOpen ? 'border-neon-amber/40 bg-neon-amber/[0.07]' : 'border-white/10 bg-white/[0.03]'}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-bold text-white">
                  {HINT_ICONS[i]} {i + 1}. {HINT_TITLES[i]}
                </span>
                {!isOpen && (
                  <button
                    disabled={!canOpen}
                    onClick={() => { sfx.hint(); onReveal(i + 1); }}
                    className="rounded-md border border-neon-amber/60 px-2 py-0.5 text-[12px] font-bold text-neon-amber enabled:hover:bg-neon-amber enabled:hover:text-black disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {canOpen ? 'חשוף' : '🔒 נעול'}
                  </button>
                )}
              </div>
              {isOpen ? (
                <div className="holo-in text-white/85">
                  <RichText text={h.text} />
                  {h.code && (
                    <div className="relative mt-1.5">
                      <pre dir="ltr" className="overflow-x-auto rounded-md border border-white/10 bg-black/60 p-2 text-left font-mono text-[12px] leading-5 text-[#9cdcfe]">
                        {h.code}
                      </pre>
                      <button
                        onClick={(ev) => {
                          sfx.click();
                          const pre = (ev.currentTarget.previousElementSibling as HTMLElement | null);
                          const selectCode = () => {
                            if (!pre) return;
                            const range = document.createRange();
                            range.selectNodeContents(pre);
                            const sel = window.getSelection();
                            sel?.removeAllRanges();
                            sel?.addRange(range);
                          };
                          try {
                            navigator.clipboard.writeText(h.code!).catch(selectCode);
                          } catch {
                            selectCode();
                          }
                        }}
                        className="absolute right-1.5 top-1.5 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/70 hover:bg-white/20"
                      >
                        העתק
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="select-none text-white/30 blur-[3px]">████ ██████ ███ ████████ ██</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
