import { useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { api } from '@/lib/axios';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/utils';
import type { StockMovement } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productId: string | null;
  productName?: string;
}

const inwardTypes = new Set(['purchase', 'adjustment_in', 'return_in']);

export function StockLedgerSheet({ open, onOpenChange, productId, productName }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['stock-ledger', productId],
    queryFn: async () => {
      const res = await api.get<{
        product: { id: string; name: string; current_stock: string };
        data: StockMovement[];
      }>(`/inventory/${productId}/ledger`);
      return res.data;
    },
    enabled: !!productId && open,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Stock ledger {productName ? `· ${productName}` : ''}</SheetTitle>
          {data?.product && (
            <p className="text-sm text-slate-500">
              Current stock:{' '}
              <span className="font-medium text-slate-900">
                {formatNumber(data.product.current_stock, 2)}
              </span>
            </p>
          )}
        </SheetHeader>

        {isLoading && (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )}

        {data && data.data.length === 0 && (
          <div className="text-center text-sm text-slate-500 py-12">No stock movements yet.</div>
        )}

        <ul className="space-y-2">
          {data?.data.map((m) => {
            const inward = inwardTypes.has(m.movement_type);
            return (
              <li
                key={m.id}
                className={`rounded-lg border p-3 ${inward ? 'border-emerald-100 bg-emerald-50/40' : 'border-red-100 bg-red-50/40'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    {inward ? (
                      <ArrowDownRight className="h-4 w-4 text-emerald-600 mt-0.5" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-red-600 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-slate-900">
                          {m.movement_type.replace('_', ' ')}
                        </span>
                        <Badge variant={inward ? 'success' : 'danger'}>
                          {inward ? '+' : '-'} {formatNumber(m.quantity, 2)}
                        </Badge>
                      </div>
                      {m.notes && <div className="text-xs text-slate-500 mt-0.5">{m.notes}</div>}
                      <div className="text-xs text-slate-400 mt-0.5">
                        {new Date(m.created_at).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Balance</div>
                    <div className="font-mono text-sm font-medium">
                      {formatNumber(m.running_balance ?? 0, 2)}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
