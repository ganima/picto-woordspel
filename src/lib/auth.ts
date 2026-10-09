import { reactive, readonly } from 'vue';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Role, StaffRow } from './types';

interface AuthState {
  ready: boolean;
  user: User | null;
  staff: StaffRow | null;
}

const state = reactive<AuthState>({ ready: false, user: null, staff: null });

export const auth = readonly(state);

/** Role of whoever uses this device: a staff role when signed in as staff, otherwise student. */
export function currentRole(): Role {
  return state.staff?.role ?? 'student';
}

export function isStaff(): boolean {
  return state.staff !== null;
}

export function isAdmin(): boolean {
  return state.staff?.role === 'admin';
}

/** Returns false when the staff row could not be fetched (network or server error). */
async function loadStaff(user: User | null): Promise<boolean> {
  state.user = user;
  if (!user) {
    state.staff = null;
    return true;
  }
  const { data, error } = await supabase.from('staff').select('*').eq('user_id', user.id).maybeSingle();
  // On a network error keep the previous staff row rather than demoting the user mid-session.
  if (error) {
    console.warn('Could not load staff row', error);
    return false;
  }
  state.staff = (data as StaffRow | null) ?? null;
  return true;
}

let readyPromise: Promise<void> | null = null;

/** Restore the session (if any) and start following auth changes. Safe to call more than once. */
export function initAuth(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      const { data } = await supabase.auth.getSession();
      await loadStaff(data.session?.user ?? null);
      state.ready = true;
      supabase.auth.onAuthStateChange((event, session) => {
        // Defer: calling Supabase from inside this callback can deadlock the auth lock.
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
          setTimeout(() => void loadStaff(session?.user ?? null), 0);
        }
      });
    })();
  }
  return readyPromise;
}

export type SignInResult = { ok: true } | { ok: false; reason: 'credentials' | 'not_staff' | 'network' };

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    // 400 = wrong email/password; anything else (no status, 5xx) is treated as a connection problem.
    return { ok: false, reason: error.status === 400 ? 'credentials' : 'network' };
  }
  if (!(await loadStaff(data.user))) {
    return { ok: false, reason: 'network' };
  }
  if (!state.staff) {
    // A login without a staff role gets nothing extra, so don't leave it signed in on a class device.
    await signOut();
    return { ok: false, reason: 'not_staff' };
  }
  return { ok: true };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  state.user = null;
  state.staff = null;
}
