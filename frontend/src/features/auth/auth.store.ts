import { create } from 'zustand';
import type { AuthUser, LoginResponse } from './auth.types';

const STORAGE_KEY = 'pos-apotek-auth';

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setSession: (session: LoginResponse) => void;
  logout: () => void;
};

type PersistedAuth = Pick<AuthState, 'accessToken' | 'refreshToken' | 'user'>;

function readInitialState(): PersistedAuth {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { accessToken: null, refreshToken: null, user: null };
    return JSON.parse(raw) as PersistedAuth;
  } catch {
    return { accessToken: null, refreshToken: null, user: null };
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  ...readInitialState(),
  setSession: (session) => {
    const persisted: PersistedAuth = {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    set(persisted);
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ accessToken: null, refreshToken: null, user: null });
  },
}));
