import { supabase } from '@/lib/supabaseClient';

const ALLOWED_GAMES = ['grid-pong', 'grid-assault', 'gridbound', 'grid-rush'];

/**
 * Submit a score for the current player via the server-side anti-cheat RPC
 * (public.submit_score). Returns { best, rank, isNewBest } or null on
 * failure / not signed in.
 */
export async function submitGameScore({ game, mode = '', difficulty = '', score }) {
  if (!Number.isFinite(score) || score < 0) return null;
  if (!ALLOWED_GAMES.includes(game)) return null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data, error } = await supabase.rpc('submit_score', {
      p_game: game,
      p_mode: mode || '',
      p_difficulty: difficulty || '',
      p_score: Math.round(score),
    });

    if (error) {
      console.error('submitGameScore failed:', error.message);
      return null;
    }

    // submit_score returns a single-row table: { best, rank, is_new_best }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;

    return { best: row.best, rank: row.rank, isNewBest: row.is_new_best };
  } catch (e) {
    console.error('submitGameScore threw:', e);
    return null;
  }
}

/**
 * Fetch a leaderboard. scope: 'all' | 'friends' (friends not yet supported,
 * falls back to 'all').
 */
export async function fetchLeaderboard({ game, mode = '', difficulty = '', scope = 'all' }) {
  try {
    let query = supabase
      .from('leaderboard_scores')
      .select('id, user_id, player_name, score, mode, difficulty, created_at')
      .eq('game', game)
      .order('score', { ascending: false })
      .limit(100);

    if (mode) query = query.eq('mode', mode);
    if (difficulty) query = query.eq('difficulty', difficulty);

    const { data, error } = await query;
    if (error) {
      console.error('fetchLeaderboard failed:', error.message);
      return { entries: [], myEntry: null, total: 0 };
    }

    const { data: { session } } = await supabase.auth.getSession();
    const myId = session?.user?.id ?? null;

    const entries = (data || []).map((row, idx) => ({
      rank: idx + 1,
      userId: row.user_id,
      username: row.player_name || 'Player',
      score: row.score,
      mode: row.mode,
      difficulty: row.difficulty,
      createdAt: row.created_at,
      isMe: Boolean(myId) && row.user_id === myId,
    }));

    const myEntry = entries.find((e) => e.isMe) ?? null;

    return { entries, myEntry, total: entries.length };
  } catch (e) {
    console.error('fetchLeaderboard threw:', e);
    return { entries: [], myEntry: null, total: 0 };
  }
}
