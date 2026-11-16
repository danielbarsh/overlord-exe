import { useEffect, useState } from 'react';
import { sfx } from '../game/audio';
import type { AuraMood } from '../game/types';
import { plainLength, RichText } from './RichText';

interface Props {
  mood: AuraMood;
  text: string;
  /** changes whenever a new line is said (re-triggers typewriter) */
  sayKey: number;
}

const MOOD_LABEL: Record<AuraMood, string> = {
  neutral: 'ONLINE',
  smug: 'SMUG.EXE',
  laughing: 'LOL.EXE',
  shocked: 'SHOCK.ERR',
  glitch: 'GL!TCH',
  angry: 'ANGRY.SYS',
  panic: 'PANIC!!',
  thinking: 'ANALYZING',
};

export function AuraHologram({ mood, text, sayKey }: Props) {
  const [shown, setShown] = useState(0);
  const total = plainLength(text);
  const talking = shown < total;
  const [mouthOpen, setMouthOpen] = useState(false);

  useEffect(() => {
    setShown(0);
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setShown(n);
      if (n % 3 === 0) sfx.aura();
      if (n >= total) window.clearInterval(id);
    }, 22);
    return () => window.clearInterval(id);
  }, [sayKey, total]);

  useEffect(() => {
    if (!talking) {
      setMouthOpen(false);
      return;
    }
    const id = window.setInterval(() => setMouthOpen((m) => !m), 95);
    return () => window.clearInterval(id);
  }, [talking]);

  const hue = mood === 'panic' || mood === 'angry' ? '#ff3b5c' : mood === 'glitch' ? '#22e4ff' : '#ff2bd6';
  const anim =
    mood === 'laughing' ? 'animate-laugh' : mood === 'shocked' || mood === 'panic' ? 'animate-shake' : mood === 'glitch' ? 'animate-glitch' : 'animate-bob';

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-40 flex max-w-[78%] items-start gap-3" dir="ltr">
      {/* avatar */}
      <div className="relative shrink-0">
        <div
          className="crt relative h-[92px] w-[92px] overflow-hidden rounded-xl border bg-black/40 backdrop-blur-sm"
          style={{ borderColor: hue + 'aa', boxShadow: `0 0 18px ${hue}66, inset 0 0 22px ${hue}33` }}
        >
          <div className={`absolute inset-0 ${anim}`}>
            <Face mood={mood} talking={talking && mouthOpen} hue={hue} />
            {mood === 'glitch' && (
              <>
                <div className="absolute inset-0 translate-x-[3px] opacity-60 mix-blend-screen" style={{ filter: 'hue-rotate(90deg)' }}>
                  <Face mood={mood} talking={false} hue="#22e4ff" />
                </div>
                <div className="absolute inset-0 -translate-x-[3px] opacity-60 mix-blend-screen">
                  <Face mood={mood} talking={false} hue="#ff2bd6" />
                </div>
              </>
            )}
          </div>
          <div className="holo-scan absolute inset-0 animate-scan opacity-70" />
          <div className="absolute inset-0 animate-flicker" style={{ background: `linear-gradient(180deg, ${hue}14, transparent 60%)` }} />
        </div>
        <div
          className="mt-1 text-center font-orb text-[9px] font-bold tracking-widest"
          style={{ color: hue, textShadow: `0 0 8px ${hue}` }}
        >
          AURA · {MOOD_LABEL[mood]}
        </div>
      </div>
      {/* dialogue */}
      {text && (
        <div
          key={sayKey}
          dir="rtl"
          className="holo-in relative mt-1 whitespace-pre-line rounded-xl border bg-[#12061a]/85 px-3.5 py-2.5 text-[13.5px] leading-relaxed text-pink-50 backdrop-blur-md"
          style={{ borderColor: hue + '99', boxShadow: `0 0 16px ${hue}44` }}
        >
          <div className="absolute -left-[7px] top-6 h-3 w-3 rotate-45 border-b border-l bg-[#12061a]" style={{ borderColor: hue + '99' }} />
          <div className={`mb-0.5 font-orb text-[10px] font-bold tracking-widest ${mood === 'glitch' ? 'rgb-split' : ''}`} style={{ color: hue }}>
            AURA&gt;
          </div>
          <RichText text={text} limit={shown} />
          {talking && <span className="ms-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse" style={{ background: hue }} />}
        </div>
      )}
    </div>
  );
}

function Face({ mood, talking, hue }: { mood: AuraMood; talking: boolean; hue: string }) {
  const stroke = hue;
  const fill = hue + '22';
  const eye = (cx: number) => {
    switch (mood) {
      case 'laughing':
        return <path d={`M${cx - 8} 54 Q${cx} 44 ${cx + 8} 54`} stroke={stroke} strokeWidth={3.5} fill="none" strokeLinecap="round" />;
      case 'smug':
        return (
          <g>
            <path d={`M${cx - 9} 51 L${cx + 9} 51`} stroke={stroke} strokeWidth={3} strokeLinecap="round" />
            <path d={`M${cx - 8} 51 Q${cx} 58 ${cx + 8} 51`} fill={stroke} />
          </g>
        );
      case 'shocked':
      case 'panic':
        return (
          <g>
            <circle cx={cx} cy={52} r={9} fill="none" stroke={stroke} strokeWidth={2.5} />
            <circle cx={cx} cy={52} r={2.5} fill={stroke} />
          </g>
        );
      case 'glitch':
        return (
          <g stroke={stroke} strokeWidth={3} strokeLinecap="round">
            <path d={`M${cx - 6} 46 L${cx + 6} 58 M${cx + 6} 46 L${cx - 6} 58`} />
          </g>
        );
      case 'angry':
        return <path d={`M${cx - 8} 50 L${cx + 8} 50 L${cx + 6} 56 L${cx - 6} 56 Z`} fill={stroke} />;
      case 'thinking':
        return <ellipse cx={cx + 3} cy={49} rx={6} ry={4} fill={stroke} />;
      default:
        return <ellipse cx={cx} cy={52} rx={7.5} ry={4.5} fill={stroke} />;
    }
  };
  const brows = () => {
    switch (mood) {
      case 'smug':
        return <path d="M33 40 L47 42 M73 37 Q80 33 88 38" stroke={stroke} strokeWidth={2.5} fill="none" strokeLinecap="round" />;
      case 'angry':
        return <path d="M33 38 L48 45 M87 38 L72 45" stroke={stroke} strokeWidth={3} strokeLinecap="round" />;
      case 'shocked':
      case 'panic':
        return <path d="M32 36 Q40 30 48 35 M72 35 Q80 30 88 36" stroke={stroke} strokeWidth={2.5} fill="none" strokeLinecap="round" />;
      default:
        return <path d="M33 41 Q40 38 47 41 M73 41 Q80 38 87 41" stroke={stroke} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.8} />;
    }
  };
  const mouth = () => {
    if (talking) return <ellipse cx={60} cy={80} rx={mood === 'laughing' ? 11 : 7} ry={mood === 'laughing' ? 8 : 5} fill={stroke} opacity={0.9} />;
    switch (mood) {
      case 'laughing':
        return <path d="M46 74 Q60 96 74 74 Z" fill={stroke} />;
      case 'smug':
        return <path d="M48 80 Q62 86 74 74" stroke={stroke} strokeWidth={3} fill="none" strokeLinecap="round" />;
      case 'shocked':
        return <ellipse cx={60} cy={81} rx={6} ry={8} fill="none" stroke={stroke} strokeWidth={3} />;
      case 'panic':
        return <path d="M46 82 Q50 76 54 82 Q58 88 62 82 Q66 76 70 82 Q72 85 74 82" stroke={stroke} strokeWidth={2.5} fill="none" />;
      case 'angry':
        return <path d="M48 84 Q60 76 72 84" stroke={stroke} strokeWidth={3} fill="none" strokeLinecap="round" />;
      case 'glitch':
        return <path d="M46 80 L52 77 L58 83 L64 76 L70 82 L74 79" stroke={stroke} strokeWidth={2.5} fill="none" />;
      case 'thinking':
        return <path d="M52 81 L68 79" stroke={stroke} strokeWidth={3} strokeLinecap="round" />;
      default:
        return <path d="M50 80 Q60 86 70 80" stroke={stroke} strokeWidth={3} fill="none" strokeLinecap="round" />;
    }
  };
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" style={{ filter: `drop-shadow(0 0 4px ${hue})` }}>
      <defs>
        <radialGradient id={`fg-${hue.slice(1)}`} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor={hue} stopOpacity={0.28} />
          <stop offset="100%" stopColor={hue} stopOpacity={0.04} />
        </radialGradient>
      </defs>
      {/* data "hair" */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <path
          key={i}
          d={`M${22 + i * 12.5} ${30 - Math.abs(3 - i) * -2} Q${60} ${-4 + Math.abs(3 - i) * 3} ${98 - i * 12.5} ${30 - Math.abs(3 - i) * -2}`}
          stroke={stroke}
          strokeOpacity={0.35}
          strokeWidth={1}
          fill="none"
        />
      ))}
      {/* head */}
      <path d="M60 14 C86 14 96 36 95 60 C94 86 78 106 60 108 C42 106 26 86 25 60 C24 36 34 14 60 14 Z" fill={`url(#fg-${hue.slice(1)})`} stroke={stroke} strokeWidth={2} />
      <path d="M25 60 L14 56 L16 72 L27 70" fill={fill} stroke={stroke} strokeWidth={1.5} />
      <path d="M95 60 L106 56 L104 72 L93 70" fill={fill} stroke={stroke} strokeWidth={1.5} />
      {/* circuit lines */}
      <path d="M60 18 L60 30 M50 22 L50 28 L44 32 M70 22 L70 28 L76 32" stroke={stroke} strokeOpacity={0.5} strokeWidth={1.2} fill="none" />
      {brows()}
      {eye(40)}
      {eye(80)}
      {mouth()}
      {mood === 'panic' && (
        <g fill="#9fe8ff">
          <path d="M92 34 Q96 42 92 46 Q88 42 92 34 Z" />
          <path d="M24 40 Q27 46 24 49 Q21 46 24 40 Z" />
        </g>
      )}
      {mood === 'thinking' && (
        <circle cx={100} cy={22} r={8} fill="none" stroke={stroke} strokeWidth={2} strokeDasharray="10 6">
          <animateTransform attributeName="transform" type="rotate" from="0 100 22" to="360 100 22" dur="1s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}
