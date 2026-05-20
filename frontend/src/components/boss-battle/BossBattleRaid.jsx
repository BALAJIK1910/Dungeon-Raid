import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Embers } from './Embers';
import { raidAudio } from '../../lib/raid-audio';

const tokenColor = {
  'phantom-gold': 'var(--phantom-gold)',
  'phantom-blue': 'var(--phantom-blue)',
  'phantom-red': 'var(--phantom-red)',
  'phantom-purple': 'var(--phantom-purple)',
  'phantom-green': 'var(--phantom-green)',
};

const fmt = (n) => Math.max(0, Math.floor(n)).toLocaleString('en-US');

const RANK_POS = [
  { x: 0, y: 30, scale: 1.25, z: 5 },
  { x: 200, y: -10, scale: 1.05, z: 4 },
  { x: -200, y: -10, scale: 1.05, z: 4 },
  { x: 360, y: -50, scale: 0.85, z: 3 },
  { x: -360, y: -50, scale: 0.85, z: 3 },
];

function BossRaidPage({
  players = [],
  damages = {},
  bossHealth = 1000000,
  bossMaxHealth = 1000000,
  combatLog = [],
  phase = 'Phase I — Awakening',
  isGameOver = false,
  mvpPlayer = null,
  gameOutcome = null,
  lowHp = false,
  gameStatus = 'PENDING',
  gameStartedAt = null,
  gamePausedAt = null,
  gameResumedAt = null,
}) {
  const [floats, setFloats] = useState([]);
  const [hitKey, setHitKey] = useState(0);
  const [bossFlow, setBossFlow] = useState({ key: 0, crit: false });
  const [attackFx, setAttackFx] = useState({});
  const [bursts, setBursts] = useState([]);
  const [slashes, setSlashes] = useState([]);
  const [shake, setShake] = useState('');
  const [critFlashKey, setCritFlashKey] = useState(0);
  const [sound, setSound] = useState(false);
  const [now, setNow] = useState(Date.now());
  const floatId = useRef(0);
  const fxId = useRef(0);
  const prevDamagesRef = useRef(damages);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (sound && lowHp) raidAudio.startHeartbeat();
    else raidAudio.stopHeartbeat();
  }, [sound, lowHp]);

  const playedVictory = useRef(false);
  useEffect(() => {
    if (isGameOver && !playedVictory.current) {
      playedVictory.current = true;
      raidAudio.stopHeartbeat();
      raidAudio.victory();
    }
  }, [isGameOver]);

  useEffect(() => {
    Object.entries(damages).forEach(([playerId, damage]) => {
      const prevDamage = prevDamagesRef.current[playerId] || 0;
      if (damage > prevDamage) {
        const amount = damage - prevDamage;
        const attacker = players.find(p => p.id === playerId);
        if (attacker) {
          triggerDamageAnimation(attacker, amount, false);
        }
      }
    });
    prevDamagesRef.current = damages;
  }, [damages, players]);

  const triggerDamageAnimation = (attacker, amount, isCrit = false) => {
    const color = tokenColor[attacker.token] || '#fff';

    raidAudio.swing();
    setAttackFx((m) => ({
      ...m,
      [attacker.id]: { key: (m[attacker.id]?.key ?? 0) + 1, crit: isCrit }
    }));

    const attackerNode = document.getElementById(`avatar-${attacker.id}`);
    if (attackerNode) {
      const r = attackerNode.getBoundingClientRect();
      const sx = r.left + r.width / 2;
      const sy = r.top + r.height * 0.3;
      const ex = window.innerWidth / 2;
      const ey = window.innerHeight / 2;
      const sid = ++fxId.current;
      setSlashes((s) => [...s, { id: sid, sx, sy, ex, ey, color }]);
      setTimeout(() => setSlashes((s) => s.filter((x) => x.id !== sid)), 350);
    }

    setTimeout(() => {
      const fid = ++floatId.current;
      const fx = (Math.random() - 0.5) * 220;
      const fy = (Math.random() - 0.5) * 160;
      setFloats((f) => [...f, { id: fid, amount, crit: isCrit, x: fx, y: fy }]);
      setTimeout(() => setFloats((f) => f.filter((x) => x.id !== fid)), 1100);

      setHitKey((k) => k + 1);
      setBossFlow((s) => ({ key: s.key + 1, crit: isCrit }));

      const bid = ++fxId.current;
      setBursts((b) => [...b, { id: bid, crit: isCrit, color }]);
      setTimeout(() => setBursts((b) => b.filter((x) => x.id !== bid)), 700);
      setShake(isCrit ? 'shake-lg' : 'shake-sm');
      setTimeout(() => setShake(''), isCrit ? 420 : 220);

      if (isCrit) {
        raidAudio.crit();
        setCritFlashKey((k) => k + 1);
      } else {
        raidAudio.impact();
      }
    }, 170);
  };

  const ranked = useMemo(
    () => [...players].sort((a, b) => (damages[b.id] || 0) - (damages[a.id] || 0)),
    [players, damages],
  );

  const totalDamage = useMemo(
    () => Object.values(damages).reduce((s, v) => s + v, 0),
    [damages],
  );

  // Calculate elapsed time:
  // - Only count time if game is ACTIVE
  // - Pause: stop counting, freeze at paused time
  // - Resume: continue from paused time
  // - Stop counting when game is CONCLUDED (isGameOver)
  let elapsedSec = 1;
  
  if (gameStatus === 'ACTIVE' && gameStartedAt) {
    // Game is running - count time from gameStartedAt to now
    const startTime = typeof gameStartedAt === 'string' 
      ? new Date(gameStartedAt).getTime() 
      : gameStartedAt;
    
    // If game has been resumed, we need to account for the pause duration
    if (gameResumedAt) {
      // Game was paused and then resumed
      // Elapsed = (pausedTime - startTime) + (now - resumedTime)
      const pausedTime = typeof gamePausedAt === 'string'
        ? new Date(gamePausedAt).getTime()
        : gamePausedAt;
      const resumedTime = typeof gameResumedAt === 'string'
        ? new Date(gameResumedAt).getTime()
        : gameResumedAt;
      
      const timeBefoPause = pausedTime - startTime;
      const timeAfterResume = now - resumedTime;
      elapsedSec = Math.max(1, Math.floor((timeBefoPause + timeAfterResume) / 1000));
    } else {
      // Game hasn't been paused yet
      elapsedSec = Math.max(1, Math.floor((now - startTime) / 1000));
    }
  } else if (gameStatus === 'PAUSED' && gameStartedAt && gamePausedAt) {
    // Game is paused - show elapsed time at pause moment (don't continue counting)
    const startTime = typeof gameStartedAt === 'string'
      ? new Date(gameStartedAt).getTime()
      : gameStartedAt;
    const pausedTime = typeof gamePausedAt === 'string'
      ? new Date(gamePausedAt).getTime()
      : gamePausedAt;
    
    if (gameResumedAt) {
      // Was paused, then resumed, now paused again - this shouldn't happen but handle it
      const resumedTime = typeof gameResumedAt === 'string'
        ? new Date(gameResumedAt).getTime()
        : gameResumedAt;
      const timeBefoPause = resumedTime - startTime;
      const timeAfterResume = pausedTime - resumedTime;
      elapsedSec = Math.max(1, Math.floor((timeBefoPause + timeAfterResume) / 1000));
    } else {
      // First pause
      elapsedSec = Math.max(1, Math.floor((pausedTime - startTime) / 1000));
    }
  } else if (isGameOver && gameStartedAt) {
    // Game is over - show the final elapsed time (don't continue counting)
    const startTime = typeof gameStartedAt === 'string'
      ? new Date(gameStartedAt).getTime()
      : gameStartedAt;
    
    if (gameResumedAt && gamePausedAt) {
      // Game had pause/resume cycle(s) before concluding
      const pausedTime = typeof gamePausedAt === 'string'
        ? new Date(gamePausedAt).getTime()
        : gamePausedAt;
      const resumedTime = typeof gameResumedAt === 'string'
        ? new Date(gameResumedAt).getTime()
        : gameResumedAt;
      const timeBefoPause = pausedTime - startTime;
      const timeAfterResume = now - resumedTime;
      elapsedSec = Math.max(1, Math.floor((timeBefoPause + timeAfterResume) / 1000));
    } else {
      // No pause/resume, just from start to now
      elapsedSec = Math.max(1, Math.floor((now - startTime) / 1000));
    }
  }
  
  const partyDps = Math.floor(totalDamage / elapsedSec);
  const hpRatio = bossHealth / bossMaxHealth;

  const toggleSound = () => {
    const next = !sound;
    raidAudio.setEnabled(next);
    setSound(next);
  };

  return (
    <main className={`relative h-screen w-screen overflow-hidden text-foreground ${shake}`}>
      {/* Background */}
      <div
        aria-hidden
        className="absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 35%, oklch(0.35 0.18 30 / 0.55) 0%, oklch(0.08 0.02 25 / 0.95) 60%, #000 100%), linear-gradient(180deg, #0a0608 0%, #050203 100%)',
        }}
      />
      <Embers />
      {/* Vignette */}
      <div
        aria-hidden
        className="absolute inset-0 z-[6] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 100% 70% at 50% 50%, transparent 55%, #000 100%)' }}
      />

      {lowHp && (
        <div
          aria-hidden
          className="edge-pulse pointer-events-none absolute inset-0 z-[7]"
          style={{
            boxShadow: 'inset 0 0 180px 40px oklch(0.55 0.27 25 / 0.7)',
          }}
        />
      )}

      {/* Crit white flash */}
      <div
        key={`cf-${critFlashKey}`}
        aria-hidden
        className="crit-flash pointer-events-none absolute inset-0 z-[8] bg-white opacity-0"
      />

      <BossHeader
        hpRatio={hpRatio}
        hp={bossHealth}
        max={bossMaxHealth}
        phase={phase}
        lowHp={lowHp}
        elapsedSec={elapsedSec}
        partyDps={partyDps}
      />

      <Scoreboard ranked={ranked} damages={damages} total={totalDamage} />

      <CombatLog log={combatLog} />

      {/* Sound toggle */}
      <button
        onClick={toggleSound}
        className="absolute right-6 top-6 z-[90] flex items-center gap-2 rounded-sm border border-border bg-black/60 px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground backdrop-blur-md transition hover:border-ember/60 hover:text-ember"
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: sound ? 'var(--ember)' : 'var(--muted-foreground)', boxShadow: sound ? '0 0 8px var(--ember)' : 'none' }}
        />
        {sound ? 'Sound On' : 'Sound Off'}
      </button>

      {/* Slash trails */}
      <div className="pointer-events-none absolute inset-0 z-[55]">
        {slashes.map((s) => {
          const dx = s.ex - s.sx;
          const dy = s.ey - s.sy;
          const len = Math.hypot(dx, dy);
          const rot = (Math.atan2(dy, dx) * 180) / Math.PI;
          return (
            <div
              key={s.id}
              className="slash-trail absolute left-0 top-0 h-[3px] origin-left rounded-full"
              style={{
                width: `${len}px`,
                background: `linear-gradient(90deg, transparent 0%, ${s.color} 50%, #fff 95%, transparent 100%)`,
                boxShadow: `0 0 14px ${s.color}, 0 0 24px ${s.color}`,
                transform: `translate(${s.sx}px, ${s.sy}px) rotate(${rot}deg)`,
              }}
            />
          );
        })}
      </div>

      {/* Hit bursts */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[58]">
        {bursts.map((b) => (
          <HitBurst key={b.id} crit={b.crit} color={b.color} />
        ))}
      </div>

      {/* Scene */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <BossSprite hitKey={hitKey} dead={isGameOver} lowHp={lowHp} flow={bossFlow} />
        <PlayersArena ranked={ranked} attackFx={attackFx} />
      </div>

      {/* Floating damage numbers */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[60]">
        {floats.map((d) => (
          <div
            key={d.id}
            className="absolute float-up font-display font-black"
            style={{
              left: d.x,
              top: d.y,
              fontSize: d.crit ? '4rem' : '2.4rem',
              color: d.crit ? 'var(--crit)' : '#fff',
              textShadow: d.crit
                ? '0 0 22px oklch(0.92 0.2 90 / 0.9), 0 0 6px #ff8a00, 2px 2px 0 #000'
                : '0 0 14px #ff3a00, 2px 2px 0 #000',
              letterSpacing: d.crit ? '0.05em' : '0',
            }}
          >
            {d.crit ? 'CRIT ' : ''}-{fmt(d.amount)}
          </div>
        ))}
      </div>

      {isGameOver && <VictoryOverlay mvp={mvpPlayer || ranked[0]} totalDamage={totalDamage} seconds={elapsedSec} outcome={gameOutcome} />}
    </main>
  );
}

function HitBurst({ crit, color }) {
  const sparkCount = crit ? 14 : 8;
  const ringColor = crit ? 'var(--crit)' : color;
  return (
    <>
      <div
        aria-hidden
        className="shockwave absolute left-0 top-0 rounded-full"
        style={{
          width: crit ? 220 : 140,
          height: crit ? 220 : 140,
          borderStyle: 'solid',
          borderColor: ringColor,
          boxShadow: `0 0 30px ${ringColor}, inset 0 0 20px ${ringColor}`,
        }}
      />
      {crit && (
        <div
          aria-hidden
          className="shockwave absolute left-0 top-0 rounded-full"
          style={{
            width: 320,
            height: 320,
            borderStyle: 'solid',
            borderColor: '#fff',
            animationDelay: '0.05s',
            opacity: 0.7,
          }}
        />
      )}
      {Array.from({ length: sparkCount }).map((_, i) => {
        const angle = (360 / sparkCount) * i + (Math.random() - 0.5) * 20;
        const dist = (crit ? 160 : 100) + Math.random() * 60;
        return (
          <span
            key={i}
            aria-hidden
            className="spark absolute left-0 top-0 block h-[3px] rounded-full"
            style={{
              width: crit ? 22 : 14,
              background: `linear-gradient(90deg, #fff, ${ringColor}, transparent)`,
              boxShadow: `0 0 8px ${ringColor}`,
              transform: `rotate(${angle}deg) translateY(${dist}px)`,
            }}
          />
        );
      })}
    </>
  );
}

function BossHeader({ hpRatio, hp, max, phase, lowHp, elapsedSec, partyDps }) {
  const pct = Math.max(0, hpRatio * 100);
  const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
  const secs = String(elapsedSec % 60).padStart(2, '0');

  return (
    <header className="absolute inset-x-0 top-0 z-[80] flex flex-col items-center px-8 pt-6">
      <div className="flex items-center gap-3 text-[0.7rem] font-mono uppercase tracking-[0.4em] text-muted-foreground">
        <span className="h-px w-12 bg-gradient-to-r from-transparent to-ember/60" />
        <span className="text-ember">World Boss · Tier VII</span>
        <span className="h-px w-12 bg-gradient-to-l from-transparent to-ember/60" />
      </div>
      <h1 className="font-display text-glow-ember mt-1 text-3xl font-black uppercase tracking-[0.35em] md:text-5xl">
        Ancient Dragon of the Abyss
      </h1>

      <div className="mt-4 flex w-full max-w-3xl items-center gap-4">
        <Stat label="Phase" value={phase.replace(/^Phase\s+\w+\s+—\s+/, '')} accent />
        <div className={`relative h-6 flex-1 overflow-hidden rounded-sm border border-border bg-black/70 ${lowHp ? 'low-hp' : ''}`}>
          <div
            className="hp-shimmer relative h-full overflow-hidden"
            style={{
              width: `${pct}%`,
              background: lowHp
                ? 'linear-gradient(90deg, oklch(0.45 0.22 25), oklch(0.7 0.25 25))'
                : 'linear-gradient(90deg, oklch(0.35 0.16 28), oklch(0.62 0.22 32))',
              transition: 'width 0.35s ease-out',
              boxShadow: '0 0 18px oklch(0.6 0.22 30 / 0.55)',
            }}
          />
          <div className="pointer-events-none absolute inset-0 flex">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-full flex-1 border-r border-black/50 last:border-r-0" />
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center font-mono text-[0.72rem] font-bold tracking-wider text-white drop-shadow-[0_1px_2px_#000]">
            {fmt(hp)} / {fmt(max)}
          </div>
        </div>
        <Stat label="Timer" value={`${mins}:${secs}`} mono />
        <Stat label="Party DPS" value={fmt(partyDps)} mono />
      </div>
    </header>
  );
}

function Stat({ label, value, accent, mono }) {
  return (
    <div className="flex min-w-[88px] flex-col items-center">
      <span className="text-[0.6rem] font-mono uppercase tracking-[0.3em] text-muted-foreground">{label}</span>
      <span
        className={`text-sm font-bold ${mono ? 'font-mono' : 'font-display'} ${accent ? 'text-ember text-glow-ember' : 'text-foreground'}`}
      >
        {value}
      </span>
    </div>
  );
}

function Scoreboard({ ranked, damages, total }) {
  return (
    <aside className="panel panel-corner absolute left-6 top-32 z-[80] w-[320px] rounded-sm p-5">
      <div className="mb-3 flex items-end justify-between border-b border-border/60 pb-2">
        <h2 className="font-display text-base font-bold uppercase tracking-[0.3em] text-gold text-glow-gold">
          Damage Ranks
        </h2>
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">Live</span>
      </div>
      <ol className="space-y-2">
        {ranked.slice(0, 5).map((p, i) => {
          const dmg = damages[p.id];
          const share = total ? dmg / total : 0;
          return (
            <li
              key={p.id}
              className="relative overflow-hidden rounded-sm bg-black/40 px-3 py-2 transition-all duration-500"
              style={{ borderLeft: `2px solid ${tokenColor[p.token]}` }}
            >
              <div
                aria-hidden
                className="absolute inset-y-0 left-0 -z-0 transition-[width] duration-700 ease-out"
                style={{
                  width: `${share * 100}%`,
                  background: `linear-gradient(90deg, ${tokenColor[p.token]} 0%, transparent 100%)`,
                  opacity: 0.18,
                }}
              />
              <div className="relative flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <RankBadge index={i} />
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold" style={{ color: tokenColor[p.token] }}>
                      {p.name}
                    </span>
                    <span className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                      {p.class}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end leading-tight">
                  <span className="font-mono text-sm font-bold text-foreground">{fmt(dmg)}</span>
                  <span className="font-mono text-[0.62rem] text-muted-foreground">
                    {(share * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

function RankBadge({ index }) {
  const styles = [
    { c: 'var(--gold)', t: 'MVP' },
    { c: 'var(--silver)', t: '#2' },
    { c: 'var(--bronze)', t: '#3' },
  ];
  if (index < 3) {
    const s = styles[index];
    return (
      <span
        className="grid h-7 w-7 place-items-center rounded-sm font-display text-[0.7rem] font-black"
        style={{
          color: s.c,
          border: `1px solid ${s.c}`,
          textShadow: `0 0 10px ${s.c}`,
          background: 'rgba(0,0,0,0.45)',
        }}
      >
        {s.t}
      </span>
    );
  }
  return (
    <span className="grid h-7 w-7 place-items-center rounded-sm border border-border bg-black/40 font-mono text-[0.7rem] text-muted-foreground">
      #{index + 1}
    </span>
  );
}

function CombatLog({ log }) {
  return (
    <aside className="panel panel-corner absolute right-6 top-32 z-[80] w-[300px] rounded-sm p-5">
      <div className="mb-3 flex items-end justify-between border-b border-border/60 pb-2">
        <h2 className="font-display text-base font-bold uppercase tracking-[0.3em] text-ember text-glow-ember">
          Battle Feed
        </h2>
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
          ×{log.length}
        </span>
      </div>
      <ul className="space-y-1.5">
        {log.length === 0 && (
          <li className="font-mono text-xs text-muted-foreground">Awaiting first strike…</li>
        )}
        {log.map((e) => (
          <li
            key={e.id}
            className="log-row flex items-center justify-between gap-2 rounded-sm bg-black/35 px-2 py-1.5 font-mono text-xs"
          >
            <span className="truncate font-semibold" style={{ color: tokenColor[e.attacker.token] || '#fff' }}>
              {e.attacker.name}
            </span>
            <span className="flex items-center gap-1.5">
              {e.crit && (
                <span className="rounded-sm border border-crit/60 px-1 text-[0.6rem] font-bold uppercase tracking-wider text-crit">
                  Crit
                </span>
              )}
              <span className={e.crit ? 'text-crit font-bold' : 'text-foreground'}>
                -{fmt(e.amount)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function BossSprite({ hitKey, dead, lowHp, flow }) {
  return (
    <div className="relative flex h-[720px] w-[720px] items-center justify-center">
      <div
        key={`flow-${flow.key}`}
        className={`relative flex h-full w-full items-center justify-center ${flow.key === 0 ? '' : flow.crit ? 'boss-flow-crit' : 'boss-flow-hit'}`}
      >
        <div
          aria-hidden
          className="ring-spin absolute inset-x-0 bottom-10 mx-auto h-[420px] w-[420px] rounded-full opacity-60"
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0deg, oklch(0.7 0.22 35 / 0.6) 60deg, transparent 120deg, oklch(0.75 0.18 60 / 0.5) 200deg, transparent 260deg, oklch(0.65 0.22 30 / 0.55) 320deg, transparent 360deg)',
            maskImage: 'radial-gradient(circle, transparent 58%, #000 60%, #000 64%, transparent 66%)',
            WebkitMaskImage: 'radial-gradient(circle, transparent 58%, #000 60%, #000 64%, transparent 66%)',
            filter: `blur(0.5px) ${lowHp ? 'saturate(1.4)' : ''}`,
          }}
        />
        <div
          aria-hidden
          className="absolute bottom-6 h-32 w-[520px] rounded-[50%]"
          style={{
            background: 'radial-gradient(ellipse at center, oklch(0.6 0.22 30 / 0.55), transparent 70%)',
            filter: 'blur(6px)',
          }}
        />
        <img
          key={hitKey}
          src="/assets/boss.png"
          alt="Ancient Dragon of the Abyss"
          className={`boss-idle relative z-20 max-h-full max-w-full select-none object-contain ${dead ? 'opacity-30 grayscale' : ''}`}
          draggable={false}
        />
        <img
          key={`flash-${hitKey}`}
          src="/assets/boss.png"
          aria-hidden
          className="boss-hit pointer-events-none absolute inset-0 z-30 m-auto max-h-full max-w-full object-contain opacity-0"
          style={{ animationFillMode: 'forwards' }}
          draggable={false}
        />
      </div>
    </div>
  );
}

function PlayersArena({ ranked, attackFx }) {
  return (
    <div className="absolute bottom-[8%] left-1/2 z-[30] h-[280px] w-[900px] -translate-x-1/2">
      {ranked.map((p, rankIndex) => {
        const pos = RANK_POS[rankIndex];
        const color = tokenColor[p.token];
        const fx = attackFx[p.id];
        return (
          <div
            key={p.id}
            className="absolute left-1/2 top-1/2 flex h-[200px] w-[150px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-end transition-all duration-700"
            style={{
              transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${pos.scale})`,
              zIndex: pos.z,
            }}
          >
            <div
              aria-hidden
              className="absolute bottom-[-6px] left-1/2 h-5 w-[120%] -translate-x-1/2 rounded-[50%]"
              style={{
                background: `radial-gradient(ellipse at center, ${color}55, transparent 70%)`,
                filter: 'blur(2px)',
              }}
            />
            {rankIndex === 0 && (
              <div
                aria-hidden
                className="absolute -top-7 left-1/2 -translate-x-1/2 font-display text-base font-black tracking-[0.3em] text-gold text-glow-gold"
              >
                ✦ MVP ✦
              </div>
            )}
            <div
              className="absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm border bg-black/80 px-2 py-0.5 text-[0.7rem] font-bold backdrop-blur-sm"
              style={{ borderColor: color, color }}
            >
              {p.name}
            </div>
            {fx && (
              <span
                key={`aura-${fx.key}`}
                aria-hidden
                className="charge-aura pointer-events-none absolute bottom-[-10px] left-1/2 z-[1] h-10 w-[130%] -translate-x-1/2 rounded-[50%]"
                style={{
                  background: `radial-gradient(ellipse at center, ${color}, ${color}66 40%, transparent 70%)`,
                  filter: 'blur(3px)',
                }}
              />
            )}
            <div
              key={`atk-${fx?.key ?? 0}`}
              id={`avatar-${p.id}`}
              className={`relative z-[2] h-full w-full ${fx ? (fx.crit ? 'player-attack-crit' : 'player-attack') : ''
                }`}
            >
              <img
                src={p.image}
                alt={p.name}
                draggable={false}
                className="player-idle h-full w-full object-contain mix-blend-screen"
                style={{
                  filter: `drop-shadow(0 0 14px ${color}) drop-shadow(0 0 28px ${color}88)`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VictoryOverlay({ mvp, totalDamage, seconds, outcome }) {
  return (
    <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="panel panel-corner relative rounded-sm px-16 py-10 text-center">
        <div className="mx-auto mb-4 h-px w-48 bg-gradient-to-r from-transparent via-gold to-transparent" />
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.6em] text-muted-foreground">{outcome === 'WON' ? 'Raid Complete' : 'Raid Failed'}</p>
        <h2 className="font-display mt-2 text-5xl font-black uppercase tracking-[0.3em] text-gold text-glow-gold">
          {outcome === 'WON' ? 'Great Enemy Felled' : 'All Questions Exhausted'}
        </h2>
        <div className="mx-auto mt-4 h-px w-48 bg-gradient-to-r from-transparent via-gold to-transparent" />
        <div className="mt-8 grid grid-cols-3 gap-8">
          <Trophy label="MVP" value={mvp?.name || 'N/A'} accent={mvp ? tokenColor[mvp.token] : undefined} />
          <Trophy label="Total Damage" value={fmt(totalDamage)} />
          <Trophy label="Clear Time" value={`${Math.floor(seconds / 60)}m ${seconds % 60}s`} />
        </div>
      </div>
    </div>
  );
}

function Trophy({ label, value, accent }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-mono text-[0.62rem] uppercase tracking-[0.4em] text-muted-foreground">{label}</span>
      <span
        className="font-display text-xl font-bold"
        style={{ color: accent ?? 'var(--foreground)', textShadow: accent ? `0 0 16px ${accent}` : undefined }}
      >
        {value}
      </span>
    </div>
  );
}

export default BossRaidPage;
