import { sfx } from '../game/audio';
import { PLAYABLE, STAGES, TIER_LABEL } from '../game/stagesConfig';

interface Props {
  currentId: string;
  unlocked: number;
  completed: Set<string>;
  onPick: (flatIdx: number) => void;
  onClose: () => void;
}

export function StageMap({ currentId, unlocked, completed, onPick, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="animate-pop max-h-[90vh] w-[min(860px,100%)] overflow-auto rounded-2xl border border-neon-cyan/40 bg-[#070a1c]/95 p-5 shadow-[0_0_50px_#22e4ff33]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="font-orb text-[11px] tracking-[0.35em] text-neon-cyan">AURA DEFENSE GRID</div>
            <h2 className="text-2xl font-black text-white">7 שכבות הגנה</h2>
          </div>
          <button onClick={onClose} className="rounded-lg border border-white/20 px-3 py-1.5 text-white/70 hover:bg-white/10" aria-label="סגור">
            ✕
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {STAGES.map((s) => {
            const locked = s.levels.length === 0;
            return (
              <div
                key={s.id}
                className={`rounded-xl border p-3 ${locked ? 'border-white/10 bg-white/[0.02] opacity-60' : 'bg-white/[0.04]'}`}
                style={locked ? undefined : { borderColor: s.color + '66' }}
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg font-orb font-black text-black" style={{ background: locked ? '#444' : s.color }}>
                    {s.id}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-white">{s.title}</div>
                    <div dir="ltr" className="text-right font-mono text-[11px] text-white/45">{s.topic}</div>
                  </div>
                  <span className="ms-auto font-orb text-[9px] tracking-widest" style={{ color: s.color }}>{s.codename}</span>
                </div>
                <p className="mt-2 text-[12.5px] text-white/60">{s.description}</p>
                {locked ? (
                  <div className="mt-2 text-[12px] text-neon-amber">🚧 בבנייה — בקרוב</div>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {s.levels.map((l, i) => {
                      const ref = PLAYABLE.find((p) => p.level.id === l.id)!;
                      const open = ref.flatIdx <= unlocked;
                      const done = completed.has(l.id);
                      const cur = l.id === currentId;
                      return (
                        <button
                          key={l.id}
                          disabled={!open}
                          onClick={() => { sfx.click(); onPick(ref.flatIdx); }}
                          className={`rounded-lg border px-2.5 py-1 text-[12px] transition disabled:cursor-not-allowed disabled:opacity-40 ${cur ? 'ring-2 ring-white/60' : ''}`}
                          style={{ borderColor: s.color + (open ? 'aa' : '33'), background: done ? s.color + '33' : 'transparent', color: open ? '#fff' : '#888' }}
                        >
                          {open ? (done ? '✓' : l.tier === 'boss' ? '☠' : '◆') : '🔒'} {i + 1}. {l.title}
                          <span className="ms-1 text-white/40">({TIER_LABEL[l.tier]})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
