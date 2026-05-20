import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Download, Eye, Printer, Search, X, BarChart3 } from 'lucide-react';
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
import { BillDetailSheet } from '@/components/billing/BillDetailSheet';
import { useParties } from '@/hooks/useParties';
import { formatCurrency } from '@/lib/utils';
import type { BillRow, Pagination } from '@/types';

interface SalesResponse {
  data: BillRow[];
  pagination: Pagination;
  summary: {
    total_bills: number; subtotal: string; cgst: string; sgst: string;
    total_amount: string; collected: string; outstanding: string;
  };
}

const STATUS_CHIPS = [
  { label: 'All', value: 'all' },
  { label: 'Paid', value: 'paid' },
  { label: 'Partial', value: 'partial' },
  { label: 'Unpaid', value: 'unpaid' },
] as const;

const TYPE_CHIPS = [
  { label: 'All Types', value: 'all' },
  { label: 'GST', value: 'gst' },
  { label: 'Non-GST', value: 'non_gst' },
] as const;

export function SalesReportPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [billType, setBillType] = useState<'all' | 'gst' | 'non_gst'>('all');
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  const [partyId, setPartyId] = useState<string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [viewBillId, setViewBillId] = useState<string | null>(null);

  const { data: parties = [] } = useParties('customer');

  const params = {
    page, page_size: 25,
    search: search || undefined,
    bill_type: billType !== 'all' ? billType : undefined,
    payment_status: paymentStatus !== 'all' ? paymentStatus : undefined,
    party_id: partyId !== 'all' ? partyId : undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['report-sales', params],
    queryFn: async () => {
      const res = await api.get<SalesResponse>('/reports/sales', { params });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  async function exportCsv() {
    try {
      await downloadCsv('/reports/sales', params, `sales-${new Date().toISOString().split('T')[0]}.csv`);
    } catch { toast.error('CSV export failed'); }
  }

  function statusVariant(s: string) {
    return s === 'paid' ? 'success' : s === 'unpaid' ? 'danger' : 'warning';
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50">

      {/* ── Desktop header ── */}
      <div className="hidden lg:block flex-shrink-0 p-6 pb-0">
        <PageHeader
          title="Sales Report"
          description="Filter sales by date, party, type, payment status."
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" /> Print / PDF
              </Button>
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
            </>
          }
        />
      </div>

      {/* ── Mobile header ── */}
      <div className="lg:hidden flex-shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Sales Report</h1>
            <p className="text-xs text-slate-500 mt-0.5">{data?.summary.total_bills ?? '—'} bills</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 active:bg-slate-50">
              <Printer className="h-3.5 w-3.5" />
            </button>
            <button onClick={exportCsv} className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 active:bg-slate-50">
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="flex-shrink-0 px-4 lg:px-6 pt-3 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <StatPill label="Bills" value={data?.summary.total_bills ?? '—'} />
          <StatPill label="Subtotal" value={data ? formatCurrency(data.summary.subtotal) : '—'} />
          <StatPill label="Total" value={data ? formatCurrency(data.summary.total_amount) : '—'} />
          <StatPill label="Collected" value={data ? formatCurrency(data.summary.collected) : '—'} color="emerald" />
          <StatPill label="Outstanding" value={data ? formatCurrency(data.summary.outstanding) : '—'} color={Number(data?.summary.outstanding) > 0 ? 'amber' : 'slate'} />
          <div className="w-2 shrink-0" />
        </div>
      </div>

      {/* ── Mobile filters ── */}
      <div className="lg:hidden flex-shrink-0 px-4 pb-2 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            placeholder="Search bill # or customer..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => { setSearch(''); setPage(1); }}>
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {STATUS_CHIPS.map((c) => (
            <button key={c.value} onClick={() => { setPaymentStatus(c.value); setPage(1); }}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium active:scale-95 ${paymentStatus === c.value ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
              {c.label}
            </button>
          ))}
          {TYPE_CHIPS.map((c) => (
            <button key={c.value} onClick={() => { setBillType(c.value); setPage(1); }}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium active:scale-95 ${billType === c.value ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
              {c.label}
            </button>
          ))}
          <div className="w-2 shrink-0" />
        </div>
        <div className="flex gap-2">
          <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} className="flex-1 text-sm h-9" />
          <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} className="flex-1 text-sm h-9" />
        </div>
      </div>

      {/* ── Mobile cards ── */}
      <div className="lg:hidden flex-1 overflow-y-auto px-4 pb-24 space-y-2">
        {isLoading && [...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        {!isLoading && (data?.data ?? []).length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <BarChart3 className="h-14 w-14 mb-3 opacity-20" />
            <p className="text-sm font-medium">No bills match the filters</p>
          </div>
        )}
        {data?.data.map((b) => {
          const gst = Number(b.cgst_total) + Number(b.sgst_total);
          return (
            <div key={b.id} className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm active:scale-[0.99] transition-transform" onClick={() => setViewBillId(b.id)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-slate-800">{b.bill_number}</span>
                    <Badge variant={b.bill_type === 'gst' ? 'info' : 'muted'} className="text-[10px]">{b.bill_type === 'gst' ? 'GST' : 'NON-GST'}</Badge>
                    <Badge variant={statusVariant(b.payment_status)} className="text-[10px]">{b.payment_status}</Badge>
                  </div>
                  <p className="text-sm font-medium text-slate-700 mt-1 truncate">{b.customer_name || b.party?.name || 'Walk-in'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(b.bill_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono font-bold text-slate-900">{formatCurrency(b.grand_total)}</p>
                  {gst > 0 && <p className="text-xs text-slate-400 mt-0.5 font-mono">GST {formatCurrency(gst)}</p>}
                </div>
              </div>
              <div className="flex justify-end mt-2 pt-2 border-t border-slate-50">
                <button onClick={(e) => { e.stopPropagation(); setViewBillId(b.id); }} className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <Eye className="h-3.5 w-3.5" /> View Bill
                </button>
              </div>
            </div>
          );
        })}
        {data && data.pagination.total_pages > 1 && (
          <div className="flex items-center justify-between py-3">
            <p className="text-xs text-slate-400">Page {data.pagination.page} of {data.pagination.total_pages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-40 active:bg-slate-50">Previous</button>
              <button disabled={page >= data.pagination.total_pages} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-40 active:bg-slate-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden lg:flex flex-col flex-1 min-h-0 p-6 pt-3 gap-3 overflow-hidden">
        <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <CardContent className="p-3 sm:p-4 flex flex-col h-full overflow-hidden gap-3">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 flex-shrink-0">
              <div className="relative col-span-2 sm:flex-1 sm:min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search bill # or customer..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
              </div>
              <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} className="w-full sm:w-44" />
              <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} className="w-full sm:w-44" />
              <Select value={partyId} onValueChange={(v) => { setPartyId(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Party" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All parties</SelectItem>
                  {parties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={billType} onValueChange={(v) => { setBillType(v as typeof billType); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="gst">GST</SelectItem>
                  <SelectItem value="non_gst">Non-GST</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentStatus} onValueChange={(v) => { setPaymentStatus(v as typeof paymentStatus); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Payment" /></SelectTrigger>
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
                    <TableHead>Bill #</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Taxable</TableHead>
                    <TableHead className="hidden md:table-cell text-right">GST</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && [...Array(8)].map((_, i) => <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)}
                  {data && data.data.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-10 text-slate-500">No bills match the filters.</TableCell></TableRow>}
                  {data?.data.map((b) => {
                    const gst = Number(b.cgst_total) + Number(b.sgst_total);
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono font-medium">{b.bill_number}</TableCell>
                        <TableCell className="hidden sm:table-cell">{new Date(b.bill_date).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell>{b.customer_name || b.party?.name || '—'}</TableCell>
                        <TableCell className="hidden sm:table-cell"><Badge variant={b.bill_type === 'gst' ? 'info' : 'muted'}>{b.bill_type === 'gst' ? 'GST' : 'NON-GST'}</Badge></TableCell>
                        <TableCell className="hidden md:table-cell text-right font-mono">{formatCurrency(b.subtotal)}</TableCell>
                        <TableCell className="hidden md:table-cell text-right font-mono">{formatCurrency(gst)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(b.grand_total)}</TableCell>
                        <TableCell><Badge variant={statusVariant(b.payment_status)}>{b.payment_status}</Badge></TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => setViewBillId(b.id)}><Eye className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {data && data.pagination.total_pages > 1 && (
              <div className="flex items-center justify-between flex-shrink-0">
                <p className="text-sm text-slate-500">Page {data.pagination.page} of {data.pagination.total_pages} · {data.pagination.total} bills</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page >= data.pagination.total_pages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BillDetailSheet billId={viewBillId} open={!!viewBillId} onOpenChange={(v) => !v && setViewBillId(null)} />
    </div>
  );
}

function StatPill({ label, value, color = 'slate' }: { label: string; value: string | number; color?: 'slate' | 'emerald' | 'amber' }) {
  const textColor = color === 'emerald' ? 'text-emerald-700' : color === 'amber' ? 'text-amber-700' : 'text-slate-900';
  return (
    <div className="shrink-0 rounded-xl bg-white border border-slate-100 px-3 py-2 shadow-sm min-w-[80px]">
      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">{label}</p>
      <p className={`mt-0.5 text-sm font-bold ${textColor} leading-none whitespace-nowrap`}>{value}</p>
    </div>
  );
}
