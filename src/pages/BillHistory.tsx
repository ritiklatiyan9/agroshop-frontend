import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { openBillPrint } from '@/lib/printBill';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Eye, Printer, Wallet, XCircle, Plus, Search, X, ChevronDown, ChevronUp, SlidersHorizontal, Receipt } from 'lucide-react';
import { api } from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { BillDetailSheet } from '@/components/billing/BillDetailSheet';
import { RecordPaymentDialog } from '@/components/billing/RecordPaymentDialog';
import { CancelBillDialog } from '@/components/billing/CancelBillDialog';
import { formatCurrency } from '@/lib/utils';
import type { BillRow, Pagination, BillSummaryAgg } from '@/types';

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

export function BillHistoryPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [billType, setBillType] = useState<'all' | 'gst' | 'non_gst'>('all');
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [viewBillId, setViewBillId] = useState<string | null>(null);
  const [payBill, setPayBill] = useState<BillRow | null>(null);
  const [cancelBill, setCancelBill] = useState<BillRow | null>(null);
  const [menuBillId, setMenuBillId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuBillId(null);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['bills', { page, search, billType, paymentStatus, fromDate, toDate }],
    queryFn: async () => {
      const res = await api.get<{ data: BillRow[]; pagination: Pagination; summary: BillSummaryAgg }>(
        '/bills',
        {
          params: {
            page,
            page_size: 30,
            search: search || undefined,
            bill_type: billType !== 'all' ? billType : undefined,
            payment_status: paymentStatus !== 'all' ? paymentStatus : undefined,
            from_date: fromDate || undefined,
            to_date: toDate || undefined,
          },
        },
      );
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const bills = data?.data ?? [];

  function statusVariant(status: string) {
    if (status === 'paid') return 'success';
    if (status === 'unpaid') return 'danger';
    return 'warning';
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50">

      {/* ── Desktop header ── */}
      <div className="hidden lg:block flex-shrink-0 p-6 pb-0">
        <PageHeader
          title="Bill History"
          description="All sales bills with status and outstanding balances."
          actions={
            <>
              <Button variant="outline" onClick={() => navigate('/bills/new')}>
                <Plus className="mr-2 h-4 w-4" /> Non-GST
              </Button>
              <Button onClick={() => navigate('/bills/new-gst')}>
                <Plus className="mr-2 h-4 w-4" /> New GST Bill
              </Button>
            </>
          }
        />
      </div>

      {/* ── Mobile header ── */}
      <div className="lg:hidden flex-shrink-0 px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-slate-900">Bill History</h1>
        <p className="text-xs text-slate-500 mt-0.5">All sales bills</p>
      </div>

      {/* ── Stats strip ── */}
      <div className="flex-shrink-0 px-4 lg:px-6 pt-3 pb-2">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
          <MobileStat label="Total Bills" value={data?.summary.total_bills ?? '—'} />
          <MobileStat label="Total Amount" value={data ? formatCurrency(data.summary.total_amount) : '—'} />
          <MobileStat label="Collected" value={data ? formatCurrency(data.summary.collected) : '—'} color="emerald" />
          <MobileStat
            label="Outstanding"
            value={data ? formatCurrency(data.summary.outstanding) : '—'}
            color={Number(data?.summary.outstanding) > 0 ? 'amber' : 'slate'}
          />
        </div>
      </div>

      {/* ── Mobile search + filter toggle ── */}
      <div className="lg:hidden flex-shrink-0 px-4 pb-2 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
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
          <button
            onClick={() => setFiltersOpen(v => !v)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
              filtersOpen || fromDate || toDate || billType !== 'all'
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {filtersOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* Status chips */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {STATUS_CHIPS.map((c) => (
            <button
              key={c.value}
              onClick={() => { setPaymentStatus(c.value); setPage(1); }}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors active:scale-95 ${
                paymentStatus === c.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              {c.label}
            </button>
          ))}
          <div className="w-2 shrink-0" />
        </div>

        {/* Bill type chips */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {TYPE_CHIPS.map((c) => (
            <button
              key={c.value}
              onClick={() => { setBillType(c.value); setPage(1); }}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors active:scale-95 ${
                billType === c.value
                  ? 'bg-slate-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              {c.label}
            </button>
          ))}
          <div className="w-2 shrink-0" />
        </div>

        {/* Collapsible date filters */}
        {filtersOpen && (
          <div className="flex gap-2 pt-1">
            <div className="flex-1">
              <p className="text-[10px] font-medium text-slate-400 mb-1 uppercase tracking-wide">From</p>
              <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} className="text-sm h-9" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-medium text-slate-400 mb-1 uppercase tracking-wide">To</p>
              <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} className="text-sm h-9" />
            </div>
            {(fromDate || toDate) && (
              <button
                onClick={() => { setFromDate(''); setToDate(''); setPage(1); }}
                className="self-end mb-0.5 text-xs text-slate-400 hover:text-red-500 px-1"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Mobile bill cards ── */}
      <div className="lg:hidden flex-1 overflow-y-auto px-4 pb-28 space-y-2" ref={menuRef}>
        {isLoading && (
          <div className="space-y-2 pt-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
          </div>
        )}
        {!isLoading && bills.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Receipt className="h-14 w-14 mb-3 opacity-20" />
            <p className="text-sm font-medium">No bills found</p>
            <p className="text-xs mt-1">Try changing your filters</p>
          </div>
        )}
        {bills.map((b) => {
          const balance = Number(b.grand_total) - Number(b.paid_amount);
          const isCancelled = b.status === 'cancelled';
          const isMenuOpen = menuBillId === b.id;
          return (
            <div
              key={b.id}
              className={`relative rounded-2xl bg-white border border-slate-100 p-4 shadow-sm active:scale-[0.99] transition-transform ${isCancelled ? 'opacity-50' : ''}`}
              onClick={() => setViewBillId(b.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-slate-800">{b.bill_number}</span>
                    <Badge variant={b.bill_type === 'gst' ? 'info' : 'muted'} className="text-[10px]">
                      {b.bill_type === 'gst' ? 'GST' : 'NON-GST'}
                    </Badge>
                    {isCancelled ? (
                      <Badge variant="danger" className="text-[10px]">Cancelled</Badge>
                    ) : (
                      <Badge variant={statusVariant(b.payment_status)} className="text-[10px]">{b.payment_status}</Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-700 mt-1 truncate">
                    {b.customer_name || b.party?.name || 'Walk-in'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(b.bill_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono font-bold text-slate-900">{formatCurrency(b.grand_total)}</p>
                  {balance > 0 && !isCancelled && (
                    <p className="text-xs font-mono text-amber-600 mt-0.5">Due {formatCurrency(balance)}</p>
                  )}
                </div>
              </div>

              {/* Quick action row */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-50" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setViewBillId(b.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 py-1.5 text-xs font-medium text-slate-600 active:bg-slate-100"
                >
                  <Eye className="h-3.5 w-3.5" /> View
                </button>
                <button
                  onClick={() => openBillPrint(b.id, navigate)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 py-1.5 text-xs font-medium text-slate-600 active:bg-slate-100"
                >
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                {!isCancelled && balance > 0 && (
                  <button
                    onClick={() => setPayBill(b)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 py-1.5 text-xs font-medium text-emerald-700 active:bg-emerald-100"
                  >
                    <Wallet className="h-3.5 w-3.5" /> Pay
                  </button>
                )}
                {!isCancelled && (
                  <button
                    onClick={() => setCancelBill(b)}
                    className="flex items-center justify-center rounded-lg bg-red-50 px-3 py-1.5 active:bg-red-100"
                  >
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Pagination */}
        {data && data.pagination.total_pages > 1 && (
          <div className="flex items-center justify-between py-3">
            <p className="text-xs text-slate-400">
              Page {data.pagination.page} of {data.pagination.total_pages} · {data.pagination.total} bills
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40 active:bg-slate-50"
              >
                Previous
              </button>
              <button
                disabled={page >= data.pagination.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40 active:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── FAB (mobile) ── */}
      <div className="lg:hidden fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
        <button
          onClick={() => navigate('/bills/new')}
          className="flex items-center gap-2 rounded-full bg-slate-700 px-4 py-2.5 shadow-lg text-white text-sm font-medium active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4" /> Non-GST
        </button>
        <button
          onClick={() => navigate('/bills/new-gst')}
          className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 shadow-xl text-white text-sm font-semibold active:scale-95 transition-transform"
        >
          <Plus className="h-5 w-5" /> GST Bill
        </button>
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden lg:flex flex-col flex-1 min-h-0 p-6 pt-4 gap-4 overflow-hidden">
        <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <CardContent className="p-4 flex flex-col h-full overflow-hidden gap-3">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 flex-shrink-0">
              <div className="col-span-2 relative sm:flex-1 sm:min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search bill # or customer..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              <Select value={billType} onValueChange={(v) => { setBillType(v as typeof billType); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="gst">GST</SelectItem>
                  <SelectItem value="non_gst">Non-GST</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentStatus} onValueChange={(v) => { setPaymentStatus(v as typeof paymentStatus); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Payment" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All payments</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} className="w-full sm:w-44" />
              <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} className="w-full sm:w-44" />
            </div>

            <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-100">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill #</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Paid</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && [...Array(8)].map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={10}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  ))}
                  {data && data.data.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center py-10 text-slate-500">No bills found.</TableCell></TableRow>
                  )}
                  {data?.data.map((b) => {
                    const balance = Number(b.grand_total) - Number(b.paid_amount);
                    const isCancelled = b.status === 'cancelled';
                    return (
                      <TableRow key={b.id} className={isCancelled ? 'opacity-60' : ''}>
                        <TableCell className="font-mono font-medium">{b.bill_number}</TableCell>
                        <TableCell className="hidden sm:table-cell">{new Date(b.bill_date).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell className="font-medium">{b.customer_name || b.party?.name || '—'}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={b.bill_type === 'gst' ? 'info' : 'muted'}>{b.bill_type === 'gst' ? 'GST' : 'NON-GST'}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right">{b.item_count ?? '—'}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(b.grand_total)}</TableCell>
                        <TableCell className="hidden md:table-cell text-right font-mono">{formatCurrency(b.paid_amount)}</TableCell>
                        <TableCell className="hidden md:table-cell text-right font-mono">{formatCurrency(balance)}</TableCell>
                        <TableCell>
                          {isCancelled ? (
                            <Badge variant="danger">Cancelled</Badge>
                          ) : (
                            <Badge variant={statusVariant(b.payment_status)}>{b.payment_status}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" title="View" onClick={() => setViewBillId(b.id)}><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" title="Print" onClick={() => openBillPrint(b.id, navigate)}><Printer className="h-4 w-4" /></Button>
                            {!isCancelled && balance > 0 && (
                              <Button variant="ghost" size="icon" title="Record payment" onClick={() => setPayBill(b)}><Wallet className="h-4 w-4 text-emerald-600" /></Button>
                            )}
                            {!isCancelled && (
                              <Button variant="ghost" size="icon" title="Cancel bill" onClick={() => setCancelBill(b)}><XCircle className="h-4 w-4 text-red-500" /></Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {data && data.pagination.total_pages > 1 && (
              <div className="flex items-center justify-between flex-shrink-0">
                <p className="text-sm text-slate-500">
                  Page {data.pagination.page} of {data.pagination.total_pages} · {data.pagination.total} items
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page >= data.pagination.total_pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BillDetailSheet billId={viewBillId} open={!!viewBillId} onOpenChange={(v) => !v && setViewBillId(null)} />
      <RecordPaymentDialog bill={payBill} open={!!payBill} onOpenChange={(v) => !v && setPayBill(null)} />
      <CancelBillDialog bill={cancelBill} open={!!cancelBill} onOpenChange={(v) => !v && setCancelBill(null)} />
    </div>
  );
}

function MobileStat({
  label,
  value,
  color = 'slate',
}: {
  label: string;
  value: string | number;
  color?: 'slate' | 'emerald' | 'amber';
}) {
  const textColor =
    color === 'emerald' ? 'text-emerald-700' :
    color === 'amber' ? 'text-amber-700' :
    'text-slate-900';
  return (
    <div className="rounded-xl bg-white border border-slate-100 p-3 shadow-sm">
      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">{label}</p>
      <p className={`mt-1 text-lg font-bold ${textColor} leading-none`}>{value}</p>
    </div>
  );
}
