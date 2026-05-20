import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, ModulePermission } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: ModulePermission[] | null;

  setSession: (data: {
    user: User;
    accessToken: string;
    refreshToken: string;
    permissions?: ModulePermission[] | null;
  }) => void;
  setTokens: (data: { accessToken: string; refreshToken: string }) => void;
  setUser: (user: User) => void;
  setPermissions: (permissions: ModulePermission[] | null) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      permissions: null,

      setSession: ({ user, accessToken, refreshToken, permissions }) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true, permissions: permissions ?? null }),
      setTokens: ({ accessToken, refreshToken }) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),
      setUser: (user) => set({ user }),
      setPermissions: (permissions) => set({ permissions }),
      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, permissions: null }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'agroshop-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,
      }),
    },
  ),
);
