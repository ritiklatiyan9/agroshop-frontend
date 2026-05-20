import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { api } from '@/lib/axios';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { inrInWords } from '@/lib/numberToWords';
import { openBillPrint } from '@/lib/printBill';
import type { BillDetail } from '@/types';

interface Props {
  billId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function BillDetailSheet({ billId, open, onOpenChange }: Props) {
  const navigate = useNavigate();

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
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0 gap-0" style={{ maxHeight: '100dvh' }}>
        {/* Header */}
        <SheetHeader className="px-4 pt-5 pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-base truncate">
              Bill {data?.bill_number || ''}
              {data?.status === 'cancelled' && (
                <Badge variant="danger" className="ml-2 text-xs">CANCELLED</Badge>
              )}
            </SheetTitle>
            {data && (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 h-8 text-xs gap-1.5"
                onClick={() => openBillPrint(data.id, navigate, () => onOpenChange(false))}
              >
                <Printer className="h-3.5 w-3.5" /> Print / PDF
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 text-sm">
          {isLoading && <Skeleton className="h-64 w-full rounded-xl" />}

          {data && (
            <>
              {/* Customer */}
              <section className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Customer</div>
                <div className="font-semibold text-slate-900">{data.customer_name || data.party?.name || '—'}</div>
                <div className="text-slate-500 text-xs mt-0.5">
                  {data.customer_mobile || data.party?.mobile || ''}
                  {data.customer_gstin && <span className="ml-2">GSTIN: {data.customer_gstin}</span>}
                </div>
                {data.customer_address && <div className="text-slate-500 text-xs">{data.customer_address}</div>}
              </section>

              {/* Meta grid */}
              <section className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
                  <div className="text-slate-400 mb-0.5">Bill date</div>
                  <div className="font-medium">{new Date(data.bill_date).toLocaleDateString('en-IN')}</div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
                  <div className="text-slate-400 mb-0.5">Payment mode</div>
                  <div className="font-medium uppercase">{data.payment_mode}</div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
                  <div className="text-slate-400 mb-0.5">Type</div>
                  <div className="font-medium">{data.bill_type === 'gst' ? 'GST Invoice' : 'Cash Memo'}</div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
                  <div className="text-slate-400 mb-0.5">Status</div>
                  <Badge
                    variant={data.payment_status === 'paid' ? 'success' : data.payment_status === 'partial' ? 'warning' : 'danger'}
                    className="text-[10px]"
                  >
                    {data.payment_status}
                  </Badge>
                </div>
              </section>

              {/* Items */}
              <section>
                <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Items</div>
                {/* Mobile: card per item */}
                <div className="sm:hidden space-y-2">
                  {data.items.map((it) => (
                    <div key={it.id} className="rounded-xl border border-slate-100 bg-white p-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="font-medium text-slate-900">{it.product_name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{it.unit}{data.bill_type === 'gst' && it.hsn_code ? ` · HSN ${it.hsn_code}` : ''}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-semibold font-mono text-slate-900">{formatCurrency(it.total_amount)}</div>
                          {data.bill_type === 'gst' && (
                            <div className="text-[10px] text-slate-400">GST {it.gst_rate}%</div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 flex gap-4 text-xs text-slate-500">
                        <span>Qty: <span className="font-mono font-medium text-slate-700">{formatNumber(it.quantity, 2)}</span></span>
                        <span>Rate: <span className="font-mono font-medium text-slate-700">{formatCurrency(it.rate)}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop: table */}
                <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="text-left p-2">Item</th>
                        {data.bill_type === 'gst' && <th className="text-left p-2 w-16">HSN</th>}
                        <th className="text-right p-2 w-16">Qty</th>
                        <th className="text-right p-2 w-20">Rate</th>
                        {data.bill_type === 'gst' && <th className="text-right p-2 w-12">GST</th>}
                        <th className="text-right p-2 w-24">Amount</th>
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
                          {data.bill_type === 'gst' && <td className="p-2 text-right text-xs">{it.gst_rate}%</td>}
                          <td className="p-2 text-right font-mono">{formatCurrency(it.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Totals */}
              <section className="rounded-xl bg-slate-50 p-3 space-y-1.5">
                <Row label="Subtotal" value={formatCurrency(data.subtotal)} />
                {data.bill_type === 'gst' && (
                  <>
                    <Row label="CGST" value={formatCurrency(data.cgst_total)} />
                    <Row label="SGST" value={formatCurrency(data.sgst_total)} />
                  </>
                )}
                {Number(data.discount_amount) > 0 && (
                  <Row label="Discount" value={`- ${formatCurrency(data.discount_amount)}`} />
                )}
                <div className="flex justify-between font-bold border-t pt-2 mt-1">
                  <span>Grand total</span>
                  <span className="font-mono">{formatCurrency(data.grand_total)}</span>
                </div>
                <div className="text-xs text-slate-400 italic">{inrInWords(Number(data.grand_total))}</div>
              </section>

              {/* Paid / Balance */}
              <section className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                  <div className="text-xs text-emerald-600 mb-0.5">Paid</div>
                  <div className="font-mono font-bold text-emerald-700">{formatCurrency(data.paid_amount)}</div>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                  <div className="text-xs text-amber-600 mb-0.5">Balance due</div>
                  <div className="font-mono font-bold text-amber-700">
                    {formatCurrency(Number(data.grand_total) - Number(data.paid_amount))}
                  </div>
                </div>
              </section>

              {/* Payment history */}
              {data.payments.length > 0 && (
                <section>
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Payment history</div>
                  <div className="space-y-2">
                    {data.payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-xl bg-emerald-50/40 border border-emerald-100 px-3 py-2">
                        <div>
                          <div className="text-xs text-slate-500">
                            {p.payment_mode} · {new Date(p.payment_date).toLocaleDateString('en-IN')}
                            {p.reference_number && ` · ref ${p.reference_number}`}
                          </div>
                        </div>
                        <div className="font-semibold font-mono text-emerald-700">{formatCurrency(p.amount)}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Notes */}
              {data.notes && (
                <section className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Notes</div>
                  <p className="text-sm text-slate-700">{data.notes}</p>
                </section>
              )}

              {/* Cancellation */}
              {data.cancellation_reason && (
                <section className="rounded-xl border border-red-100 bg-red-50/40 p-3">
                  <div className="text-xs uppercase tracking-wide text-red-500 mb-1">Cancelled</div>
                  <p className="text-sm text-slate-700">{data.cancellation_reason}</p>
                </section>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
