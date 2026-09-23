import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Zap, Ruler, Coins as CoinsIcon, Youtube } from 'lucide-react';
import { sfx, resumeAudio, startHyperMusic, stopHyperMusic } from '@/lib/sound';
import { recordPlay, setHighScore, addXp } from '@/lib/gameStore';
import { loadSprite } from '@/lib/sprite';

const VW = 900, VH = 520;
const PX = 180; // player screen x
const GROUND = 440;
const GRAV = 0.75;
const JUMP = 13.5;
const AVATAR_URL = 'https://media.base44.com/images/public/6a9cc11b444670045f826e08/48b04a5ec_generated_image.png';
const YT_URL = 'https://www.youtube.com/@PlayGridGames';

export default function GridRush() {
  const canvasRef = useRef(null);
  const [screen, setScreen] = useState('menu'); // menu | playing | over
  const [hud, setHud] = useState({ dist: 0, coins: 0, speed: 0 });
  const G = useRef(null);
  const spriteRef = useRef(null);

  useEffect(() => { loadSprite(AVATAR_URL).then((s) => { spriteRef.current = s; }); }, []);

  useEffect(() => {
    const start = Date.now();
    return () => { recordPlay('grid-rush', Date.now() - start); stopHyperMusic(); };
  }, []);

  // hyper music while running
  useEffect(() => {
    if (screen === 'playing') startHyperMusic();
    else stopHyperMusic();
    return () => stopHyperMusic();
  }, [screen]);

  const startRun = useCallback(() => {
    resumeAudio();
    G.current = {
      dist: 0, speed: 6.5, py: GROUND - 18, vy: 0, onGround: true,
      obstacles: [], coins: [], particles: [], nextX: 900,
      coinsGot: 0, nextMile: 100, jumpBuf: 0, coyote: 0, last: 0, t: 0,
    };
    setHud({ dist: 0, coins: 0, speed: 65 });
    setScreen('playing');
  }, []);

  // input
  useEffect(() => {
    const kd = (e) => {
      const k = e.key.toLowerCase();
      if (k === ' ' || k === 'w' || k === 'arrowup' || e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        if (G.current) G.current.jumpBuf = 8;
        e.preventDefault();
      }
      if (k === 'escape') setScreen('menu');
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  }, []);

  // loop
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = VW * dpr; cv.height = VH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const die = (g) => {
      sfx.lose();
      stopHyperMusic();
      const score = Math.floor(g.dist / 10);
      setHighScore('grid-rush', score);
      addXp(Math.floor(score / 5));
      setScreen('over');
    };

    const genChunk = (g, x) => {
      const roll = Math.random();
      if (roll < 0.26) {
        // glowing spike strip
        const w = 30 + Math.random() * 50;
        g.obstacles.push({ type: 'spikes', x, w });
        return w + 140 + g.speed * 16;
      }
      if (roll < 0.5) {
        // neon block
        const h = 36 + Math.random() * 34;
        g.obstacles.push({ type: 'block', x, w: 46, h, y: GROUND - h });
        return 46 + 150 + g.speed * 16;
      }
      if (roll < 0.72) {
        // pit (+ floating platform with coins sometimes)
        const w = 90 + Math.random() * 40;
        g.obstacles.push({ type: 'pit', x, w });
        if (Math.random() < 0.5) {
          const p = { type: 'plat', x: x + w / 2 - 45, y: GROUND - 110, w: 90 };
          g.obstacles.push(p);
          for (let c = 0; c < 2; c++) g.coins.push({ x: p.x + 20 + c * 45, y: p.y - 40, taken: false });
        }
        return w + 150 + g.speed * 16;
      }
      // spinning saw
      const r = 26 + Math.random() * 10;
      g.obstacles.push({ type: 'saw', x, y: GROUND - r - 8, r, ang: 0 });
      return 170 + g.speed * 16;
    };

    let raf = 0;
    const step = (ts) => {
      const g = G.current;
      if (!g) { raf = requestAnimationFrame(step); return; }
      if (!g.last) g.last = ts;
      let dt = (ts - g.last) / 16.6667;
      g.last = ts;
      if (dt > 2.5) dt = 2.5;
      g.t += dt;

      if (screen === 'playing') update(dt);
      draw();
      raf = requestAnimationFrame(step);
    };

    const update = (dt) => {
      const g = G.current;
      g.speed = Math.min(14, g.speed + 0.0018 * dt);
      g.dist += g.speed * dt;

      // generate ahead, despawn behind
      while (g.nextX < g.dist + VW + 500) {
        g.nextX += genChunk(g, g.nextX);
      }
      g.obstacles = g.obstacles.filter((o) => o.x + (o.w || 0) + 60 > g.dist);
      g.coins = g.coins.filter((c) => !c.taken && c.x + 60 > g.dist);

      // physics
      const px = g.dist + PX; // player world x
      g.vy += GRAV * dt;
      if (g.vy > 14) g.vy = 14;
      const prevPy = g.py;
      g.py += g.vy * dt;

      // floor (unless over a pit)
      const overPit = g.obstacles.some((o) => o.type === 'pit' && px + 12 > o.x && px - 12 < o.x + o.w);
      let landed = false;
      if (!overPit && g.py >= GROUND - 18 && g.vy >= 0) {
        g.py = GROUND - 18; g.vy = 0; landed = true;
      }
      // platforms & block tops
      for (const o of g.obstacles) {
        const topY = o.type === 'plat' ? o.y : o.type === 'block' ? o.y : null;
        if (topY == null) continue;
        if (px + 12 > o.x && px - 12 < o.x + o.w && g.vy >= 0 && prevPy + 18 <= topY + 12 && g.py + 18 >= topY) {
          g.py = topY - 18; g.vy = 0; landed = true;
        }
      }
      g.onGround = landed;
      g.coyote = landed ? 7 : Math.max(0, g.coyote - dt);
      if (g.jumpBuf > 0) {
        g.jumpBuf -= dt;
        if (g.coyote > 0) { g.vy = -JUMP; g.coyote = 0; g.jumpBuf = 0; g.onGround = false; sfx.jump(); }
      }

      // hazards
      for (const o of g.obstacles) {
        if (o.type === 'spikes') {
          if (px + 12 > o.x && px - 12 < o.x + o.w && g.py + 18 > GROUND - 26) { die(g); return; }
        } else if (o.type === 'block') {
          if (px + 12 > o.x && px - 12 < o.x + o.w && g.py + 18 > o.y && g.py + 18 < GROUND) {
            if (g.py + 18 > o.y + 12) { die(g); return; }
          }
        } else if (o.type === 'saw') {
          o.ang += 0.15 * dt;
          if (Math.hypot(o.x - px, o.y - g.py) < o.r + 13) { die(g); return; }
        }
      }
      if (g.py > VH + 80) { die(g); return; }

      // coins
      for (const c of g.coins) {
        if (!c.taken && Math.hypot(c.x - px, c.y - g.py) < 26) {
          c.taken = true; g.coinsGot++;
          sfx.coin(); addXp(2);
          for (let i = 0; i < 6; i++) g.particles.push({ x: c.x, y: c.y, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3, life: 20, color: '#fbbf24' });
        }
      }
      // milestones
      if (g.dist / 10 >= g.nextMile) {
        g.nextMile += 100;
        addXp(10); sfx.score();
        for (let i = 0; i < 14; i++) g.particles.push({ x: px, y: g.py - 10, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 5, life: 26, color: '#60A5FA' });
      }
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        if (p.life <= 0) g.particles.splice(i, 1);
      }

      setHud({ dist: Math.floor(g.dist / 10), coins: g.coinsGot, speed: Math.round(g.speed * 10) });
    };

    const draw = () => {
      const g = G.current;
      ctx.clearRect(0, 0, VW, VH);
      const grad = ctx.createLinearGradient(0, 0, 0, VH);
      grad.addColorStop(0, '#090420'); grad.addColorStop(1, '#0d0524');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, VW, VH);
      // scrolling grid
      ctx.strokeStyle = 'rgba(124,58,237,0.22)'; ctx.lineWidth = 1;
      const gs = 48, off = (g.dist % gs);
      for (let x = -off; x < VW; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VH); ctx.stroke(); }
      for (let y = 0; y < VH; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VW, y); ctx.stroke(); }
      // speed streaks
      if (g.speed > 8) {
        ctx.strokeStyle = 'rgba(96,165,250,0.35)'; ctx.lineWidth = 2;
        for (let i = 0; i < 10; i++) {
          const sy = (i * 47 + (g.t * 8)) % VH;
          const sx = VW - ((g.dist * 3 + i * 211) % (VW + 200));
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 30, sy); ctx.stroke();
        }
      }

      // ground with pits carved out
      const pits = g.obstacles.filter((o) => o.type === 'pit');
      ctx.fillStyle = '#101b38';
      ctx.fillRect(0, GROUND, VW, VH - GROUND);
      for (const o of pits) {
        const sx = o.x - g.dist;
        const pitGrad = ctx.createLinearGradient(0, GROUND, 0, VH);
        pitGrad.addColorStop(0, '#090420'); pitGrad.addColorStop(1, '#0d0524');
        ctx.fillStyle = pitGrad;
        ctx.fillRect(sx, GROUND, o.w, VH - GROUND);
      }
      // glowing top edge (skipping pit gaps)
      ctx.strokeStyle = '#3B82F6';
      ctx.shadowColor = '#3B82F6'; ctx.shadowBlur = 14; ctx.lineWidth = 3;
      let runStart = 0;
      const edges = [...pits.map((p) => ({ x: p.x - g.dist, w: p.w })), { x: VW + 10, w: 0 }].sort((a, b) => a.x - b.x);
      for (const e of edges) {
        ctx.beginPath(); ctx.moveTo(runStart, GROUND); ctx.lineTo(Math.min(e.x, VW), GROUND); ctx.stroke();
        runStart = e.x + e.w;
      }
      ctx.shadowBlur = 0;

      // obstacles
      for (const o of g.obstacles) {
        const sx = o.x - g.dist;
        if (sx < -160 || sx > VW + 160) continue;
        if (o.type === 'spikes') {
          ctx.fillStyle = '#f87171';
          ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 16;
          for (let i = 0; i < o.w / 12; i++) {
            ctx.beginPath();
            ctx.moveTo(sx + i * 12, GROUND);
            ctx.lineTo(sx + i * 12 + 6, GROUND - 26);
            ctx.lineTo(sx + i * 12 + 12, GROUND);
            ctx.closePath(); ctx.fill();
          }
          ctx.shadowBlur = 0;
        } else if (o.type === 'block') {
          ctx.fillStyle = '#0f1d3d';
          ctx.strokeStyle = '#22d3ee';
          ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 14;
          ctx.lineWidth = 3;
          ctx.fillRect(sx, o.y, o.w, o.h);
          ctx.strokeRect(sx, o.y, o.w, o.h);
          ctx.shadowBlur = 0;
        } else if (o.type === 'plat') {
          ctx.fillStyle = '#16264d';
          ctx.strokeStyle = '#a855f7';
          ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 14;
          ctx.lineWidth = 3;
          ctx.fillRect(sx, o.y, o.w, 16);
          ctx.strokeRect(sx, o.y, o.w, 16);
          ctx.shadowBlur = 0;
        } else if (o.type === 'saw') {
          ctx.save();
          ctx.translate(sx, o.y);
          ctx.rotate(o.ang);
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 18;
          for (let t = 0; t < 8; t++) {
            const a = (t / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * (o.r - 8), Math.sin(a) * (o.r - 8));
            ctx.lineTo(Math.cos(a + 0.39) * (o.r + 8), Math.sin(a + 0.39) * (o.r + 8));
            ctx.lineTo(Math.cos(a + 0.78) * (o.r - 8), Math.sin(a + 0.78) * (o.r - 8));
            ctx.closePath(); ctx.fill();
          }
          ctx.beginPath(); ctx.arc(0, 0, o.r - 8, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          ctx.shadowBlur = 0;
        }
      }

      // coins
      for (const c of g.coins) {
        const sx = c.x - g.dist;
        const bob = Math.sin(g.t * 0.1 + c.x) * 3;
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(sx, c.y + bob, 7, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }

      // particles
      for (const p of g.particles) {
        ctx.globalAlpha = Math.max(0, p.life / 25);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - g.dist, p.y, 3, 3);
        ctx.globalAlpha = 1;
      }

      // player
      const spr = spriteRef.current;
      ctx.save();
      ctx.translate(PX, g.py);
      if (!g.onGround) ctx.rotate(Math.sin(g.t * 0.3) * 0.15);
      if (spr) {
        ctx.shadowColor = '#3B82F6'; ctx.shadowBlur = 16;
        ctx.drawImage(spr, -17, -24, 34, 48);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#60A5FA';
        ctx.shadowColor = '#3B82F6'; ctx.shadowBlur = 16;
        roundRect(ctx, -14, -18, 28, 36, 8); ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
      // run dust
      if (g.onGround && Math.random() < 0.3) {
        ctx.fillStyle = 'rgba(96,165,250,0.35)';
        ctx.fillRect(PX - 18, GROUND - 2, 4, 4);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [screen]);

  return (
    <div className="w-full max-w-5xl">
      <div className="relative rounded-2xl overflow-hidden pg-surface p-2 sm:p-3">
        <canvas ref={canvasRef} className="w-full rounded-xl block"
          onPointerDown={(e) => { if (e.pointerType === 'mouse') return; e.preventDefault(); const g = G.current; if (g) g.jumpBuf = 8; }}
          style={{ aspectRatio: `${VW}/${VH}`, background: '#090420', touchAction: 'none' }} />

        {screen === 'playing' && (
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-none">
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(0,5,15,0.7)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
                <Ruler className="w-4 h-4 text-sky-400" />
                <span className="text-sm font-bold">{hud.dist} m</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(0,5,15,0.7)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
                <CoinsIcon className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold">{hud.coins}</span>
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: 'rgba(0,5,15,0.7)', boxShadow: 'inset 0 0 0 1px rgba(245,158,11,0.4)' }}>
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold">{hud.speed}</span>
            </div>
          </div>
        )}

        {screen === 'menu' && (
          <Overlay>
            <h2 className="font-display text-3xl font-extrabold pg-text-glow">Grid Rush</h2>
            <p className="text-[var(--pg-muted)] text-sm max-w-md mx-auto">
              An endless neon sprint that keeps getting faster. <b className="text-white">Space</b> / <b className="text-white">W</b> to jump — clear glowing spikes, blocks, pits, and spinning saws for as many meters as you can.
            </p>
            <button onClick={startRun} className="mt-3 px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
              style={{ background: 'var(--pg-accent)', color: '#fff', boxShadow: '0 8px 24px rgba(59,130,246,0.4)' }}>
              <Play className="w-4 h-4 fill-white" /> Rush!
            </button>
            <a href={YT_URL} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold hover:underline" style={{ color: 'var(--pg-accent2)' }}>
              <Youtube className="w-4 h-4" /> youtube.com/@PlayGridGames
            </a>
          </Overlay>
        )}

        {screen === 'over' && (
          <Overlay>
            <h2 className="font-display text-2xl font-bold text-rose-400">Crashed!</h2>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <Stat label="Distance" value={`${hud.dist} m`} />
              <Stat label="Coins" value={hud.coins} />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={startRun} className="px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
                style={{ background: 'var(--pg-accent)', color: '#fff', boxShadow: '0 8px 24px rgba(59,130,246,0.4)' }}>
                <RotateCcw className="w-4 h-4" /> Retry
              </button>
              <button onClick={() => setScreen('menu')} className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--pg-accent2)', boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.3)' }}>
                Menu
              </button>
            </div>
            <a href={YT_URL} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold hover:underline" style={{ color: 'var(--pg-accent2)' }}>
              <Youtube className="w-4 h-4" /> youtube.com/@PlayGridGames
            </a>
          </Overlay>
        )}
      </div>
      {screen === 'playing' && <p className="mt-3 text-center text-xs text-[var(--pg-muted)]">Space / W jump · Esc for menu · Speed rises forever</p>}
    </div>
  );
}

function Overlay({ children }) {
  return (
    <div className="absolute inset-2 sm:inset-3 rounded-xl flex flex-col items-center justify-center text-center gap-2 px-4"
      style={{ background: 'rgba(0,5,15,0.85)', backdropFilter: 'blur(6px)' }}>
      {children}
    </div>
  );
}
function Stat({ label, value }) {
  return (
    <div className="px-4 py-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.1)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
      <div className="text-xl font-bold">{value}</div>
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