import GridPong from './GridPong';
import GridAssault from './GridAssault';
import Gridbound from './Gridbound';
import GridRush from './GridRush';

export const games = [
  {
    slug: 'grid-pong',
    title: 'Grid Pong',
    category: 'Arcade',
    description: 'Neon table tennis vs an AI that actually reacts. First to 10, power orbs, accelerating ball.',
    tags: ['Arcade', 'Multiplayer'],
    component: GridPong,
    thumb: 'https://media.base44.com/images/public/6a9cc11b444670045f826e08/6ceab9504_generated_image.png',
    color: '#3B82F6',
    featured: true,
    addedAt: 1,
  },
  {
    slug: 'grid-assault',
    title: 'Grid Assault',
    category: 'Shooter',
    description: 'Top-down arena survival. Waves, enemy types, weapon upgrades, bosses, and a score multiplier.',
    tags: ['Shooter', 'Action'],
    component: GridAssault,
    thumb: 'https://media.base44.com/images/public/6a9cc11b444670045f826e08/43ab3fa7c_generated_image.png',
    color: '#06b6d4',
    featured: true,
    addedAt: 2,
  },
  {
    slug: 'gridbound',
    title: 'Gridbound',
    category: 'Platformer',
    description: 'A 2D platformer with moving platforms, enemies, coins, hazards, checkpoints, and a boss.',
    tags: ['Platformer', 'Action'],
    component: Gridbound,
    thumb: 'https://media.base44.com/images/public/6a9cc11b444670045f826e08/f263a3844_generated_image.png',
    color: '#6366f1',
    featured: true,
    addedAt: 3,
  },
  {
    slug: 'grid-rush',
    title: 'Grid Rush',
    category: 'Racing',
    description: 'A hyper-speed neon runner. Jump glowing Geometry-Dash-style spikes, dodge spinning saws, and chase your best distance.',
    tags: ['Racing', 'Action'],
    component: GridRush,
    thumb: 'https://media.base44.com/images/public/6a9cc11b444670045f826e08/7f36c1440_generated_image.png',
    color: '#f59e0b',
    featured: true,
    addedAt: 4,
  },
];

export function getGame(slug) {
  return games.find((g) => g.slug === slug);
}

export const categories = ['Action', 'Arcade', 'Platformer', 'Racing', 'Shooter', 'Multiplayer', 'Strategy'];