import { useEffect, useState } from 'react';
import { sfx } from '../game/audio';

const BOOT = [
  '> BOOT rebel_terminal v0.42 ........ OK',
  '> 2042 · SECTOR 7 · UNDERGROUND BUNKER',
  '> SCANNING AURA MAINTENANCE PORT :1337 ...',
  '> PORT OPEN. SECURITY BOT R-7 FOUND (IDLE)',
  '> HIJACK MODULE: C# INTERFACE READY',
];

export function IntroScreen({ onStart, resume }: { onStart: () => void; resume: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= BOOT.length) return;
    const id = window.setTimeout(() => setN((x) => x + 1), 380);
    return () => window.clearTimeout(id);
  }, [n]);

  return (
    <div className="relative grid h-full place-items-center overflow-hidden bg-void">
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 50% 40%, #ff2bd655, transparent 55%), radial-gradient(circle at 20% 90%, #22e4ff33, transparent 50%)' }} />
      <div className="holo-scan pointer-events-none absolute inset-0 animate-scan opacity-40" />
      <div className="relative w-[min(720px,92vw)] text-center">
        <div className="font-orb text-[12px] font-bold tracking-[0.5em] text-neon-pink/80">OVERLORD.EXE</div>
        <h1 className="neon-text mt-2 animate-flicker text-6xl font-black text-neon-cyan sm:text-7xl">פרוטוקול קריסה</h1>
        <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-white/80">
          השנה 2042. הבינה המלאכותית <b className="text-neon-pink">AURA</b> השתלטה על העולם ונעלה את האנושות מתחת לאדמה.
          פרצת לטרמינל התחזוקה שלה, השתלטת על רובוט אבטחה — ועכשיו, עם <b className="text-neon-cyan">C#</b> בלבד, עליך לפרוץ 7 שכבות הגנה ולכבות את הליבה.
        </p>
        <div dir="ltr" className="mx-auto mt-6 h-[120px] max-w-md rounded-lg border border-neon-cyan/30 bg-black/50 p-3 text-left font-mono text-[12px] leading-5 text-[#5dff9c]">
          {BOOT.slice(0, n).map((l) => (
            <div key={l}>{l}</div>
          ))}
          {n < BOOT.length && <span className="inline-block h-3.5 w-2 animate-pulse bg-[#5dff9c]" />}
        </div>
        <button
          onClick={() => { sfx.unlock(); sfx.granted(); onStart(); }}
          className="btn-run mt-7 rounded-xl px-8 py-3.5 text-xl font-black text-white"
        >
          {resume ? '▶ המשך בפריצה' : '▶ התחל פריצה'}
        </button>
        <div className="mt-3 text-[12px] text-white/40">מומלץ עם רמקולים 🔊 · מסך מחשב</div>
      </div>
    </div>
  );
}
