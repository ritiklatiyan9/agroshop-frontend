import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Shop, ModulePermission } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: ModulePermission[] | null;
  shops: Shop[];
  currentShopId: string | null;

  setSession: (data: {
    user: User;
    accessToken: string;
    refreshToken: string;
    permissions?: ModulePermission[] | null;
    shops?: Shop[];
    currentShopId?: string | null;
  }) => void;
  setTokens: (data: { accessToken: string; refreshToken: string }) => void;
  setUser: (user: User) => void;
  setPermissions: (permissions: ModulePermission[] | null) => void;
  setShops: (shops: Shop[]) => void;
  setCurrentShop: (shopId: string | null) => void;
  upsertShop: (shop: Shop) => void;
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
      shops: [],
      currentShopId: null,

      setSession: ({ user, accessToken, refreshToken, permissions, shops, currentShopId }) =>
        set((state) => ({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          permissions: permissions ?? null,
          shops: shops ?? [],
          // keep a valid current shop: prefer server value, then existing, then first
          currentShopId:
            currentShopId ??
            (shops?.some((s) => s.id === state.currentShopId) ? state.currentShopId : shops?.[0]?.id ?? null),
        })),
      setTokens: ({ accessToken, refreshToken }) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),
      setUser: (user) => set({ user }),
      setPermissions: (permissions) => set({ permissions }),
      setShops: (shops) =>
        set((state) => ({
          shops,
          currentShopId: shops.some((s) => s.id === state.currentShopId)
            ? state.currentShopId
            : shops[0]?.id ?? null,
        })),
      setCurrentShop: (shopId) => set({ currentShopId: shopId }),
      upsertShop: (shop) =>
        set((state) => {
          const exists = state.shops.some((s) => s.id === shop.id);
          return {
            shops: exists ? state.shops.map((s) => (s.id === shop.id ? shop : s)) : [...state.shops, shop],
          };
        }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          permissions: null,
          shops: [],
          currentShopId: null,
        }),
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
        shops: state.shops,
        currentShopId: state.currentShopId,
      }),
    },
  ),
);

/** The currently-selected shop object (or null). */
export function useCurrentShop(): Shop | null {
  return useAuthStore((s) => s.shops.find((shop) => shop.id === s.currentShopId) ?? null);
}
