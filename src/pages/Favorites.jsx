import { Heart } from 'lucide-react';
import { games } from '@/games/registry';
import { useGameStore } from '@/lib/gameStore';
import GameCard from '@/components/GameCard';

export default function Favorites() {
  const store = useGameStore();
  const favs = games.filter((g) => store.favorites.includes(g.slug));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
          <Heart className="w-7 h-7 fill-rose-500 text-rose-500" /> Favorites
        </h1>
        <p className="text-[var(--pg-muted)] text-sm mt-1">Your starred games, ready to launch.</p>
      </div>

      {favs.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {favs.map((g, i) => <GameCard key={g.slug} game={g} index={i} />)}
        </div>
      ) : (
        <div className="rounded-2xl pg-surface p-12 text-center flex flex-col items-center gap-3">
          <Heart className="w-10 h-10 text-rose-500/40" />
          <div className="text-[var(--pg-muted)]">No favorites yet. Tap the heart on any game to save it here.</div>
        </div>
      )}
    </div>
  );
}