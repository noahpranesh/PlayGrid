import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { Gamepad2, LayoutGrid, Heart, User, Settings as SettingsIcon, Smartphone, Monitor, MessageSquare, LogIn, LogOut, Trophy } from 'lucide-react';
import { isTouchDevice, deviceLabel } from '@/lib/device';
import { supabase } from '@/lib/supabaseClient';
import { useGameStore, getLevel, getLevelProgress } from '@/lib/gameStore';
import { syncMusic } from '@/lib/sound';

const THEME_COLORS = { blue: '#3B82F6', violet: '#8B5CF6', ember: '#F97316' };

const navItems = [
  { to: '/', label: 'PlayGrid', icon: LayoutGrid, end: true, home: true },
  { to: '/games', label: 'Games', icon: Gamepad2 },
  { to: '/leaderboard', label: 'Ranks', icon: Trophy },
  { to: '/forums', label: 'Forums', icon: MessageSquare },
  { to: '/favorites', label: 'Favorites', icon: Heart },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <span className="relative grid place-items-center w-9 h-9 rounded-xl"
        style={{ background: 'linear-gradient(135deg,#3B82F6,#1e3a8a)', boxShadow: '0 0 22px rgba(59,130,246,0.5)' }}>
        <span className="absolute inset-1.5 rounded-md border border-white/30 grid grid-cols-2 grid-rows-2 gap-0.5">
          <span className="bg-white/80 rounded-sm" />
          <span className="bg-white/40 rounded-sm" />
          <span className="bg-white/40 rounded-sm" />
          <span className="bg-white/80 rounded-sm" />
        </span>
      </span>
      <span className="font-display font-extrabold tracking-tight text-lg leading-none">
        Play<span style={{ color: 'var(--pg-accent2)' }}>Grid</span>
      </span>
    </Link>
  );
}

export default function Layout() {
  const store = useGameStore();
  const { level } = getLevelProgress(store.xp);
  const [authed, setAuthed] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setAuthed(Boolean(session)));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(Boolean(session)));
    return () => listener?.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    document.body.classList.toggle('pg-no-anim', !store.settings.animations);
  }, [store.settings.animations]);

  useEffect(() => {
    const c = THEME_COLORS[store.settings.theme] || THEME_COLORS.blue;
    document.documentElement.style.setProperty('--pg-accent', c);
    document.documentElement.style.setProperty('--pg-accent2', c);
  }, [store.settings.theme]);

  useEffect(() => {
    syncMusic();
  }, [store.settings.music]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--pg-bg)' }}>
      {/* Top nav (desktop + tablet) */}
      <header
        className="sticky top-0 z-40 backdrop-blur-xl border-b"
        style={{ borderColor: 'var(--pg-border)', background: 'rgba(0,5,15,0.72)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Logo />
          <nav className="hidden md:flex items-center gap-1">
            {navItems.slice(1).map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    isActive
                      ? 'text-white'
                      : 'text-[var(--pg-muted)] hover:text-white'
                  }`
                }
                style={({ isActive }) =>
                  isActive
                    ? { background: 'rgba(59,130,246,0.18)', boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.4)' }
                    : undefined
                }
              >
                <n.icon className="w-4 h-4" />
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium text-[var(--pg-muted)]"
              style={{ boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
              {isTouchDevice() ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
              {deviceLabel()}
            </span>
            <Link
              to="/profile"
              className="hidden sm:flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border transition-colors hover:bg-white/5"
              style={{ borderColor: 'var(--pg-border)' }}
            >
              <span className="grid place-items-center w-7 h-7 rounded-full text-xs font-bold"
                style={{ background: 'linear-gradient(135deg,#3B82F6,#1e3a8a)', color: '#fff' }}>
                {level}
              </span>
              <span className="text-xs text-[var(--pg-muted)]">Lvl {level}</span>
            </Link>
            {authed === false && (
              <Link to="/login" className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--pg-accent)', color: '#fff' }}>
                <LogIn className="w-4 h-4" /> Sign In
              </Link>
            )}
            {authed === true && (
              <button onClick={() => supabase.auth.signOut()} className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-[var(--pg-muted)] hover:text-white transition-colors"
                style={{ boxShadow: 'inset 0 0 0 1px var(--pg-border)' }}>
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-10 pg-scroll">
        <Outlet />
      </main>

      {/* Bottom nav (mobile) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t backdrop-blur-xl"
        style={{ borderColor: 'var(--pg-border)', background: 'rgba(0,5,15,0.85)' }}
      >
        <div className="grid grid-cols-7">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-[var(--pg-accent2)]' : 'text-[var(--pg-muted)]'
                }`
              }
            >
              <n.icon className="w-5 h-5" />
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}