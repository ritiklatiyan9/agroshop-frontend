import { useEffect } from 'react';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

/**
 * On app load (when already authenticated), refreshes the session from /auth/me
 * so `shops`, the current shop, permissions, and user details are always present
 * and up to date — including repairing older sessions saved before multi-shop.
 */
export function useSessionBootstrap() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/auth/me');
        if (cancelled) return;
        const { setUser, setShops, setPermissions, setCurrentShop, currentShopId } =
          useAuthStore.getState();
        if (res.data.user) setUser(res.data.user);
        if (res.data.shops) setShops(res.data.shops);
        setPermissions(res.data.permissions ?? null);
        // adopt the server's current shop only if we don't have a valid one yet
        const validHere = res.data.shops?.some(
          (s: { id: string }) => s.id === currentShopId,
        );
        if (!validHere && res.data.current_shop_id) {
          setCurrentShop(res.data.current_shop_id);
        }
      } catch {
        /* token refresh / logout is handled by the axios interceptor */
      }
    })();
    return () => {
      cancelled = true;
    };
    // run once per authenticated load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
}
