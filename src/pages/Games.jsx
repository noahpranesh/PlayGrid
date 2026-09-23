import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { games, categories } from '@/games/registry';
import { useGameStore } from '@/lib/gameStore';
import { sfx } from '@/lib/sound';
import GameCard from '@/components/GameCard';

const SORTS = [
  { id: 'popular', label: 'Most Popular' },
  { id: 'newest', label: 'Newest' },
  { id: 'az', label: 'A–Z' },
];

export default function Games() {
  const [params, setParams] = useSearchParams();
  const store = useGameStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(params.get('category') || 'All');
  const [sort, setSort] = useState('popular');

  useEffect(() => {
    const c = params.get('category');
    if (c) setCat(c);
  }, [params]);

  const filtered = useMemo(() => {
    let list = games.filter((g) => {
      if (cat !== 'All' && g.category !== cat && !g.tags.includes(cat)) return false;
      if (q) {
        const t = q.toLowerCase();
        if (!g.title.toLowerCase().includes(t) && !g.description.toLowerCase().includes(t)) return false;
      }
      return true;
    });
    if (sort === 'popular') {
      list = list.slice().sort((a, b) => (store.stats.perGame[b.slug]?.plays || 0) - (store.stats.perGame[a.slug]?.plays || 0));
    } else if (sort === 'newest') {
      list = list.slice().sort((a, b) => b.addedAt - a.addedAt);
    } else if (sort === 'az') {
      list = list.slice().sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [q, cat, sort, store]);

  const activeStyle = { background: 'var(--pg-accent)', color: '#fff', boxShadow: '0 4px 14px rgba(59,130,246,0.4)' };
  const idleStyle = { background: 'rgba(59,130,246,0.08)', color: 'var(--pg-muted)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Game Library</h1>
        <p className="text-[var(--pg-muted)] text-sm mt-1">Browse, filter, and launch every game on PlayGrid.</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 rounded-2xl px-4 py-3"
          style={{ background: 'rgba(0,5,15,0.5)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
          <Search className="w-5 h-5 text-[var(--pg-muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search games…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-[var(--pg-muted)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['All', ...categories].map((c) => (
            <button
              key={c}
              onClick={() => { sfx.click(); setCat(c); setParams(c === 'All' ? {} : { category: c }); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={cat === c ? activeStyle : idleStyle}
            >
              {c}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[var(--pg-muted)]" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="text-xs font-medium rounded-lg px-3 py-2 outline-none cursor-pointer"
              style={{ background: 'rgba(0,5,15,0.6)', color: 'var(--pg-text)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filtered.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filtered.map((g, i) => (
            <GameCard key={g.slug} game={g} index={i} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl pg-surface p-12 text-center text-[var(--pg-muted)]">
          No games found. Try a different category or search.
        </div>
      )}
    </div>
  );
}