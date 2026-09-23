import { Link } from 'react-router-dom';
import { Heart, Play, Star } from 'lucide-react';
import { useGameStore, toggleFavorite } from '@/lib/gameStore';
import { sfx } from '@/lib/sound';
import { Image } from '@/components/ui/image';

export default function GameCard({ game, index = 0, badge }) {
  const store = useGameStore();
  const fav = store.favorites.includes(game.slug);
  const stats = store.stats.perGame[game.slug];
  const plays = stats?.plays || 0;

  return (
    <div
      className="pg-fade-up group relative rounded-2xl overflow-hidden pg-surface transition-all duration-300 hover:-translate-y-1 hover:pg-glow"
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        {game.thumb ? (
          <Image
            src={game.thumb}
            alt={game.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            fittingType="fill"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: `linear-gradient(135deg, ${game.color || '#3B82F6'}, #0A1124)` }}
          />
        )}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(0,5,15,0) 40%, rgba(0,5,15,0.92))' }} />

        {badge && (
          <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
            style={{ background: 'rgba(59,130,246,0.25)', color: '#bfdbfe', boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.5)' }}>
            {badge}
          </span>
        )}

        <button
          onClick={() => { sfx.click(); toggleFavorite(game.slug); }}
          aria-label="Favorite"
          className="absolute top-3 right-3 grid place-items-center w-9 h-9 rounded-full backdrop-blur-md transition-transform hover:scale-110 active:scale-95"
          style={{ background: 'rgba(0,5,15,0.6)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)' }}
        >
          <Heart className={`w-4 h-4 transition-colors ${fav ? 'fill-rose-500 text-rose-500' : 'text-white/80'}`} />
        </button>

        <span className="absolute bottom-3 left-3 text-[11px] font-semibold px-2 py-0.5 rounded-md"
          style={{ background: 'rgba(10,17,36,0.85)', color: 'var(--pg-accent2)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
          {game.category}
        </span>

        <Link
          to={`/play/${game.slug}`}
          onClick={() => sfx.click()}
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <span className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background: 'var(--pg-accent)', color: '#fff', boxShadow: '0 8px 30px rgba(59,130,246,0.5)' }}>
            <Play className="w-4 h-4 fill-white" /> Play
          </span>
        </Link>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-bold text-base leading-tight">{game.title}</h3>
          {plays > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-[var(--pg-muted)] shrink-0">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {plays}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-[var(--pg-muted)] line-clamp-2">{game.description}</p>
        <Link
          to={`/play/${game.slug}`}
          onClick={() => sfx.click()}
          className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110"
          style={{ background: 'rgba(59,130,246,0.14)', color: 'var(--pg-accent2)', boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.35)' }}
        >
          <Play className="w-4 h-4 fill-current" /> Play Now
        </Link>
      </div>
    </div>
  );
}