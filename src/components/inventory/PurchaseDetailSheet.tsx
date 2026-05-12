import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { Purchase } from '@/types';

interface Props {
  purchaseId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function PurchaseDetailSheet({ purchaseId, open, onOpenChange }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['purchase', purchaseId],
    queryFn: async () => {
      const res = await api.get<Purchase>(`/purchases/${purchaseId}`);
      return res.data;
    },
    enabled: !!purchaseId && open,
  });

  const balance = data
    ? Number(data.total_amount) - Number(data.paid_amount)
    : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            Purchase {data?.invoice_number ? `· ${data.invoice_number}` : ''}
          </SheetTitle>
        </SheetHeader>

        {isLoading && <Skeleton className="h-64 w-full" />}

        {data && (
          <div className="space-y-5 text-sm">
            <section className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-xs text-slate-500">Supplier</div>
                <div className="font-medium text-slate-900">{data.party?.name || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Date</div>
                <div className="font-medium">
                  {new Date(data.purchase_date).toLocaleDateString('en-IN')}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Invoice #</div>
                <div className="font-mono">{data.invoice_number || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Payment</div>
                <div>
                  <Badge
                    variant={
                      data.payment_status === 'paid'
                        ? 'success'
                        : data.payment_status === 'unpaid'
                        ? 'danger'
                        : 'warning'
                    }
                  >
                    {data.payment_status} · {data.payment_mode}
                  </Badge>
                </div>
              </div>
            </section>

            <section>
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Items</div>
              <div className="border border-slate-100 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="text-left p-2">Product</th>
                      <th className="text-right p-2 w-20">Qty</th>
                      <th className="text-right p-2 w-24">Rate</th>
                      <th className="text-right p-2 w-24">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.items ?? []).map((it) => (
                      <tr key={it.id} className="border-t border-slate-100">
                        <td className="p-2">
                          <div className="font-medium">{it.product?.name ?? '—'}</div>
                          <div className="text-xs text-slate-400">
                            {it.batch_number ? `Batch ${it.batch_number}` : '—'}
                            {it.expiry_date && ` · exp ${new Date(it.expiry_date).toLocaleDateString('en-IN')}`}
                          </div>
                        </td>
                        <td className="p-2 text-right font-mono">
                          {formatNumber(it.quantity, 2)} {it.product?.unit ?? ''}
                        </td>
                        <td className="p-2 text-right font-mono">
                          {formatCurrency(it.rate)}
                        </td>
                        <td className="p-2 text-right font-mono">
                          {formatCurrency(it.total_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-lg bg-slate-50 p-3 text-sm space-y-1.5">
              <Row label="Total amount" value={formatCurrency(data.total_amount)} />
              <Row label="Paid" value={formatCurrency(data.paid_amount)} />
              <div className="flex justify-between font-bold border-t pt-1.5 mt-1.5">
                <span>Balance due</span>
                <span className="font-mono text-amber-700">{formatCurrency(balance)}</span>
              </div>
            </section>

            {data.notes && (
              <section>
                <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Notes</div>
                <p className="text-sm text-slate-700">{data.notes}</p>
              </section>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
