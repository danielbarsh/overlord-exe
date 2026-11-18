import { useEffect, useRef, useState } from 'react';
import type { Engine } from '../game/engine/Engine';
import { PLAYABLE, STAGES, TIER_LABEL, type LevelRef } from '../game/stagesConfig';
import type { AuraMood } from '../game/types';
import { AuraHologram } from './AuraHologram';
import { RichText } from './RichText';

interface Props {
  engine: Engine;
  current: LevelRef;
  aura: { mood: AuraMood; text: string; key: number };
  success: boolean;
  onNext: () => void;
  onStay: () => void;
}

export function GameView({ engine, current, aura, success, onNext, onStay }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [briefOpen, setBriefOpen] = useState(true);

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
          <div className="max-h-[26vh] overflow-auto px-4 pb-3 text-[13.5px] leading-relaxed text-white/85">
            {level.brief.split('\n').map((line, i) => (
              <p key={i} className="mb-1">
                <RichText text={line} />
              </p>
            ))}
            <ul className="mt-2 grid gap-1">
              {level.objectives.map((o, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px]" style={{ borderColor: stage.color, color: stage.color }}>
                    ◆
                  </span>
                  <span>
                    <RichText text={o} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
