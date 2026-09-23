import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentProfile } from '@/lib/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      await applySession(session);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    });

    // Keep in sync with login/logout/token refresh in any tab
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      await applySession(session);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const applySession = async (session) => {
    if (session?.user) {
      setUser(session.user);
      setIsAuthenticated(true);
      const p = await getCurrentProfile();
      setProfile(p);
    } else {
      setUser(null);
      setProfile(null);
      setIsAuthenticated(false);
    }
  };

  const checkUserAuth = async () => {
    setIsLoadingAuth(true);
    const { data: { session } } = await supabase.auth.getSession();
    await applySession(session);
    setIsLoadingAuth(false);
    setAuthChecked(true);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isAuthenticated,
      isLoadingAuth,
      // Kept for compatibility with components that used Base44's app-loading
      // gate; there's no separate "app settings" fetch with Supabase, so this
      // just mirrors isLoadingAuth.
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings: null,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState: checkUserAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
