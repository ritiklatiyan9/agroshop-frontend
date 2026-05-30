import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, EyeOff, Package, Clock, TrendingUp, Wallet, CheckCheck, X, CheckCircle2 } from 'lucide-react';
// EyeOff = "hide" action (owner only)
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

type Severity = 'danger' | 'warning' | 'info' | 'success';
type NotifType = 'low_stock' | 'expiring_soon' | 'daily_sales' | 'unpaid_purchase' | 'action';

interface NotificationItem {
  key: string;
  type: NotifType;
  title: string;
  body: string;
  severity: Severity;
  referenceId?: string;
  isRead: boolean;
}

interface NotificationsResponse {
  data: NotificationItem[];
  unread_count: number;
}

const ICON: Record<NotifType, React.ReactNode> = {
  low_stock: <Package className="h-4 w-4" />,
  expiring_soon: <Clock className="h-4 w-4" />,
  daily_sales: <TrendingUp className="h-4 w-4" />,
  unpaid_purchase: <Wallet className="h-4 w-4" />,
  action: <CheckCircle2 className="h-4 w-4" />,
};

const SEVERITY_STYLES: Record<Severity, { card: string; icon: string; badge: string }> = {
  danger: { card: 'border-red-100 bg-red-50/50', icon: 'bg-red-100 text-red-600', badge: 'bg-red-500' },
  warning: { card: 'border-amber-100 bg-amber-50/50', icon: 'bg-amber-100 text-amber-600', badge: 'bg-amber-500' },
  info: { card: 'border-blue-100 bg-blue-50/50', icon: 'bg-blue-100 text-blue-600', badge: 'bg-blue-500' },
  success: { card: 'border-emerald-100 bg-emerald-50/50', icon: 'bg-emerald-100 text-emerald-600', badge: 'bg-emerald-500' },
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  // Read-state is shared at the owner level, so only the owner may hide/dismiss.
  const isOwner = useAuthStore((s) => s.user?.role === 'owner');

  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get<NotificationsResponse>('/notifications');
      return res.data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (keys: string[]) => {
      await api.post('/notifications/read', { keys });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  function handleMarkOne(key: string) {
    markReadMutation.mutate([key]);
  }

  function handleMarkAll() {
    const unreadKeys = (data?.data ?? []).filter((n) => !n.isRead).map((n) => n.key);
    if (unreadKeys.length > 0) markReadMutation.mutate(unreadKeys);
  }

  const unreadCount = data?.unread_count ?? 0;
  const notifications = data?.data ?? [];
  // Hidden (read) notifications drop out of the list; only the owner can hide them.
  const visibleNotifications = notifications.filter((n) => !n.isRead);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(true)}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md flex flex-col p-0 gap-0 [&>button.absolute]:hidden"
        >
          {/* Header */}
          <SheetHeader className="flex flex-row items-center justify-between px-4 py-3 border-b border-slate-100 space-y-0">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-base font-semibold">Notifications</SheetTitle>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-[11px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {isOwner && unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-slate-500 hover:text-slate-900 gap-1.5"
                  onClick={handleMarkAll}
                  disabled={markReadMutation.isPending}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Hide all
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {isLoading && (
              <>
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </>
            )}

            {!isLoading && visibleNotifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Bell className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs mt-1">No notifications right now.</p>
              </div>
            )}

            {visibleNotifications.map((n) => {
              const styles = SEVERITY_STYLES[n.severity];
              return (
                <div
                  key={n.key}
                  className={`relative flex items-start gap-3 rounded-xl border p-3 ${styles.card}`}
                >
                  {/* Type icon */}
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}>
                    {ICON[n.type]}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 leading-tight">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
                  </div>

                  {/* Hide — owner only (read state is shared across the shop) */}
                  {isOwner && (
                    <button
                      className="shrink-0 -mt-0.5 -mr-1 flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-white/70 transition-colors"
                      title="Hide notification"
                      onClick={() => handleMarkOne(n.key)}
                      disabled={markReadMutation.isPending}
                    >
                      <EyeOff className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          {visibleNotifications.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2.5 text-center">
              <p className="text-xs text-slate-400">
                {visibleNotifications.length} active notification{visibleNotifications.length !== 1 ? 's' : ''}
                {isOwner ? ' · tap the eye to hide' : ''}
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
