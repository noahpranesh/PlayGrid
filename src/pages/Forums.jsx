import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Send, LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { sfx } from '@/lib/sound';

const CATEGORIES = ['General', 'Tips & Strategies', 'Bug Reports', 'Suggestions', 'Showcase'];

export default function Forums() {
  const [posts, setPosts] = useState(null);
  const [authed, setAuthed] = useState(null);
  const [me, setMe] = useState(null);
  const [category, setCategory] = useState('General');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data, error: loadError } = await supabase
        .from('forum_posts')
        .select('id, title, body, category, created_at, user_id, author_name')
        .order('created_at', { ascending: false })
        .limit(50);
      if (loadError) throw loadError;
      setPosts(data || []);
    } catch {
      setPosts([]);
    }
  }, []);

  useEffect(() => {
    load();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(Boolean(session));
      setMe(session?.user ?? null);
    });
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) { setError('Add a title and a message first.'); return; }
    setPosting(true);
    setError('');
    try {
      const { error: insertError } = await supabase.from('forum_posts').insert({
        title: title.trim(),
        body: body.trim(),
        category,
        user_id: me?.id,
        author_name: me?.user_metadata?.username || 'Player',
      });
      if (insertError) throw insertError;
      setTitle('');
      setBody('');
      sfx.powerup();
      await load();
    } catch {
      setError('Could not post right now — please try again.');
    }
    setPosting(false);
  };

  const authorName = (p) => p.author_name || 'Player';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2.5 mb-2">
        <span className="grid place-items-center w-8 h-8 rounded-lg" style={{ background: 'rgba(59,130,246,0.12)', boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.35)' }}>
          <MessageSquare className="w-4 h-4" style={{ color: 'var(--pg-accent2)' }} />
        </span>
        <h1 className="font-display text-2xl font-extrabold">Forums</h1>
      </div>
      <p className="text-sm text-[var(--pg-muted)] mb-5">Talk everything PlayGrid — strategies, bugs, ideas, and runs.</p>

      {/* Compose */}
      {authed === false ? (
        <div className="rounded-2xl pg-surface p-6 text-center">
          <p className="text-sm text-[var(--pg-muted)]">Want to join the conversation? Sign in — or create a free account — to post.</p>
          <Link to="/login" className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--pg-accent)', color: '#fff', boxShadow: '0 8px 24px rgba(59,130,246,0.4)' }}>
            <LogIn className="w-4 h-4" /> Sign In / Create Account
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="rounded-2xl pg-surface p-5">
          <div className="flex flex-wrap gap-2 mb-3">
            {CATEGORIES.map((c) => (
              <button type="button" key={c} onClick={() => { sfx.click(); setCategory(c); }}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={category === c
                  ? { background: 'var(--pg-accent)', color: '#fff' }
                  : { background: 'rgba(59,130,246,0.1)', color: 'var(--pg-muted)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
                {c}
              </button>
            ))}
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title"
            className="w-full mb-2 px-3.5 py-2.5 rounded-xl text-sm bg-transparent outline-none"
            style={{ boxShadow: 'inset 0 0 0 1px var(--pg-border)' }} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share your thoughts…" rows={4}
            className="w-full mb-3 px-3.5 py-2.5 rounded-xl text-sm bg-transparent outline-none resize-none"
            style={{ boxShadow: 'inset 0 0 0 1px var(--pg-border)' }} />
          {error && <p className="text-xs text-rose-400 mb-2">{error}</p>}
          <button type="submit" disabled={posting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: 'var(--pg-accent)', color: '#fff', boxShadow: '0 8px 24px rgba(59,130,246,0.4)' }}>
            <Send className="w-4 h-4" /> {posting ? 'Posting…' : 'Post'}
          </button>
        </form>
      )}

      {/* Posts */}
      <div className="mt-6 space-y-3">
        {posts === null && <p className="text-sm text-[var(--pg-muted)] text-center py-8">Loading posts…</p>}
        {posts !== null && posts.length === 0 && (
          <p className="text-sm text-[var(--pg-muted)] text-center py-8">No posts yet — be the first to say hello!</p>
        )}
        {posts !== null && posts.map((p) => (
          <article key={p.id} className="rounded-2xl pg-surface p-4 pg-fade-up">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(59,130,246,0.16)', color: 'var(--pg-accent2)' }}>
                {p.category || 'General'}
              </span>
              <span className="text-[11px] text-[var(--pg-muted)] ml-auto">
                {authorName(p)} · {new Date(p.created_at).toLocaleDateString()}
              </span>
            </div>
            <h3 className="font-display font-bold text-base mt-1.5">{p.title}</h3>
            <p className="text-sm text-[var(--pg-muted)] mt-1 whitespace-pre-wrap">{p.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
