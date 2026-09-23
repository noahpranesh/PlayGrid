import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Heart, MapPin, Trophy, ArrowLeft } from 'lucide-react';
import { sfx, resumeAudio, startHyperMusic, stopHyperMusic, stopMusic, syncMusic } from '@/lib/sound';
import { recordPlay, completeLevel, recordBossDefeat, addXp } from '@/lib/gameStore';
import { loadSprite } from '@/lib/sprite';

const VW = 900, VH = 520;
const AVATAR_URL = 'https://media.base44.com/images/public/6a9cc11b444670045f826e08/48b04a5ec_generated_image.png';
const GRAV = 0.6;
const MOVE = 4.2;
const JUMP = 12;

// Levels: platforms {x,y,w,h,move?}, coins {x,y}, enemies {x,y,range}, spikes {x,y,w}, goal {x,y}, boss bool
const LEVELS = [
  {
    name: 'Awakening', w: 1800, spawn: { x: 60, y: 380 },
    platforms: [
      { x: 0, y: 470, w: 1800, h: 50 },
      { x: 220, y: 390, w: 120, h: 18 },
      { x: 400, y: 320, w: 120, h: 18 },
      { x: 600, y: 380, w: 140, h: 18, move: { axis: 'y', amp: 60, speed: 0.03 } },
      { x: 820, y: 300, w: 120, h: 18 },
      { x: 1020, y: 360, w: 160, h: 18 },
      { x: 1260, y: 300, w: 120, h: 18 },
      { x: 1460, y: 380, w: 300, h: 18 },
    ],
    coins: [{ x: 270, y: 350 }, { x: 450, y: 280 }, { x: 660, y: 340 }, { x: 870, y: 260 }, { x: 1080, y: 320 }, { x: 1300, y: 260 }, { x: 1500, y: 340 }],
    enemies: [{ x: 480, y: 446, range: 80 }, { x: 1080, y: 446, range: 120 }, { x: 1500, y: 356, range: 120 }],
    spikes: [{ x: 760, y: 458, w: 40 }],
    goal: { x: 1770, y: 470 },
  },
  {
    name: 'Skybridge', w: 2200, spawn: { x: 60, y: 380 },
    platforms: [
      { x: 0, y: 470, w: 300, h: 50 },
      { x: 360, y: 410, w: 100, h: 18 },
      { x: 520, y: 350, w: 100, h: 18, move: { axis: 'x', amp: 80, speed: 0.025 } },
      { x: 760, y: 300, w: 100, h: 18 },
      { x: 920, y: 360, w: 120, h: 18 },
      { x: 1120, y: 300, w: 100, h: 18, move: { axis: 'y', amp: 70, speed: 0.035 } },
      { x: 1320, y: 380, w: 120, h: 18 },
      { x: 1520, y: 320, w: 100, h: 18 },
      { x: 1700, y: 380, w: 120, h: 18 },
      { x: 1900, y: 470, w: 300, h: 50 },
    ],
    coins: [{ x: 400, y: 370 }, { x: 560, y: 310 }, { x: 800, y: 260 }, { x: 970, y: 320 }, { x: 1160, y: 260 }, { x: 1360, y: 340 }, { x: 1560, y: 280 }, { x: 1740, y: 340 }],
    enemies: [{ x: 970, y: 446, range: 0 }, { x: 1340, y: 446, range: 0 }, { x: 1960, y: 446, range: 120 }],
    spikes: [{ x: 300, y: 458, w: 60 }, { x: 760, y: 458, w: 60 }, { x: 1200, y: 458, w: 80 }],
    goal: { x: 2140, y: 470 },
  },
  {
    name: 'The Climb', w: 2000, spawn: { x: 60, y: 420 },
    platforms: [
      { x: 0, y: 470, w: 260, h: 50 },
      { x: 300, y: 410, w: 80, h: 18 },
      { x: 420, y: 340, w: 80, h: 18 },
      { x: 540, y: 270, w: 80, h: 18 },
      { x: 660, y: 200, w: 100, h: 18, move: { axis: 'x', amp: 70, speed: 0.03 } },
      { x: 860, y: 250, w: 80, h: 18 },
      { x: 980, y: 320, w: 80, h: 18 },
      { x: 1100, y: 390, w: 80, h: 18 },
      { x: 1220, y: 320, w: 80, h: 18, move: { axis: 'y', amp: 60, speed: 0.04 } },
      { x: 1380, y: 250, w: 80, h: 18 },
      { x: 1500, y: 180, w: 100, h: 18 },
      { x: 1680, y: 250, w: 100, h: 18 },
      { x: 1820, y: 470, w: 180, h: 50 },
    ],
    coins: [{ x: 340, y: 370 }, { x: 460, y: 300 }, { x: 580, y: 230 }, { x: 700, y: 160 }, { x: 900, y: 210 }, { x: 1020, y: 280 }, { x: 1140, y: 350 }, { x: 1260, y: 280 }, { x: 1420, y: 210 }, { x: 1540, y: 140 }, { x: 1720, y: 210 }],
    enemies: [{ x: 1020, y: 446, range: 0 }, { x: 1860, y: 446, range: 80 }],
    spikes: [{ x: 260, y: 458, w: 40 }, { x: 1280, y: 458, w: 60 }, { x: 1640, y: 458, w: 40 }],
    goal: { x: 1940, y: 470 },
  },
  {
    name: 'Gauntlet', w: 2400, spawn: { x: 60, y: 380 },
    platforms: [
      { x: 0, y: 470, w: 200, h: 50 },
      { x: 260, y: 400, w: 90, h: 18 },
      { x: 400, y: 330, w: 90, h: 18, move: { axis: 'x', amp: 90, speed: 0.04 } },
      { x: 600, y: 380, w: 90, h: 18 },
      { x: 760, y: 300, w: 90, h: 18 },
      { x: 900, y: 380, w: 90, h: 18, move: { axis: 'y', amp: 80, speed: 0.05 } },
      { x: 1080, y: 320, w: 90, h: 18 },
      { x: 1240, y: 260, w: 90, h: 18 },
      { x: 1400, y: 340, w: 90, h: 18, move: { axis: 'x', amp: 70, speed: 0.035 } },
      { x: 1600, y: 280, w: 90, h: 18 },
      { x: 1760, y: 360, w: 90, h: 18 },
      { x: 1920, y: 300, w: 90, h: 18, move: { axis: 'y', amp: 60, speed: 0.04 } },
      { x: 2100, y: 470, w: 300, h: 50 },
    ],
    coins: [{ x: 300, y: 360 }, { x: 440, y: 290 }, { x: 640, y: 340 }, { x: 800, y: 260 }, { x: 940, y: 340 }, { x: 1120, y: 280 }, { x: 1280, y: 220 }, { x: 1440, y: 300 }, { x: 1640, y: 240 }, { x: 1800, y: 320 }, { x: 1960, y: 260 }, { x: 2200, y: 420 }],
    enemies: [{ x: 640, y: 446, range: 60 }, { x: 1120, y: 446, range: 80 }, { x: 1800, y: 446, range: 80 }, { x: 2160, y: 446, range: 100 }],
    spikes: [{ x: 200, y: 458, w: 60 }, { x: 540, y: 458, w: 60 }, { x: 1040, y: 458, w: 40 }, { x: 1500, y: 458, w: 100 }, { x: 1850, y: 458, w: 70 }],
    saws: [{ x: 330, y: 300, r: 30 }, { x: 1170, y: 430, r: 34 }, { x: 1900, y: 240, r: 30 }],
    goal: { x: 2340, y: 470 },
  },
  {
    name: 'The Core', w: 2200, spawn: { x: 60, y: 420 }, boss: true,
    platforms: [
      { x: 0, y: 470, w: 2200, h: 50 },
      { x: 300, y: 390, w: 120, h: 18 },
      { x: 520, y: 320, w: 120, h: 18, move: { axis: 'y', amp: 50, speed: 0.03 } },
      { x: 740, y: 390, w: 120, h: 18 },
      { x: 960, y: 320, w: 120, h: 18 },
      { x: 1180, y: 390, w: 120, h: 18 },
      { x: 1400, y: 320, w: 120, h: 18, move: { axis: 'x', amp: 70, speed: 0.03 } },
      { x: 1620, y: 390, w: 120, h: 18 },
    ],
    coins: [{ x: 340, y: 350 }, { x: 560, y: 280 }, { x: 780, y: 350 }, { x: 1000, y: 280 }, { x: 1220, y: 350 }, { x: 1440, y: 280 }, { x: 1660, y: 350 }],
    enemies: [{ x: 780, y: 446, range: 60 }, { x: 1220, y: 446, range: 60 }],
    spikes: [],
    saws: [{ x: 560, y: 250, r: 30 }, { x: 1000, y: 250, r: 30 }],
    goal: { x: 1900, y: 470 },
    bossArena: { x: 1900, y: 470, w: 300 },
  },
  {
    name: 'Neon Spire', w: 2200, spawn: { x: 60, y: 380 },
    platforms: [
      { x: 0, y: 470, w: 240, h: 50 },
      { x: 320, y: 400, w: 90, h: 18 },
      { x: 460, y: 330, w: 90, h: 18, move: { axis: 'y', amp: 70, speed: 0.04 } },
      { x: 620, y: 260, w: 90, h: 18 },
      { x: 760, y: 330, w: 90, h: 18, move: { axis: 'x', amp: 80, speed: 0.03 } },
      { x: 960, y: 400, w: 90, h: 18 },
      { x: 1120, y: 340, w: 100, h: 18 },
      { x: 1300, y: 280, w: 90, h: 18, move: { axis: 'y', amp: 60, speed: 0.05 } },
      { x: 1480, y: 220, w: 100, h: 18 },
      { x: 1640, y: 320, w: 90, h: 18 },
      { x: 1800, y: 400, w: 90, h: 18, move: { axis: 'x', amp: 70, speed: 0.035 } },
      { x: 2000, y: 470, w: 200, h: 50 },
    ],
    coins: [{ x: 370, y: 360 }, { x: 510, y: 290 }, { x: 670, y: 220 }, { x: 810, y: 290 }, { x: 1010, y: 360 }, { x: 1170, y: 300 }, { x: 1350, y: 240 }, { x: 1530, y: 180 }, { x: 1690, y: 280 }, { x: 2090, y: 420 }],
    enemies: [{ x: 1010, y: 446, range: 90 }, { x: 2060, y: 446, range: 60 }],
    spikes: [{ x: 240, y: 458, w: 60 }],
    saws: [{ x: 870, y: 430, r: 34 }, { x: 1240, y: 250, r: 30 }, { x: 1430, y: 445, r: 36 }, { x: 1570, y: 180, r: 26 }],
    goal: { x: 2140, y: 470 },
  },
  {
    name: 'Event Horizon', w: 2400, spawn: { x: 60, y: 420 },
    platforms: [
      { x: 0, y: 470, w: 220, h: 50 },
      { x: 280, y: 410, w: 80, h: 18 },
      { x: 400, y: 340, w: 80, h: 18, move: { axis: 'x', amp: 90, speed: 0.045 } },
      { x: 620, y: 280, w: 80, h: 18 },
      { x: 760, y: 360, w: 80, h: 18 },
      { x: 900, y: 300, w: 80, h: 18, move: { axis: 'y', amp: 80, speed: 0.05 } },
      { x: 1080, y: 240, w: 80, h: 18 },
      { x: 1220, y: 320, w: 80, h: 18 },
      { x: 1360, y: 400, w: 80, h: 18, move: { axis: 'x', amp: 100, speed: 0.04 } },
      { x: 1620, y: 340, w: 90, h: 18 },
      { x: 1760, y: 260, w: 90, h: 18, move: { axis: 'y', amp: 70, speed: 0.035 } },
      { x: 1940, y: 400, w: 90, h: 18 },
      { x: 2100, y: 470, w: 300, h: 50 },
    ],
    coins: [{ x: 320, y: 370 }, { x: 440, y: 300 }, { x: 660, y: 240 }, { x: 800, y: 320 }, { x: 940, y: 260 }, { x: 1120, y: 200 }, { x: 1260, y: 280 }, { x: 1400, y: 360 }, { x: 1660, y: 300 }, { x: 1800, y: 220 }, { x: 1980, y: 360 }, { x: 2200, y: 420 }],
    enemies: [{ x: 800, y: 446, range: 100 }, { x: 1240, y: 446, range: 120 }, { x: 2160, y: 446, range: 100 }],
    spikes: [{ x: 220, y: 458, w: 50 }, { x: 1500, y: 458, w: 80 }, { x: 1900, y: 458, w: 60 }],
    saws: [{ x: 560, y: 420, r: 36 }, { x: 700, y: 200, r: 28 }, { x: 1140, y: 440, r: 34 }, { x: 1300, y: 200, r: 30 }, { x: 1560, y: 220, r: 26 }, { x: 2020, y: 330, r: 32 }],
    goal: { x: 2340, y: 470 },
  },
];

export default function Gridbound() {
  const canvasRef = useRef(null);
  const [screen, setScreen] = useState('select'); // select | playing | dead | win
  const [levelIdx, setLevelIdx] = useState(0);
  const [hud, setHud] = useState({ lives: 3, coins: 0, totalCoins: 0 });
  const [completed, setCompleted] = useState([]);
  const isTouch = typeof window !== 'undefined' && (('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0);

  const G = useRef(null);
  const spriteRef = useRef(null);

  useEffect(() => { loadSprite(AVATAR_URL).then((s) => { spriteRef.current = s; }); }, []);

  useEffect(() => {
    const start = Date.now();
    return () => recordPlay('gridbound', Date.now() - start);
  }, []);

  // hyper music during gameplay, ambient elsewhere
  useEffect(() => {
    if (screen === 'playing') { stopMusic(); startHyperMusic(); }
    else { stopHyperMusic(); syncMusic(); }
    return () => { stopHyperMusic(); };
  }, [screen]);

  const loadLevel = useCallback((idx) => {
    const L = LEVELS[idx];
    const plats = L.platforms.map((p) => ({ ...p, baseX: p.x, baseY: p.y, phase: Math.random() * Math.PI * 2 }));
    const coins = L.coins.map((c) => ({ ...c, taken: false }));
    const enemies = L.enemies.map((e) => ({ ...e, dir: 1, startX: e.x }));
    G.current = {
      level: idx, L, plats, coins, enemies,
      saws: (L.saws || []).map((s) => ({ ...s, ang: Math.random() * Math.PI * 2 })),
      px: L.spawn.x, py: L.spawn.y, vx: 0, vy: 0, onGround: false, face: 1,
      cam: 0, lives: G.current?.lives ?? 3,
      coinsCollected: 0, checkpoint: { x: L.spawn.x, y: L.spawn.y },
      boss: L.boss ? { x: 2050, y: 430, hp: 4, maxHp: 4, dir: -1, shootT: 90, alive: true, invuln: 0 } : null,
      bossProjectiles: [], particles: [],
      keys: {}, t: 0, raf: 0, last: 0,
      won: false, dead: false,
    };
    setHud({ lives: G.current.lives, coins: 0, totalCoins: coins.length });
  }, []);

  const startLevel = useCallback((idx) => {
    G.current = { lives: 3 };
    loadLevel(idx);
    setLevelIdx(idx);
    setScreen('playing');
    resumeAudio();
  }, [loadLevel]);

  // input
  useEffect(() => {
    const kd = (e) => {
      const g = G.current; if (!g) return;
      const k = e.key.toLowerCase();
      g.keys[k] = true;
      g.keys[e.code] = true; // physical key, layout-independent
      if (k === ' ' || k === 'arrowup' || k === 'w' || e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        g.jumpBuf = 8; // buffered — the jump fires as soon as you land
        e.preventDefault();
      }
      if (k === 'escape' || e.code === 'Escape') setScreen('select');
    };
    const ku = (e) => { const g = G.current; if (g) { g.keys[e.key.toLowerCase()] = false; g.keys[e.code] = false; } };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, []);

  // loop
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = VW * dpr; cv.height = VH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

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
      // moving platforms
      for (const p of g.plats) {
        if (p.move) {
          p.phase += p.move.speed * dt;
          if (p.move.axis === 'x') p.x = p.baseX + Math.sin(p.phase) * p.move.amp;
          else p.y = p.baseY + Math.sin(p.phase) * p.move.amp;
        }
      }

      // player input
      let move = 0;
      if (g.keys['a'] || g.keys['KeyA'] || g.keys['arrowleft'] || g.keys['ArrowLeft']) { move -= 1; g.face = -1; }
      if (g.keys['d'] || g.keys['KeyD'] || g.keys['arrowright'] || g.keys['ArrowRight']) { move += 1; g.face = 1; }
      g.moving = move !== 0;
      g.vx = move * MOVE;
      g.vy += GRAV * dt;
      if (g.vy > 12) g.vy = 12; // capped so fast falls can't tunnel through platforms
      g.invuln = Math.max(0, (g.invuln || 0) - dt);
      g.px += g.vx * dt;
      g.py += g.vy * dt;

      // collisions
      g.onGround = false;
      for (const p of g.plats) {
        if (g.px + 14 > p.x && g.px - 14 < p.x + p.w &&
            g.py + 18 > p.y && g.py + 18 < p.y + p.h + 20 && g.vy >= 0) {
          g.py = p.y - 18;
          g.vy = 0;
          g.onGround = true;
          // ride moving platform
          if (p.move && p.move.axis === 'x') g.px += Math.cos(p.phase) * 0; // simplified
        }
      }
      // coyote time + jump buffer for responsive controls
      g.coyote = g.onGround ? 7 : Math.max(0, (g.coyote || 0) - dt);
      if ((g.jumpBuf || 0) > 0) {
        g.jumpBuf -= dt;
        if (g.coyote > 0) {
          g.vy = -JUMP; g.onGround = false; g.coyote = 0; g.jumpBuf = 0; sfx.jump();
        }
      }
      // world bounds
      if (g.px < 14) g.px = 14;
      if (g.px > g.L.w - 14) g.px = g.L.w - 14;
      // fall death
      if (g.py > VH + 100) hurt(g, true);

      // camera
      const targetCam = Math.max(0, Math.min(g.L.w - VW, g.px - VW / 2));
      g.cam += (targetCam - g.cam) * 0.12;

      // coins
      for (const c of g.coins) {
        if (!c.taken && Math.hypot(c.x - g.px, c.y - g.py) < 22) {
          c.taken = true; g.coinsCollected++;
          sfx.coin(); addXp(2);
          for (let i = 0; i < 8; i++) g.particles.push({ x: c.x, y: c.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4 - 1, life: 25, color: '#fbbf24' });
          setHud((h) => ({ ...h, coins: g.coinsCollected }));
        }
      }

      // enemies
      for (const e of g.enemies) {
        if (e.range > 0) {
          e.x += e.dir * 1.2 * dt;
          if (e.x > e.startX + e.range) e.dir = -1;
          if (e.x < e.startX - e.range) e.dir = 1;
        }
        if (Math.abs(e.x - g.px) < 20 && Math.abs(e.y - g.py) < 24) {
          if (g.vy > 0 && g.py < e.y) {
            // stomp
            g.enemies = g.enemies.filter((x) => x !== e);
            g.vy = -8;
            sfx.explosion();
            addXp(5);
          } else {
            hurt(g);
          }
        }
      }

      // spikes
      for (const s of g.L.spikes) {
        if (g.px + 12 > s.x && g.px - 12 < s.x + s.w && g.py + 16 > s.y && g.py < s.y + 14) {
          hurt(g, true);
        }
      }

      // saws
      for (const s of g.saws) {
        s.ang += 0.12 * dt;
        if (Math.hypot(s.x - g.px, s.y - g.py) < s.r + 12) hurt(g, true);
      }

      // boss
      if (g.boss && g.boss.alive) {
        const b = g.boss;
        b.invuln = Math.max(0, b.invuln - dt);
        b.x += b.dir * 1.1 * dt;
        if (b.x < 1920) b.dir = 1;
        if (b.x > 2180) b.dir = -1;
        b.shootT -= dt;
        if (b.shootT <= 0) {
          b.shootT = 150;
          const ang = Math.atan2(g.py - b.y, g.px - b.x);
          g.bossProjectiles.push({ x: b.x, y: b.y - 20, vx: Math.cos(ang) * 2.8, vy: Math.sin(ang) * 2.8, life: 200 });
          sfx.shoot();
        }
        // boss projectiles
        for (let i = g.bossProjectiles.length - 1; i >= 0; i--) {
          const p = g.bossProjectiles[i];
          p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
          if (p.life <= 0) { g.bossProjectiles.splice(i, 1); continue; }
          if (Math.hypot(p.x - g.px, p.y - g.py) < 18) {
            g.bossProjectiles.splice(i, 1);
            hurt(g);
          }
        }
        // stomp boss
        if (Math.abs(b.x - g.px) < 40 && Math.abs(b.y - g.py) < 40 && g.vy > 0 && g.py < b.y && b.invuln <= 0) {
          b.hp--;
          b.invuln = 30;
          g.vy = -10;
          sfx.hurt();
          if (b.hp <= 0) {
            b.alive = false;
            recordBossDefeat('gridbound');
            sfx.explosion();
            for (let i = 0; i < 30; i++) g.particles.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 40, color: '#ef4444' });
          }
        }
      }

      // particles
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        if (p.life <= 0) g.particles.splice(i, 1);
      }

      // goal
      const goal = g.L.goal;
      const bossDone = g.L.boss ? !(g.boss && g.boss.alive) : true;
      if (bossDone && Math.abs(goal.x - g.px) < 24 && Math.abs(goal.y - g.py) < 40) {
        // win
        g.won = true;
        completeLevel('gridbound', g.level);
        addXp(100);
        sfx.win();
        setCompleted((c) => Array.from(new Set([...c, g.level])));
        setScreen('win');
      }
    };

    const hurt = (g, respawn) => {
      if ((g.invuln || 0) > 0) return; // brief invulnerability after each hit
      g.invuln = 90;
      g.lives--;
      setHud((h) => ({ ...h, lives: g.lives }));
      sfx.hurt();
      for (let i = 0; i < 10; i++) g.particles.push({ x: g.px, y: g.py, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, life: 25, color: '#3B82F6' });
      if (g.lives <= 0) {
        g.dead = true;
        setScreen('dead');
        sfx.lose();
        return;
      }
      if (respawn) {
        g.px = g.checkpoint.x; g.py = g.checkpoint.y; g.vy = 0;
      }
    };

    const draw = () => {
      const g = G.current; if (!g) return;
      ctx.clearRect(0, 0, VW, VH);
      // bg
      const grad = ctx.createLinearGradient(0, 0, 0, VH);
      grad.addColorStop(0, '#070D1C'); grad.addColorStop(1, '#0A1124');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, VW, VH);
      // parallax stars
      ctx.fillStyle = 'rgba(96,165,250,0.25)';
      for (let i = 0; i < 40; i++) {
        const sx = (i * 137 - g.cam * 0.3) % VW;
        const sy = (i * 53) % VH;
        ctx.fillRect(((sx + VW) % VW), sy, 2, 2);
      }

      ctx.save();
      ctx.translate(-g.cam, 0);

      // platforms
      for (const p of g.plats) {
        ctx.fillStyle = p.move ? '#1e3a8a' : '#13203f';
        ctx.strokeStyle = p.move ? '#3B82F6' : '#2563eb';
        ctx.shadowColor = '#3B82F6';
        ctx.shadowBlur = p.move ? 16 : 8;
        ctx.lineWidth = 2;
        roundRect(ctx, p.x, p.y, p.w, p.h, 6); ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        if (p.move) {
          ctx.fillStyle = 'rgba(59,130,246,0.3)';
          ctx.fillRect(p.x, p.y, p.w, 3);
        }
      }

      // spikes (glowing Geometry-Dash style)
      ctx.fillStyle = '#f87171';
      ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 14;
      for (const s of g.L.spikes) {
        for (let i = 0; i < s.w / 10; i++) {
          ctx.beginPath();
          ctx.moveTo(s.x + i * 10, s.y + 14);
          ctx.lineTo(s.x + i * 10 + 5, s.y);
          ctx.lineTo(s.x + i * 10 + 10, s.y + 14);
          ctx.closePath(); ctx.fill();
        }
      }
      ctx.shadowBlur = 0;

      // saws
      for (const s of g.saws) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.ang);
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 18;
        for (let t = 0; t < 10; t++) {
          const a = (t / 10) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * (s.r - 8), Math.sin(a) * (s.r - 8));
          ctx.lineTo(Math.cos(a + 0.31) * (s.r + 8), Math.sin(a + 0.31) * (s.r + 8));
          ctx.lineTo(Math.cos(a + 0.62) * (s.r - 8), Math.sin(a + 0.62) * (s.r - 8));
          ctx.closePath(); ctx.fill();
        }
        ctx.beginPath(); ctx.arc(0, 0, s.r - 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath(); ctx.arc(0, 0, (s.r - 8) * 0.45, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // coins
      for (const c of g.coins) {
        if (c.taken) continue;
        const bob = Math.sin(g.t * 0.1 + c.x) * 3;
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(c.x, c.y + bob, 7, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }

      // enemies
      for (const e of g.enemies) {
        ctx.fillStyle = '#f87171';
        ctx.shadowColor = '#f87171'; ctx.shadowBlur = 10;
        roundRect(ctx, e.x - 14, e.y - 14, 28, 28, 6); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.fillRect(e.x - 8 + e.dir * 3, e.y - 6, 4, 4);
        ctx.fillRect(e.x + 2 + e.dir * 3, e.y - 6, 4, 4);
      }

      // boss
      if (g.boss && g.boss.alive) {
        const b = g.boss;
        ctx.fillStyle = b.invuln > 0 ? '#fca5a5' : '#ef4444';
        ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 20;
        roundRect(ctx, b.x - 40, b.y - 40, 80, 80, 10); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 20px ui-sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('☠', b.x, b.y + 7);
        // hp
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(b.x - 40, b.y - 55, 80, 6);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(b.x - 40, b.y - 55, 80 * (b.hp / b.maxHp), 6);
      }
      // boss projectiles
      for (const p of g.bossProjectiles) {
        ctx.fillStyle = '#f87171'; ctx.shadowColor = '#f87171'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }

      // goal — tall glowing beacon flag
      const goal = g.L.goal;
      const bossDone = g.L.boss ? !(g.boss && g.boss.alive) : true;
      const gCol = bossDone ? '#22c55e' : '#64748b';
      const pulse = 0.55 + Math.sin(g.t * 0.09) * 0.35;
      // beacon light column, visible from across the level
      const beam = ctx.createLinearGradient(0, goal.y - 300, 0, goal.y);
      beam.addColorStop(0, 'rgba(0,0,0,0)');
      beam.addColorStop(1, bossDone ? `rgba(34,197,94,${(0.22 * pulse + 0.1).toFixed(3)})` : 'rgba(100,116,139,0.08)');
      ctx.fillStyle = beam;
      ctx.fillRect(goal.x - 24, goal.y - 300, 48, 300);
      // pulsing base ring
      ctx.strokeStyle = gCol; ctx.globalAlpha = pulse; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(goal.x, goal.y, 26, 7, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      // pole + waving checkered flag
      const wave = Math.sin(g.t * 0.14) * 3;
      ctx.shadowColor = gCol; ctx.shadowBlur = bossDone ? 16 : 0;
      ctx.fillStyle = gCol;
      ctx.fillRect(goal.x - 3, goal.y - 58, 6, 58);
      for (let col = 0; col < 4; col++) {
        const fx = goal.x + 3 + col * 10;
        const fy = goal.y - 58 + (col / 3) * wave;
        for (let row = 0; row < 2; row++) {
          ctx.fillStyle = (col + row) % 2 === 0 ? gCol : '#e6eeff';
          ctx.fillRect(fx, fy + row * 11, 10, 11);
        }
      }
      ctx.shadowBlur = 0;

      // player avatar (mirrored by facing direction, bobs while running)
      ctx.save();
      ctx.translate(g.px, g.py + (g.moving && g.onGround ? Math.sin(g.t * 0.35) * 2 : 0));
      ctx.scale(g.face, 1);
      if ((g.invuln || 0) > 0) ctx.globalAlpha = 0.35 + 0.3 * Math.abs(Math.sin(g.t * 0.5));
      const spr = spriteRef.current;
      if (spr) {
        ctx.shadowColor = '#3B82F6'; ctx.shadowBlur = 14;
        ctx.drawImage(spr, -17, -24, 34, 48);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#60A5FA';
        ctx.shadowColor = '#3B82F6'; ctx.shadowBlur = 16;
        roundRect(ctx, -14, -18, 28, 36, 8); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.fillRect(2, -10, 5, 5);
      }
      ctx.restore();

      // particles
      for (const p of g.particles) {
        ctx.globalAlpha = Math.max(0, p.life / 30);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
        ctx.globalAlpha = 1;
      }

      ctx.restore();

      // off-screen arrow pointing toward the goal
      const gsx = g.L.goal.x - g.cam;
      if (gsx < 60 || gsx > VW - 60) {
        const done2 = g.L.boss ? !(g.boss && g.boss.alive) : true;
        const right = gsx > VW / 2;
        const ax = right ? VW - 24 : 24;
        ctx.fillStyle = done2 ? '#22c55e' : '#94a3b8';
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(ax + (right ? 12 : -12), 300);
        ctx.lineTo(ax - (right ? 10 : -10), 288);
        ctx.lineTo(ax - (right ? 10 : -10), 312);
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [screen]);

  const retry = () => startLevel(levelIdx);

  const touchKey = (k, v) => { const g = G.current; if (g) g.keys[k] = v; };
  const touchJump = () => { const g = G.current; if (g) g.jumpBuf = 8; };

  return (
    <div className="w-full max-w-5xl">
      <div className="relative rounded-2xl overflow-hidden pg-surface p-2 sm:p-3">
        <canvas ref={canvasRef} className="w-full rounded-xl block" style={{ aspectRatio: `${VW}/${VH}`, background: '#070D1C', touchAction: 'none' }} />

        {/* HUD */}
        {screen === 'playing' && (
          <div className="absolute top-3 left-3 flex items-center gap-3">
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(0,5,15,0.7)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart key={i} className={`w-4 h-4 ${i < hud.lives ? 'fill-rose-500 text-rose-500' : 'text-white/20'}`} />
              ))}
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(0,5,15,0.7)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
              <span className="text-amber-400 text-xs font-bold">{hud.coins}/{hud.totalCoins}</span>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(0,5,15,0.7)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
              {LEVELS[levelIdx].name}
            </div>
          </div>
        )}

        {/* touch controls */}
        {screen === 'playing' && isTouch && (
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end select-none">
            <div className="flex gap-2.5">
              <TouchBtn onDown={() => touchKey('a', true)} onUp={() => touchKey('a', false)}>◀</TouchBtn>
              <TouchBtn onDown={() => touchKey('d', true)} onUp={() => touchKey('d', false)}>▶</TouchBtn>
            </div>
            <TouchBtn onDown={touchJump} onUp={() => {}}>JUMP</TouchBtn>
          </div>
        )}

        {/* Level select */}
        {screen === 'select' && (
          <Overlay>
            <h2 className="font-display text-3xl font-extrabold pg-text-glow">Gridbound</h2>
            <p className="text-[var(--pg-muted)] text-sm max-w-md mx-auto">A/D or arrows to move, Space/W to jump. Stomp enemies, dodge spikes, and follow the green beacon to the goal flag. Beat the boss in The Core.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mt-3 w-full max-w-3xl">
              {LEVELS.map((l, i) => {
                const done = completed.includes(i) || (G.current?.level === i && false);
                const locked = i > 0 && !completed.includes(i - 1) && i !== 0;
                return (
                  <button key={l.name} disabled={locked} onClick={() => !locked && startLevel(i)}
                    className="p-3 rounded-xl text-left transition-all disabled:opacity-40"
                    style={locked
                      ? { background: 'rgba(255,255,255,0.03)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }
                      : { background: 'rgba(59,130,246,0.12)', boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.4)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--pg-muted)]">Lv {i + 1}</span>
                      {done ? <Trophy className="w-3.5 h-3.5 text-amber-400" /> : locked ? <span className="text-[10px]">🔒</span> : <MapPin className="w-3.5 h-3.5 text-sky-400" />}
                    </div>
                    <div className="text-sm font-bold mt-1">{l.name}</div>
                    {l.boss && <div className="text-[10px] text-rose-400 mt-0.5">Boss</div>}
                  </button>
                );
              })}
            </div>
          </Overlay>
        )}

        {screen === 'dead' && (
          <Overlay>
            <h2 className="font-display text-2xl font-bold text-rose-400">You Died</h2>
            <p className="text-[var(--pg-muted)] text-sm">{LEVELS[levelIdx].name}</p>
            <div className="flex gap-2 mt-3">
              <button onClick={retry} className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
                style={{ background: 'var(--pg-accent)', color: '#fff', boxShadow: '0 8px 24px rgba(59,130,246,0.4)' }}>
                <RotateCcw className="w-4 h-4" /> Retry
              </button>
              <button onClick={() => setScreen('select')} className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--pg-accent2)', boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.3)' }}>
                Levels
              </button>
            </div>
          </Overlay>
        )}

        {screen === 'win' && (
          <Overlay>
            <Trophy className="w-10 h-10 text-amber-400" />
            <h2 className="font-display text-2xl font-bold text-amber-300">Level Complete!</h2>
            <p className="text-[var(--pg-muted)] text-sm">{LEVELS[levelIdx].name} · {hud.coins}/{hud.totalCoins} coins</p>
            <div className="flex gap-2 mt-3">
              {levelIdx < LEVELS.length - 1 ? (
                <button onClick={() => startLevel(levelIdx + 1)} className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
                  style={{ background: 'var(--pg-accent)', color: '#fff', boxShadow: '0 8px 24px rgba(59,130,246,0.4)' }}>
                  <Play className="w-4 h-4 fill-white" /> Next Level
                </button>
              ) : (
                <div className="px-4 py-2.5 rounded-xl text-sm font-bold text-amber-300" style={{ background: 'rgba(245,158,11,0.15)', boxShadow: 'inset 0 0 0 1px rgba(245,158,11,0.4)' }}>
                  🏆 All levels complete!
                </div>
              )}
              <button onClick={() => setScreen('select')} className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--pg-accent2)', boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.3)' }}>
                Levels
              </button>
            </div>
          </Overlay>
        )}
      </div>
      {screen === 'playing' && <p className="mt-3 text-center text-xs text-[var(--pg-muted)]">A/D move · Space jump · Stomp enemies · Esc for level select</p>}
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
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function TouchBtn({ children, onDown, onUp }) {
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); onDown(); }}
      onPointerUp={onUp} onPointerLeave={onUp} onPointerCancel={onUp}
      className="w-14 h-14 rounded-full text-sm font-bold grid place-items-center backdrop-blur"
      style={{ background: 'rgba(0,5,15,0.55)', color: 'var(--pg-accent2)', boxShadow: 'inset 0 0 0 1px var(--pg-border)', touchAction: 'none' }}
    >{children}</button>
  );
}