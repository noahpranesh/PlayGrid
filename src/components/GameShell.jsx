import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function GameShell({ game, children }) {
  const nav = useNavigate();
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--pg-bg)' }}>
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{ borderColor: 'var(--pg-border)', background: 'rgba(0,5,15,0.8)' }}
      >
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => nav('/games')}
            className="grid place-items-center w-9 h-9 rounded-lg transition-colors hover:bg-white/5"
            style={{ boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}
            aria-label="Back to games"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="leading-tight">
            <h1 className="font-display font-bold text-sm">{game.title}</h1>
            <p className="text-[11px] text-[var(--pg-muted)]">{game.category} · {game.description}</p>
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-3 sm:p-5">
        {children}
      </main>
    </div>
  );
}