// Achievement definitions. Each `check(state)` returns true when unlocked.
export const ACHIEVEMENTS = [
  {
    id: 'first_game', name: 'First Game', desc: 'Play your first game', xp: 50,
    check: (s) => s.stats.gamesPlayed >= 1,
  },
  {
    id: 'ten_games', name: '10 Games Played', desc: 'Play 10 game sessions', xp: 100,
    check: (s) => s.stats.gamesPlayed >= 10,
  },
  {
    id: 'platformer_completed', name: 'Platformer Completed', desc: 'Complete every Gridbound level', xp: 250,
    check: (s) => {
      const g = s.stats.perGame['gridbound'];
      return g && (g.levelsCompleted || []).length >= 5;
    },
  },
  {
    id: 'first_boss', name: 'Defeat Your First Boss', desc: 'Defeat any boss', xp: 150,
    check: (s) => (s.stats.bossesDefeated || 0) >= 1,
  },
  {
    id: 'first_pong_win', name: 'Win Your First Pong Match', desc: 'Win a Grid Pong match', xp: 100,
    check: (s) => {
      const g = s.stats.perGame['grid-pong'];
      return g && (g.wins || 0) >= 1;
    },
  },
  {
    id: 'shooter_10k', name: '10,000 Shooter Points', desc: 'Score 10,000 in Grid Assault', xp: 150,
    check: (s) => {
      const g = s.stats.perGame['grid-assault'];
      return g && (g.highScore || 0) >= 10000;
    },
  },
  {
    id: 'first_race', name: 'Finish Your First Race', desc: 'Finish a Grid Rush race', xp: 120,
    check: (s) => {
      const g = s.stats.perGame['grid-rush'];
      return g && (g.runsCompleted || 0) >= 1;
    },
  },
  {
    id: 'dungeon_run', name: 'Complete a Dungeon Run', desc: 'Complete a Gridfall run', xp: 200,
    check: (s) => {
      const g = s.stats.perGame['gridfall'];
      return g && (g.runsCompleted || 0) >= 1;
    },
  },
  {
    id: 'master_gamer', name: 'Master Gamer', desc: 'Reach PlayGrid level 10', xp: 300,
    check: (s) => Math.floor(s.xp / 500) + 1 >= 10,
  },
  {
    id: 'play_every_game', name: 'Play Every Game', desc: 'Play every game on PlayGrid', xp: 250,
    check: (s) => {
      const slugs = ['grid-pong', 'grid-assault', 'gridbound', 'grid-rush', 'gridfall'];
      return slugs.every((u) => {
        const g = s.stats.perGame[u];
        return g && (g.plays || 0) >= 1;
      });
    },
  },
];