import { useState } from 'react';
import { Volume2, Music, Sparkles, Palette, Trash2, AlertTriangle } from 'lucide-react';
import { useGameStore, updateSettings, resetProgress } from '@/lib/gameStore';
import { sfx } from '@/lib/sound';
import { Switch } from '@/components/ui/switch';

const THEMES = [
  { id: 'blue', name: 'Electric Blue', color: '#3B82F6' },
  { id: 'violet', name: 'Violet Surge', color: '#8B5CF6' },
  { id: 'ember', name: 'Ember Glow', color: '#F97316' },
];

export default function Settings() {
  const store = useGameStore();
  const s = store.settings;
  const [confirming, setConfirming] = useState(false);

  const Toggle = ({ icon: Icon, label, desc, checked, onChange }) => (
    <div className="flex items-center justify-between gap-4 rounded-2xl pg-surface p-4">
      <div className="flex items-center gap-3">
        <span className="grid place-items-center w-10 h-10 rounded-xl"
          style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--pg-accent2)' }}>
          <Icon className="w-5 h-5" />
        </span>
        <div>
          <div className="font-semibold text-sm">{label}</div>
          <div className="text-xs text-[var(--pg-muted)]">{desc}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={(v) => { sfx.click(); onChange(v); }} />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Settings</h1>
        <p className="text-[var(--pg-muted)] text-sm mt-1">Tune your PlayGrid experience. Saved to this browser.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider text-[var(--pg-muted)] font-semibold">Audio & Motion</h2>
        <Toggle icon={Volume2} label="Sound Effects" desc="Blips, hits, explosions, and UI clicks"
          checked={s.sound} onChange={(v) => updateSettings({ sound: v })} />
        <Toggle icon={Music} label="Music" desc="Ambient background music in menus"
          checked={s.music} onChange={(v) => updateSettings({ music: v })} />
        <Toggle icon={Sparkles} label="Animations" desc="Hover, entrance, and transition effects"
          checked={s.animations} onChange={(v) => updateSettings({ animations: v })} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider text-[var(--pg-muted)] font-semibold flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5" /> Theme
        </h2>
        <div className="rounded-2xl pg-surface p-4">
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map((t) => (
              <button key={t.id} onClick={() => { sfx.click(); updateSettings({ theme: t.id }); }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
                style={s.theme === t.id
                  ? { background: 'rgba(59,130,246,0.12)', boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.5)' }
                  : { background: 'rgba(255,255,255,0.02)', boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
                <span className="w-8 h-8 rounded-full" style={{ background: t.color, boxShadow: `0 0 14px ${t.color}` }} />
                <span className="text-xs font-medium">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider text-[var(--pg-muted)] font-semibold text-rose-400">Danger Zone</h2>
        <div className="rounded-2xl p-4" style={{ background: 'rgba(239,68,68,0.06)', boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.3)' }}>
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-10 h-10 rounded-xl" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
              <Trash2 className="w-5 h-5" />
            </span>
            <div className="flex-1">
              <div className="font-semibold text-sm">Reset All Progress</div>
              <div className="text-xs text-[var(--pg-muted)]">Erases XP, levels, scores, achievements, favorites, and settings.</div>
            </div>
          </div>
          {!confirming ? (
            <button onClick={() => { sfx.click(); setConfirming(true); }}
              className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.4)' }}>
              Reset Progress
            </button>
          ) : (
            <div className="mt-4 rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.1)', boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.4)' }}>
              <div className="flex items-center gap-2 text-sm text-rose-300 mb-3">
                <AlertTriangle className="w-4 h-4" /> Are you sure? This cannot be undone.
              </div>
              <div className="flex gap-2">
                <button onClick={() => { resetProgress(); setConfirming(false); sfx.lose(); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: '#ef4444', color: '#fff' }}>
                  Yes, delete everything
                </button>
                <button onClick={() => { setConfirming(false); sfx.click(); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--pg-text)' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}