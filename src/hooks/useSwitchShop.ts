import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

/**
 * Switches the active shop: updates the store (so the X-Shop-Id header changes),
 * drops all cached shop-scoped data, and refreshes permissions/shops for the
 * newly-selected shop. Fast and glitch-free — no page reload.
 */
export function useSwitchShop() {
  const queryClient = useQueryClient();

  return useCallback(
    async (shopId: string) => {
      const { currentShopId, setCurrentShop, setShops, setPermissions } = useAuthStore.getState();
      if (shopId === currentShopId) return;

      // 1. point all subsequent requests at the new shop
      setCurrentShop(shopId);

      // 2. drop cached data from the previous shop so nothing stale renders
      queryClient.clear();

      // 3. refresh per-shop permissions (+ latest shop list) for the new shop
      try {
        const res = await api.get('/auth/me');
        if (res.data.shops) setShops(res.data.shops);
        setPermissions(res.data.permissions ?? null);
      } catch {
        /* keep the optimistic switch; queries will retry */
      }
    },
    [queryClient],
  );
}
