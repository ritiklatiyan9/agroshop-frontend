import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { api } from '@/lib/axios';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { inrInWords } from '@/lib/numberToWords';
import type { BillDetail } from '@/types';

interface Props {
  billId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function BillDetailSheet({ billId, open, onOpenChange }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['bill', billId],
    queryFn: async () => {
      const res = await api.get<BillDetail>(`/bills/${billId}`);
      return res.data;
    },
    enabled: !!billId && open,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>
              Bill {data?.bill_number || ''}
              {data?.status === 'cancelled' && (
                <Badge variant="danger" className="ml-2">CANCELLED</Badge>
              )}
            </SheetTitle>
            {data && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(`/bills/print/${data.id}`, '_blank')}
              >
                <Printer className="mr-2 h-4 w-4" /> Print / PDF
              </Button>
            )}
          </div>
        </SheetHeader>

        {isLoading && <Skeleton className="h-64 w-full" />}

        {data && (
          <div className="space-y-5 text-sm">
            <section>
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Customer</div>
              <div className="font-medium text-slate-900">{data.customer_name || data.party?.name || '—'}</div>
              <div className="text-slate-500">
                {data.customer_mobile || data.party?.mobile || ''}
                {data.customer_gstin && <span className="ml-2">GSTIN: {data.customer_gstin}</span>}
              </div>
              {data.customer_address && <div className="text-slate-500">{data.customer_address}</div>}
            </section>

            <section>
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Items</div>
              <div className="border border-slate-100 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="text-left p-2">Item</th>
                      {data.bill_type === 'gst' && <th className="text-left p-2 w-20">HSN</th>}
                      <th className="text-right p-2 w-20">Qty</th>
                      <th className="text-right p-2 w-24">Rate</th>
                      {data.bill_type === 'gst' && <th className="text-right p-2 w-16">GST</th>}
                      <th className="text-right p-2 w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((it) => (
                      <tr key={it.id} className="border-t border-slate-100">
                        <td className="p-2">
                          <div className="font-medium">{it.product_name}</div>
                          <div className="text-xs text-slate-400">{it.unit}</div>
                        </td>
                        {data.bill_type === 'gst' && <td className="p-2 text-xs">{it.hsn_code || '—'}</td>}
                        <td className="p-2 text-right font-mono">{formatNumber(it.quantity, 2)}</td>
                        <td className="p-2 text-right font-mono">{formatCurrency(it.rate)}</td>
                        {data.bill_type === 'gst' && (
                          <td className="p-2 text-right text-xs">{it.gst_rate}%</td>
                        )}
                        <td className="p-2 text-right font-mono">{formatCurrency(it.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-lg bg-slate-50 p-3 text-sm space-y-1.5">
              <Row label="Subtotal" value={formatCurrency(data.subtotal)} />
              {data.bill_type === 'gst' && (
                <>
                  <Row label="CGST" value={formatCurrency(data.cgst_total)} />
                  <Row label="SGST" value={formatCurrency(data.sgst_total)} />
                </>
              )}
              <Row label="Discount" value={`- ${formatCurrency(data.discount_amount)}`} />
              <div className="flex justify-between font-bold border-t pt-1.5 mt-1.5">
                <span>Grand total</span>
                <span className="font-mono">{formatCurrency(data.grand_total)}</span>
              </div>
              <div className="text-xs text-slate-500 italic pt-1">
                {inrInWords(Number(data.grand_total))}
              </div>
            </section>

            <section className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-xs text-slate-500">Paid</div>
                <div className="font-mono font-medium">{formatCurrency(data.paid_amount)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Balance</div>
                <div className="font-mono font-medium text-amber-700">
                  {formatCurrency(Number(data.grand_total) - Number(data.paid_amount))}
                </div>
              </div>
            </section>

            {data.payments.length > 0 && (
              <section>
                <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                  Payment history
                </div>
                <ul className="space-y-1.5">
                  {data.payments.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between text-sm rounded-md bg-emerald-50/40 px-3 py-2"
                    >
                      <div>
                        <div className="font-medium">{formatCurrency(p.amount)}</div>
                        <div className="text-xs text-slate-500">
                          {p.payment_mode} · {new Date(p.payment_date).toLocaleDateString('en-IN')}
                          {p.reference_number && ` · ref ${p.reference_number}`}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {data.notes && (
              <section>
                <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Notes</div>
                <p className="text-sm text-slate-700">{data.notes}</p>
              </section>
            )}

            {data.cancellation_reason && (
              <section className="rounded-md border border-red-100 bg-red-50/40 p-3">
                <div className="text-xs uppercase tracking-wide text-red-600 mb-1">
                  Cancelled
                </div>
                <p className="text-sm text-slate-700">{data.cancellation_reason}</p>
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
