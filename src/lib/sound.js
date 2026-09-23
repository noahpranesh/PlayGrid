import { getState } from './gameStore';

let ctx = null;
function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { return null; }
  }
  return ctx;
}

export function resumeAudio() {
  const c = ac();
  if (c && c.state === 'suspended') c.resume();
}

function tone(freq, dur, type = 'sine', vol = 0.12, when = 0) {
  const c = ac();
  if (!c) return;
  if (!getState().settings.sound) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(c.destination);
    const t = c.currentTime + when;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {}
}

function noise(dur, vol = 0.12) {
  const c = ac();
  if (!c) return;
  if (!getState().settings.sound) return;
  try {
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(g);
    g.connect(c.destination);
    src.start();
  } catch {}
}

export const sfx = {
  click: () => tone(520, 0.04, 'square', 0.05),
  blip: () => tone(440, 0.06, 'square', 0.08),
  paddle: () => tone(320, 0.05, 'triangle', 0.12),
  wall: () => tone(190, 0.04, 'triangle', 0.08),
  score: () => { tone(660, 0.1, 'square', 0.1); tone(880, 0.12, 'square', 0.09, 0.08); },
  coin: () => { tone(880, 0.05, 'square', 0.08); tone(1320, 0.07, 'square', 0.06, 0.05); },
  jump: () => tone(330, 0.12, 'sine', 0.09),
  land: () => tone(180, 0.05, 'sine', 0.06),
  shoot: () => tone(760, 0.05, 'sawtooth', 0.06),
  shotgun: () => { tone(420, 0.08, 'sawtooth', 0.09); noise(0.08, 0.05); },
  explosion: () => { tone(120, 0.22, 'sawtooth', 0.13); noise(0.2, 0.1); },
  hurt: () => tone(160, 0.18, 'square', 0.11),
  powerup: () => { tone(660, 0.08, 'square', 0.09); tone(990, 0.1, 'square', 0.08, 0.07); tone(1320, 0.12, 'square', 0.07, 0.14); },
  win: () => { tone(523, 0.1, 'square', 0.1); tone(659, 0.1, 'square', 0.1, 0.1); tone(784, 0.16, 'square', 0.1, 0.2); },
  lose: () => { tone(330, 0.18, 'sawtooth', 0.1); tone(220, 0.28, 'sawtooth', 0.1, 0.16); },
  boss: () => { tone(110, 0.4, 'sawtooth', 0.14); tone(82, 0.5, 'sawtooth', 0.1, 0.05); },
  upgrade: () => { tone(523, 0.07, 'square', 0.08); tone(784, 0.1, 'square', 0.08, 0.07); },
};

// --- Ambient background music (chord progression + melody, respects settings.music) ---
let musicTimer = null;
const MUSIC_PROG = [
  { root: 130.81, chord: [261.63, 329.63, 392.0] }, // C major
  { root: 174.61, chord: [261.63, 349.23, 440.0] }, // F major
  { root: 98.0, chord: [246.94, 293.66, 392.0] },    // G major
  { root: 110.0, chord: [261.63, 329.63, 440.0] },  // A minor
];
const MUSIC_MEL = [523.25, 659.25, 783.99, 659.25, 587.33, 659.25, 523.25, 392.0];

export function startMusic() {
  stopMusic();
  if (!getState().settings.music) return;
  const c = ac();
  if (!c) return;
  let bar = 0;
  musicTimer = setInterval(() => {
    if (!getState().settings.music) return;
    const p = MUSIC_PROG[bar % MUSIC_PROG.length];
    tone(p.root, 2.4, 'triangle', 0.045); // bass
    p.chord.forEach((f, i) => tone(f, 2.2, 'sine', 0.016, i * 0.04)); // pad
    MUSIC_MEL.forEach((f, i) => { // gentle melody
      if ((bar + i) % 2 === 0 || i % 3 === 0) tone(f, 0.55, 'sine', 0.02, i * 0.3);
    });
    bar++;
  }, 2400);
}

export function stopMusic() {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
}

export function syncMusic() {
  if (getState().settings.music) startMusic();
  else stopMusic();
}

// --- Hyper arcade music (fast driving bassline for Grid Rush / Gridbound) ---
let hyperTimer = null;
const HYPER_BASS = [110, 110, 130.81, 110, 146.83, 110, 98, 116.54];

export function startHyperMusic() {
  stopHyperMusic();
  if (!getState().settings.music) return;
  const c = ac();
  if (!c) return;
  let step = 0;
  hyperTimer = setInterval(() => {
    if (!getState().settings.music) return;
    const bass = HYPER_BASS[step % HYPER_BASS.length];
    tone(bass, 0.13, 'sawtooth', 0.06);
    if (step % 2 === 0) tone(bass * 2, 0.08, 'square', 0.03, 0.02);
    if (step % 4 === 2) tone(bass * 4, 0.06, 'square', 0.022, 0.03);
    if (step % 8 === 7) tone(bass * 6, 0.08, 'triangle', 0.03, 0.02);
    step++;
  }, 135);
}

export function stopHyperMusic() {
  if (hyperTimer) { clearInterval(hyperTimer); hyperTimer = null; }
}