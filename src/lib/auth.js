import { supabase } from '@/lib/supabaseClient';

// Synthetic email domain used when a player signs up with a username only
// (no real email address). Supabase Auth requires *some* email string, so
// we build one from the username and never actually send mail to it.
export const FAKE_EMAIL_DOMAIN = 'players.playgrid.local';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export function isValidUsername(username) {
  return USERNAME_RE.test(username || '');
}

export function usernameToFakeEmail(username) {
  return `${username.toLowerCase()}@${FAKE_EMAIL_DOMAIN}`;
}

function looksLikeEmail(value) {
  return /\S+@\S+\.\S+/.test(value || '');
}

/**
 * Register a new player.
 * - username: required, 3-20 chars, letters/numbers/underscore
 * - password: required
 * - email: optional real email. If omitted, a synthetic address is used
 *   so the player never needs a real inbox to play.
 *
 * A DB trigger (handle_new_user) creates the matching profiles row from
 * raw_user_meta_data.username, so we don't need to write it ourselves here.
 */
export async function signUpWithUsername({ username, password, email }) {
  if (!isValidUsername(username)) {
    throw new Error('Username must be 3-20 characters (letters, numbers, underscore only).');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const authEmail = email && email.trim() ? email.trim() : usernameToFakeEmail(username);

  const { data, error } = await supabase.auth.signUp({
    email: authEmail,
    password,
    options: {
      data: {
        username,
      },
    },
  });

  if (error) {
    if (/already registered|already exists/i.test(error.message)) {
      throw new Error('That username or email is already taken.');
    }
    throw error;
  }

  return data;
}

/**
 * Log in with either a username or a real email address, plus password.
 */
export async function signInWithUsernameOrEmail({ identifier, password }) {
  if (!identifier || !password) {
    throw new Error('Enter your username/email and password.');
  }

  let authEmail = identifier.trim();

  if (!looksLikeEmail(authEmail)) {
    // It's a username - resolve it to the auth email via the RPC.
    const { data: resolvedEmail, error: rpcError } = await supabase.rpc('email_for_username', {
      p_username: authEmail,
    });
    if (rpcError || !resolvedEmail) {
      throw new Error('No account found with that username.');
    }
    authEmail = resolvedEmail;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password,
  });

  if (error) {
    throw new Error('Incorrect username/email or password.');
  }

  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return data;
}
