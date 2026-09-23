import { useParams, useNavigate } from 'react-router-dom';
import { getGame } from '@/games/registry';
import GameShell from '@/components/GameShell';

export default function Play() {
  const { slug } = useParams();
  const nav = useNavigate();
  const game = getGame(slug);

  if (!game) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center" style={{ background: 'var(--pg-bg)' }}>
        <div>
          <h1 className="font-display text-2xl font-bold">Game not found</h1>
          <p className="text-[var(--pg-muted)] text-sm mt-1">“{slug}” isn’t on PlayGrid.</p>
          <button onClick={() => nav('/games')} className="mt-4 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--pg-accent)', color: '#fff' }}>
            Back to Games
          </button>
        </div>
      </div>
    );
  }

  const Comp = game.component;
  return (
    <GameShell game={game}>
      <Comp />
    </GameShell>
  );
}