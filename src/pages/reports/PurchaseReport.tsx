import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Eye, Printer, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { downloadCsv } from '@/lib/download';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { PurchaseDetailSheet } from '@/components/inventory/PurchaseDetailSheet';
import { useParties } from '@/hooks/useParties';
import { formatCurrency } from '@/lib/utils';
import type { Purchase } from '@/types';

interface Response {
  data: Purchase[];
  summary: { total_purchases: number; total_paid: number; total_pending: number; count: number };
}

const STATUS_CHIPS = [
  { label: 'All', value: 'all' },
  { label: 'Paid', value: 'paid' },
  { label: 'Partial', value: 'partial' },
  { label: 'Unpaid', value: 'unpaid' },
] as const;

export function PurchaseReportPage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [partyId, setPartyId] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  const [viewId, setViewId] = useState<string | null>(null);

  const { data: parties = [] } = useParties('supplier');

  const params = {
    from: fromDate || undefined,
    to: toDate || undefined,
    party_id: partyId !== 'all' ? partyId : undefined,
    payment_status: paymentStatus !== 'all' ? paymentStatus : undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['report-purchases', params],
    queryFn: async () => {
      const res = await api.get<Response>('/reports/purchases', { params });
      return res.data;
    },
  });

  async function exportCsv() {
    try {
      await downloadCsv('/reports/purchases', params, `purchases-${new Date().toISOString().split('T')[0]}.csv`);
    } catch { toast.error('Export failed'); }
  }

  function statusVariant(s: string) { return s === 'paid' ? 'success' : s === 'unpaid' ? 'danger' : 'warning'; }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50">

      {/* ── Desktop header ── */}
      <div className="hidden lg:block flex-shrink-0 p-6 pb-0">
        <PageHeader
          title="Purchase Report"
          description="Stock-in entries from suppliers with payment status."
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Print / PDF</Button>
              <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
            </>
          }
        />
      </div>

      {/* ── Mobile header ── */}
      <div className="lg:hidden flex-shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Purchase Report</h1>
            <p className="text-xs text-slate-500 mt-0.5">{data?.summary.count ?? '—'} purchases</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 active:bg-slate-50"><Printer className="h-4 w-4" /></button>
            <button onClick={exportCsv} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 active:bg-slate-50"><Download className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="flex-shrink-0 px-4 lg:px-6 pt-3 pb-2">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
          <MobileStat label="Purchases" value={data?.summary.count ?? '—'} />
          <MobileStat label="Total" value={data ? formatCurrency(data.summary.total_purchases) : '—'} />
          <MobileStat label="Paid" value={data ? formatCurrency(data.summary.total_paid) : '—'} color="emerald" />
          <MobileStat label="Pending" value={data ? formatCurrency(data.summary.total_pending) : '—'} color={Number(data?.summary.total_pending) > 0 ? 'amber' : 'slate'} />
        </div>
      </div>

      {/* ── Mobile filters ── */}
      <div className="lg:hidden flex-shrink-0 px-4 pb-2 space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {STATUS_CHIPS.map((c) => (
            <button key={c.value} onClick={() => setPaymentStatus(c.value)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium active:scale-95 ${paymentStatus === c.value ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
              {c.label}
            </button>
          ))}
          <div className="w-2 shrink-0" />
        </div>
        <div className="flex gap-2">
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="flex-1 text-sm h-9" />
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="flex-1 text-sm h-9" />
        </div>
      </div>

      {/* ── Mobile cards ── */}
      <div className="lg:hidden flex-1 overflow-y-auto px-4 pb-24 space-y-2">
        {isLoading && [...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        {!isLoading && (data?.data ?? []).length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <ShoppingCart className="h-14 w-14 mb-3 opacity-20" />
            <p className="text-sm font-medium">No purchases match filters</p>
          </div>
        )}
        {data?.data.map((p) => {
          const balance = Number(p.total_amount) - Number(p.paid_amount);
          return (
            <div key={p.id} className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm active:scale-[0.99] transition-transform" onClick={() => setViewId(p.id)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-800 truncate">{p.party?.name || 'Unknown'}</span>
                    <Badge variant={statusVariant(p.payment_status)} className="text-[10px] shrink-0">{p.payment_status}</Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(p.purchase_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {p.invoice_number && <span className="ml-2 font-mono">#{p.invoice_number}</span>}
                  </p>
                  {p.item_count && <p className="text-xs text-slate-400 mt-0.5">{p.item_count} items</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono font-bold text-slate-900">{formatCurrency(p.total_amount)}</p>
                  {balance > 0 && <p className="text-xs font-mono text-amber-600 mt-0.5">Due {formatCurrency(balance)}</p>}
                </div>
              </div>
              <div className="flex justify-end mt-2 pt-2 border-t border-slate-50">
                <button onClick={(e) => { e.stopPropagation(); setViewId(p.id); }} className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <Eye className="h-3.5 w-3.5" /> View
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden lg:flex flex-col flex-1 min-h-0 p-6 pt-3 gap-3 overflow-hidden">
        <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <CardContent className="p-3 sm:p-4 flex flex-col h-full overflow-hidden gap-3">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 flex-shrink-0">
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full sm:w-44" />
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full sm:w-44" />
              <Select value={partyId} onValueChange={setPartyId}>
                <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Supplier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All suppliers</SelectItem>
                  {parties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as typeof paymentStatus)}>
                <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto flex-1 min-h-0 overflow-auto rounded-lg border border-slate-100">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="hidden sm:table-cell">Invoice #</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Paid</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && [...Array(8)].map((_, i) => <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)}
                  {data && data.data.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-10 text-slate-500">No purchases match the filters.</TableCell></TableRow>}
                  {data?.data.map((p) => {
                    const balance = Number(p.total_amount) - Number(p.paid_amount);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>{new Date(p.purchase_date).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell className="hidden sm:table-cell">{p.invoice_number || '—'}</TableCell>
                        <TableCell>{p.party?.name || '—'}</TableCell>
                        <TableCell className="hidden sm:table-cell text-right">{p.item_count ?? '—'}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(p.total_amount)}</TableCell>
                        <TableCell className="hidden md:table-cell text-right font-mono">{formatCurrency(p.paid_amount)}</TableCell>
                        <TableCell className="hidden md:table-cell text-right font-mono">{formatCurrency(balance)}</TableCell>
                        <TableCell><Badge variant={statusVariant(p.payment_status)}>{p.payment_status}</Badge></TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => setViewId(p.id)}><Eye className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <PurchaseDetailSheet purchaseId={viewId} open={!!viewId} onOpenChange={(v) => !v && setViewId(null)} />
    </div>
  );
}

function MobileStat({ label, value, color = 'slate' }: { label: string; value: string | number; color?: 'slate' | 'emerald' | 'amber' }) {
  const textColor = color === 'emerald' ? 'text-emerald-700' : color === 'amber' ? 'text-amber-700' : 'text-slate-900';
  return (
    <div className="rounded-xl bg-white border border-slate-100 p-3 shadow-sm">
      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">{label}</p>
      <p className={`mt-1 text-lg font-bold ${textColor} leading-none`}>{value}</p>
    </div>
  );
}
