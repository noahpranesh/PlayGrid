import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Crown, Loader2, LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { fetchLeaderboard } from '@/lib/leaderboard';
import { sfx } from '@/lib/sound';

const GAMES = [
  { slug: 'grid-assault', name: 'Grid Assault' },
  { slug: 'grid-pong', name: 'Grid Pong' },
  { slug: 'gridbound', name: 'Gridbound' },
  { slug: 'grid-rush', name: 'Grid Rush' },
];
const ASSAULT_DIFFS = [
  { id: 'easy', name: 'Easy' },
  { id: 'medium', name: 'Medium' },
  { id: 'hard', name: 'Hard' },
  { id: 'pro', name: 'Pro' },
  { id: 'hacker', name: 'Hacker' },
];
const ASSAULT_MODES = [{ id: 'normal', name: 'Normal' }, { id: 'boss', name: 'Boss Mode' }];

export default function Leaderboard() {
  const [game, setGame] = useState('grid-assault');
  const [mode, setMode] = useState('normal');
  const [difficulty, setDifficulty] = useState('easy');
  const [scope, setScope] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const isAssault = game === 'grid-assault';
    const d = await fetchLeaderboard({
      game,
      mode: isAssault ? mode : '',
      difficulty: isAssault ? difficulty : '',
      scope,
    });
    setData(d);
    setLoading(false);
  }, [game, mode, difficulty, scope]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { supabase.auth.getSession().then(({ data: { session } }) => setAuthed(Boolean(session))); }, []);

  const isAssault = game === 'grid-assault';
  const mineInList = data?.entries?.some((e) => e.isMe);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2.5 mb-2">
        <span className="grid place-items-center w-8 h-8 rounded-lg" style={{ background: 'rgba(245,158,11,0.14)', boxShadow: 'inset 0 0 0 1px rgba(245,158,11,0.4)' }}>
          <Trophy className="w-4 h-4 text-amber-400" />
        </span>
        <h1 className="font-display text-2xl font-extrabold">Leaderboards</h1>
      </div>
      <p className="text-sm text-[var(--pg-muted)] mb-5">Top 50 runs. Your best score per mode & difficulty saves automatically when you're signed in.</p>

      <div className="rounded-2xl pg-surface p-4 mb-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          {GAMES.map((g) => (
            <button key={g.slug} onClick={() => { sfx.click(); setGame(g.slug); }}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={game === g.slug
                ? { background: 'var(--pg-accent)', color: '#fff' }
                : { background: 'rgba(59,130,246,0.1)', color: 'var(--pg-muted)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
              {g.name}
            </button>
          ))}
        </div>
        {isAssault && (
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-[var(--pg-muted)] mr-1">Mode</span>
              {ASSAULT_MODES.map((m) => (
                <button key={m.id} onClick={() => { sfx.click(); setMode(m.id); }} className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={mode === m.id ? { background: 'rgba(59,130,246,0.25)', color: '#fff' } : { color: 'var(--pg-muted)' }}>{m.name}</button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-[var(--pg-muted)] mr-1">Difficulty</span>
              {ASSAULT_DIFFS.map((d) => (
                <button key={d.id} onClick={() => { sfx.click(); setDifficulty(d.id); }} className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={difficulty === d.id ? { background: 'rgba(59,130,246,0.25)', color: '#fff' } : { color: 'var(--pg-muted)' }}>{d.name}</button>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-2">
          {[{ id: 'all', name: 'All-Time' }, { id: 'week', name: 'This Week' }].map((t) => (
            <button key={t.id} onClick={() => { sfx.click(); setScope(t.id); }} className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={scope === t.id
                ? { background: 'var(--pg-accent)', color: '#fff' }
                : { background: 'rgba(59,130,246,0.1)', color: 'var(--pg-muted)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>{t.name}</button>
          ))}
        </div>
      </div>

      {authed === false && (
        <div className="rounded-xl pg-surface p-3 mb-4 text-center text-sm text-[var(--pg-muted)]">
          <Link to="/login" className="inline-flex items-center gap-1.5 font-semibold" style={{ color: 'var(--pg-accent2)' }}>
            <LogIn className="w-4 h-4" /> Sign in
          </Link> to save your scores and get ranked.
        </div>
      )}

      <div className="rounded-2xl pg-surface overflow-hidden">
        <div className="grid grid-cols-[3rem_1fr_auto_4rem] gap-2 px-4 py-2 text-[10px] uppercase tracking-wider text-[var(--pg-muted)]" style={{ boxShadow: 'inset 0 -1px 0 var(--pg-border)' }}>
          <span>Rank</span><span>Player</span><span>Score</span><span className="text-right">Diff</span>
        </div>
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[var(--pg-muted)]" /></div>
        ) : (!data?.entries?.length ? (
          <div className="py-12 text-center text-sm text-[var(--pg-muted)]">No scores yet — be the first to set a record!</div>
        ) : (
          <>
            {data.entries.map((e) => (
              <Row key={e.rank} rank={e.rank} username={e.username} score={e.score} difficulty={e.difficulty} isMe={e.isMe} />
            ))}
            {data.myEntry && (data.myEntry.rank > 50 || !mineInList) && (
              <>
                <div className="py-1 text-center text-[10px] text-[var(--pg-muted)]">⋯</div>
                <Row rank={data.myEntry.rank} username={data.myEntry.username} score={data.myEntry.score} difficulty={data.myEntry.difficulty} isMe />
              </>
            )}
          </>
        ))}
      </div>
    </div>
  );
}

function Row({ rank, username, score, difficulty, isMe }) {
  return (
    <div className="grid grid-cols-[3rem_1fr_auto_4rem] gap-2 px-4 py-2.5 items-center text-sm"
      style={{ background: isMe ? 'rgba(59,130,246,0.14)' : 'transparent', boxShadow: 'inset 0 -1px 0 var(--pg-border)' }}>
      <span className="font-bold flex items-center" style={{ color: rank === 1 ? '#fbbf24' : 'var(--pg-text)' }}>
        {rank === 1 ? <Crown className="w-4 h-4 text-amber-400" /> : `#${rank}`}
      </span>
      <span className="font-medium truncate" style={{ color: isMe ? '#fff' : 'var(--pg-text)' }}>
        {username}{isMe && <span className="ml-1.5 text-[10px] text-[var(--pg-accent2)]">YOU</span>}
      </span>
      <span className="font-mono font-bold">{Number(score).toLocaleString()}</span>
      <span className="text-[11px] text-[var(--pg-muted)] capitalize text-right">{difficulty || '—'}</span>
    </div>
  );
}