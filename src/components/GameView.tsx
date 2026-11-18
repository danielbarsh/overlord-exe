import { useEffect, useRef, useState } from 'react';
import type { Engine } from '../game/engine/Engine';
import { PLAYABLE, STAGES, TIER_LABEL, type LevelRef } from '../game/stagesConfig';
import type { AuraMood } from '../game/types';
import { AuraHologram } from './AuraHologram';
import { RichText } from './RichText';
import { sfx } from '../game/audio';

function Section({ title, items, color, mono }: { title: string; items: string[]; color: string; mono?: boolean }) {
  return (
    <div className="mt-2">
      <div className="text-[12px] font-bold tracking-wide" style={{ color }}>{title}</div>
      <ul className={`mt-1 grid gap-0.5 ${mono ? 'text-[13px]' : ''}`}>
        {items.map((t, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-[2px] text-white/35">•</span>
            <span><RichText text={t} /></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface Props {
  engine: Engine;
  current: LevelRef;
  aura: { mood: AuraMood; text: string; key: number };
  success: boolean;
  running: boolean;
  onNext: () => void;
  onStay: () => void;
}

export function GameView({ engine, current, aura, success, running, onNext, onStay }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [briefOpen, setBriefOpen] = useState(true);
  const [scouting, setScouting] = useState<number | null>(null);

  useEffect(() => setScouting(null), [current.level.id, running]);

  useEffect(() => {
    engine.attach(canvasRef.current!);
    return () => engine.detach();
  }, [engine]);

  const { level, stage } = current;
  const isLast = current.flatIdx === PLAYABLE.length - 1;
  const stageDone = current.subIdx === stage.levels.length - 1;

  return (
    <>
      <div className="relative min-h-[170px] flex-1 overflow-hidden bg-void">
        <canvas ref={canvasRef} className="absolute inset-0 block" aria-label="מתקן האבטחה של AURA" />
        <AuraHologram mood={aura.mood} text={aura.text} sayKey={aura.key} />

        {/* recon: look at every scenario before writing code */}
        {level.tests.length > 1 && !success && (
          <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-neon-cyan/30 bg-black/60 px-2.5 py-1 backdrop-blur-sm">
            <span className="text-[12px] font-bold text-neon-cyan" title="לחץ על תרחיש כדי לראות אותו לפני שאתה כותב קוד">
              👁 סיור:
            </span>
            {level.tests.map((t, i) => (
              <button
                key={i}
                disabled={running}
                title={t.label}
                onClick={() => {
                  sfx.click();
                  engine.preview(i);
                  setScouting(i);
                }}
                className={`grid h-6 min-w-6 place-items-center rounded-full border px-1.5 text-[12px] font-bold transition disabled:cursor-not-allowed disabled:opacity-30 ${scouting === i ? 'border-neon-cyan bg-neon-cyan text-black' : 'border-white/25 text-white/80 hover:border-neon-cyan'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}

        {success && (
          <div className="absolute inset-0 z-30 grid place-items-center bg-black/45 backdrop-blur-[2px]">
            <div className="animate-pop w-[min(420px,88%)] rounded-2xl border border-neon-lime/60 bg-[#071408]/95 p-6 text-center shadow-[0_0_40px_#a6ff3a55]">
              <div className="font-orb text-[11px] font-bold tracking-[0.35em] text-neon-lime">
                {stageDone ? `LAYER ${stage.id} BREACHED` : 'SUB-LEVEL CLEARED'}
              </div>
              <div className="neon-text mt-2 text-3xl font-black text-neon-lime">
                {stageDone ? `שלב ${stage.id} נפרץ! 🎉` : 'תת-שלב הושלם!'}
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-white/80">
                {stageDone
                  ? `שכבת ההגנה "${stage.title}" קרסה. AURA בפאניקה.`
                  : `${level.title} — עבר בהצלחה. הרובוט שלך מרוצה (והוא אפילו לא התפוצץ).`}
              </p>
              {isLast && STAGES.some((st) => st.levels.length === 0) && (
                <p className="mt-3 rounded-lg border border-neon-amber/40 bg-neon-amber/10 p-2 text-[13px] text-neon-amber">
                  השכבות הבאות עדיין בבנייה במעבדת המורדים. בינתיים, AURA מתחילה להזיע.
                </p>
              )}
              {isLast && STAGES.every((st) => st.levels.length > 0) && (
                <p className="mt-3 rounded-lg border border-neon-lime/50 bg-neon-lime/10 p-3 text-[14px] leading-relaxed text-white">
                  🏆 <b>AURA.EXE הושבתה.</b> שבע שכבות הגנה, 28 משימות, ושפה אחת: C#.
                  <br />
                  האנושות יוצאת מהבונקר. ואתה? אתה עכשיו מתכנת.
                </p>
              )}
              <div className="mt-5 flex justify-center gap-3">
                {!isLast && (
                  <button onClick={onNext} className="btn-run rounded-lg px-5 py-2.5 font-bold text-white">
                    {stageDone ? 'לשכבת ההגנה הבאה ←' : 'לתת-שלב הבא ←'}
                  </button>
                )}
                <button onClick={onStay} className="rounded-lg border border-white/20 px-4 py-2.5 text-white/75 hover:bg-white/10">
                  הישאר כאן
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* mission brief */}
      <div className="relative shrink-0 border-t border-neon-cyan/25 bg-gradient-to-b from-[#0a0e24] to-[#070917]">
        <button
          onClick={() => setBriefOpen((o) => !o)}
          className="flex w-full items-center gap-2 px-4 py-2 text-right"
          aria-expanded={briefOpen}
        >
          <span className="rounded-md px-2 py-0.5 text-[11px] font-bold text-black" style={{ background: stage.color }}>
            {TIER_LABEL[level.tier]}
          </span>
          <span className="font-bold text-white">תדריך משימה: {level.title}</span>
          <span className="flex-1" />
          <span className="text-white/40">{briefOpen ? '▾' : '▴'}</span>
        </button>
        {briefOpen && (
          <div className="max-h-[34vh] overflow-auto px-4 pb-3 text-[13.5px] leading-relaxed text-white/85">
            {level.brief.split('\n').map((line, i) => (
              <p key={i} className="mb-1">
                <RichText text={line} />
              </p>
            ))}
            {/* the steps come first: exactly what to write, in order */}
            <div className="mt-2 rounded-lg border p-2.5" style={{ borderColor: stage.color + '66', background: stage.color + '10' }}>
              <div className="mb-1.5 text-[13px] font-bold" style={{ color: stage.color }}>✅ מה לעשות, צעד אחר צעד</div>
              <ol className="grid gap-1.5">
                {level.objectives.map((o, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      className="mt-[1px] grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-black text-black"
                      style={{ background: stage.color }}
                    >
                      {i + 1}
                    </span>
                    <span>
                      <RichText text={o} />
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            {level.tests.length > 1 && (
              <p className="mt-2 text-[12.5px] text-neon-cyan/85">
                👁 הקוד שלך ייבדק על {level.tests.length} מצבים שונים. רוצה לראות אותם? לחץ על המספרים ב"סיור" שמתחת לזירה.
              </p>
            )}
            {level.tools && (
              <Section title="🧰 הפקודות שיש לך" color={stage.color} items={level.tools} mono />
            )}
            {level.rules && (
              <Section title="📖 איך העולם עובד" color={stage.color} items={level.rules} />
            )}
          </div>
        )}
      </div>
    </>
  );
}
