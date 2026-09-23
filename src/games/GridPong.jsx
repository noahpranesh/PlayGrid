import { useEffect, useRef, useState, useCallback } from 'react';
import { Pause, RotateCcw, Flag, Play, Zap } from 'lucide-react';
import { sfx, resumeAudio } from '@/lib/sound';
import { recordPlay, recordWin, addXp } from '@/lib/gameStore';

const W = 900, H = 560;
const PADDLE_W = 14, PADDLE_H = 110;
const BALL = 14;
const TARGET = 10;

const ARENAS = [
  { name: 'Nexus', bg: '#0A1124', line: '#1B2A4A', accent: '#3B82F6' },
  { name: 'Void', bg: '#0B0B1A', line: '#2A1B3D', accent: '#A855F7' },
  { name: 'Ember', bg: '#1A0F0A', line: '#3D2418', accent: '#F97316' },
  { name: 'Aurora', bg: '#0A1A14', line: '#1B3D2A', accent: '#22D3EE' },
];
const DIFFS = [
  { name: 'Rookie', speed: 4.0, error: 95, react: 0.05 },
  { name: 'Pro', speed: 5.6, error: 48, react: 0.11 },
  { name: 'Legend', speed: 7.2, error: 16, react: 0.2 },
];

export default function GridPong() {
  const canvasRef = useRef(null);
  const [screen, setScreen] = useState('menu'); // menu | playing | paused | over
  const [diff, setDiff] = useState(1);
  const [arena, setArena] = useState(0);
  const [score, setScore] = useState({ p: 0, a: 0 });
  const [stats, setStats] = useState({ rallies: 0, longest: 0, curRally: 0, maxSpeed: 0 });
  const [winner, setWinner] = useState(null);
  const [powerMsg, setPowerMsg] = useState('');

  const game = useRef({
    py: H / 2, ay: H / 2, pTarget: H / 2,
    bx: W / 2, by: H / 2, vx: 0, vy: 0, speed: 6,
    keys: {}, mouseY: null,
    aiTarget: H / 2, aiErr: 0,
    power: null, powerT: 0, pGrow: 0, aGrow: 0,
    rally: 0, rallies: 0, longest: 0, maxSpeed: 6,
    lastHitter: null,
    raf: 0, last: 0, running: false,
  });

  // session tracking
  useEffect(() => {
    const start = Date.now();
    return () => recordPlay('grid-pong', Date.now() - start);
  }, []);

  const resetBall = useCallback((toward) => {
    const g = game.current;
    g.bx = W / 2; g.by = H / 2;
    g.speed = 6;
    const ang = (Math.random() * 0.6 - 0.3); // -0.3..0.3 rad
    g.vx = toward * Math.cos(ang) * g.speed;
    g.vy = Math.sin(ang) * g.speed;
    g.rally = 0;
  }, []);

  const startMatch = useCallback(() => {
    resumeAudio();
    const g = game.current;
    g.py = H / 2; g.ay = H / 2; g.pTarget = H / 2; g.aiTarget = H / 2;
    g.pGrow = 0; g.aGrow = 0; g.power = null; g.powerT = 0;
    g.rallies = 0; g.longest = 0; g.maxSpeed = 6;
    setStats({ rallies: 0, longest: 0, curRally: 0, maxSpeed: 6 });
    setScore({ p: 0, a: 0 });
    setWinner(null);
    resetBall(Math.random() < 0.5 ? 1 : -1);
    setScreen('playing');
  }, [resetBall]);

  // input
  useEffect(() => {
    const g = game.current;
    const kd = (e) => {
      g.keys[e.key.toLowerCase()] = true;
      if ([' ', 'arrowup', 'arrowdown', 'w', 's'].includes(e.key.toLowerCase())) e.preventDefault();
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') setScreen((s) => (s === 'playing' ? 'paused' : s === 'paused' ? 'playing' : s));
    };
    const ku = (e) => { g.keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, []);

  // canvas mouse
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const move = (e) => {
      const r = cv.getBoundingClientRect();
      const y = ((e.clientY - r.top) / r.height) * H;
      game.current.mouseY = y;
      if (e.pointerType === 'touch') e.preventDefault();
    };
    const leave = () => { game.current.mouseY = null; };
    cv.addEventListener('mousemove', move);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('mouseleave', leave);
    cv.addEventListener('pointerleave', leave);
    return () => {
      cv.removeEventListener('mousemove', move);
      cv.removeEventListener('pointermove', move);
      cv.removeEventListener('mouseleave', leave);
      cv.removeEventListener('pointerleave', leave);
    };
  }, []);

  // win detection
  useEffect(() => {
    if (screen !== 'playing') return;
    if (score.p >= TARGET || score.a >= TARGET) {
      const won = score.p >= TARGET;
      setWinner(won ? 'player' : 'ai');
      setScreen('over');
      if (won) { sfx.win(); recordWin('grid-pong'); addXp(80); }
      else { sfx.lose(); addXp(20); }
    }
  }, [score, screen]);

  // game loop
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const step = (ts) => {
      const g = game.current;
      if (!g.last) g.last = ts;
      let dt = (ts - g.last) / 16.6667;
      g.last = ts;
      if (dt > 3) dt = 3;

      if (screen === 'playing') update(dt);
      draw();
      g.raf = requestAnimationFrame(step);
    };

    const update = (dt) => {
      const g = game.current;
      const d = DIFFS[diff];
      const a = ARENAS[arena];

      // player paddle
      if (g.mouseY != null) g.pTarget = g.mouseY;
      if (g.keys['w'] || g.keys['arrowup']) g.pTarget -= 9 * dt;
      if (g.keys['s'] || g.keys['arrowdown']) g.pTarget += 9 * dt;
      g.pTarget = Math.max(PADDLE_H / 2, Math.min(H - PADDLE_H / 2, g.pTarget));
      g.py += (g.pTarget - g.py) * 0.35;

      // AI paddle
      if (g.vx > 0) {
        // ball coming to AI: update target with reaction + error
        if (Math.random() < d.react) {
          g.aiErr = (Math.random() - 0.5) * d.error;
          g.aiTarget = g.by + g.aiErr;
        }
      } else {
        g.aiTarget = H / 2;
      }
      g.aiTarget = Math.max(PADDLE_H / 2, Math.min(H - PADDLE_H / 2, g.aiTarget));
      const aiDiff = g.aiTarget - g.ay;
      const move = Math.max(-d.speed * dt, Math.min(d.speed * dt, aiDiff));
      g.ay += move;

      // ball
      g.bx += g.vx * dt;
      g.by += g.vy * dt;

      // walls
      if (g.by < BALL / 2) { g.by = BALL / 2; g.vy *= -1; sfx.wall(); }
      if (g.by > H - BALL / 2) { g.by = H - BALL / 2; g.vy *= -1; sfx.wall(); }

      // paddles
      const pPh = PADDLE_H + g.pGrow;
      const aPh = PADDLE_H + g.aGrow;
      // player (left)
      if (g.vx < 0 && g.bx - BALL / 2 < 24 + PADDLE_W && g.bx > 20 &&
          g.by > g.py - pPh / 2 && g.by < g.py + pPh / 2) {
        g.bx = 24 + PADDLE_W + BALL / 2;
        g.speed = Math.min(g.speed + 0.45, 16);
        const rel = (g.by - g.py) / (pPh / 2);
        const ang = rel * 0.9;
        g.vx = Math.cos(ang) * g.speed;
        g.vy = Math.sin(ang) * g.speed;
        g.lastHitter = 'p';
        g.rally++; g.rallies++;
        if (g.rally > g.longest) g.longest = g.rally;
        if (g.speed > g.maxSpeed) g.maxSpeed = g.speed;
        sfx.paddle();
        addXp(2);
      }
      // ai (right)
      if (g.vx > 0 && g.bx + BALL / 2 > W - 24 - PADDLE_W && g.bx < W - 20 &&
          g.by > g.ay - aPh / 2 && g.by < g.ay + aPh / 2) {
        g.bx = W - 24 - PADDLE_W - BALL / 2;
        g.speed = Math.min(g.speed + 0.45, 16);
        const rel = (g.by - g.ay) / (aPh / 2);
        const ang = rel * 0.9;
        g.vx = -Math.cos(ang) * g.speed;
        g.vy = Math.sin(ang) * g.speed;
        g.lastHitter = 'a';
        g.rally++; g.rallies++;
        if (g.rally > g.longest) g.longest = g.rally;
        if (g.speed > g.maxSpeed) g.maxSpeed = g.speed;
        sfx.paddle();
      }

      // power-up
      if (g.powerT > 0) g.powerT -= dt * 16.6667;
      if (!g.power && g.powerT <= 0 && Math.random() < 0.004) {
        g.power = { x: W / 2 + (Math.random() - 0.5) * 120, y: 80 + Math.random() * (H - 160), r: 16, type: Math.random() < 0.5 ? 'grow' : 'surge' };
      }
      if (g.power) {
        const dx = g.bx - g.power.x, dy = g.by - g.power.y;
        if (Math.hypot(dx, dy) < g.power.r + BALL / 2) {
          if (g.power.type === 'grow') {
            if (g.lastHitter === 'p') g.pGrow = 60; else g.aGrow = 60;
            setPowerMsg(g.lastHitter === 'p' ? 'Big Paddle!' : 'AI Grew!');
          } else {
            g.speed = Math.min(g.speed + 3, 18);
            const ang = Math.atan2(g.vy, g.vx);
            g.vx = Math.cos(ang) * g.speed; g.vy = Math.sin(ang) * g.speed;
            setPowerMsg('Surge!');
          }
          sfx.powerup();
          g.power = null; g.powerT = 6000;
          setTimeout(() => setPowerMsg(''), 1400);
        }
      }
      // shrink grow over time
      if (g.pGrow > 0) g.pGrow = Math.max(0, g.pGrow - 0.4 * dt);
      if (g.aGrow > 0) g.aGrow = Math.max(0, g.aGrow - 0.4 * dt);

      // scoring
      if (g.bx < -20) {
        sfx.lose();
        resetBall(1);
        setScore((s) => ({ p: s.p, a: s.a + 1 }));
      } else if (g.bx > W + 20) {
        sfx.score();
        addXp(10);
        resetBall(-1);
        setScore((s) => ({ p: s.p + 1, a: s.a }));
      }

      setStats({ rallies: g.rallies, longest: g.longest, curRally: g.rally, maxSpeed: Math.round(g.maxSpeed) });
    };

    const draw = () => {
      const g = game.current;
      const a = ARENAS[arena];
      ctx.clearRect(0, 0, W, H);
      // bg
      ctx.fillStyle = a.bg;
      ctx.fillRect(0, 0, W, H);
      // grid
      ctx.strokeStyle = a.line;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.globalAlpha = 1;
      // center line
      ctx.setLineDash([10, 12]);
      ctx.strokeStyle = a.accent;
      ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      // center circle
      ctx.strokeStyle = a.accent;
      ctx.globalAlpha = 0.25;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 70, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;

      // score
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.font = 'bold 120px ui-sans-serif, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(score.p, W / 2 - 120, H / 2 + 40);
      ctx.fillText(score.a, W / 2 + 120, H / 2 + 40);

      // paddles
      const pPh = PADDLE_H + g.pGrow, aPh = PADDLE_H + g.aGrow;
      ctx.fillStyle = a.accent;
      ctx.shadowColor = a.accent; ctx.shadowBlur = 18;
      roundRect(ctx, 24, g.py - pPh / 2, PADDLE_W, pPh, 6); ctx.fill();
      ctx.fillStyle = '#fff';
      roundRect(ctx, W - 24 - PADDLE_W, g.ay - aPh / 2, PADDLE_W, aPh, 6); ctx.fill();
      ctx.shadowBlur = 0;

      // power
      if (g.power) {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = g.power.type === 'grow' ? '#22d3ee' : '#f59e0b';
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(g.power.x, g.power.y, g.power.r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000'; ctx.font = 'bold 14px ui-sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(g.power.type === 'grow' ? '+' : '»', g.power.x, g.power.y + 5);
        ctx.globalAlpha = 1;
      }

      // ball
      ctx.fillStyle = '#fff';
      ctx.shadowColor = a.accent; ctx.shadowBlur = 22;
      ctx.beginPath(); ctx.arc(g.bx, g.by, BALL / 2, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    };

    game.current.raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(game.current.raf);
  }, [screen, diff, arena, score, resetBall]);

  const Btn = ({ children, onClick, primary, className = '' }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 justify-center ${className}`}
      style={primary
        ? { background: 'var(--pg-accent)', color: '#fff', boxShadow: '0 8px 24px rgba(59,130,246,0.4)' }
        : { background: 'rgba(59,130,246,0.12)', color: 'var(--pg-accent2)', boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.3)' }}
    >
      {children}
    </button>
  );

  return (
    <div className="w-full max-w-5xl">
      <div className="relative rounded-2xl overflow-hidden pg-surface p-2 sm:p-3">
        <canvas
          ref={canvasRef}
          className="w-full rounded-xl block"
          style={{ aspectRatio: `${W}/${H}`, background: ARENAS[arena].bg, touchAction: 'none' }}
        />

        {powerMsg && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-sm font-bold"
            style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24', boxShadow: 'inset 0 0 0 1px rgba(245,158,11,0.5)' }}>
            {powerMsg}
          </div>
        )}

        {/* Top HUD while playing */}
        {screen === 'playing' && (
          <div className="absolute top-4 right-4 flex gap-2">
            <button onClick={() => setScreen('paused')} className="grid place-items-center w-9 h-9 rounded-lg backdrop-blur"
              style={{ background: 'rgba(0,5,15,0.6)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
              <Pause className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Menu */}
        {screen === 'menu' && (
          <Overlay>
            <h2 className="font-display text-3xl font-extrabold pg-text-glow">Grid Pong</h2>
            <p className="text-[var(--pg-muted)] text-sm max-w-md mx-auto">First to {TARGET}. Move with mouse or W/S. Grab power orbs for an edge.</p>
            <div className="grid sm:grid-cols-2 gap-4 w-full max-w-md mt-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--pg-muted)] mb-1.5">Difficulty</p>
                <div className="flex gap-2">
                  {DIFFS.map((d, i) => (
                    <button key={d.name} onClick={() => { sfx.click(); setDiff(i); }}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                      style={diff === i
                        ? { background: 'var(--pg-accent)', color: '#fff' }
                        : { background: 'rgba(59,130,246,0.1)', color: 'var(--pg-muted)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
                      {d.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--pg-muted)] mb-1.5">Arena</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {ARENAS.map((a, i) => (
                    <button key={a.name} onClick={() => { sfx.click(); setArena(i); }} title={a.name}
                      className="aspect-square rounded-lg transition-all"
                      style={arena === i
                        ? { background: a.accent, boxShadow: `0 0 14px ${a.accent}` }
                        : { background: a.bg, boxShadow: `inset 0 0 0 1px ${a.line}` }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-5">
              <Btn primary onClick={startMatch}><Play className="w-4 h-4 fill-white" /> Start Match</Btn>
            </div>
          </Overlay>
        )}

        {screen === 'paused' && (
          <Overlay>
            <h2 className="font-display text-2xl font-bold">Paused</h2>
            <p className="text-[var(--pg-muted)] text-sm">{score.p} – {score.a}</p>
            <div className="flex gap-2 mt-3">
              <Btn primary onClick={() => setScreen('playing')}><Play className="w-4 h-4 fill-white" /> Resume</Btn>
              <Btn onClick={startMatch}><RotateCcw className="w-4 h-4" /> Restart</Btn>
              <Btn onClick={() => setScreen('menu')}>Menu</Btn>
            </div>
          </Overlay>
        )}

        {screen === 'over' && (
          <Overlay>
            <h2 className="font-display text-3xl font-extrabold" style={{ color: winner === 'player' ? '#22d3ee' : '#f87171' }}>
              {winner === 'player' ? 'Victory!' : 'Defeat'}
            </h2>
            <p className="text-[var(--pg-muted)] text-sm">Final score {score.p} – {score.a}</p>
            <div className="grid grid-cols-3 gap-3 mt-3 text-center">
              <Stat label="Rallies" value={stats.rallies} />
              <Stat label="Longest" value={stats.longest} />
              <Stat label="Top Speed" value={stats.maxSpeed} />
            </div>
            <div className="flex gap-2 mt-4">
              <Btn primary onClick={startMatch}><RotateCcw className="w-4 h-4" /> Rematch</Btn>
              <Btn onClick={() => setScreen('menu')}>Menu</Btn>
            </div>
          </Overlay>
        )}
      </div>

      {screen === 'playing' && (
        <div className="mt-3 flex items-center justify-between text-xs text-[var(--pg-muted)]">
          <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-400" /> Ball speed {stats.maxSpeed}</span>
          <span>Rally {stats.curRally} · Longest {stats.longest}</span>
          <button onClick={() => setScreen('paused')} className="hover:text-white">Pause (Esc)</button>
        </div>
      )}
    </div>
  );
}

function Overlay({ children }) {
  return (
    <div className="absolute inset-2 sm:inset-3 rounded-xl flex flex-col items-center justify-center text-center gap-2 px-4"
      style={{ background: 'rgba(0,5,15,0.82)', backdropFilter: 'blur(6px)' }}>
      {children}
    </div>
  );
}
function Stat({ label, value }) {
  return (
    <div className="px-3 py-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.1)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--pg-muted)]">{label}</div>
    </div>
  );
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}