import { Trophy, Gamepad2, Clock, Star, Zap, Lock } from 'lucide-react';
import { games } from '@/games/registry';
import { useGameStore, getLevelProgress, getLevel } from '@/lib/gameStore';
import { ACHIEVEMENTS } from '@/lib/achievements';

function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m`;
  return `${s}s`;
}

export default function Profile() {
  const store = useGameStore();
  const { level, into, need, pct } = getLevelProgress(store.xp);
  const per = store.stats.perGame;

  const stats = [
    { label: 'Games Played', value: store.stats.gamesPlayed, icon: Gamepad2 },
    { label: 'Total Play Time', value: fmtTime(store.stats.totalPlayTime), icon: Clock },
    { label: 'Bosses Defeated', value: store.stats.bossesDefeated || 0, icon: Zap },
    { label: 'Achievements', value: `${store.achievements.length}/${ACHIEVEMENTS.length}`, icon: Trophy },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl pg-surface p-6 sm:p-8">
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #3B82F6, transparent 70%)' }} />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="grid place-items-center w-20 h-20 rounded-2xl text-3xl font-extrabold"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#1e3a8a)', color: '#fff', boxShadow: '0 10px 30px rgba(59,130,246,0.4)' }}>
            {level}
          </div>
          <div className="flex-1 w-full">
            <h1 className="font-display text-2xl font-extrabold">Player Profile</h1>
            <p className="text-[var(--pg-muted)] text-sm">PlayGrid Level {level} · {store.xp.toLocaleString()} XP</p>
            <div className="mt-3 max-w-md">
              <div className="flex justify-between text-xs text-[var(--pg-muted)] mb-1">
                <span>Level {level}</span>
                <span>{into}/{need} XP to Level {level + 1}</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, background: 'linear-gradient(90deg,#3B82F6,#60A5FA)' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl pg-surface p-4">
            <div className="flex items-center gap-2 text-[var(--pg-muted)]">
              <s.icon className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">{s.label}</span>
            </div>
            <div className="mt-2 text-2xl font-extrabold">{s.value}</div>
          </div>
        ))}
      </section>

      {/* Per-game stats */}
      <section>
        <h2 className="font-display text-xl font-bold mb-4">Game Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {games.map((g) => {
            const st = per[g.slug] || {};
            return (
              <div key={g.slug} className="rounded-2xl pg-surface p-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: g.color }} />
                  <h3 className="font-bold text-sm">{g.title}</h3>
                </div>
                <div className="mt-3 space-y-1.5 text-sm">
                  <Row label="Sessions" value={st.plays || 0} />
                  <Row label="Play Time" value={fmtTime(st.playTime || 0)} />
                  {g.slug === 'grid-pong' && <Row label="Wins" value={st.wins || 0} />}
                  {g.slug === 'grid-assault' && <Row label="High Score" value={(st.highScore || 0).toLocaleString()} />}
                  {g.slug === 'gridbound' && <Row label="Levels Cleared" value={`${(st.levelsCompleted || []).length}/${5}`} />}
                  {g.slug === 'grid-rush' && <Row label="Best Time" value={st.bestTime ? fmtTime(st.bestTime) : '—'} />}
                  {g.slug === 'gridfall' && <Row label="Runs Completed" value={st.runsCompleted || 0} />}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Achievements */}
      <section>
        <h2 className="font-display text-xl font-bold mb-4">Achievements</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = store.achievements.includes(a.id);
            return (
              <div key={a.id} className="rounded-2xl p-4 flex items-center gap-3 transition-all"
                style={unlocked
                  ? { background: 'rgba(245,158,11,0.08)', boxShadow: 'inset 0 0 0 1px rgba(245,158,11,0.35)' }
                  : { background: 'rgba(255,255,255,0.02)', boxShadow: 'inset 0 0 0 1px var(--pg-border)', opacity: 0.7 }}>
                <div className="grid place-items-center w-10 h-10 rounded-xl shrink-0"
                  style={unlocked
                    ? { background: 'linear-gradient(135deg,#f59e0b,#b45309)', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.05)', color: 'var(--pg-muted)' }}>
                  {unlocked ? <Trophy className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm flex items-center gap-1.5">
                    {a.name}
                    {unlocked && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
                  </div>
                  <div className="text-xs text-[var(--pg-muted)] truncate">{a.desc} · +{a.xp} XP</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-[var(--pg-muted)]">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}