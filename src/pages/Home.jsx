import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, Flame, Clock, Gamepad2, Youtube, Play } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { games, categories } from '@/games/registry';
import { useGameStore, getLevelProgress } from '@/lib/gameStore';
import { sfx } from '@/lib/sound';
import GameCard from '@/components/GameCard';

export default function Home() {
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const store = useGameStore();
  const { level, pct } = getLevelProgress(store.xp);

  const featured = games.find((g) => g.slug === 'grid-assault') || games[0];
  const popular = [...games].sort(
    (a, b) => (store.stats.perGame[b.slug]?.plays || 0) - (store.stats.perGame[a.slug]?.plays || 0)
  );
  const recent = [...games].sort((a, b) => b.addedAt - a.addedAt);
  const results = q
    ? games.filter(
        (g) =>
          g.title.toLowerCase().includes(q.toLowerCase()) ||
          g.description.toLowerCase().includes(q.toLowerCase()) ||
          g.category.toLowerCase().includes(q.toLowerCase())
      )
    : null;

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl pg-surface p-6 sm:p-10">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, #3B82F6, transparent 70%)' }} />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--pg-accent2)', boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.4)' }}>
            <Sparkles className="w-3.5 h-3.5" /> PlayGrid Arcade
          </span>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl font-extrabold leading-[1.05] tracking-tight">
            Play original games <br />
            <span style={{ color: 'var(--pg-accent2)' }} className="pg-text-glow">right in your browser.</span>
          </h1>
          <p className="mt-3 text-[var(--pg-muted)] text-base sm:text-lg max-w-xl">
            No downloads, no accounts. Jump into handcrafted arcade, shooter, and platformer action — and earn XP while you play.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {[`${games.length} games`, `${categories.length} genres`, 'Free forever'].map((s) => (
              <span key={s} className="px-3 py-1 rounded-lg text-xs font-medium"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--pg-muted)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>{s}</span>
            ))}
          </div>

          {/* Search */}
          <div className="mt-6 flex items-center gap-2 max-w-xl rounded-2xl px-4 py-3"
            style={{ background: 'rgba(0,5,15,0.6)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
            <Search className="w-5 h-5 text-[var(--pg-muted)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search games…"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-[var(--pg-muted)]"
            />
            {q && (
              <button onClick={() => setQ('')} className="text-xs text-[var(--pg-muted)] hover:text-white">clear</button>
            )}
          </div>

          {/* Categories */}
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => { sfx.click(); nav(`/games?category=${encodeURIComponent(c)}`); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(59,130,246,0.08)', color: 'var(--pg-muted)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* YouTube */}
          <a href="https://www.youtube.com/@PlayGridGames" target="_blank" rel="noreferrer"
            onClick={() => sfx.click()}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.4)' }}>
            <Youtube className="w-4 h-4" /> YouTube: @PlayGridGames
          </a>

          {/* Player chip */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
              style={{ background: 'rgba(0,5,15,0.5)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
              <span className="grid place-items-center w-9 h-9 rounded-full text-sm font-bold"
                style={{ background: 'linear-gradient(135deg,#3B82F6,#1e3a8a)', color: '#fff' }}>{level}</span>
              <div className="leading-tight">
                <div className="text-xs text-[var(--pg-muted)]">PlayGrid Level</div>
                <div className="w-32 h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: 'var(--pg-accent)' }} />
                </div>
              </div>
            </div>
            <button onClick={() => nav('/profile')} className="text-sm text-[var(--pg-accent2)] hover:underline">
              View profile →
            </button>
          </div>
        </div>
      </section>

      {results ? (
        <Section title={`Search results for "${q}"`} icon={Search}>
          {results.length ? (
            <Grid>{results.map((g, i) => <GameCard key={g.slug} game={g} index={i} />)}</Grid>
          ) : (
            <Empty text="No games match your search." />
          )}
        </Section>
      ) : (
        <>
          <FeaturedSpotlight game={featured} />
          <Section title="Popular Games" icon={Flame} count={popular.length}>
            <Grid>{popular.map((g, i) => <GameCard key={g.slug} game={g} index={i} />)}</Grid>
          </Section>
          <Section title="Recently Added" icon={Clock} count={recent.length}>
            <Grid>{recent.map((g, i) => <GameCard key={g.slug} game={g} index={i} badge="New" />)}</Grid>
          </Section>
        </>
      )}
    </div>
  );
}

function FeaturedSpotlight({ game }) {
  const nav = useNavigate();
  return (
    <section className="relative overflow-hidden rounded-3xl pg-surface p-6 sm:p-8">
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />
      <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-10">
        <div className="w-full md:w-1/2 rounded-2xl overflow-hidden pg-glow">
          <Image src={game.thumb} alt={game.title} className="w-full aspect-[16/9]" fittingType="fill" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: 'rgba(6,182,212,0.15)', color: '#22d3ee', boxShadow: 'inset 0 0 0 1px rgba(6,182,212,0.4)' }}>
            <Sparkles className="w-3.5 h-3.5" /> Featured Game
          </span>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold pg-text-glow">{game.title}</h2>
          <p className="mt-2 text-[var(--pg-muted)] text-sm sm:text-base">{game.description}</p>
          <button onClick={() => { sfx.click(); nav(`/play/${game.slug}`); }}
            className="mt-5 px-6 py-3 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-all hover:-translate-y-0.5"
            style={{ background: game.color || 'var(--pg-accent)', color: '#fff', boxShadow: '0 10px 30px rgba(59,130,246,0.45)' }}>
            <Play className="w-4 h-4 fill-white" /> Play {game.title}
          </button>
        </div>
      </div>
    </section>
  );
}

function Section({ title, icon: Icon, count, children }) {
  return (
    <section>
      <div className="flex items-center gap-2.5 mb-4">
        <span className="grid place-items-center w-8 h-8 rounded-lg" style={{ background: 'rgba(59,130,246,0.12)', boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.35)' }}>
          <Icon className="w-4 h-4" style={{ color: 'var(--pg-accent2)' }} />
        </span>
        <h2 className="font-display text-xl font-bold">{title}</h2>
        {count != null && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--pg-muted)' }}>{count}</span>
        )}
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, var(--pg-border), transparent)' }} />
      </div>
      {children}
    </section>
  );
}
function Grid({ children }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">{children}</div>;
}
function Empty({ text }) {
  return (
    <div className="rounded-2xl pg-surface p-10 text-center text-[var(--pg-muted)] flex flex-col items-center gap-2">
      <Gamepad2 className="w-8 h-8 opacity-40" />
      {text}
    </div>
  );
}