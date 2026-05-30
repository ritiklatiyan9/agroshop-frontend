import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, ChevronsUpDown, Check, Settings2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore, useCurrentShop } from '@/store/authStore';
import { useSwitchShop } from '@/hooks/useSwitchShop';
import { cn } from '@/lib/utils';

export function ShopSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const switchShop = useSwitchShop();
  const shops = useAuthStore((s) => s.shops);
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const role = useAuthStore((s) => s.user?.role) ?? 'supervisor';
  const setCurrentShop = useAuthStore((s) => s.setCurrentShop);
  const currentShop = useCurrentShop();

  // Default to the first shop when none is selected (or the selected one vanished).
  useEffect(() => {
    if (shops.length > 0 && !shops.some((s) => s.id === currentShopId)) {
      setCurrentShop(shops[0].id);
    }
  }, [shops, currentShopId, setCurrentShop]);

  const isOwner = role === 'owner';
  const canSwitch = shops.length > 1 || isOwner;
  const shopName = currentShop?.name ?? currentShop?.shop_name ?? 'No shop';

  const trigger = (
    <button
      className={cn(
        'flex h-14 w-full items-center gap-2.5 border-b border-slate-200 px-4 text-left transition-colors',
        canSwitch && 'hover:bg-slate-50',
      )}
      disabled={!canSwitch}
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
        <Store className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-900">{shopName}</div>
        <div className="text-[11px] text-slate-400">{isOwner ? 'Owner' : 'Shop'}</div>
      </div>
      {canSwitch && <ChevronsUpDown className="h-4 w-4 flex-shrink-0 text-slate-400" />}
    </button>
  );

  if (!canSwitch) return trigger;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-slate-400">
          {isOwner ? 'Your shops' : 'Switch shop'}
        </DropdownMenuLabel>
        {shops.length === 0 && (
          <div className="px-2 py-2 text-sm text-slate-400">No shops yet</div>
        )}
        {shops.map((shop) => (
          <DropdownMenuItem
            key={shop.id}
            onClick={() => switchShop(shop.id)}
            className="flex items-center gap-2"
          >
            <Store className="h-4 w-4 text-slate-400" />
            <span className="flex-1 truncate">{shop.name}</span>
            {shop.id === currentShopId && <Check className="h-4 w-4 text-emerald-600" />}
          </DropdownMenuItem>
        ))}
        {isOwner && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                navigate('/admin/shops');
                onNavigate?.();
              }}
            >
              <Settings2 className="mr-2 h-4 w-4" />
              Manage shops
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
