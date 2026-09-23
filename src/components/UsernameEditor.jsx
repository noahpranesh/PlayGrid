import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Check, X, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { changeUsername, isUsernameAvailable, isValidUsername } from '@/lib/auth';

export default function UsernameEditor() {
  const { isAuthenticated, profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [status, setStatus] = useState(''); // '', 'checking', 'free', 'taken', 'invalid'
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isAuthenticated) {
    return (
      <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--pg-accent2)' }}>
        <LogIn className="w-4 h-4" /> Sign in to pick a username
      </Link>
    );
  }

  const current = profile?.username || 'Player';

  const onChange = async (v) => {
    setValue(v);
    setError('');
    if (!isValidUsername(v)) { setStatus(v ? 'invalid' : ''); return; }
    if (v.toLowerCase() === current.toLowerCase()) { setStatus('free'); return; }
    setStatus('checking');
    const free = await isUsernameAvailable(v);
    setStatus(free ? 'free' : 'taken');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await changeUsername(value);
      await refreshProfile();
      setEditing(false);
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold">@{current}</span>
        <button onClick={() => { setValue(current); setStatus(''); setEditing(true); }}
          className="p-1.5 rounded-md text-[var(--pg-muted)] hover:text-white transition-colors" aria-label="Change username">
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const hint = {
    invalid: '3-20 letters, numbers, or underscores',
    checking: 'Checking…',
    taken: 'Taken — try another',
    free: 'Available ✓',
  }[status];

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-[var(--pg-muted)]">@</span>
        <input autoFocus value={value} maxLength={20} onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && status === 'free') save(); if (e.key === 'Escape') setEditing(false); }}
          className="px-2.5 py-1.5 rounded-lg text-sm bg-transparent outline-none w-48"
          style={{ boxShadow: 'inset 0 0 0 1px var(--pg-border)' }} />
        <button onClick={save} disabled={saving || status !== 'free'}
          className="p-1.5 rounded-md disabled:opacity-40" style={{ background: 'var(--pg-accent)', color: '#fff' }} aria-label="Save username">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        </button>
        <button onClick={() => setEditing(false)} className="p-1.5 rounded-md text-[var(--pg-muted)] hover:text-white" aria-label="Cancel">
          <X className="w-4 h-4" />
        </button>
      </div>
      {(hint || error) && (
        <p className={`text-xs mt-1 ${error || status === 'taken' || status === 'invalid' ? 'text-rose-400' : 'text-[var(--pg-muted)]'}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
