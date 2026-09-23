import { useEffect, useReducer } from 'react';
import { ACHIEVEMENTS } from './achievements';

const KEY = 'playgrid_save_v1';

const defaultState = {
  xp: 0,
  favorites: [],
  settings: { sound: true, music: true, animations: true, theme: 'dark' },
  stats: {
    gamesPlayed: 0,
    totalPlayTime: 0,
    bossesDefeated: 0,
    perGame: {},
  },
  achievements: [],
  unlocked: { cars: ['dart'], tracks: [0] },
};

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return clone(defaultState);
    const p = JSON.parse(raw);
    return {
      ...clone(defaultState),
      ...p,
      stats: {
        ...defaultState.stats,
        ...(p.stats || {}),
        perGame: { ...(p.stats?.perGame || {}) },
      },
      settings: { ...defaultState.settings, ...(p.settings || {}) },
      unlocked: { ...defaultState.unlocked, ...(p.unlocked || {}) },
      favorites: p.favorites || [],
      achievements: p.achievements || [],
    };
  } catch {
    return clone(defaultState);
  }
}

let state = load();
const listeners = new Set();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}
function emit() { listeners.forEach((l) => l()); }
function update(next) { state = next; persist(); emit(); }

export function getState() { return state; }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function useGameStore() {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => subscribe(force), []);
  return state;
}

function ensurePerGame(s, slug) {
  if (s.stats.perGame[slug]) return s;
  return {
    ...s,
    stats: {
      ...s.stats,
      perGame: {
        ...s.stats.perGame,
        [slug]: {
          plays: 0, playTime: 0, highScore: 0, wins: 0,
          levelsCompleted: [], bestTime: null, runsCompleted: 0,
        },
      },
    },
  };
}

function checkAchievements() {
  const newly = [];
  for (const a of ACHIEVEMENTS) {
    if (state.achievements.includes(a.id)) continue;
    try { if (a.check(state)) newly.push(a); } catch {}
  }
  if (newly.length) {
    update({
      ...state,
      achievements: [...state.achievements, ...newly.map((a) => a.id)],
      xp: state.xp + newly.reduce((n, a) => n + (a.xp || 100), 0),
    });
  }
}

export function addXp(n) {
  const v = Math.max(0, Math.floor(n));
  if (!v) return;
  update({ ...state, xp: state.xp + v });
  checkAchievements();
}

export function recordPlay(slug, durationMs) {
  update((() => {
    let s = ensurePerGame(state, slug);
    const g = s.stats.perGame[slug];
    return {
      ...s,
      stats: {
        ...s.stats,
        gamesPlayed: s.stats.gamesPlayed + 1,
        totalPlayTime: s.stats.totalPlayTime + (durationMs || 0),
        perGame: {
          ...s.stats.perGame,
          [slug]: { ...g, plays: g.plays + 1, playTime: g.playTime + (durationMs || 0) },
        },
      },
    };
  })());
  checkAchievements();
}

export function setHighScore(slug, score, extra = {}) {
  let isNew = false;
  update((() => {
    let s = ensurePerGame(state, slug);
    const g = s.stats.perGame[slug];
    isNew = score > (g.highScore || 0);
    return {
      ...s,
      stats: {
        ...s.stats,
        perGame: {
          ...s.stats.perGame,
          [slug]: { ...g, highScore: Math.max(g.highScore || 0, score), ...extra },
        },
      },
    };
  })());
  if (isNew) addXp(50);
  checkAchievements();
}

export function recordWin(slug, extra = {}) {
  update((() => {
    let s = ensurePerGame(state, slug);
    const g = s.stats.perGame[slug];
    return {
      ...s,
      stats: {
        ...s.stats,
        perGame: { ...s.stats.perGame, [slug]: { ...g, wins: (g.wins || 0) + 1, ...extra } },
      },
    };
  })());
  checkAchievements();
}

export function completeLevel(slug, levelIndex) {
  update((() => {
    let s = ensurePerGame(state, slug);
    const g = s.stats.perGame[slug];
    const levels = new Set(g.levelsCompleted || []);
    levels.add(levelIndex);
    return {
      ...s,
      stats: {
        ...s.stats,
        perGame: { ...s.stats.perGame, [slug]: { ...g, levelsCompleted: [...levels] } },
      },
    };
  })());
  addXp(75);
  checkAchievements();
}

export function recordBossDefeat(slug) {
  update({
    ...state,
    stats: { ...state.stats, bossesDefeated: (state.stats.bossesDefeated || 0) + 1 },
  });
  addXp(150);
  checkAchievements();
}

export function recordBestTime(slug, timeMs) {
  let isNew = false;
  update((() => {
    let s = ensurePerGame(state, slug);
    const g = s.stats.perGame[slug];
    isNew = !g.bestTime || timeMs < g.bestTime;
    return {
      ...s,
      stats: {
        ...s.stats,
        perGame: { ...s.stats.perGame, [slug]: { ...g, bestTime: isNew ? timeMs : g.bestTime } },
      },
    };
  })());
  if (isNew) addXp(60);
  checkAchievements();
}

export function recordRunComplete(slug, extra = {}) {
  update((() => {
    let s = ensurePerGame(state, slug);
    const g = s.stats.perGame[slug];
    return {
      ...s,
      stats: {
        ...s.stats,
        perGame: { ...s.stats.perGame, [slug]: { ...g, runsCompleted: (g.runsCompleted || 0) + 1, ...extra } },
      },
    };
  })());
  addXp(120);
  checkAchievements();
}

export function toggleFavorite(slug) {
  const has = state.favorites.includes(slug);
  update({
    ...state,
    favorites: has ? state.favorites.filter((x) => x !== slug) : [...state.favorites, slug],
  });
}

export function updateSettings(partial) {
  update({ ...state, settings: { ...state.settings, ...partial } });
}

export function unlockCar(id) {
  if ((state.unlocked.cars || []).includes(id)) return;
  update({ ...state, unlocked: { ...state.unlocked, cars: [...(state.unlocked.cars || []), id] } });
}

export function unlockTrack(i) {
  if ((state.unlocked.tracks || []).includes(i)) return;
  update({ ...state, unlocked: { ...state.unlocked, tracks: [...(state.unlocked.tracks || []), i] } });
}

export function resetProgress() {
  update(clone(defaultState));
}

export function getLevel(xp) { return Math.floor(xp / 500) + 1; }
export function getLevelProgress(xp) {
  const level = getLevel(xp);
  const cur = (level - 1) * 500;
  const need = 500;
  const into = xp - cur;
  return { level, into, need, pct: Math.max(0, Math.min(1, into / need)) };
}