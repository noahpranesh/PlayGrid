import { useEffect, useRef, useState, useCallback } from 'react';
import { RotateCcw, Play, Skull, Heart, Crosshair, Youtube, Trophy, Smartphone, Monitor } from 'lucide-react';
import { isTouchDevice, deviceLabel } from '@/lib/device';
import { sfx, resumeAudio } from '@/lib/sound';
import { recordPlay, setHighScore, recordBossDefeat, recordWin, addXp } from '@/lib/gameStore';
import { submitGameScore } from '@/lib/leaderboard';
import { loadSprite } from '@/lib/sprite';

const W = 880, H = 600;
const PLAYER_R = 16;
const AVATAR_URL = 'https://media.base44.com/images/public/6a9cc11b444670045f826e08/c8ab15148_generated_image.png';
const ENEMY_SPRITES = {
  grunt: 'https://media.base44.com/images/public/6a9cc11b444670045f826e08/89d9119b4_generated_image.png',
  shooter: 'https://media.base44.com/images/public/6a9cc11b444670045f826e08/534f13f26_generated_image.png',
  tank: 'https://media.base44.com/images/public/6a9cc11b444670045f826e08/cf1a24231_generated_image.png',
  boss: 'https://media.base44.com/images/public/6a9cc11b444670045f826e08/8514f218f_generated_image.png',
  dasher: 'https://media.base44.com/images/public/6a9cc11b444670045f826e08/4511f9040_generated_image.png',
  bomber: 'https://media.base44.com/images/public/6a9cc11b444670045f826e08/c89912a86_generated_image.png',
  summoner: 'https://media.base44.com/images/public/6a9cc11b444670045f826e08/196d19365_generated_image.png',
};
const ARENA = { x: 16, y: 16, w: W - 32, h: H - 32 };

const DIFFICULTIES = [
  { id: 'easy', name: 'Easy', hp: 120, eHp: 0.7, eSpeed: 0.85, dmg: 0.6, spawn: 0.75, scoreMult: 1, waves: 20 },
  { id: 'medium', name: 'Medium', hp: 135, eHp: 0.85, eSpeed: 0.95, dmg: 0.8, spawn: 0.9, scoreMult: 1.5, waves: 25 },
  { id: 'hard', name: 'Hard', hp: 150, eHp: 1.0, eSpeed: 1.0, dmg: 1.0, spawn: 1.0, scoreMult: 2, waves: 30 },
  { id: 'pro', name: 'Pro', hp: 165, eHp: 1.4, eSpeed: 1.15, dmg: 1.35, spawn: 1.3, scoreMult: 3, waves: 35 },
  { id: 'hacker', name: 'Hacker', hp: 175, eHp: 3, eSpeed: 1.5, dmg: 2.4, spawn: 2.1, scoreMult: 5, waves: 40 },
];

const CROSSHAIRS = ['#60A5FA', '#22d3ee', '#4ade80', '#facc15', '#f87171', '#e879f9', '#ffffff'];

const RARITIES = [
  { id: 'common', name: 'Common', w: 60, color: '#4ade80' },
  { id: 'uncommon', name: 'Uncommon', w: 28, color: '#7dd3fc' },
  { id: 'rare', name: 'Rare', w: 15, color: '#fb923c' },
  { id: 'epic', name: 'Epic', w: 9, color: '#c084fc' },
  { id: 'legendary', name: 'Legendary', w: 3, color: '#facc15' },
  { id: 'mythic', name: 'Mythic', w: 0.5, color: '#ef4444' },
  { id: 'godly', name: 'Godly', w: 0.12, color: '#1d4ed8' },
  { id: 'heroic', name: 'HEROIC', w: 0.04, color: '#f472b6' },
];
const RARITY_INDEX = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5, godly: 6, heroic: 7 };

// --- Boss roster: 27 unique bosses + the Mythic final boss, each with its own avatar ---
const SPRITE_BASE = 'https://media.base44.com/images/public/6a9cc11b444670045f826e08/';
const BOSSES = [
  { id: 'titan', name: 'Titan', color: '#ef4444', hp: 1, speed: 1.0, r: 48, dmg: 22, score: 1200, taunt: 'You shall not pass.', ability: 'ring', tier: 1, sprite: SPRITE_BASE + '68e3e3068_generated_image.png' },
  { id: 'blitz', name: 'Blitz', color: '#fb923c', hp: 0.6, speed: 1.6, r: 40, dmg: 26, score: 1000, taunt: 'Too slow!', ability: 'dash', tier: 1, sprite: SPRITE_BASE + '4b337db64_generated_image.png' },
  { id: 'hivequeen', name: 'Hive Queen', color: '#f472b6', hp: 0.8, speed: 0.85, r: 46, dmg: 16, score: 1400, taunt: 'Meet my children.', ability: 'summon', tier: 1, sprite: SPRITE_BASE + 'bcc89c9ad_generated_image.png' },
  { id: 'spiker', name: 'Spiker', color: '#a3e635', hp: 0.9, speed: 1.0, r: 42, dmg: 18, score: 1300, taunt: 'Dodge THIS.', ability: 'spread', tier: 2, sprite: SPRITE_BASE + '64e6bc624_generated_image.png' },
  { id: 'spinner', name: 'Spinner', color: '#22d3ee', hp: 1.0, speed: 0.9, r: 44, dmg: 18, score: 1350, taunt: 'Round and round you go.', ability: 'spiral', tier: 2, sprite: SPRITE_BASE + '6978f96d1_generated_image.png' },
  { id: 'vanguard', name: 'Vanguard', color: '#94a3b8', hp: 1.5, speed: 0.7, r: 54, dmg: 26, score: 1600, taunt: 'Break upon my shield.', ability: 'shielded', tier: 2, sprite: SPRITE_BASE + '2c324ac6a_generated_image.png' },
  { id: 'wasp', name: 'Wasp', color: '#facc15', hp: 0.5, speed: 1.9, r: 34, dmg: 14, score: 1100, taunt: 'Buzz buzz, loser.', ability: 'zigzag', tier: 2, sprite: SPRITE_BASE + '226b82c7e_generated_image.png' },
  { id: 'warper', name: 'Warper', color: '#c084fc', hp: 0.8, speed: 1.0, r: 40, dmg: 20, score: 1400, taunt: 'Catch me if you can.', ability: 'teleport', tier: 3, sprite: SPRITE_BASE + '6511ad292_generated_image.png' },
  { id: 'leech', name: 'Leech Lord', color: '#84cc16', hp: 1.0, speed: 1.1, r: 42, dmg: 20, score: 1500, taunt: 'Your health is mine.', ability: 'vampire', tier: 3, sprite: SPRITE_BASE + '23ea479dd_generated_image.png' },
  { id: 'deadeye', name: 'Deadeye', color: '#60A5FA', hp: 0.7, speed: 0.9, r: 38, dmg: 24, score: 1450, taunt: 'I never miss twice.', ability: 'snipe', tier: 3, sprite: SPRITE_BASE + '746136312_generated_image.png' },
  { id: 'bombsmith', name: 'Bombsmith', color: '#f97316', hp: 1.0, speed: 0.85, r: 46, dmg: 20, score: 1500, taunt: 'Fire in the hole!', ability: 'bomblets', tier: 3, sprite: SPRITE_BASE + '6829e6653_generated_image.png' },
  { id: 'goliath', name: 'Goliath', color: '#a8a29e', hp: 2.4, speed: 0.55, r: 62, dmg: 32, score: 2200, taunt: 'CRUSH.', ability: 'quake', tier: 4, sprite: SPRITE_BASE + '21a7dc184_generated_image.png' },
  { id: 'bulwark', name: 'Bulwark', color: '#0ea5e9', hp: 1.4, speed: 0.75, r: 50, dmg: 22, score: 1800, taunt: 'Nowhere to hide.', ability: 'wall', tier: 4, sprite: SPRITE_BASE + '81fdc4d16_generated_image.png' },
  { id: 'stomper', name: 'Stomper', color: '#dc2626', hp: 1.3, speed: 1.0, r: 48, dmg: 26, score: 1900, taunt: 'Feel the ground shake!', ability: 'stomp', tier: 5, sprite: SPRITE_BASE + '2865e1679_generated_image.png' },
  { id: 'overmender', name: 'Overmender', color: '#4ade80', hp: 1.1, speed: 0.9, r: 44, dmg: 18, score: 2000, taunt: 'I heal faster than you hurt.', ability: 'regen', tier: 5, sprite: SPRITE_BASE + 'd4dbf0e40_generated_image.png' },
  { id: 'gunslinger', name: 'Gunslinger', color: '#fbbf24', hp: 1.0, speed: 1.2, r: 40, dmg: 20, score: 2100, taunt: 'Draw, partner.', ability: 'burst', tier: 5, sprite: SPRITE_BASE + '500c65c41_generated_image.png' },
  { id: 'nova', name: 'Nova Prime', color: '#e879f9', hp: 1.2, speed: 0.9, r: 46, dmg: 22, score: 2400, taunt: 'Go supernova with me.', ability: 'nova', tier: 6, sprite: SPRITE_BASE + '9677509cb_generated_image.png' },
  { id: 'executioner', name: 'Executioner', color: '#b91c1c', hp: 1.6, speed: 1.1, r: 52, dmg: 30, score: 2600, taunt: 'Kneel.', ability: 'ringdash', tier: 6, sprite: SPRITE_BASE + 'fae1a96ce_generated_image.png' },
  { id: 'voidmaw', name: 'Voidmaw', color: '#7c3aed', hp: 1.8, speed: 0.95, r: 54, dmg: 26, score: 3000, taunt: 'The void hungers.', ability: 'void', tier: 6, sprite: SPRITE_BASE + '91ee419b2_generated_image.png' },
  { id: 'omega', name: 'Omega', color: '#22d3ee', hp: 1.8, speed: 1.0, r: 52, dmg: 28, score: 3200, taunt: 'I am the end of all things.', ability: 'twinSpiral', tier: 7, sprite: SPRITE_BASE + '3068a07c4_generated_image.png' },
  { id: 'hellfire', name: 'Hellfire', color: '#f97316', hp: 1.6, speed: 1.05, r: 50, dmg: 26, score: 3000, taunt: 'Burn with me.', ability: 'crossfire', tier: 7, sprite: SPRITE_BASE + 'b5f689cd8_generated_image.png' },
  { id: 'broodmother', name: 'Broodmother', color: '#f472b6', hp: 1.9, speed: 0.9, r: 54, dmg: 24, score: 3100, taunt: 'My swarm is endless.', ability: 'brood', tier: 7, sprite: SPRITE_BASE + '76310bdcb_generated_image.png' },
  { id: 'reaper', name: 'Reaper', color: '#ef4444', hp: 1.5, speed: 1.5, r: 44, dmg: 30, score: 3300, taunt: 'Your time is up.', ability: 'reap', tier: 7, sprite: SPRITE_BASE + 'a2c7d297f_generated_image.png' },
  { id: 'warlord', name: 'Warlord', color: '#94a3b8', hp: 2.2, speed: 0.9, r: 56, dmg: 30, score: 3400, taunt: 'All shall fall.', ability: 'siege', tier: 7, sprite: SPRITE_BASE + 'a66f59c27_generated_image.png' },
  { id: 'stormking', name: 'Storm King', color: '#60A5FA', hp: 1.7, speed: 1.1, r: 48, dmg: 26, score: 3200, taunt: 'Feel the sky itself turn on you.', ability: 'storm', tier: 7, sprite: SPRITE_BASE + 'd068347bf_generated_image.png' },
  { id: 'annihilator', name: 'Annihilator', color: '#c084fc', hp: 2.0, speed: 1.0, r: 52, dmg: 28, score: 3600, taunt: 'Total deletion incoming.', ability: 'annihilate', tier: 7, sprite: SPRITE_BASE + '46ac44575_generated_image.png' },
  { id: 'pixelwyrm', name: 'Pixel Wyrm', color: '#4ade80', hp: 2.4, speed: 1.2, r: 50, dmg: 27, score: 3500, taunt: 'The Grid bends to my coils.', ability: 'wyrm', tier: 7, sprite: SPRITE_BASE + '0f0434812_generated_image.png' },
  { id: 'overlord', name: 'GRID OVERLORD', color: '#f472b6', hp: 3.2, speed: 1.0, r: 60, dmg: 34, score: 10000, taunt: 'I AM THE GRID. KNEEL OR BE DELETED.', ability: 'ultimate', tier: 99, mythic: true, sprite: SPRITE_BASE + 'aefc54031_generated_image.png' },
];

function randSpawnPoint() {
  const side = Math.floor(Math.random() * 4);
  const m = 60;
  if (side === 0) return { x: m + Math.random() * (W - 2 * m), y: m };
  if (side === 1) return { x: W - m, y: m + Math.random() * (H - 2 * m) };
  if (side === 2) return { x: m + Math.random() * (W - 2 * m), y: H - m };
  return { x: m, y: m + Math.random() * (H - 2 * m) };
}

// easy mobs first, harder mobs unlock later
function pickEnemyType(wave) {
  const table = [
    ['grunt', 1, 46],
    ['shooter', 3, 15],
    ['dasher', 4, 16],
    ['tank', 5, 12],
    ['bomber', 7, 10],
    ['summoner', 9, 8],
  ];
  const avail = table.filter(([, unlock]) => wave >= unlock);
  const total = avail.reduce((s, t) => s + t[2], 0);
  let r = Math.random() * total;
  for (const [t, , w] of avail) { r -= w; if (r <= 0) return t; }
  return 'grunt';
}

function makeBoss(g, def, wave, pos) {
  const d = g.diff;
  const hp = Math.ceil((350 + wave * 40) * def.hp * d.eHp);
  return {
    type: 'boss', bossDef: def, ability: def.ability,
    x: pos.x, y: pos.y, r: def.r, hp, maxHp: hp,
    speed: def.speed * d.eSpeed, dmg: Math.round(def.dmg * d.dmg),
    color: def.color, score: def.score, t: 0, shootT: 40,
    invulnT: 0, ultT: 0, ultWarn: 0, ultFire: 0,
    dashT: 90, dashLeft: 0, clonesDone: false,
  };
}

function mergeMelee(cur, next) {
  if (!cur) return { ...next, last: 0, arc: 1.9, fx: 0 };
  return { name: next.name, dmg: Math.max(cur.dmg, next.dmg), range: Math.max(cur.range, next.range), rateMs: Math.min(cur.rateMs, next.rateMs), last: cur.last, arc: 1.9, fx: cur.fx || 0 };
}

const UPGRADES = [
  // Common
  { id: 'dmg', rarity: 'common', name: 'Damage Up', desc: '+25% bullet damage', apply: (g) => { g.weapon.dmg *= 1.25; } },
  { id: 'rate', rarity: 'common', name: 'Fire Rate', desc: '+20% fire rate', apply: (g) => { g.weapon.rate *= 0.8; } },
  { id: 'mag', rarity: 'common', name: 'Extended Mag', desc: '+4 ammo per magazine', apply: (g) => { g.weapon.mag += 4; g.ammo += 4; } },
  { id: 'reload', rarity: 'common', name: 'Fast Hands', desc: '30% faster reload', apply: (g) => { g.weapon.reload *= 0.7; } },
  { id: 'speed', rarity: 'common', name: 'Sprint Boots', desc: '+15% move speed', apply: (g) => { g.speed *= 1.15; } },
  { id: 'hp', rarity: 'common', name: 'Max Health', desc: '+25 max health', apply: (g) => { g.maxHp += 25; g.hp += 25; } },
  { id: 'bigRounds', rarity: 'common', name: 'Big Rounds', desc: 'Bullets are bigger and hit more easily', apply: (g) => { g.bR = (g.bR || 0) + 3; } },
  { id: 'nanobots', rarity: 'common', name: 'Nanobots', desc: 'Regenerate 1 HP per second', apply: (g) => { g.regen = (g.regen || 0) + 1; } },
  { id: 'sharpened', rarity: 'common', name: 'Sharpened Rounds', desc: '10% chance to crit for double damage', apply: (g) => { g.crit = (g.crit || 0) + 0.1; g.critMult = Math.max(g.critMult || 2, 2); } },
  { id: 'impact', rarity: 'common', name: 'Impact Rounds', desc: 'Bullets knock enemies back', apply: (g) => { g.knock = (g.knock || 0) + 1.5; } },
  { id: 'hollow', rarity: 'common', name: 'Hollow Points', desc: '+15% bullet damage', apply: (g) => { g.weapon.dmg *= 1.15; } },
  { id: 'trigger', rarity: 'common', name: 'Trigger Discipline', desc: '+10% fire rate', apply: (g) => { g.weapon.rate *= 0.9; } },
  { id: 'grip', rarity: 'common', name: 'Grip Soles', desc: '+8% move speed', apply: (g) => { g.speed *= 1.08; } },
  { id: 'constitution', rarity: 'common', name: 'Iron Constitution', desc: '+15 max health', apply: (g) => { g.maxHp += 15; g.hp += 15; } },
  { id: 'bandolier', rarity: 'common', name: 'Bandolier', desc: '+2 ammo per magazine', apply: (g) => { g.weapon.mag += 2; g.ammo += 2; } },
  { id: 'quickdraw', rarity: 'common', name: 'Quickdraw', desc: '15% faster reload', apply: (g) => { g.weapon.reload *= 0.85; } },
  { id: 'longarms', rarity: 'common', name: 'Long Arms', desc: '+40% pickup radius', apply: (g) => { g.pick = (g.pick || 0) + 14; } },
  { id: 'bounty', rarity: 'common', name: 'Bounty Chips', desc: '+10% score from kills', apply: (g) => { g.scoreBoost = (g.scoreBoost || 0) + 0.1; } },
  { id: 'jets', rarity: 'common', name: 'Jet Rounds', desc: '+10% bullet speed', apply: (g) => { g.weapon.bSpeed *= 1.1; } },
  { id: 'plating', rarity: 'common', name: 'Light Plating', desc: 'Take 10% less damage', apply: (g) => { g.armor = Math.min(0.6, (g.armor || 0) + 0.1); } },
  { id: 'rations', rarity: 'common', name: 'Field Rations', desc: 'Health packs restore +10 more', apply: (g) => { g.dropHp = (g.dropHp || 0) + 10; } },
  // Uncommon
  { id: 'split', rarity: 'uncommon', name: 'Split Shot', desc: 'Fire an extra bullet per shot', apply: (g) => { g.weapon.split += 1; } },
  { id: 'pierce', rarity: 'uncommon', name: 'Pierce', desc: 'Bullets pierce +1 enemy', apply: (g) => { g.weapon.pierce += 1; } },
  { id: 'velocity', rarity: 'uncommon', name: 'Velocity Rounds', desc: '+25% bullet speed', apply: (g) => { g.weapon.bSpeed *= 1.25; } },
  { id: 'armor', rarity: 'uncommon', name: 'Thick Skin', desc: 'Take 15% less damage', apply: (g) => { g.armor = Math.min(0.6, (g.armor || 0) + 0.15); } },
  { id: 'luck', rarity: 'uncommon', name: 'Scavenger', desc: 'Supplies drop twice as often', apply: (g) => { g.luck = (g.luck || 1) * 2; } },
  { id: 'regenMatrix', rarity: 'uncommon', name: 'Regeneration Matrix', desc: 'Regenerate +2 HP per second', apply: (g) => { g.regen = (g.regen || 0) + 2; } },
  { id: 'precision', rarity: 'uncommon', name: 'Precision Optics', desc: '+15% crit chance', apply: (g) => { g.crit = (g.crit || 0) + 0.15; g.critMult = Math.max(g.critMult || 2, 2); } },
  { id: 'spikedArmor', rarity: 'uncommon', name: 'Spiked Armor', desc: 'Enemies that touch you take 15 damage', apply: (g) => { g.thorns = (g.thorns || 0) + 15; } },
  { id: 'magnet', rarity: 'uncommon', name: 'Supply Magnet', desc: 'Supplies drift toward you', once: true, apply: (g) => { g.magnet = true; } },
  { id: 'bloodRounds', rarity: 'uncommon', name: 'Blood Rounds', desc: 'Heal 0.5 HP per bullet hit', apply: (g) => { g.lifeHit = (g.lifeHit || 0) + 0.5; } },
  { id: 'frostNova', rarity: 'uncommon', name: 'Frost Nova', desc: 'Getting hit freezes nearby enemies', once: true, apply: (g) => { g.nova = true; } },
  { id: 'spareStim', rarity: 'uncommon', name: 'Spare Stim', desc: 'Revive once with 50% HP', apply: (g) => { g.revives = (g.revives || 0) + 1; g.revivePct = Math.max(g.revivePct || 0, 0.5); } },
  { id: 'phaseStep', rarity: 'uncommon', name: 'Phase Step', desc: '12% chance to ignore damage entirely', apply: (g) => { g.dodge = (g.dodge || 0) + 0.12; } },
  { id: 'rail', rarity: 'uncommon', name: 'Rail Rounds', desc: 'Bullets pierce +1 enemy', apply: (g) => { g.weapon.pierce += 1; } },
  { id: 'drone', rarity: 'uncommon', name: 'Combat Drone', desc: 'An orbiting drone shoots at enemies', apply: (g) => { g.orbs = (g.orbs || 0) + 1; } },
  // Rare
  { id: 'auto', rarity: 'rare', name: 'Auto Trigger', desc: 'Your gun fires automatically at the cursor', once: true, apply: (g) => { g.auto = true; } },
  { id: 'shield', rarity: 'rare', name: 'Energy Shield', desc: 'Blocks one hit, recharges over time (stacks)', apply: (g) => { if (!g.shield) g.shield = { charges: 1, max: 1, timer: 0, recharge: 780 }; else { g.shield.max += 1; g.shield.charges += 1; } } },
  { id: 'ricochet', rarity: 'rare', name: 'Ricochet', desc: 'Bullets bounce off walls once', once: true, apply: (g) => { g.ricochet = true; } },
  { id: 'venom', rarity: 'rare', name: 'Venom Rounds', desc: 'Hits poison enemies for damage over time', once: true, apply: (g) => { g.venom = true; } },
  { id: 'adren', rarity: 'rare', name: 'Adrenaline', desc: 'Up to +35% speed the more hurt you are', once: true, apply: (g) => { g.adren = true; } },
  { id: 'megaRounds', rarity: 'rare', name: 'Mega Rounds', desc: 'Much bigger bullets', apply: (g) => { g.bR = (g.bR || 0) + 5; } },
  { id: 'servos', rarity: 'rare', name: 'Overclocked Servos', desc: '+20% move speed', apply: (g) => { g.speed *= 1.2; } },
  { id: 'capacitor', rarity: 'rare', name: 'Shield Capacitor', desc: 'Shields recharge 40% faster', apply: (g) => { if (g.shield) g.shield.recharge *= 0.6; } },
  { id: 'bossbane', rarity: 'rare', name: 'Bossbane', desc: '+50% damage to bosses', apply: (g) => { g.bossDmg = (g.bossDmg || 0) + 0.5; } },
  { id: 'bloodbath', rarity: 'rare', name: 'Blood Bath', desc: 'Heal +2 HP on every kill', apply: (g) => { g.vampHeal = (g.vampHeal || 0) + 2; } },
  { id: 'deepmags', rarity: 'rare', name: 'Deep Mags', desc: '+6 ammo per magazine', apply: (g) => { g.weapon.mag += 6; g.ammo += 6; } },
  { id: 'ghost', rarity: 'rare', name: 'Ghost Protocol', desc: '+10% chance to ignore damage', apply: (g) => { g.dodge = (g.dodge || 0) + 0.1; } },
  // Epic
  { id: 'axe', rarity: 'epic', name: 'Battle Axe', desc: 'Auto-swings at nearby enemies (30 dmg)', apply: (g) => { g.melee = mergeMelee(g.melee, { name: 'Battle Axe', dmg: 30, range: 90, rateMs: 1500 }); } },
  { id: 'homing', rarity: 'epic', name: 'Homing Rounds', desc: 'Bullets curve toward enemies', once: true, apply: (g) => { g.homing = true; } },
  { id: 'frost', rarity: 'epic', name: 'Frost Rounds', desc: 'Hits slow enemies by 35%', once: true, apply: (g) => { g.frost = true; } },
  { id: 'explosive', rarity: 'epic', name: 'Explosive Rounds', desc: 'Bullets blast nearby enemies for 15 dmg', once: true, apply: (g) => { g.explosive = true; } },
  { id: 'droneSwarm', rarity: 'epic', name: 'Drone Swarm', desc: '+2 orbiting drones', apply: (g) => { g.orbs = (g.orbs || 0) + 2; } },
  { id: 'guardian', rarity: 'epic', name: 'Guardian Angel', desc: 'Revive once with 75% HP', apply: (g) => { g.revives = (g.revives || 0) + 1; g.revivePct = Math.max(g.revivePct || 0, 0.75); } },
  { id: 'shockwave', rarity: 'epic', name: 'Shockwave', desc: 'Getting hit blasts nearby enemies for 30 damage', once: true, apply: (g) => { g.shock = 30; } },
  { id: 'absoluteZero', rarity: 'epic', name: 'Absolute Zero', desc: 'Your slows weaken enemies by 60%', once: true, apply: (g) => { g.slowPower = 0.4; } },
  // Legendary
  { id: 'spear', rarity: 'legendary', name: 'Spear of the Grid', desc: 'Long-reaching melee thrust (45 dmg, huge range)', apply: (g) => { g.melee = mergeMelee(g.melee, { name: 'Spear', dmg: 45, range: 150, rateMs: 1200 }); } },
  { id: 'vamp', rarity: 'legendary', name: 'Vampirism', desc: 'Heal 4 HP on every kill', once: true, apply: (g) => { g.vamp = true; } },
  { id: 'mace', rarity: 'legendary', name: 'Mace of Ruin', desc: 'Heavy melee swings (60 dmg, wide reach)', apply: (g) => { g.melee = mergeMelee(g.melee, { name: 'Mace', dmg: 60, range: 100, rateMs: 1100 }); } },
  { id: 'executioner', rarity: 'legendary', name: 'Executioner', desc: '+25% crit chance, crits deal 3× damage', apply: (g) => { g.crit = (g.crit || 0) + 0.25; g.critMult = 3; } },
  { id: 'stormAura', rarity: 'legendary', name: 'Storm Aura', desc: 'Nearby enemies burn for 2 damage/sec', apply: (g) => { g.aura = (g.aura || 0) + 2; } },
  { id: 'phoenix', rarity: 'legendary', name: 'Phoenix Core', desc: 'Revive once at FULL health', apply: (g) => { g.revives = (g.revives || 0) + 1; g.revivePct = 1; } },
  // Mythic
  { id: 'excalibur', rarity: 'mythic', name: 'Excalibur', desc: 'Greatsword slashes — 75 dmg, blazing fast', apply: (g) => { g.melee = mergeMelee(g.melee, { name: 'Excalibur', dmg: 75, range: 110, rateMs: 700 }); } },
  { id: 'chain', rarity: 'mythic', name: 'Chain Lightning', desc: 'Kills arc lightning to nearby enemies (25 dmg)', once: true, apply: (g) => { g.chain = true; } },
  { id: 'bulletStorm', rarity: 'mythic', name: 'Bullet Storm', desc: 'Fire 4 extra bullets per shot', apply: (g) => { g.weapon.split += 4; } },
  { id: 'singularity', rarity: 'mythic', name: 'Singularity', desc: 'Nearby enemies take 6 extra damage/sec', apply: (g) => { g.aura = (g.aura || 0) + 6; } },
  { id: 'chronoField', rarity: 'mythic', name: 'Chrono Field', desc: 'ALL enemies move 20% slower', once: true, apply: (g) => { g.chrono = true; } },
  // Godly
  { id: 'aegis', rarity: 'godly', name: 'Aegis of the Grid', desc: '3-charge shield that recharges fast', apply: (g) => { g.shield = { charges: 3, max: 3, timer: 0, recharge: 420 }; } },
  { id: 'apocalypse', rarity: 'godly', name: 'Apocalypse Drones', desc: '+3 orbiting drones that shred everything', apply: (g) => { g.orbs = (g.orbs || 0) + 3; } },
  { id: 'eternal', rarity: 'godly', name: 'Eternal', desc: 'Revive 2 more times at full health', apply: (g) => { g.revives = (g.revives || 0) + 2; g.revivePct = 1; } },
  { id: 'ragnarok', rarity: 'godly', name: 'Ragnarok', desc: 'Bullets detonate in massive 30-damage blasts', once: true, apply: (g) => { g.explosive = true; g.exploPower = (g.exploPower || 0) + 30; g.exploRadius = (g.exploRadius || 0) + 60; } },
  // MORE — Common
  { id: 'kevlar', rarity: 'common', name: 'Kevlar Vest', desc: '+20 max health', apply: (g) => { g.maxHp += 20; g.hp += 20; } },
  { id: 'caffeine', rarity: 'common', name: 'Caffeine Rush', desc: '+12% move speed', apply: (g) => { g.speed *= 1.12; } },
  { id: 'sharp', rarity: 'common', name: 'Sharpshooter', desc: '+15% bullet damage', apply: (g) => { g.weapon.dmg *= 1.15; } },
  { id: 'wad', rarity: 'common', name: 'Wad Cutter', desc: '+8% fire rate', apply: (g) => { g.weapon.rate *= 0.92; } },
  { id: 'pouch', rarity: 'common', name: 'Ammo Pouch', desc: '+3 ammo per magazine', apply: (g) => { g.weapon.mag += 3; g.ammo += 3; } },
  // MORE — Uncommon
  { id: 'cryoRounds', rarity: 'uncommon', name: 'Cryo Rounds', desc: 'Hits briefly slow enemies', once: true, apply: (g) => { g.cryoHit = true; } },
  { id: 'shredder', rarity: 'uncommon', name: 'Shredder Rounds', desc: 'Hits make enemies bleed out', once: true, apply: (g) => { g.bleed = true; } },
  { id: 'focus', rarity: 'uncommon', name: 'Focus Lens', desc: '+20% crit chance', apply: (g) => { g.crit = (g.crit || 0) + 0.2; g.critMult = Math.max(g.critMult || 2, 2); } },
  { id: 'greed', rarity: 'uncommon', name: 'Greed', desc: '+25% score from kills', apply: (g) => { g.scoreBoost = (g.scoreBoost || 0) + 0.25; } },
  { id: 'kinetic', rarity: 'uncommon', name: 'Kinetic Wings', desc: '+25% move speed', apply: (g) => { g.speed *= 1.25; } },
  { id: 'fatmag', rarity: 'uncommon', name: 'Fat Mags', desc: '+5 ammo per magazine', apply: (g) => { g.weapon.mag += 5; g.ammo += 5; } },
  // MORE — Rare
  { id: 'hose', rarity: 'rare', name: 'Bullet Hose', desc: 'Fire 2 extra bullets per shot', apply: (g) => { g.weapon.split += 2; } },
  { id: 'phalanx', rarity: 'rare', name: 'Phalanx', desc: '+1 shield charge, 25% faster recharge', apply: (g) => { if (!g.shield) g.shield = { charges: 1, max: 1, timer: 0, recharge: 780 * 0.75 }; else { g.shield.max += 1; g.shield.charges += 1; g.shield.recharge *= 0.75; } } },
  { id: 'timeWarp', rarity: 'rare', name: 'Time Warp', desc: 'ALL enemies move 10% slower', once: true, apply: (g) => { g.chronoSlow = 0.9; } },
  { id: 'hunter', rarity: 'rare', name: 'Hunter Instinct', desc: '+30% bullet damage, +10% crit', apply: (g) => { g.weapon.dmg *= 1.3; g.crit = (g.crit || 0) + 0.1; g.critMult = Math.max(g.critMult || 2, 2); } },
  // MORE — Epic
  { id: 'railgun', rarity: 'epic', name: 'Railgun Rounds', desc: 'Pierce +2 and +40% bullet speed', apply: (g) => { g.weapon.pierce += 2; g.weapon.bSpeed *= 1.4; } },
  { id: 'blitz', rarity: 'epic', name: 'Blitz Mags', desc: '+8 ammo and 35% faster reload', apply: (g) => { g.weapon.mag += 8; g.ammo += 8; g.weapon.reload *= 0.65; } },
  { id: 'horizon', rarity: 'epic', name: 'Event Horizon', desc: 'Nearby enemies take 5 extra damage/sec', apply: (g) => { g.aura = (g.aura || 0) + 5; } },
  // MORE — Legendary
  { id: 'sunfire', rarity: 'legendary', name: 'Sunfire Aura', desc: 'Aura burns nearby enemies for +4 dmg/sec', apply: (g) => { g.aura = (g.aura || 0) + 4; } },
  { id: 'titan', rarity: 'legendary', name: 'Titanblood', desc: '+35% bullet damage and +25 max health', apply: (g) => { g.weapon.dmg *= 1.35; g.maxHp += 25; g.hp += 25; } },
  // MORE — Mythic
  { id: 'tempest', rarity: 'mythic', name: 'Tempest Drones', desc: '+2 orbiting drones', apply: (g) => { g.orbs = (g.orbs || 0) + 2; } },
  { id: 'annihilate', rarity: 'mythic', name: 'Annihilation', desc: 'Crits deal +1× damage (stacks)', apply: (g) => { g.critMult = (g.critMult || 2) + 1; } },
  // MORE — Heroic
  { id: 'omnislash', rarity: 'heroic', name: 'Omnislash', desc: 'Melee becomes a 200-damage rainbow execution arc', apply: (g) => { g.melee = mergeMelee(g.melee, { name: 'Omnislash', dmg: 200, range: 130, rateMs: 600 }); } },
  // HEROIC
  { id: 'judgment', rarity: 'heroic', name: 'Judgment Beam', desc: 'A rainbow laser annihilates everything every 6 seconds', once: true, apply: (g) => { g.beamCd = 60; } },
  { id: 'cascade', rarity: 'heroic', name: 'Prismatic Cascade', desc: 'Bullets burn, freeze, home, ricochet AND pierce 3', once: true, apply: (g) => { g.venom = true; g.frost = true; g.homing = true; g.ricochet = true; g.weapon.pierce += 3; } },
  { id: 'godslayer', rarity: 'heroic', name: 'Godslayer', desc: '+100% damage, +50% fire rate, EVERY hit crits', once: true, apply: (g) => { g.weapon.dmg *= 2; g.weapon.rate *= 0.67; g.crit = 1; g.critMult = Math.max(g.critMult || 2, 2); } },
];

function rollRarity() {
  const total = RARITIES.reduce((s, r) => s + r.w, 0);
  let roll = Math.random() * total;
  for (const r of RARITIES) { roll -= r.w; if (roll <= 0) return r; }
  return RARITIES[0];
}

function baseWeapon() {
  return { dmg: 10, rate: 260, mag: 12, reload: 1100, bSpeed: 9, spread: 1, pierce: 0, split: 1 };
}

export default function GridAssault() {
  const canvasRef = useRef(null);
  const [screen, setScreen] = useState('menu');
  const [hud, setHud] = useState({ hp: 100, maxHp: 100, ammo: 12, mag: 12, wave: 0, score: 0, mult: 1 });
  const [upgradeChoices, setUpgradeChoices] = useState(null);
  const [gameOver, setGameOver] = useState(null);
  const [difficulty, setDifficulty] = useState(DIFFICULTIES[0]);
  const [crossColor, setCrossColor] = useState('#60A5FA');
  const crossRef = useRef('#60A5FA');
  crossRef.current = crossColor;
  const [mode, setMode] = useState('normal'); // normal | boss
  const [bossIntro, setBossIntro] = useState(null);
  const [menuAuto, setMenuAuto] = useState(false);

  const G = useRef(null);
  const spriteRef = useRef(null);
  const enemySpritesRef = useRef({});
  const bossSpritesRef = useRef({});

  useEffect(() => {
    loadSprite(AVATAR_URL).then((s) => { spriteRef.current = s; });
    for (const [type, url] of Object.entries(ENEMY_SPRITES)) {
      loadSprite(url).then((s) => { if (s) enemySpritesRef.current[type] = s; });
    }
    for (const def of BOSSES) {
      loadSprite(def.sprite).then((s) => { if (s) bossSpritesRef.current[def.id] = s; });
    }
  }, []);

  const newGame = useCallback(() => {
    const diff = difficulty;
    G.current = {
      px: W / 2, py: H / 2, angle: 0,
      hp: diff.hp, maxHp: diff.hp, speed: 3.2, diff, mode, menuAuto,
      stats: { shots: 0, hits: 0, dmg: 0, bossKills: 0 },
      usedBosses: [],
      props: [
        { x: W * 0.27 - 35, y: H * 0.3 - 35, w: 70, h: 70 },
        { x: W * 0.73 - 35, y: H * 0.3 - 35, w: 70, h: 70 },
        { x: W * 0.27 - 35, y: H * 0.7 - 35, w: 70, h: 70 },
        { x: W * 0.73 - 35, y: H * 0.7 - 35, w: 70, h: 70 },
      ],
      weapon: baseWeapon(), ammo: 12, reloading: 0, lastShot: 0,
      bullets: [], enemies: [], particles: [], drops: [],
      wave: 0, toSpawn: 0, spawnTimer: 0, waveBreak: 0,
      score: 0, mult: 1, multTimer: 0,
      kills: 0, bossActive: false,
      shield: null, melee: null, beamCd: null, beamFx: null,
      auto: false, ricochet: false, venom: false, frost: false, homing: false,
      explosive: false, adren: false, vamp: false, chain: false,
      armor: 0, luck: 1, owned: new Set(), upLevels: {}, ultCharge: 0, hasUlt: false,
      keys: {}, mouse: { x: W / 2, y: H / 2, down: false },
      dust: Array.from({ length: 42 }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: -0.15 - Math.random() * 0.3, vy: (Math.random() - 0.5) * 0.2, a: 0.05 + Math.random() * 0.12, r: 1 + Math.random() * 1.6 })),
      rings: [], flash: 0, t: 0,
      raf: 0, last: 0,
    };
    setHud({ hp: diff.hp, maxHp: diff.hp, ammo: 12, mag: 12, wave: 0, score: 0, mult: 1 });
    setGameOver(null);
    setUpgradeChoices(null);
    setBossIntro(null);
    startWave(1);
  }, [difficulty, mode, menuAuto]);

  const spawnBosses = useCallback((g, wave, finalWave) => {
    let def;
    if (finalWave) {
      def = BOSSES.find((b) => b.mythic);
    } else {
      const total = g.diff.waves;
      const maxTier = g.mode === 'boss'
        ? Math.min(7, 1 + Math.floor(((wave - 1) / total) * 7))
        : Math.min(7, Math.ceil(wave / 5));
      g.usedBosses = g.usedBosses || [];
      let pool = BOSSES.filter((b) => !b.mythic && b.tier <= maxTier && b.tier >= maxTier - 2 && !g.usedBosses.includes(b.id));
      if (!pool.length) pool = BOSSES.filter((b) => !b.mythic && b.tier <= maxTier && b.tier >= maxTier - 2);
      def = pool[Math.floor(Math.random() * pool.length)];
      g.usedBosses.push(def.id);
    }
    const count = g.mode === 'boss' && !finalWave && wave > g.diff.waves * 0.55 ? 2 : 1;
    for (let k = 0; k < count; k++) {
      g.enemies.push(makeBoss(g, def, wave, randSpawnPoint()));
    }
    sfx.boss();
    setBossIntro(def);
  }, []);

  const startWave = useCallback((n) => {
    const g = G.current; if (!g) return;
    g.wave = n;
    const finalWave = n >= g.diff.waves;
    if (g.mode === 'boss') {
      g.toSpawn = 0;
      spawnBosses(g, n, finalWave);
    } else {
      g.bossActive = n % 5 === 0;
      g.toSpawn = g.bossActive ? 0 : Math.min(200, Math.round((12 + n * 6) * g.diff.spawn));
      if (g.bossActive || finalWave) spawnBosses(g, n, finalWave);
    }
    g.ultCharge = Math.min(30, (g.ultCharge || 0) + 1); // the Ultimate charges as you survive waves
    g.spawnTimer = 0;
    setHud((h) => ({ ...h, wave: n }));
  }, [spawnBosses]);

  useEffect(() => {
    const start = Date.now();
    return () => recordPlay('grid-assault', Date.now() - start);
  }, []);

  // boss intro: auto-dismiss or skip with space / tap / click
  useEffect(() => {
    if (!bossIntro) return;
    const t = setTimeout(() => setBossIntro(null), 2600);
    const kd = (e) => { if (e.key === ' ' || e.code === 'Space') setBossIntro(null); };
    window.addEventListener('keydown', kd);
    return () => { clearTimeout(t); window.removeEventListener('keydown', kd); };
  }, [bossIntro]);

  // input
  useEffect(() => {
    const kd = (e) => {
      const g = G.current; if (!g) return;
      const k = e.key.toLowerCase();
      g.keys[k] = true;
      g.keys[e.code] = true; // physical key, layout-independent (WASD on any keyboard)
      if ((k === 'r' || e.code === 'KeyR') && g.reloading <= 0 && g.ammo < g.weapon.mag) {
        g.reloading = g.weapon.reload;
      }
      if ([' ', 'w', 'a', 's', 'd'].includes(k) || e.code.startsWith('Key') || e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    };
    const ku = (e) => { const g = G.current; if (g) { g.keys[e.key.toLowerCase()] = false; g.keys[e.code] = false; } };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, []);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pos = (e) => {
      const r = cv.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
    };
    const sticks = {}; // pointerId → move-stick or aim pointer
    const applySticks = (g) => {
      let mx = 0, my = 0, stick = null, hasAim = false;
      for (const id in sticks) {
        const s = sticks[id];
        if (s.kind === 'stick') { stick = s; mx = s.dx / 60; my = s.dy / 60; }
        else hasAim = true;
      }
      const mag = Math.hypot(mx, my);
      if (mag < 0.15) { mx = 0; my = 0; }
      else { const cl = Math.min(1, mag); mx = (mx / mag) * cl; my = (my / mag) * cl; }
      g.touchMove = { x: mx, y: my, stick };
      g.hasAimTouch = hasAim;
      g.touchFire = !!stick && !hasAim && !!g.menuAuto;
    };
    const onDown = (e) => {
      const g = G.current; if (!g) return;
      const p = pos(e);
      if (e.pointerType === 'mouse') {
        g.mouse.x = p.x; g.mouse.y = p.y; g.mouse.down = true;
        return;
      }
      if (p.x < W / 2) sticks[e.pointerId] = { kind: 'stick', ox: p.x, oy: p.y, dx: 0, dy: 0 };
      else sticks[e.pointerId] = { kind: 'aim' };
      if (sticks[e.pointerId].kind === 'aim') { g.mouse.x = p.x; g.mouse.y = p.y; g.mouse.down = true; }
      applySticks(g);
      e.preventDefault();
    };
    const onMove = (e) => {
      const g = G.current; if (!g) return;
      const p = pos(e);
      const s = sticks[e.pointerId];
      if (e.pointerType === 'mouse' || (s && s.kind === 'aim')) {
        g.mouse.x = p.x; g.mouse.y = p.y;
      }
      if (s && s.kind === 'stick') {
        s.dx = Math.max(-60, Math.min(60, p.x - s.ox));
        s.dy = Math.max(-60, Math.min(60, p.y - s.oy));
      }
      applySticks(g);
      if (e.pointerType !== 'mouse') e.preventDefault();
    };
    const onUp = (e) => {
      const g = G.current; if (!g) return;
      delete sticks[e.pointerId];
      if (e.pointerType !== 'mouse') g.mouse.down = false;
      else g.mouse.down = false;
      applySticks(g);
    };
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      cv.removeEventListener('pointerdown', onDown);
      cv.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  // loop
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let raf = 0;
    const step = (ts) => {
      const g = G.current;
      if (!g) { raf = requestAnimationFrame(step); return; }
      if (!g.last) g.last = ts;
      let dt = (ts - g.last) / 16.6667;
      g.last = ts;
      if (dt > 3) dt = 3;

      if (screen === 'playing' && !upgradeChoices && !bossIntro) update(dt);
      draw();

      raf = requestAnimationFrame(step);
    };

    const spawnEnemy = (type, x, y, wave) => {
      const d = G.current ? G.current.diff : DIFFICULTIES[0];
      const base = { x, y, r: 16, hp: 1, maxHp: 1, speed: 1.1, dmg: 8, type, t: 0, shootT: 0, color: '#f87171', score: 50 };
      if (type === 'grunt') { Object.assign(base, { hp: 3 + Math.floor(wave / 2), maxHp: 3 + Math.floor(wave / 2), speed: 1.25 + wave * 0.05, color: '#f87171', score: 50 }); }
      if (type === 'shooter') { Object.assign(base, { hp: 4 + wave, maxHp: 4 + wave, speed: 0.85, color: '#c084fc', score: 90, shootT: 60 }); base.r = 14; }
      if (type === 'tank') { Object.assign(base, { hp: 14 + wave * 3, maxHp: 14 + wave * 3, speed: 0.75, color: '#fb923c', r: 26, dmg: 16, score: 160 }); }
      if (type === 'boss') {
        const kinds = ['titan', 'blitz', 'hive'];
        base.bossKind = kinds[Math.floor(Math.random() * kinds.length)];
        Object.assign(base, { hp: 120 + wave * 30, maxHp: 120 + wave * 30, speed: 1.0, color: '#ef4444', r: 48, dmg: 22, score: 1200, shootT: 40 });
        if (base.bossKind === 'blitz') { base.hp = base.maxHp = Math.ceil(base.hp * 0.6); base.speed = 1.6; base.dmg = 26; base.color = '#fb923c'; base.score = 1000; }
        if (base.bossKind === 'hive') { base.hp = base.maxHp = Math.ceil(base.hp * 0.8); base.speed = 0.85; base.dmg = 16; base.color = '#f472b6'; base.score = 1400; base.shootT = 50; }
      }
      if (type === 'dasher') { Object.assign(base, { hp: 3 + Math.floor(wave / 2), maxHp: 3 + Math.floor(wave / 2), speed: 1.7, color: '#facc15', r: 13, dmg: 12, score: 120, dashT: 120 }); }
      if (type === 'bomber') { Object.assign(base, { hp: 3 + Math.floor(wave / 2), maxHp: 3 + Math.floor(wave / 2), speed: 0.95, color: '#a3e635', r: 15, dmg: 18, score: 130 }); }
      if (type === 'summoner') { Object.assign(base, { hp: 6 + wave, maxHp: 6 + wave, speed: 0.75, color: '#f472b6', r: 16, dmg: 8, score: 200, shootT: 240 }); }
      base.hp = Math.ceil(base.hp * d.eHp);
      base.maxHp = Math.ceil(base.maxHp * d.eHp);
      base.speed *= d.eSpeed;
      base.dmg = Math.round(base.dmg * d.dmg);
      return base;
    };

    const pickSpawn = () => {
      const side = Math.floor(Math.random() * 4);
      const m = 40;
      if (side === 0) return { x: m + Math.random() * (W - 2 * m), y: m };
      if (side === 1) return { x: W - m, y: m + Math.random() * (H - 2 * m) };
      if (side === 2) return { x: m + Math.random() * (W - 2 * m), y: H - m };
      return { x: m, y: m + Math.random() * (H - 2 * m) };
    };

    const update = (dt) => {
      const g = G.current;
      g.t += dt;
      const clusterBoom = (x, y, color) => {
        for (let k = 0; k < 6; k++) {
          const a2 = (k / 6) * Math.PI * 2;
          g.bullets.push({ x, y, vx: Math.cos(a2) * 2.6, vy: Math.sin(a2) * 2.6, dmg: 0, enemy: true, life: 90, r: 5, color });
        }
        sfx.explosion();
      };
      if (g.flash > 0) g.flash -= dt;
      // ambient dust drift
      for (const d of g.dust) {
        d.x += d.vx * dt; d.y += d.vy * dt;
        if (d.x < -4) { d.x = W + 4; d.y = Math.random() * H; }
        if (d.y < -4) d.y = H + 4;
        if (d.y > H + 4) d.y = -4;
      }
      // player trail
      if (g.moving && Math.random() < 0.4) spawnParticles(g, g.px, g.py, '#3B82F6', 1, 2);

      // player movement
      let mx = 0, my = 0;
      if (g.keys['w'] || g.keys['KeyW'] || g.keys['arrowup'] || g.keys['ArrowUp']) my -= 1;
      if (g.keys['s'] || g.keys['KeyS'] || g.keys['arrowdown'] || g.keys['ArrowDown']) my += 1;
      if (g.keys['a'] || g.keys['KeyA'] || g.keys['arrowleft'] || g.keys['ArrowLeft']) mx -= 1;
      if (g.keys['d'] || g.keys['KeyD'] || g.keys['arrowright'] || g.keys['ArrowRight']) mx += 1;
      if (g.touchMove) {
        mx = mx || g.touchMove.x;
        my = my || g.touchMove.y;
      }
      // auto-aim (only while the Auto-Shoot option is on)
      if (g.menuAuto && g.enemies.length && !(g.touchMove && g.hasAimTouch)) {
        let ne = null, nd = Infinity;
        for (const e of g.enemies) { const d = (e.x - g.px) ** 2 + (e.y - g.py) ** 2; if (d < nd) { nd = d; ne = e; } }
        if (ne) { g.mouse.x = ne.x; g.mouse.y = ne.y; }
      }
      const len = Math.hypot(mx, my) || 1;
      g.moving = mx !== 0 || my !== 0;
      const adren = g.adren ? (1 - g.hp / g.maxHp) * 0.35 : 0;
      g.px += (mx / len) * g.speed * (1 + adren) * dt;
      g.py += (my / len) * g.speed * (1 + adren) * dt;
      g.px = Math.max(ARENA.x + PLAYER_R, Math.min(ARENA.x + ARENA.w - PLAYER_R, g.px));
      g.py = Math.max(ARENA.y + PLAYER_R, Math.min(ARENA.y + ARENA.h - PLAYER_R, g.py));
      // arena props (cover blocks)
      for (const p of g.props) {
        const cx = Math.max(p.x, Math.min(g.px, p.x + p.w));
        const cy = Math.max(p.y, Math.min(g.py, p.y + p.h));
        const dpx = g.px - cx, dpy = g.py - cy;
        const dd = dpx * dpx + dpy * dpy;
        if (dd < PLAYER_R * PLAYER_R) {
          if (dd === 0) { g.px = p.x - PLAYER_R; }
          else { const dl = Math.sqrt(dd); g.px = cx + (dpx / dl) * PLAYER_R; g.py = cy + (dpy / dl) * PLAYER_R; }
        }
      }
      g.angle = Math.atan2(g.mouse.y - g.py, g.mouse.x - g.px);

      // shooting
      if (g.reloading > 0) g.reloading -= dt * 16.6667;
      if (g.reloading <= 0 && g.ammo <= 0) { g.ammo = g.weapon.mag; sfx.blip(); }
      if ((g.mouse.down || g.auto || g.menuAuto || g.touchFire) && g.reloading <= 0 && g.ammo > 0 && performance.now() - g.lastShot >= g.weapon.rate) {
        g.lastShot = performance.now();
        g.ammo--;
        const count = g.weapon.split;
        g.stats.shots += count;
        const spreadTotal = (count - 1) * 0.12;
        for (let i = 0; i < count; i++) {
          const a = g.angle - spreadTotal / 2 + i * 0.12;
          g.bullets.push({ x: g.px + Math.cos(g.angle) * 16, y: g.py + Math.sin(g.angle) * 16, vx: Math.cos(a) * g.weapon.bSpeed, vy: Math.sin(a) * g.weapon.bSpeed, dmg: g.weapon.dmg, pierce: g.weapon.pierce, hit: new Set(), life: 80, bR: g.bR || 0 });
        }
        g.flash = 4;
        sfx.shoot();
        if (g.ammo <= 0) g.reloading = g.weapon.reload;
      }

      // bullets
      for (let i = g.bullets.length - 1; i >= 0; i--) {
        const b = g.bullets[i];
        if (b.enemy) continue; // enemy bullets are handled in their own loop below
        if (g.homing && g.enemies.length) {
          let ne = null, nd = Infinity;
          for (const e of g.enemies) { const d = (e.x - b.x) ** 2 + (e.y - b.y) ** 2; if (d < nd) { nd = d; ne = e; } }
          if (ne) {
            const sp = Math.hypot(b.vx, b.vy);
            const want = Math.atan2(ne.y - b.y, ne.x - b.x);
            const cur = Math.atan2(b.vy, b.vx);
            let diff = want - cur;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            const turn = Math.max(-0.07 * dt, Math.min(0.07 * dt, diff));
            b.vx = Math.cos(cur + turn) * sp; b.vy = Math.sin(cur + turn) * sp;
          }
        }
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0) { g.bullets.splice(i, 1); continue; }
        if (b.x < 0 || b.x > W || b.y < 0 || b.y > H) {
          if (g.ricochet && !b.bounced) {
            b.bounced = true;
            if (b.x < 0 || b.x > W) b.vx *= -1;
            if (b.y < 0 || b.y > H) b.vy *= -1;
            b.x = Math.max(0, Math.min(W, b.x)); b.y = Math.max(0, Math.min(H, b.y));
          } else { g.bullets.splice(i, 1); continue; }
        }
        // props block bullets
        let hitProp = false;
        for (const p of g.props) {
          if (b.x > p.x - 4 && b.x < p.x + p.w + 4 && b.y > p.y - 4 && b.y < p.y + p.h + 4) { hitProp = true; break; }
        }
        if (hitProp) { spawnParticles(g, b.x, b.y, '#22d3ee', 4, 2); g.bullets.splice(i, 1); continue; }
        for (const e of g.enemies) {
          if (b.hit.has(e)) continue;
          if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + 8 + (b.bR || 0)) {
            if (e.type === 'boss' && (e.invulnT || 0) > 0) continue; // shielded boss phase
            let dmg = b.dmg;
            if (e.type === 'boss') dmg *= 1 + (g.bossDmg || 0);
            if (g.crit && Math.random() < g.crit) { dmg *= (g.critMult || 2); spawnParticles(g, e.x, e.y, '#fbbf24', 5); }
            e.hp -= dmg;
            g.stats.hits++;
            g.stats.dmg += dmg;
            if (g.knock) {
              const m = Math.hypot(b.vx, b.vy) || 1;
              e.x += (b.vx / m) * g.knock; e.y += (b.vy / m) * g.knock;
            }
            if (g.lifeHit) g.hp = Math.min(g.maxHp, g.hp + g.lifeHit);
            b.hit.add(e);
            onBulletHit(g, b, e);
            spawnParticles(g, b.x, b.y, e.color, e.type === 'boss' ? 9 : 4, 2);
            if (e.hp <= 0) {} else if (b.pierce <= 0) { g.bullets.splice(i, 1); break; }
            b.pierce--;
          }
        }
      }

      // enemy spawn
      if (g.toSpawn > 0 && g.enemies.length < 260) {
        g.spawnTimer -= dt;
        if (g.spawnTimer <= 0) {
          const p = pickSpawn();
          const type = g.bossActive ? 'boss' : pickEnemyType(g.wave);
          g.enemies.push(spawnEnemy(type, p.x, p.y, g.wave));
          g.toSpawn--;
          g.spawnTimer = g.bossActive ? 0 : 12;
        }
      }

      // enemies
      for (let i = g.enemies.length - 1; i >= 0; i--) {
        const e = g.enemies[i];
        e.t += dt;
        if (e.burnT > 0) { e.burnT -= dt; e.hp -= (4 / 60) * dt; if (Math.random() < 0.06) spawnParticles(g, e.x, e.y, '#a3e635', 1); }
        if (e.slowT > 0) e.slowT -= dt;
        const eSpeed = e.speed * (e.slowT > 0 ? (g.slowPower || 0.65) : 1) * (g.chrono ? 0.8 : 1) * (g.chronoSlow || 1);
        const dx = g.px - e.x, dy = g.py - e.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (e.type === 'shooter') {
          // keep distance, shoot
          const ideal = 220;
          if (dist > ideal + 30) { e.x += (dx / dist) * eSpeed * dt; e.y += (dy / dist) * eSpeed * dt; }
          else if (dist < ideal - 30) { e.x -= (dx / dist) * eSpeed * dt; e.y -= (dy / dist) * eSpeed * dt; }
          e.shootT -= dt;
          if (e.shootT <= 0) {
            e.shootT = 90;
            g.bullets.push({ x: e.x, y: e.y, vx: (dx / dist) * 4.5, vy: (dy / dist) * 4.5, dmg: 0, enemy: true, life: 140, r: 5, color: '#c084fc' });
          }
        } else if (e.type === 'boss') {
          const ab = e.ability || 'ring';
          const bossShoot = (a, sp, r = 6, heal = false, cluster = false, life = 200) =>
            g.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: 0, enemy: true, life, r, color: e.color, heal, cluster });
          if ((e.invulnT || 0) > 0) e.invulnT -= dt;
          const aim = Math.atan2(dy, dx);
          if (ab === 'dash' || ab === 'ringdash' || ab === 'stomp') {
            e.dashT = (e.dashT == null ? 90 : e.dashT) - dt;
            if ((e.dashLeft || 0) > 0) {
              e.dashLeft -= dt;
              e.x += e.dashVx * dt; e.y += e.dashVy * dt;
              if (e.dashLeft <= 0 && ab !== 'dash') {
                const nk = ab === 'stomp' ? 10 : 12;
                for (let k = 0; k < nk; k++) bossShoot((k / nk) * Math.PI * 2, 3.2);
                g.rings.push({ x: e.x, y: e.y, r: 20, max: 150, life: 14, color: e.color });
                sfx.explosion();
              }
            } else {
              e.x += (dx / dist) * eSpeed * 0.55 * dt;
              e.y += (dy / dist) * eSpeed * 0.55 * dt;
              if (e.dashT <= 0 && dist < 420) {
                e.dashT = ab === 'stomp' ? 170 : 140; e.dashLeft = 26;
                e.dashVx = (dx / dist) * 9; e.dashVy = (dy / dist) * 9;
                sfx.blip();
              }
            }
          } else if (ab === 'summon' || ab === 'ultimate') {
            if (dist < 260) { e.x -= (dx / dist) * eSpeed * dt; e.y -= (dy / dist) * eSpeed * dt; }
            else if (dist > 340) { e.x += (dx / dist) * eSpeed * dt; e.y += (dy / dist) * eSpeed * dt; }
            e.shootT -= dt;
            if (e.shootT <= 0 && g.enemies.length < 26) {
              e.shootT = ab === 'ultimate' ? 170 : 110;
              for (let s = 0; s < (ab === 'ultimate' ? 2 : 3); s++) {
                g.enemies.push(spawnEnemy('grunt', Math.max(40, Math.min(W - 40, e.x + (Math.random() - 0.5) * 140)), Math.max(40, Math.min(H - 40, e.y + (Math.random() - 0.5) * 140)), g.wave));
              }
              spawnParticles(g, e.x, e.y, e.color, 10, 2);
            }
            if (ab === 'ultimate') {
              // MYTHIC ULTIMATE: telegraphed rainbow beam
              e.ultT = (e.ultT || 0) - dt;
              if (e.ultT <= 0) { e.ultT = 440; e.ultWarn = 55; e.ultHit = false; e.ultAng = aim; }
              if ((e.ultWarn || 0) > 0) {
                e.ultWarn -= dt;
                if (e.ultWarn <= 0) { e.ultFire = 26; sfx.boss(); g.rings.push({ x: e.x, y: e.y, r: 30, max: 300, life: 18, color: '#e879f9' }); }
              }
              if ((e.ultFire || 0) > 0) {
                e.ultFire -= dt;
                const relx = g.px - e.x, rely = g.py - e.y;
                const along = relx * Math.cos(e.ultAng) + rely * Math.sin(e.ultAng);
                const perp = Math.abs(-relx * Math.sin(e.ultAng) + rely * Math.cos(e.ultAng));
                if (along > 0 && perp < 42 && !e.ultHit) {
                  e.ultHit = true;
                  damagePlayer(g, Math.round(40 * g.diff.dmg));
                }
              }
            }
          } else if (ab === 'spiral') {
            e.x += (dx / dist) * eSpeed * 0.6 * dt; e.y += (dy / dist) * eSpeed * 0.6 * dt;
            e.shootT -= dt;
            if (e.shootT <= 0) { e.shootT = 7; e.spiralA = (e.spiralA || 0) + 0.42; bossShoot(e.spiralA, 3, 5); }
          } else if (ab === 'nova') {
            e.x += (dx / dist) * eSpeed * 0.6 * dt; e.y += (dy / dist) * eSpeed * 0.6 * dt;
            e.shootT -= dt;
            if (e.shootT <= 0) {
              e.shootT = 260;
              for (let k = 0; k < 24; k++) bossShoot((k / 24) * Math.PI * 2, 2.6, 5);
              g.rings.push({ x: e.x, y: e.y, r: 10, max: 140, life: 14, color: e.color });
              sfx.boss();
            }
          } else if (ab === 'teleport') {
            e.x += (dx / dist) * eSpeed * 0.7 * dt; e.y += (dy / dist) * eSpeed * 0.7 * dt;
            e.shootT -= dt;
            if (e.shootT <= 0) {
              e.shootT = 150;
              spawnParticles(g, e.x, e.y, e.color, 12, 2);
              const p2 = randSpawnPoint();
              e.x = p2.x; e.y = p2.y;
              spawnParticles(g, e.x, e.y, e.color, 12, 2);
              for (let k = 0; k < 6; k++) bossShoot((k / 6) * Math.PI * 2, 3, 5);
              sfx.blip();
            }
          } else if (ab === 'zigzag') {
            const perpX = -dy / dist, perpY = dx / dist;
            const wob = Math.sin(e.t * 0.15) * 0.8;
            e.x += ((dx / dist) + perpX * wob) * eSpeed * dt;
            e.y += ((dy / dist) + perpY * wob) * eSpeed * dt;
            e.shootT -= dt;
            if (e.shootT <= 0) { e.shootT = 80; bossShoot(aim, 4.2, 5); }
          } else if (ab === 'vampire') {
            e.x += (dx / dist) * eSpeed * dt; e.y += (dy / dist) * eSpeed * dt;
            e.shootT -= dt;
            if (e.shootT <= 0) { e.shootT = 70; bossShoot(aim, 3.6, 6, true); }
          } else if (ab === 'snipe') {
            e.x += (dx / dist) * eSpeed * 0.5 * dt; e.y += (dy / dist) * eSpeed * 0.5 * dt;
            e.shootT -= dt;
            if (e.shootT <= 0) { e.shootT = 130; e.lockAng = aim; e.lockT = 45; }
            if ((e.lockT || 0) > 0) {
              e.lockT -= dt;
              if (e.lockT <= 0) bossShoot(e.lockAng, 9, 6);
            }
          } else if (ab === 'bomblets') {
            e.x += (dx / dist) * eSpeed * 0.7 * dt; e.y += (dy / dist) * eSpeed * 0.7 * dt;
            e.shootT -= dt;
            if (e.shootT <= 0) { e.shootT = 110; bossShoot(aim + (Math.random() - 0.5) * 0.6, 2.2, 8, false, true, 70); }
          } else if (ab === 'quake') {
            e.x += (dx / dist) * eSpeed * dt; e.y += (dy / dist) * eSpeed * dt;
            e.shootT -= dt;
            if (e.shootT <= 0) {
              e.shootT = 180;
              for (let k = 0; k < 14; k++) bossShoot((k / 14) * Math.PI * 2, 1.8, 6);
              g.rings.push({ x: e.x, y: e.y, r: 20, max: 200, life: 16, color: e.color });
              sfx.explosion();
            }
          } else if (ab === 'shielded') {
            e.x += (dx / dist) * eSpeed * dt; e.y += (dy / dist) * eSpeed * dt;
            e.shootT -= dt;
            if (e.shootT <= 0) {
              e.shootT = 60;
              if (e.invulnT <= 0 && Math.random() < 0.5) { e.invulnT = 90; spawnParticles(g, e.x, e.y, '#94a3b8', 10, 2); }
              else bossShoot(aim, 3.4, 5);
            }
          } else if (ab === 'wall') {
            e.x += (dx / dist) * eSpeed * 0.6 * dt; e.y += (dy / dist) * eSpeed * 0.6 * dt;
            e.shootT -= dt;
            if (e.shootT <= 0) {
              e.shootT = 210;
              const vertical = Math.random() < 0.5;
              for (let k = -3; k <= 3; k++) {
                const off = k * 0.16;
                bossShoot(vertical ? off : Math.PI / 2 + off, 2.6, 5, false, false, 260);
                bossShoot(vertical ? Math.PI + off : -Math.PI / 2 + off, 2.6, 5, false, false, 260);
              }
              sfx.boss();
            }
          } else if (ab === 'regen') {
            e.x += (dx / dist) * eSpeed * dt; e.y += (dy / dist) * eSpeed * dt;
            e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.0009 * dt);
            e.shootT -= dt;
            if (e.shootT <= 0) { e.shootT = 100; for (let k = 0; k < 5; k++) bossShoot((k / 5) * Math.PI * 2 + e.t * 0.03, 3, 5); }
          } else if (ab === 'burst') {
            e.x += (dx / dist) * eSpeed * 0.8 * dt; e.y += (dy / dist) * eSpeed * 0.8 * dt;
            e.shootT -= dt;
            if (e.shootT <= 0) { e.shootT = 150; e.burstN = 6; }
            if ((e.burstN || 0) > 0) {
              e.burstCd = (e.burstCd || 0) - dt;
              if (e.burstCd <= 0) { e.burstCd = 6; e.burstN--; bossShoot(aim + (Math.random() - 0.5) * 0.2, 4.6, 5); }
            }
          } else if (ab === 'void') {
            e.x += (dx / dist) * eSpeed * 0.5 * dt; e.y += (dy / dist) * eSpeed * 0.5 * dt;
            e.pullT = (e.pullT == null ? 120 : e.pullT) - dt;
            if (e.pullT <= 0 && e.pullT > -70) {
              g.px += (dx / dist) * 1.4 * dt; g.py += (dy / dist) * 1.4 * dt;
            } else if (e.pullT <= -70) e.pullT = 210;
            e.shootT -= dt;
            if (e.shootT <= 0) { e.shootT = 90; for (let k = 0; k < 8; k++) bossShoot((k / 8) * Math.PI * 2, 3.2, 5); }
          } else if (ab === 'spread') {
            e.x += (dx / dist) * eSpeed * dt; e.y += (dy / dist) * eSpeed * dt;
            e.shootT -= dt;
            if (e.shootT <= 0) { e.shootT = 80; for (let k = -1; k <= 1; k++) bossShoot(aim + k * 0.3, 3.8, 5); }
          } else if (ab === 'twinSpiral') {
            e.x += (dx / dist) * eSpeed * 0.5 * dt; e.y += (dy / dist) * eSpeed * 0.5 * dt;
            e.shootT -= dt;
            if (e.shootT <= 0) {
              e.shootT = 6;
              e.spiralA = (e.spiralA || 0) + 0.5;
              bossShoot(e.spiralA, 3.4, 5);
              bossShoot(-e.spiralA, 3.4, 5);
            }
          } else if (ab === 'crossfire') {
            e.x += (dx / dist) * eSpeed * 0.6 * dt; e.y += (dy / dist) * eSpeed * 0.6 * dt;
            e.shootT -= dt;
            if (e.shootT <= 0) {
              e.shootT = 70;
              for (let k = 0; k < 4; k++) bossShoot((k / 4) * Math.PI * 2 + e.t * 0.03, 4, 5);
              for (let k = -1; k <= 1; k++) bossShoot(aim + k * 0.25, 4.6, 6);
            }
          } else if (ab === 'brood') {
            if (dist < 240) { e.x -= (dx / dist) * eSpeed * dt; e.y -= (dy / dist) * eSpeed * dt; }
            else if (dist > 360) { e.x += (dx / dist) * eSpeed * dt; e.y += (dy / dist) * eSpeed * dt; }
            e.shootT -= dt;
            if (e.shootT <= 0 && g.enemies.length < 30) {
              e.shootT = 90;
              for (let s = 0; s < 3; s++) {
                g.enemies.push(spawnEnemy(Math.random() < 0.5 ? 'shooter' : 'grunt', Math.max(40, Math.min(W - 40, e.x + (Math.random() - 0.5) * 160)), Math.max(40, Math.min(H - 40, e.y + (Math.random() - 0.5) * 160)), g.wave));
              }
              spawnParticles(g, e.x, e.y, e.color, 12, 2);
            }
          } else if (ab === 'reap') {
            e.x += (dx / dist) * eSpeed * dt; e.y += (dy / dist) * eSpeed * dt;
            e.shootT -= dt;
            if (e.shootT <= 0) { e.shootT = 26; bossShoot(aim + (Math.random() - 0.5) * 0.15, 6.5, 5); }
          } else if (ab === 'siege') {
            e.x += (dx / dist) * eSpeed * 0.5 * dt; e.y += (dy / dist) * eSpeed * 0.5 * dt;
            e.shootT -= dt;
            if (e.shootT <= 0) {
              e.shootT = 120;
              e.siegeN = (e.siegeN || 0) + 1;
              if (e.siegeN % 2 === 0) {
                for (let k = 0; k < 16; k++) bossShoot((k / 16) * Math.PI * 2, 2.4, 6);
                g.rings.push({ x: e.x, y: e.y, r: 20, max: 220, life: 16, color: e.color });
                sfx.boss();
              } else {
                for (let k = -3; k <= 3; k++) bossShoot(aim + k * 0.18, 4.2, 5);
              }
            }
          } else if (ab === 'storm') {
            e.x += (dx / dist) * eSpeed * 0.8 * dt; e.y += (dy / dist) * eSpeed * 0.8 * dt;
            e.shootT -= dt;
            if (e.shootT <= 0) {
              e.shootT = 45;
              e.stormN = (e.stormN || 0) + 1;
              if (e.stormN % 5 === 0) { for (let k = 0; k < 12; k++) bossShoot((k / 12) * Math.PI * 2, 3, 5); }
              else { bossShoot(aim, 7, 5); bossShoot(aim - 0.12, 7, 5); bossShoot(aim + 0.12, 7, 5); }
            }
          } else if (ab === 'annihilate') {
            e.x += (dx / dist) * eSpeed * 0.5 * dt; e.y += (dy / dist) * eSpeed * 0.5 * dt;
            e.shootT -= dt;
            if (e.shootT <= 0) {
              e.shootT = 9;
              e.spiralA = (e.spiralA || 0) + 0.55;
              for (let k = 0; k < 3; k++) bossShoot(e.spiralA + (k / 3) * Math.PI * 2, 3.6, 5);
              if (Math.random() < 0.06) { for (let k = 0; k < 16; k++) bossShoot((k / 16) * Math.PI * 2, 2.8, 6); sfx.boss(); }
            }
          } else if (ab === 'wyrm') {
            const perpX = -dy / dist, perpY = dx / dist;
            const wob = Math.sin(e.t * 0.2) * 1.1;
            e.x += ((dx / dist) + perpX * wob) * eSpeed * dt;
            e.y += ((dy / dist) + perpY * wob) * eSpeed * dt;
            e.shootT -= dt;
            if (e.shootT <= 0) { e.shootT = 16; bossShoot(aim, 5.5, 4, false, false, 300); }
          } else {
            // titan: ring shots
            e.x += (dx / dist) * eSpeed * dt;
            e.y += (dy / dist) * eSpeed * dt;
            e.shootT -= dt;
            if (e.shootT <= 0) {
              e.shootT = 50;
              for (let k = 0; k < 8; k++) bossShoot((k / 8) * Math.PI * 2 + e.t * 0.02, 3.4);
            }
          }
        } else if (e.type === 'dasher') {
          e.dashT -= dt;
          if ((e.dashT || 0) <= 0 && dist < 340) {
            e.dashT = 150;
            e.dashVx = (dx / dist) * 5.2; e.dashVy = (dy / dist) * 5.2; e.dashLeft = 26;
            sfx.blip();
          }
          if (e.dashLeft > 0) { e.dashLeft -= dt; e.x += e.dashVx * dt; e.y += e.dashVy * dt; }
          else { e.x += (dx / dist) * eSpeed * dt; e.y += (dy / dist) * eSpeed * dt; }
        } else if (e.type === 'bomber') {
          e.x += (dx / dist) * eSpeed * dt;
          e.y += (dy / dist) * eSpeed * dt;
          if (dist < 90) {
            e.fuse = (e.fuse == null ? 70 : e.fuse - dt);
            if (e.fuse <= 0) e.hp = 0; // detonates in the kill loop
          }
        } else if (e.type === 'summoner') {
          const ideal = 280;
          if (dist > ideal + 30) { e.x += (dx / dist) * eSpeed * dt; e.y += (dy / dist) * eSpeed * dt; }
          else if (dist < ideal - 30) { e.x -= (dx / dist) * eSpeed * dt; e.y -= (dy / dist) * eSpeed * dt; }
          e.shootT -= dt;
          if (e.shootT <= 0 && g.enemies.length < 24) {
            e.shootT = 240;
            for (let s = 0; s < 2; s++) {
              const ang = Math.random() * Math.PI * 2;
              g.enemies.push(spawnEnemy('grunt', Math.max(40, Math.min(W - 40, e.x + Math.cos(ang) * 44)), Math.max(40, Math.min(H - 40, e.y + Math.sin(ang) * 44)), g.wave));
            }
            spawnParticles(g, e.x, e.y, '#f472b6', 12);
            sfx.boss();
          }
        } else {
          e.x += (dx / dist) * eSpeed * dt;
          e.y += (dy / dist) * eSpeed * dt;
        }

        // arena props push (enemies)
        for (const p of g.props) {
          const cx = Math.max(p.x, Math.min(e.x, p.x + p.w));
          const cy = Math.max(p.y, Math.min(e.y, p.y + p.h));
          const dpx = e.x - cx, dpy = e.y - cy;
          const dd = dpx * dpx + dpy * dpy;
          if (dd < e.r * e.r) {
            if (dd === 0) { e.x = p.x - e.r; }
            else { const dl = Math.sqrt(dd); e.x = cx + (dpx / dl) * e.r; e.y = cy + (dpy / dl) * e.r; }
          }
        }

        // contact damage
        if (e.type !== 'shooter') {
          e.pokeCd = Math.max(0, (e.pokeCd || 0) - dt);
          if (Math.hypot(e.x - g.px, e.y - g.py) < e.r + PLAYER_R - 8) {
            if (g.thorns) { e.hp -= g.thorns; spawnParticles(g, e.x, e.y, '#e2e8f0', 4); }
            if ((e.pokeCd || 0) <= 0) {
              if (e.type === 'dasher') {
                e.pokeCd = 50;
                damagePlayer(g, e.dashLeft > 0 ? Math.round(13 * g.diff.dmg) : Math.max(2, Math.round(e.dmg * 0.3)));
              } else if (e.type === 'boss') {
                e.pokeCd = 45;
                damagePlayer(g, e.dmg);
              } else {
                damagePlayer(g, e.dmg);
                g.enemies.splice(i, 1);
                continue;
              }
            }
          }
        }
      }

      // enemy bullets
      for (let i = g.bullets.length - 1; i >= 0; i--) {
        const b = g.bullets[i];
        if (!b.enemy) continue;
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        let gone = b.life <= 0 || b.x < 0 || b.x > W || b.y < 0 || b.y > H;
        if (!gone) {
          for (const p of g.props) {
            if (b.x > p.x - 4 && b.x < p.x + p.w + 4 && b.y > p.y - 4 && b.y < p.y + p.h + 4) { gone = true; break; }
          }
        }
        if (gone) {
          g.bullets.splice(i, 1);
          if (b.cluster) clusterBoom(b.x, b.y, b.color);
          continue;
        }
        if (Math.hypot(b.x - g.px, b.y - g.py) < PLAYER_R + (b.r || 4) - 4) {
          damagePlayer(g, 10 * g.diff.dmg);
          if (b.heal) {
            const boss = g.enemies.find((en) => en.type === 'boss');
            if (boss) boss.hp = Math.min(boss.maxHp, boss.hp + 8);
          }
          g.bullets.splice(i, 1);
        }
      }

      // remove dead enemies
      for (let i = g.enemies.length - 1; i >= 0; i--) {
        const e = g.enemies[i];
        if (e.hp <= 0) {
          g.enemies.splice(i, 1);
          if (e.type === 'bomber') explodeAt(g, e.x, e.y, 160, Math.round(e.dmg * 2));
          g.kills++;
          g.score += Math.round(e.score * g.mult * g.diff.scoreMult * (1 + (g.scoreBoost || 0)));
          g.mult = Math.min(5, g.mult + 0.1);
          g.multTimer = 180;
          spawnParticles(g, e.x, e.y, e.color, e.type === 'boss' ? 60 : 22, 2);
          sfx.explosion();
          addXp(3);
          if (g.vamp) g.hp = Math.min(g.maxHp, g.hp + 4);
          if (g.vampHeal) g.hp = Math.min(g.maxHp, g.hp + g.vampHeal);
          if (g.chain) {
            let zapped = 0;
            for (const o of g.enemies) {
              if (o !== e && zapped < 3 && Math.hypot(o.x - e.x, o.y - e.y) < 160) {
                o.hp -= 25; zapped++;
                for (let s = 1; s < 6; s++) {
                  spawnParticles(g, e.x + (o.x - e.x) * (s / 6), e.y + (o.y - e.y) * (s / 6), '#60A5FA', 1);
                }
              }
            }
          }
          if (e.type === 'boss') {
            recordBossDefeat('grid-assault');
            g.stats.bossKills++;
            g.rings.push({ x: e.x, y: e.y, r: 24, max: 180, life: 22, color: e.color });
            // drop big loot
            g.drops.push({ x: e.x, y: e.y, type: 'health', t: 0 });
            g.drops.push({ x: e.x + 30, y: e.y, type: 'ammo', t: 0 });
          } else if (Math.random() < 0.12 * (g.luck || 1)) {
            g.drops.push({ x: e.x, y: e.y, type: Math.random() < 0.5 ? 'health' : 'ammo', t: 0 });
          }
        }
      }

      // regen & storm aura
      if (g.regen) g.hp = Math.min(g.maxHp, g.hp + g.regen * (dt / 60));
      if (g.aura) {
        for (const e of g.enemies) {
          if (Math.hypot(e.x - g.px, e.y - g.py) < 110) e.hp -= g.aura * (dt / 60);
        }
      }

      // orbiting drones
      if (g.orbs) {
        g.orbAng = (g.orbAng || 0) + 0.05 * dt;
        g.orbT = (g.orbT || 0) - dt;
        if (g.orbT <= 0 && g.enemies.length) {
          g.orbT = 90;
          for (let k = 0; k < g.orbs; k++) {
            const ox = g.px + Math.cos(g.orbAng + (k / g.orbs) * Math.PI * 2) * 42;
            const oy = g.py + Math.sin(g.orbAng + (k / g.orbs) * Math.PI * 2) * 42;
            let ne = null, nd = Infinity;
            for (const e of g.enemies) { const d = (e.x - ox) ** 2 + (e.y - oy) ** 2; if (d < nd) { nd = d; ne = e; } }
            if (ne) {
              const ang = Math.atan2(ne.y - oy, ne.x - ox);
              g.bullets.push({ x: ox, y: oy, vx: Math.cos(ang) * g.weapon.bSpeed, vy: Math.sin(ang) * g.weapon.bSpeed, dmg: g.weapon.dmg * 0.6, pierce: 0, hit: new Set(), life: 70, bR: g.bR || 0 });
            }
          }
          sfx.shoot();
        }
      }

      // melee weapon auto-swing
      if (g.melee) {
        const nowMs = performance.now();
        if (nowMs - g.melee.last >= g.melee.rateMs) {
          const targetNear = g.enemies.some((e) => Math.hypot(e.x - g.px, e.y - g.py) < g.melee.range + e.r);
          if (targetNear) {
            g.melee.last = nowMs;
            g.melee.fx = 12;
            for (const e of g.enemies) {
              const d = Math.hypot(e.x - g.px, e.y - g.py);
              if (d < g.melee.range + e.r) {
                let diff = Math.abs(Math.atan2(e.y - g.py, e.x - g.px) - g.angle);
                if (diff > Math.PI) diff = Math.PI * 2 - diff;
                if (diff < g.melee.arc / 2) {
                  e.hp -= g.melee.dmg;
                  spawnParticles(g, e.x, e.y, '#e2e8f0', 6);
                }
              }
            }
            sfx.shoot();
          }
        }
        if (g.melee.fx > 0) g.melee.fx -= dt;
      }

      // shield recharge
      if (g.shield && g.shield.charges < g.shield.max) {
        g.shield.timer -= dt;
        if (g.shield.timer <= 0) { g.shield.charges++; g.shield.timer = g.shield.recharge; }
      }

      // judgment beam
      if (g.beamCd != null) {
        g.beamCd -= dt;
        if (g.beamCd <= 0) {
          g.beamCd = 360;
          let ne = null, nd = Infinity;
          for (const e of g.enemies) { const d = (e.x - g.px) ** 2 + (e.y - g.py) ** 2; if (d < nd) { nd = d; ne = e; } }
          if (ne) {
            g.beamFx = { x: ne.x, y: ne.y, life: 20 };
            const sx = ne.x - g.px, sy = ne.y - g.py;
            const len2 = sx * sx + sy * sy || 1;
            for (const e of g.enemies) {
              const t2 = Math.max(0, Math.min(1, ((e.x - g.px) * sx + (e.y - g.py) * sy) / len2));
              if (Math.hypot(e.x - (g.px + sx * t2), e.y - (g.py + sy * t2)) < 34) {
                e.hp -= 150;
                spawnParticles(g, e.x, e.y, '#f472b6', 10);
              }
            }
            sfx.boss();
          }
        }
        if (g.beamFx) { g.beamFx.life -= dt; if (g.beamFx.life <= 0) g.beamFx = null; }
      }

      // drops
      for (let i = g.drops.length - 1; i >= 0; i--) {
        const d = g.drops[i];
        d.t += dt;
        if (d.t > 600) { g.drops.splice(i, 1); continue; }
        if (g.magnet && Math.hypot(d.x - g.px, d.y - g.py) < 130) {
          d.x += (g.px - d.x) * 0.06 * dt;
          d.y += (g.py - d.y) * 0.06 * dt;
        }
        if (Math.hypot(d.x - g.px, d.y - g.py) < PLAYER_R + 12 + (g.pick || 0)) {
          if (d.type === 'health') { g.hp = Math.min(g.maxHp, g.hp + 25 + (g.dropHp || 0)); }
          else { g.ammo = g.weapon.mag; g.reloading = 0; }
          sfx.powerup();
          g.drops.splice(i, 1);
        }
      }

      // shock rings
      for (let i = (g.rings || []).length - 1; i >= 0; i--) {
        const r = g.rings[i];
        r.r += (r.max - r.r) * 0.22 * dt; r.life -= dt;
        if (r.life <= 0) g.rings.splice(i, 1);
      }

      // particles
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        if (p.life <= 0) g.particles.splice(i, 1);
      }

      // multiplier decay
      g.multTimer -= dt;
      if (g.multTimer <= 0 && g.mult > 1) { g.mult = Math.max(1, g.mult - 0.02 * dt); }

      // Ultimate Nova — unlocked at upgrade Lv15, recharges over 30 waves
      if (g.hasUlt && g.ultCharge >= 30 && g.enemies.length >= 4) {
        g.ultCharge = 0;
        g.bullets = g.bullets.filter((b) => !b.enemy);
        for (const e of g.enemies) {
          e.hp -= 800;
          spawnParticles(g, e.x, e.y, e.color, 10);
        }
        for (let k = 0; k < 60; k++) {
          spawnParticles(g, W / 2, H / 2, ['#ff004c', '#fff200', '#00e5ff', '#7b2bff'][k % 4], 2);
        }
        g.rings.push({ x: W / 2, y: H / 2, r: 20, max: 560, life: 26, color: '#e879f9' });
        sfx.win();
        sfx.boss();
      }

      // wave clear
      if (g.toSpawn <= 0 && g.enemies.length === 0) {
        if (g.wave >= g.diff.waves) {
          // VICTORY — the run is beaten!
          const bonus = 5000 + g.diff.waves * 100;
          g.score += bonus;
          setHighScore('grid-assault', g.score);
          addXp(100 + Math.floor(g.score / 50));
          recordWin('grid-assault');
          submitGameScore({ game: 'grid-assault', mode: g.mode, difficulty: g.diff.id, score: g.score });
          setGameOver({ score: g.score, wave: g.wave, kills: g.kills, won: true });
          setScreen('victory');
          sfx.win();
          return;
        }
        // offer upgrades
        const choices = pickUpgrades(g, 3);
        setUpgradeChoices(choices);
        setHud((h) => ({ ...h, score: g.score, mult: g.mult, hp: Math.ceil(g.hp), maxHp: g.maxHp, ammo: g.ammo, mag: g.weapon.mag }));
        return;
      }

      setHud({
        hp: Math.max(0, Math.ceil(g.hp)), maxHp: g.maxHp,
        ammo: Math.max(0, g.ammo), mag: g.weapon.mag,
        wave: g.wave, score: g.score, mult: g.mult,
        reloading: g.reloading > 0,
        ult: g.hasUlt ? Math.round((g.ultCharge / 30) * 100) : null,
      });
    };

    const damagePlayer = (g, dmg) => {
      if (Math.random() < (g.dodge || 0)) {
        spawnParticles(g, g.px, g.py, '#94a3b8', 6);
        return;
      }
      if (g.shield && g.shield.charges > 0) {
        g.shield.charges--;
        if (g.shield.charges === g.shield.max - 1) g.shield.timer = g.shield.recharge;
        sfx.paddle();
        spawnParticles(g, g.px, g.py, '#60A5FA', 8);
        return;
      }
      dmg *= (1 - (g.armor || 0));
      g.hp -= dmg;
      sfx.hurt();
      spawnParticles(g, g.px, g.py, '#3B82F6', 6);
      // defensive novas on being hit
      if (g.nova) {
        for (const e of g.enemies) {
          if (Math.hypot(e.x - g.px, e.y - g.py) < 140) { e.slowT = 150; spawnParticles(g, e.x, e.y, '#7dd3fc', 3); }
        }
      }
      if (g.shock) {
        for (const e of g.enemies) {
          if (Math.hypot(e.x - g.px, e.y - g.py) < 150) { e.hp -= g.shock; spawnParticles(g, e.x, e.y, '#60A5FA', 4); }
        }
      }
      if (g.hp <= 0) {
        if ((g.revives || 0) > 0) {
          g.revives--;
          g.hp = Math.ceil(g.maxHp * (g.revivePct || 0.5));
          sfx.powerup();
          spawnParticles(g, g.px, g.py, '#facc15', 30);
          return;
        }
        g.hp = 0;
        spawnParticles(g, g.px, g.py, '#60A5FA', 30, 2);
        setHighScore('grid-assault', g.score);
        addXp(Math.floor(g.score / 100));
        submitGameScore({ game: 'grid-assault', mode: g.mode, difficulty: g.diff.id, score: g.score });
        setGameOver({ score: g.score, wave: g.wave, kills: g.kills });
        setScreen('over');
        sfx.lose();
      }
    };

    const spawnParticles = (g, x, y, color, n, size = 3) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = Math.random() * 4 + 1;
        g.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 20 + Math.random() * 20, color, size: size * (0.4 + Math.random() * 0.8) });
      }
    };

    const onBulletHit = (g, b, e) => {
      if (g.venom) e.burnT = 180;
      if (g.bleed) e.burnT = Math.max(e.burnT || 0, 90);
      if (g.cryoHit) e.slowT = Math.max(e.slowT || 0, 45);
      if (g.frost) e.slowT = 120;
      if (g.explosive) {
        const exR = 48 + (g.exploRadius || 0);
        for (const o of g.enemies) {
          if (o !== e && !b.hit.has(o) && Math.hypot(o.x - b.x, o.y - b.y) < exR) {
            o.hp -= 15 + (g.exploPower || 0);
            b.hit.add(o);
            spawnParticles(g, o.x, o.y, '#fbbf24', 5);
          }
        }
      }
    };

    const explodeAt = (g, x, y, radius, dmg) => {
      spawnParticles(g, x, y, '#a3e635', 34, 2);
      g.rings = g.rings || [];
      g.rings.push({ x, y, r: 10, max: radius, life: 16, color: '#a3e635' });
      sfx.explosion();
      if (Math.hypot(g.px - x, g.py - y) < radius) damagePlayer(g, dmg);
    };

    const pickUpgrades = (g, n) => {
      const picks = [];
      const used = new Set();
      let guard = 0;
      while (picks.length < n && guard++ < 80) {
        const rarity = rollRarity();
        const pool = UPGRADES.filter((u) => u.rarity === rarity.id && !used.has(u.id));
        if (!pool.length) continue;
        const up = pool[Math.floor(Math.random() * pool.length)];
        used.add(up.id);
        picks.push({ up, rarity });
      }
      while (picks.length < n) {
        const pool = UPGRADES.filter((u) => !used.has(u.id));
        if (!pool.length) break;
        const up = pool[Math.floor(Math.random() * pool.length)];
        used.add(up.id);
        picks.push({ up, rarity: RARITIES[RARITY_INDEX[up.rarity]] });
      }
      return picks;
    };

    const draw = () => {
      const g = G.current; if (!g) return;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#070D1C';
      ctx.fillRect(0, 0, W, H);
      // ambient dust
      for (const d of g.dust) {
        ctx.globalAlpha = d.a;
        ctx.fillStyle = '#60A5FA';
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // grid floor
      ctx.strokeStyle = '#13203f'; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
      for (let x = 0; x < W; x += 44) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 44) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.globalAlpha = 1;
      // arena border
      ctx.strokeStyle = '#1B2A4A'; ctx.lineWidth = 2;
      ctx.strokeRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
      // corner brackets
      ctx.strokeStyle = 'rgba(96,165,250,0.55)';
      ctx.lineWidth = 3;
      const B = 26, PAD = 8;
      const corners = [[ARENA.x + PAD, ARENA.y + PAD, 1, 1], [W - ARENA.x - PAD, ARENA.y + PAD, -1, 1], [ARENA.x + PAD, H - ARENA.y - PAD, 1, -1], [W - ARENA.x - PAD, H - ARENA.y - PAD, -1, -1]];
      for (const [cx2, cy2, sx, sy] of corners) {
        ctx.beginPath();
        ctx.moveTo(cx2 + sx * B, cy2); ctx.lineTo(cx2, cy2); ctx.lineTo(cx2, cy2 + sy * B);
        ctx.stroke();
      }
      // arena props (neon cover blocks)
      for (const p of g.props) {
        ctx.fillStyle = '#0f1d3d';
        ctx.strokeStyle = '#22d3ee';
        ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 10;
        ctx.lineWidth = 2;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.strokeRect(p.x, p.y, p.w, p.h);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(34,211,238,0.25)';
        ctx.beginPath(); ctx.moveTo(p.x + 8, p.y + p.h - 8); ctx.lineTo(p.x + p.w - 8, p.y + 8); ctx.stroke();
      }

      // drops
      for (const d of g.drops) {
        const pulse = 1 + Math.sin(d.t * 0.1) * 0.15;
        ctx.fillStyle = d.type === 'health' ? '#22c55e' : '#f59e0b';
        ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.arc(d.x, d.y, 9 * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.font = 'bold 11px ui-sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(d.type === 'health' ? '+' : '•', d.x, d.y + 4);
        ctx.globalAlpha = 1;
      }

      // bullets
      for (const b of g.bullets) {
        ctx.fillStyle = b.enemy ? (b.color || '#f87171') : '#60A5FA';
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.enemy ? (b.r || 5) : 4 + (b.bR || 0) * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }

      // enemies (unique sprites per type, flipped toward the player; hitbox is slightly smaller than the visual)
      for (const e of g.enemies) {
        const spr = e.type === 'boss' ? bossSpritesRef.current[e.bossDef?.id] : enemySpritesRef.current[e.type];
        const face = g.px < e.x ? -1 : 1; // sprite art faces right
        if (e.type === 'boss') {
          ctx.fillStyle = e.color;
          ctx.globalAlpha = 0.16 + 0.1 * Math.abs(Math.sin(g.t * 0.06));
          ctx.shadowColor = e.color; ctx.shadowBlur = 30;
          ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 1.7, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
          if ((e.invulnT || 0) > 0) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 8, 0, Math.PI * 2); ctx.stroke();
          }
        }
        if (spr) {
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.scale(face, 1);
          ctx.drawImage(spr, -e.r * 1.3, -e.r * 1.3, e.r * 2.6, e.r * 2.6);
          ctx.restore();
        } else {
          ctx.fillStyle = e.color;
          ctx.shadowColor = e.color; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }
        if (e.type === 'bomber' && e.fuse != null) {
          ctx.fillStyle = `rgba(239,68,68,${0.25 + 0.35 * Math.abs(Math.sin(g.t * 0.9))})`;
          ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 7, 0, Math.PI * 2); ctx.fill();
        }
        // hp bar
        if (e.hp < e.maxHp) {
          const w = e.r * 2;
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(e.x - w / 2, e.y - e.r - 8, w, 4);
          ctx.fillStyle = '#22c55e'; ctx.fillRect(e.x - w / 2, e.y - e.r - 8, w * (e.hp / e.maxHp), 4);
        }
      }

      // shock rings
      for (const r of g.rings || []) {
        ctx.globalAlpha = Math.max(0, r.life / 20);
        ctx.strokeStyle = r.color || '#a3e635';
        ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 12;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      // particles
      for (const p of g.particles) {
        ctx.globalAlpha = Math.max(0, p.life / 30);
        ctx.fillStyle = p.color;
        const ps = p.size || 3;
        ctx.fillRect(p.x, p.y, ps, ps);
        ctx.globalAlpha = 1;
      }

      // orbiting drones
      if (g.orbs) {
        for (let k = 0; k < g.orbs; k++) {
          const ox = g.px + Math.cos((g.orbAng || 0) + (k / g.orbs) * Math.PI * 2) * 42;
          const oy = g.py + Math.sin((g.orbAng || 0) + (k / g.orbs) * Math.PI * 2) * 42;
          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(ox, oy, 6, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // energy shield ring
      if (g.shield && g.shield.charges > 0) {
        ctx.strokeStyle = 'rgba(96,165,250,0.75)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(g.px, g.py, 26 + Math.sin(g.t * 0.2) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // player
      ctx.save();
      ctx.translate(g.px, g.py);
      ctx.rotate(g.angle);
      const spr = spriteRef.current;
      if (spr) {
        ctx.shadowColor = '#3B82F6'; ctx.shadowBlur = 18;
        ctx.drawImage(spr, -28, -28, 56, 56);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#60A5FA';
        ctx.shadowColor = '#3B82F6'; ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.arc(0, 0, PLAYER_R, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, -3, 22, 6);
        ctx.shadowBlur = 0;
      }
      ctx.restore();

      // muzzle flash
      if (g.flash > 0) {
        ctx.save();
        ctx.translate(g.px, g.py);
        ctx.rotate(g.angle);
        ctx.fillStyle = `rgba(253,224,71,${Math.min(1, g.flash / 4)})`;
        ctx.shadowColor = '#fde047'; ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(18, 0); ctx.lineTo(36, -7); ctx.lineTo(31, 0); ctx.lineTo(36, 7);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.shadowBlur = 0;
      }

      // melee slash arc
      if (g.melee && g.melee.fx > 0) {
        ctx.save();
        ctx.translate(g.px, g.py);
        ctx.rotate(g.angle);
        ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.9, g.melee.fx / 12)})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, g.melee.range, -g.melee.arc / 2, g.melee.arc / 2);
        ctx.stroke();
        ctx.restore();
      }

      // judgment beam fx (rainbow)
      if (g.beamFx) {
        const bf = g.beamFx;
        const hues = ['#ff004c', '#fff200', '#00e5ff', '#7b2bff', '#22d94c'];
        ctx.globalAlpha = Math.min(1, bf.life / 10);
        for (let k = 0; k < 5; k++) {
          ctx.strokeStyle = hues[(k + Math.floor(g.t * 0.8)) % 5];
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(g.px, g.py + (k - 2) * 2.4);
          ctx.lineTo(bf.x, bf.y + (k - 2) * 2.4);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // boss telegraphs (snipe lock line, mythic ult beam warn/fire)
      for (const e of g.enemies) {
        if (e.type !== 'boss') continue;
        if ((e.lockT || 0) > 0) {
          ctx.strokeStyle = 'rgba(96,165,250,0.45)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(e.x, e.y);
          ctx.lineTo(e.x + Math.cos(e.lockAng) * 1200, e.y + Math.sin(e.lockAng) * 1200);
          ctx.stroke();
        }
        if ((e.ultWarn || 0) > 0) {
          ctx.strokeStyle = `rgba(232,121,249,${0.2 + 0.4 * Math.abs(Math.sin(g.t * 0.4))})`;
          ctx.lineWidth = 42;
          ctx.beginPath();
          ctx.moveTo(e.x, e.y);
          ctx.lineTo(e.x + Math.cos(e.ultAng) * 1200, e.y + Math.sin(e.ultAng) * 1200);
          ctx.stroke();
        }
        if ((e.ultFire || 0) > 0) {
          const hues = ['#ff004c', '#fff200', '#00e5ff', '#7b2bff', '#22d94c'];
          for (let k = 0; k < 5; k++) {
            ctx.strokeStyle = hues[(k + Math.floor(g.t * 0.8)) % 5];
            ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.moveTo(e.x, e.y + (k - 2) * 5);
            ctx.lineTo(e.x + Math.cos(e.ultAng) * 1200, e.y + Math.sin(e.ultAng) * 1200 + (k - 2) * 5);
            ctx.stroke();
          }
        }
      }

      // low-HP vignette
      if (g.hp / g.maxHp < 0.3) {
        const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.78);
        vg.addColorStop(0, 'rgba(239,68,68,0)');
        vg.addColorStop(1, `rgba(239,68,68,${0.12 + 0.08 * Math.abs(Math.sin(g.t * 0.1))})`);
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, W, H);
      }

      // custom crosshair
      const cc = crossRef.current;
      const mx = g.mouse.x, my = g.mouse.y;
      ctx.strokeStyle = cc;
      ctx.shadowColor = cc; ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mx - 13, my); ctx.lineTo(mx - 5, my);
      ctx.moveTo(mx + 5, my); ctx.lineTo(mx + 13, my);
      ctx.moveTo(mx, my - 13); ctx.lineTo(mx, my - 5);
      ctx.moveTo(mx, my + 5); ctx.lineTo(mx, my + 13);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(mx, my, 2, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;

      // virtual joystick (touch)
      const st = g.touchMove && g.touchMove.stick;
      if (st) {
        ctx.strokeStyle = 'rgba(96,165,250,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(st.ox, st.oy, 44, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(96,165,250,0.5)';
        ctx.beginPath(); ctx.arc(st.ox + st.dx * 0.7, st.oy + st.dy * 0.7, 20, 0, Math.PI * 2); ctx.fill();
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [screen, upgradeChoices, bossIntro]);

  const chooseUpgrade = ({ up }) => {
    const g = G.current; if (!g) return;
    const lvl = (g.upLevels[up.id] || 0) + 1;
    g.upLevels[up.id] = lvl;
    if (!(up.once && lvl > 1)) up.apply(g);
    if (lvl > 1) g.weapon.dmg *= 1.05; // each level makes the attack hit harder
    if (lvl >= 15) g.hasUlt = true; // level 15 unlocks the Ultimate Nova
    g.owned.add(up.id);
    setHud((h) => ({ ...h, hp: Math.ceil(g.hp), maxHp: g.maxHp, mag: g.weapon.mag }));
    sfx.upgrade();
    setUpgradeChoices(null);
    startWave(g.wave + 1);
  };

  const startBtn = () => { resumeAudio(); newGame(); setScreen('playing'); };

  const hpPct = Math.max(0, (hud.hp / hud.maxHp) * 100);

  return (
    <div className="w-full max-w-5xl">
      <div className="relative rounded-2xl overflow-hidden pg-surface p-2 sm:p-3">
        <canvas ref={canvasRef} className="w-full rounded-xl block" style={{ aspectRatio: `${W}/${H}`, background: '#070D1C', touchAction: 'none', cursor: 'none' }} />

        {/* HUD */}
        {screen === 'playing' && !upgradeChoices && (
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-none">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(0,5,15,0.7)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                <div className="w-28 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${hpPct}%`, background: hpPct > 30 ? '#22c55e' : '#ef4444' }} />
                </div>
                <span className="text-xs font-bold w-8">{hud.hp}</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(0,5,15,0.7)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
                <Crosshair className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold">{hud.reloading ? 'RELOADING' : `${hud.ammo}/${hud.mag}`}</span>
                <span className="text-[10px] text-[var(--pg-muted)]">[R]</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="px-2.5 py-1.5 rounded-lg text-right" style={{ background: 'rgba(0,5,15,0.7)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
                <div className="text-[10px] uppercase tracking-wider text-[var(--pg-muted)]">Score</div>
                <div className="text-lg font-bold leading-none">{hud.score}</div>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg text-right" style={{ background: 'rgba(0,5,15,0.7)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
                <div className="text-[10px] uppercase tracking-wider text-[var(--pg-muted)]">Wave {hud.wave}/{difficulty.waves}</div>
                <div className="text-sm font-bold" style={{ color: '#fbbf24' }}>×{hud.mult.toFixed(1)}</div>
              </div>
              {hud.ult != null && (
                <div className="px-2.5 py-1.5 rounded-lg text-right" style={{ background: 'rgba(0,5,15,0.7)', boxShadow: 'inset 0 0 0 1px rgba(192,132,252,0.5)' }}>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--pg-muted)]">Ultimate</div>
                  <div className="text-sm font-bold" style={{ color: '#c084fc' }}>{hud.ult}%</div>
                </div>
              )}
            </div>
          </div>
        )}

        {bossIntro && (
          <div className="absolute inset-2 sm:inset-3 rounded-xl flex flex-col items-center justify-center text-center px-4 z-20"
            style={{ background: 'rgba(0,5,15,0.88)', backdropFilter: 'blur(6px)', cursor: 'pointer' }}
            onPointerDown={() => setBossIntro(null)}>
            <div className="pg-fade-up flex flex-col items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.3em] font-black animate-pulse" style={{ color: bossIntro.color }}>⚠ Boss Incoming ⚠</span>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold" style={{ color: bossIntro.color, textShadow: `0 0 24px ${bossIntro.color}` }}>{bossIntro.name}</h2>
              <span className="text-[10px] uppercase tracking-widest text-[var(--pg-muted)] mt-2">Space / tap to skip</span>
            </div>
          </div>
        )}

        {screen === 'menu' && (
          <Overlay>
            <h2 className="font-display text-3xl font-extrabold pg-text-glow">Grid Assault</h2>
            <p className="text-[var(--pg-muted)] text-sm max-w-md mx-auto">
              Survive the waves. <b className="text-white">WASD</b> to move, <b className="text-white">mouse</b> to aim, <b className="text-white">click</b> to shoot, <b className="text-white">R</b> to reload. Pick upgrades between waves. Boss every 5 waves.
            </p>
            <div className="text-[10px] uppercase tracking-widest text-[var(--pg-muted)] mt-4">Choose Difficulty</div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2 w-full max-w-2xl">
              {DIFFICULTIES.map((d) => (
                <button key={d.id} onClick={() => setDifficulty(d)}
                  className="p-2.5 rounded-xl text-center transition-all hover:-translate-y-0.5"
                  style={difficulty.id === d.id
                    ? { background: 'var(--pg-accent)', color: '#fff', boxShadow: '0 8px 24px rgba(59,130,246,0.45)' }
                    : { background: 'rgba(59,130,246,0.1)', color: 'var(--pg-text)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
                  <div className="text-sm font-bold">{d.name}</div>
                  <div className="text-[10px] opacity-80">{d.hp} HP · {d.waves} waves</div>
                </button>
              ))}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--pg-muted)] mt-3">Mode</div>
            <div className="grid grid-cols-2 gap-2 mt-2 w-full max-w-xl">
              {[
                { id: 'normal', name: 'Normal', d: `${difficulty.waves} waves · boss every 5` },
                { id: 'boss', name: 'Boss Mode', d: `A boss every wave · ${difficulty.waves} waves` },
              ].map((m) => (
                <button key={m.id} onClick={() => { sfx.click(); setMode(m.id); }} className="p-2.5 rounded-xl text-center transition-all hover:-translate-y-0.5"
                  style={mode === m.id
                    ? { background: 'var(--pg-accent)', color: '#fff', boxShadow: '0 8px 24px rgba(59,130,246,0.45)' }
                    : { background: 'rgba(59,130,246,0.1)', color: 'var(--pg-text)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
                  <div className="text-sm font-bold">{m.name}</div>
                  <div className="text-[10px] opacity-80">{m.d}</div>
                </button>
              ))}
            </div>
            <button onClick={startBtn} className="mt-3 px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
              style={{ background: 'var(--pg-accent)', color: '#fff', boxShadow: '0 8px 24px rgba(59,130,246,0.4)' }}>
              <Play className="w-4 h-4 fill-white" /> Deploy — {difficulty.name}{mode === 'boss' ? ' · Boss Mode' : ''}
            </button>
            <div className="text-[10px] uppercase tracking-widest text-[var(--pg-muted)] mt-3">Crosshair</div>
            <div className="flex gap-2 mt-1.5">
              {CROSSHAIRS.map((c) => (
                <button key={c} onClick={() => { sfx.click(); setCrossColor(c); }} className="w-6 h-6 rounded-full transition-all"
                  style={{ background: c, boxShadow: crossColor === c ? `0 0 12px ${c}` : 'inset 0 0 0 1px rgba(255,255,255,0.25)' }} />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-[var(--pg-muted)]"
                style={{ boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
                {isTouchDevice() ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                {deviceLabel()} · {isTouchDevice() ? 'touch controls' : 'keyboard & mouse'}
              </span>
              <button onClick={() => { sfx.click(); setMenuAuto((v) => !v); }}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={menuAuto
                  ? { background: 'var(--pg-accent)', color: '#fff', boxShadow: '0 6px 18px rgba(59,130,246,0.4)' }
                  : { background: 'rgba(59,130,246,0.1)', color: 'var(--pg-accent2)', boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.35)' }}>
                Auto-Shoot: {menuAuto ? 'ON' : 'OFF'}
              </button>
            </div>
            <a href="https://www.youtube.com/@PlayGridGames" target="_blank" rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
              style={{ color: 'var(--pg-accent2)' }}>
              <Youtube className="w-4 h-4" /> youtube.com/@PlayGridGames
            </a>
          </Overlay>
        )}

        {upgradeChoices && (
          <Overlay>
            <h2 className="font-display text-xl font-bold">Wave {hud.wave} Cleared — Choose an Upgrade</h2>
            <div className="grid sm:grid-cols-3 gap-3 mt-3 w-full max-w-2xl">
              {upgradeChoices.map(({ up, rarity }) => {
                const idx = RARITY_INDEX[rarity.id];
                const shiny = idx >= 2;
                const swirlies = idx >= 3;
                return (
                  <button key={up.id} onClick={() => chooseUpgrade({ up })}
                    className={`relative text-left p-4 rounded-xl transition-all hover:-translate-y-1 overflow-hidden ${idx >= 5 ? 'animate-pulse' : ''} ${idx === 7 ? 'pg-rainbow' : ''}`}
                    style={{
                      background: idx === 7 ? undefined : 'rgba(10,17,36,0.92)',
                      boxShadow: idx === 7 ? '0 0 34px rgba(255,255,255,0.55)' : `inset 0 0 0 2px ${rarity.color}, 0 0 ${shiny ? 26 : 10}px ${hexA(rarity.color, shiny ? 0.45 : 0.2)}`,
                    }}>
                    {swirlies && (
                      <span className="pointer-events-none absolute inset-0">
                        <span className="absolute top-2 left-2 text-xs animate-ping" style={{ color: rarity.color }}>✦</span>
                        <span className="absolute bottom-3 right-2 text-sm animate-pulse" style={{ color: rarity.color }}>✧</span>
                        <span className="absolute top-1/2 right-3 text-[10px] animate-bounce" style={{ color: rarity.color }}>✦</span>
                      </span>
                    )}
                    <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: idx === 7 ? '#000' : rarity.color }}>{rarity.name}</div>
                    <div className="font-bold text-sm mt-0.5" style={{ color: idx === 7 ? '#000' : '#fff' }}>
                      {up.name}
                      {(G.current?.upLevels?.[up.id] || 0) > 0 && (
                        <span className="ml-1.5 text-[10px]" style={{ color: rarity.color }}>Lv {G.current.upLevels[up.id]} → {G.current.upLevels[up.id] + 1}</span>
                      )}
                    </div>
                    <div className="text-xs mt-1" style={{ color: idx === 7 ? 'rgba(0,0,0,0.8)' : 'var(--pg-muted)' }}>{up.desc}</div>
                  </button>
                );
              })}
            </div>
          </Overlay>
        )}

        {screen === 'over' && gameOver && (
          <Overlay>
            <Skull className="w-10 h-10 text-rose-500" />
            <h2 className="font-display text-3xl font-extrabold text-rose-400">Game Over</h2>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <Stat label="Score" value={gameOver.score} />
              <Stat label="Wave" value={gameOver.wave} />
              <Stat label="Kills" value={gameOver.kills} />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <Stat label="Damage" value={Math.round((G.current?.stats?.dmg) || 0)} />
              <Stat label="Accuracy" value={`${(G.current?.stats?.shots || 0) > 0 ? Math.round(((G.current.stats.hits || 0) / G.current.stats.shots) * 100) : 0}%`} />
              <Stat label="Bosses" value={G.current?.stats?.bossKills || 0} />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={startBtn} className="px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
                style={{ background: 'var(--pg-accent)', color: '#fff', boxShadow: '0 8px 24px rgba(59,130,246,0.4)' }}>
                <RotateCcw className="w-4 h-4" /> Retry
              </button>
              <button onClick={() => setScreen('menu')} className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--pg-accent2)', boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.3)' }}>
                Menu
              </button>
            </div>
          </Overlay>
        )}

        {screen === 'victory' && gameOver && (
          <Overlay>
            <Trophy className="w-10 h-10 text-amber-400" />
            <h2 className="font-display text-3xl font-extrabold text-amber-300 pg-text-glow">Victory!</h2>
            <p className="text-[var(--pg-muted)] text-sm">{difficulty.name}{mode === 'boss' ? ' Boss Mode' : ''} cleared — the Grid Overlord has fallen!</p>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <Stat label="Score" value={gameOver.score} />
              <Stat label="Waves" value={gameOver.wave} />
              <Stat label="Kills" value={gameOver.kills} />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <Stat label="Damage" value={Math.round((G.current?.stats?.dmg) || 0)} />
              <Stat label="Accuracy" value={`${(G.current?.stats?.shots || 0) > 0 ? Math.round(((G.current.stats.hits || 0) / G.current.stats.shots) * 100) : 0}%`} />
              <Stat label="Bosses" value={G.current?.stats?.bossKills || 0} />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={startBtn} className="px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
                style={{ background: 'var(--pg-accent)', color: '#fff', boxShadow: '0 8px 24px rgba(59,130,246,0.4)' }}>
                <Play className="w-4 h-4 fill-white" /> Play Again
              </button>
              <button onClick={() => setScreen('menu')} className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--pg-accent2)', boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.3)' }}>
                Menu
              </button>
            </div>
          </Overlay>
        )}
      </div>
      {screen === 'playing' && !upgradeChoices && (
        <p className="mt-3 text-center text-xs text-[var(--pg-muted)]">WASD move · Mouse aim · Click shoot · R reload · Touch: left = move, right = aim & fire</p>
      )}
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
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function Stat({ label, value }) {
  return (
    <div className="px-4 py-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.1)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--pg-muted)]">{label}</div>
    </div>
  );
}