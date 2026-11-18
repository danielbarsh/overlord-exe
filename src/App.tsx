import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameView } from './components/GameView';
import { HudBar } from './components/HudBar';
import { IdePanel } from './components/IdePanel';
import { IntroScreen } from './components/IntroScreen';
import { StageMap } from './components/StageMap';
import type { LogKind, LogLine } from './components/Terminal';
import { sfx } from './game/audio';
import { Cancelled, Engine } from './game/engine/Engine';
import { AURA_LINES, moodFor, pick, roast } from './game/roasts';
import { evaluateLevel } from './game/runner';
import { getScene } from './game/scenes';
import { PLAYABLE } from './game/stagesConfig';
import type { AuraMood } from './game/types';

const STORE_KEY = 'overlord-exe-v2';
const OLD_STORE_KEY = 'overlord-exe-v1';
interface Saved {
  idx: number;
  unlocked: number;
  completed: string[];
  codes: Record<string, string>;
  hints: Record<string, number>;
  muted: boolean;
}

/**
 * v1 had 3 sub-levels per stage; v2 has 4 (a new practice level before each boss).
 * The old boss "S-3" is now "S-4", and flat indexes shift accordingly.
 */
function migrateV1(old: Saved): Saved {
  const id = (k: string) => k.replace(/^(\d+)-3$/, '$1-4');
  const remap = <T,>(o: Record<string, T> = {}) => Object.fromEntries(Object.entries(o).map(([k, v]) => [id(k), v]));
  const flat = (i: number) => {
    const stage = Math.floor(i / 3);
    const sub = i % 3;
    return stage * 4 + (sub === 2 ? 3 : sub);
  };
  return {
    ...old,
    idx: flat(old.idx ?? 0),
    unlocked: flat(old.unlocked ?? 0),
    completed: (old.completed ?? []).map(id),
    codes: remap(old.codes),
    hints: remap(old.hints),
  };
}

function loadSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as Saved;
    const old = localStorage.getItem(OLD_STORE_KEY);
    return old ? migrateV1(JSON.parse(old) as Saved) : null;
  } catch {
    return null;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clampIdx = (i: number) => Math.max(0, Math.min(PLAYABLE.length - 1, i | 0));

export default function App() {
  const saved = useMemo(loadSaved, []);
  // teacher demo: ?unlock=all locally, #unlock-all on hosted links (which only pass a plain #hash)
  const unlockAll = useMemo(() => new URLSearchParams(location.search).get('unlock') === 'all' || location.hash === '#unlock-all', []);

  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(clampIdx(saved?.idx ?? 0));
  const [unlocked, setUnlocked] = useState(unlockAll ? PLAYABLE.length - 1 : clampIdx(saved?.unlocked ?? 0));
  const [completed, setCompleted] = useState<Set<string>>(new Set(saved?.completed ?? []));
  const [codes, setCodes] = useState<Record<string, string>>(saved?.codes ?? {});
  const [hints, setHints] = useState<Record<string, number>>(saved?.hints ?? {});
  const [muted, setMuted] = useState(saved?.muted ?? false);

  const [logs, setLogs] = useState<LogLine[]>([]);
  const [aura, setAura] = useState<{ mood: AuraMood; text: string; key: number }>({ mood: 'smug', text: '', key: 0 });
  const [running, setRunning] = useState(false);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [warnCount, setWarnCount] = useState(0);
  const [success, setSuccess] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const engine = useMemo(() => new Engine(), []);
  // dev-only handle for debugging/automated playtests (window.__engine)
  if (import.meta.env.DEV) (window as unknown as { __engine: Engine }).__engine = engine;
  const current = PLAYABLE[idx];
  const level = current.level;
  const code = codes[level.id] ?? level.starterCode;

  const logId = useRef(0);
  const codeRef = useRef(code);
  codeRef.current = code;
  const levelIdRef = useRef(level.id);
  levelIdRef.current = level.id;
  const runningRef = useRef(false);

  const log = useCallback((kind: LogKind, text: string) => {
    setLogs((l) => [...l.slice(-400), { id: ++logId.current, kind, text }]);
  }, []);
  const say = useCallback((mood: AuraMood, text: string) => {
    setAura((a) => ({ mood, text, key: a.key + 1 }));
  }, []);

  // persistence
  useEffect(() => {
    try {
      const data: Saved = { idx, unlocked, completed: [...completed], codes, hints, muted };
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch {
      /* storage unavailable — progress just won't persist */
    }
  }, [idx, unlocked, completed, codes, hints, muted]);

  useEffect(() => sfx.setMuted(muted), [muted]);

  // load level into the scene
  useEffect(() => {
    if (!started) return;
    engine.setScene(getScene(level.scene), level);
    runningRef.current = false;
    setRunning(false);
    setSuccess(false);
    setErrorLine(null);
    setWarnCount(0);
    setLogs([]);
    log('dim', `// ${current.stage.codename} · level ${level.id} loaded`);
    log('info', `Microsoft (R) Visual C# Compiler — simulated by rebel_terminal`);
    log('dim', 'Write your code, then press ▶ COMPILE & RUN (Ctrl+Enter)');
    say(level.tier === 'boss' ? 'angry' : 'smug', level.aura.intro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, started]);

  // idle taunts
  useEffect(() => {
    if (!started || running) return;
    const id = window.setTimeout(() => say('smug', pick(AURA_LINES.idle)), 75000);
    return () => window.clearTimeout(id);
  }, [code, aura.key, started, running, say]);

  const setCode = (v: string) => {
    setCodes((c) => ({ ...c, [level.id]: v }));
    if (errorLine !== null) setErrorLine(null);
  };

  const run = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    setSuccess(false);
    setErrorLine(null);
    const lvl = level;
    const src = codeRef.current;
    engine.resetScene();
    setLogs([]);
    log('cmd', '$ dotnet build HackProtocol.csproj');
    log('info', '[Compiling HackProtocol.cs...]');
    sfx.compile();
    say('thinking', pick(AURA_LINES.compiling));
    const finish = () => {
      runningRef.current = false;
      setRunning(false);
    };
    await sleep(750);
    if (levelIdRef.current !== lvl.id) return finish();

    const outcome = evaluateLevel(lvl, src);
    if (outcome.phase === 'compile') {
      const d = outcome.error;
      log('err', `HackProtocol.cs(${d.line},${d.col}): error ${d.code}: ${d.message}`);
      log('err', 'Build FAILED.  0 Warning(s)  1 Error(s)');
      setErrorLine(d.line);
      setWarnCount(0);
      sfx.error();
      say(moodFor(d.roast), roast(d.roast, d.extra));
      try {
        await engine.scene?.onCompileError?.(engine);
      } catch (e) {
        if (!(e instanceof Cancelled)) throw e;
      }
      return finish();
    }

    setWarnCount(outcome.warnings.length);
    for (const w of outcome.warnings) {
      log('warn', `HackProtocol.cs(${w.line},${w.col}): warning ${w.code}: ${w.message}`);
    }
    log('ok', `Build succeeded.  ${outcome.warnings.length} Warning(s)  0 Error(s)`);
    sfx.buildOk();
    if (outcome.warnings.length) say('smug', roast(outcome.warnings[0].roast, outcome.warnings[0].extra));
    await sleep(350);
    log('cmd', '$ dotnet run  --target R-7');

    const { runs, verdict } = outcome;
    try {
      await engine.scene!.play(engine, {
        level: lvl,
        runs,
        verdict,
        onTestStart: (i) => {
          const t = lvl.tests[i];
          const r = runs[i];
          if (lvl.tests.length > 1) log('test', `── ${t.label} ──`);
          t.input?.forEach((x) => log('in', `< ${x}`));
          if (t.harness) {
            log('dim', '  // AURA runs her own Main against your classes:');
            t.harness.split('\n').forEach((l) => log('in', `  AURA> ${l}`));
          }
          if (r.blocked) log('warn', `  🛡 AURA's code failed to compile: ${r.blocked.code}: ${r.blocked.message}`);
          if (t.sensors) log('dim', `  sensors: ${Object.entries(t.sensors).map(([k, v]) => `${k}()=${JSON.stringify(v)}`).join(', ')}`);
          for (const ev of r.events) {
            if (ev.kind === 'out') log('out', ev.text === '' ? ' ' : ev.text);
            else if (ev.kind === 'act') {
              const args = ev.action.args.map((a, k) => {
                const o = ev.action.objs[k];
                return o ? `${o.cls}#${o.id} { ${Object.entries(o.fields).map(([f, v]) => `${f}=${JSON.stringify(v)}`).join(', ')} }` : JSON.stringify(a);
              });
              log('act', `⚙ Robot.${ev.action.name}(${args.join(', ')})`);
            }
            else log('dim', `  new ${ev.cls}()`);
          }
          if (r.error) {
            log('err', `Unhandled exception. System.${r.error.exception}: ${r.error.message}`);
            if (r.error.line) log('err', `   at HackProtocol.Main() in HackProtocol.cs:line ${r.error.line}`);
          }
        },
        onTestEnd: (_i, ok) => log(ok ? 'ok' : 'err', ok ? '  ✔ PASS' : '  ✖ FAIL'),
      });
    } catch (e) {
      if (e instanceof Cancelled) return finish();
      throw e;
    }
    if (levelIdRef.current !== lvl.id) return finish();

    if (verdict.ok) {
      log('ok', '══════ ALL CHECKS PASSED · ACCESS GRANTED ══════');
      const stageDone = current.subIdx === current.stage.levels.length - 1;
      say(stageDone ? 'panic' : 'shocked', lvl.aura.win);
      if (stageDone) sfx.glitch();
      setCompleted((c) => new Set(c).add(lvl.id));
      setUnlocked((u) => Math.max(u, clampIdx(current.flatIdx + 1)));
      await sleep(900);
      if (levelIdRef.current === lvl.id) setSuccess(true);
    } else {
      verdict.details?.filter(Boolean).forEach((d) => log('err', d));
      log('err', '══════ ACCESS DENIED ══════');
      if (runs.some((r) => r.error)) say(verdict.mood ?? 'laughing', verdict.message ?? pick(AURA_LINES.runtimeCrash));
      else say(verdict.mood ?? 'smug', `${pick(AURA_LINES.logicFail)}\n${verdict.message ?? ''}`.trim());
    }
    finish();
  }, [level, current, engine, log, say]);

  const reset = () => {
    setCodes((c) => {
      const n = { ...c };
      delete n[level.id];
      return n;
    });
    setErrorLine(null);
    setWarnCount(0);
    engine.resetScene();
    setSuccess(false);
    say('smug', pick(AURA_LINES.reset));
  };

  const revealHint = (tier: number) => {
    setHints((h) => ({ ...h, [level.id]: Math.max(h[level.id] ?? 0, tier) }));
    say(tier === 3 ? 'laughing' : 'smug', tier === 3 ? pick(AURA_LINES.hint3) : pick(AURA_LINES.hint));
  };

  const goTo = (i: number) => {
    engine.cancel();
    setMapOpen(false);
    setIdx(clampIdx(i));
  };

  if (!started) return <IntroScreen resume={!!saved} onStart={() => setStarted(true)} />;

  return (
    <div className="flex h-full flex-col overflow-hidden md:flex-row">
      {/* RTL: first child sits on the right */}
      <main className="flex h-1/2 min-w-0 flex-col border-white/10 md:h-full md:w-1/2 md:border-l">
        <HudBar
          current={current}
          completed={completed}
          hintsRevealed={hints[level.id] ?? 0}
          onRevealHint={revealHint}
          onOpenMap={() => setMapOpen(true)}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
        />
        <GameView
          engine={engine}
          current={current}
          aura={aura}
          success={success}
          onNext={() => goTo(idx + 1)}
          onStay={() => setSuccess(false)}
        />
      </main>
      <div className="h-1/2 min-w-0 md:h-full md:w-1/2">
        <IdePanel
          code={code}
          dirty={code !== level.starterCode}
          onChange={setCode}
          onRun={run}
          onReset={reset}
          running={running}
          logs={logs}
          onClearLogs={() => setLogs([])}
          errorLine={errorLine}
          errorCount={errorLine ? 1 : 0}
          warnCount={warnCount}
        />
      </div>
      {mapOpen && (
        <StageMap currentId={level.id} unlocked={unlocked} completed={completed} onPick={goTo} onClose={() => setMapOpen(false)} />
      )}
    </div>
  );
}
