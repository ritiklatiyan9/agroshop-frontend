import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, FileText, Pencil } from 'lucide-react';
import { api } from '@/lib/axios';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { Purchase } from '@/types';

interface Props {
  purchaseId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEdit?: (id: string) => void;
}

export function PurchaseDetailSheet({ purchaseId, open, onOpenChange, onEdit }: Props) {
  const [imgExpanded, setImgExpanded] = useState(false);

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
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0 gap-0" style={{ maxHeight: '100dvh' }}>
        <SheetHeader className="px-4 pt-5 pb-3 border-b border-slate-100 shrink-0 flex flex-row items-center justify-between pr-8">
          <SheetTitle>
            Purchase {data?.invoice_number ? `· ${data.invoice_number}` : ''}
          </SheetTitle>
          {data && onEdit && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => onEdit(data.id)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
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
              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="w-full min-w-[360px]">
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

            {data.bill_image_url && (() => {
              const url = data.bill_image_url!;
              const isImage = /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);
              return (
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Bill / Invoice</div>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-slate-500">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open original
                      </Button>
                    </a>
                  </div>
                  {isImage ? (
                    <div
                      className="cursor-zoom-in overflow-hidden rounded-xl border border-slate-200"
                      onClick={() => setImgExpanded((v) => !v)}
                    >
                      <img
                        src={url}
                        alt="Purchase bill"
                        className={`w-full object-contain transition-all ${imgExpanded ? 'max-h-none' : 'max-h-48'}`}
                      />
                      <p className="text-center text-xs text-slate-400 py-1">
                        {imgExpanded ? 'Click to collapse' : 'Click to expand'}
                      </p>
                    </div>
                  ) : (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100 transition-colors"
                    >
                      <FileText className="h-8 w-8 text-slate-400 shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-slate-700">View PDF</div>
                        <div className="text-xs text-slate-400 truncate max-w-xs">{url}</div>
                      </div>
                    </a>
                  )}
                </section>
              );
            })()}
          </div>
        )}
        </div>
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
