import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  Eye, IndianRupee, Pencil, Plus, ShoppingCart, TrendingDown, Wallet,
  ChevronDown, ChevronUp, SlidersHorizontal,
} from 'lucide-react';
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
import { NewPurchaseDialog } from '@/components/inventory/NewPurchaseDialog';
import { PurchaseDetailSheet } from '@/components/inventory/PurchaseDetailSheet';
import { EditPurchaseDialog } from '@/components/inventory/EditPurchaseDialog';
import { PurchasePayDialog } from '@/components/inventory/PurchasePayDialog';
import { formatCurrency } from '@/lib/utils';
import type { Pagination, Purchase } from '@/types';

const STATUS_CHIPS = [
  { label: 'All', value: 'all' },
  { label: 'Paid', value: 'paid' },
  { label: 'Partial', value: 'partial' },
  { label: 'Unpaid', value: 'unpaid' },
] as const;

export function PurchasesPage() {
  const [newOpen, setNewOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [payPurchase, setPayPurchase] = useState<Purchase | null>(null);
  const [page, setPage] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', { page, paymentStatus, fromDate, toDate }],
    queryFn: async () => {
      const res = await api.get<{ data: Purchase[]; pagination: Pagination }>('/purchases', {
        params: {
          page,
          page_size: 25,
          payment_status: paymentStatus !== 'all' ? paymentStatus : undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
        },
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const purchases = data?.data ?? [];
  const pagination = data?.pagination;

  const pageTotal = purchases.reduce((s, p) => s + Number(p.total_amount), 0);
  const pageUnpaid = purchases.filter((p) => p.payment_status !== 'paid').length;

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
          title="Purchases"
          description="All stock purchases from suppliers."
          actions={
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New purchase
            </Button>
          }
        />
      </div>

      {/* ── Mobile header ── */}
      <div className="lg:hidden flex-shrink-0 px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-slate-900">Purchases</h1>
        <p className="text-xs text-slate-500 mt-0.5">Stock IN from suppliers</p>
      </div>

      {/* ── Stats strip ── */}
      <div className="flex-shrink-0 px-4 lg:px-6 pt-3 pb-2">
        <div className="grid grid-cols-3 gap-2 lg:gap-3">
          <MobileStat label="Total" value={pagination?.total ?? '—'} icon={<ShoppingCart className="h-3.5 w-3.5" />} />
          <MobileStat label="Page Total" value={formatCurrency(pageTotal)} icon={<IndianRupee className="h-3.5 w-3.5" />} />
          <MobileStat
            label="Unpaid"
            value={pageUnpaid}
            icon={<TrendingDown className="h-3.5 w-3.5" />}
            color={pageUnpaid > 0 ? 'danger' : 'slate'}
          />
        </div>
      </div>

      {/* ── Mobile filters ── */}
      <div className="lg:hidden flex-shrink-0 px-4 pb-2 space-y-2">
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
          <button
            onClick={() => setFiltersOpen(v => !v)}
            className={`shrink-0 flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filtersOpen || fromDate || toDate
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            <SlidersHorizontal className="h-3 w-3" />
            Date
            {filtersOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <div className="w-2 shrink-0" />
        </div>

        {filtersOpen && (
          <div className="flex gap-2">
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

      {/* ── Mobile purchase cards ── */}
      <div className="lg:hidden flex-1 overflow-y-auto px-4 pb-28 space-y-2">
        {isLoading && (
          <div className="space-y-2 pt-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
          </div>
        )}
        {!isLoading && purchases.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <ShoppingCart className="h-14 w-14 mb-3 opacity-20" />
            <p className="text-sm font-medium">No purchases found</p>
            <p className="text-xs mt-1">Tap + to add a new purchase</p>
          </div>
        )}
        {purchases.map((p) => {
          const balance = Number(p.total_amount) - Number(p.paid_amount);
          return (
            <div
              key={p.id}
              className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm active:scale-[0.99] transition-transform"
              onClick={() => setViewId(p.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-slate-800">
                      {p.party?.name || 'Unknown Supplier'}
                    </span>
                    <Badge variant={statusVariant(p.payment_status)} className="text-[10px]">
                      {p.payment_status}
                    </Badge>
                    {p.bill_image_url && <Badge variant="info" className="text-[10px]">Bill</Badge>}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(p.purchase_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {p.invoice_number && <span className="ml-2 font-mono">#{p.invoice_number}</span>}
                  </p>
                  {p.item_count && (
                    <p className="text-xs text-slate-400 mt-0.5">{p.item_count} item{p.item_count !== 1 ? 's' : ''}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono font-bold text-slate-900">{formatCurrency(p.total_amount)}</p>
                  {balance > 0 && (
                    <p className="text-xs font-mono text-amber-600 mt-0.5">Due {formatCurrency(balance)}</p>
                  )}
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-50" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setViewId(p.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 py-1.5 text-xs font-medium text-slate-600 active:bg-slate-100"
                >
                  <Eye className="h-3.5 w-3.5" /> View
                </button>
                <button
                  onClick={() => setEditId(p.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 py-1.5 text-xs font-medium text-slate-600 active:bg-slate-100"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                {p.payment_status !== 'paid' && (
                  <button
                    onClick={() => setPayPurchase(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 py-1.5 text-xs font-medium text-emerald-700 active:bg-emerald-100"
                  >
                    <Wallet className="h-3.5 w-3.5" /> Pay
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between py-3">
            <p className="text-xs text-slate-400">
              Page {page} of {pagination.total_pages} · {pagination.total} purchases
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
                disabled={page >= pagination.total_pages}
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
      <button
        onClick={() => setNewOpen(true)}
        className="lg:hidden fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3.5 shadow-xl text-white text-sm font-semibold active:scale-95 transition-transform"
      >
        <Plus className="h-5 w-5" />
        New Purchase
      </button>

      {/* ── Desktop layout ── */}
      <div className="hidden lg:flex flex-col flex-1 min-h-0 p-6 pt-4 gap-4 overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-shrink-0">
          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Purchases shown</div>
                <div className="mt-0.5 text-xl font-bold text-slate-900">{pagination?.total ?? '—'}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <IndianRupee className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Page total</div>
                <div className="mt-0.5 text-xl font-bold text-slate-900">{formatCurrency(pageTotal)}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <TrendingDown className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Unpaid on page</div>
                <div className={`mt-0.5 text-xl font-bold ${pageUnpaid > 0 ? 'text-red-600' : 'text-slate-900'}`}>{pageUnpaid}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <CardContent className="p-4 flex flex-col h-full overflow-hidden gap-3">
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              <Select value={paymentStatus} onValueChange={(v) => { setPaymentStatus(v as typeof paymentStatus); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} className="w-full sm:w-40" placeholder="From date" />
              <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} className="w-full sm:w-40" placeholder="To date" />
            </div>

            <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-100">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="hidden sm:table-cell">Invoice #</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Paid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Bill</TableHead>
                    <TableHead className="w-28"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && [...Array(8)].map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  ))}
                  {!isLoading && purchases.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center py-12 text-slate-500">No purchases found.</TableCell></TableRow>
                  )}
                  {purchases.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-slate-50/60" onClick={() => setViewId(p.id)}>
                      <TableCell className="text-sm whitespace-nowrap">{new Date(p.purchase_date).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell className="font-medium">{p.party?.name || '—'}</TableCell>
                      <TableCell className="hidden sm:table-cell font-mono text-xs">{p.invoice_number || '—'}</TableCell>
                      <TableCell className="hidden sm:table-cell text-right">{p.item_count ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(p.total_amount)}</TableCell>
                      <TableCell className="hidden md:table-cell text-right font-mono">{formatCurrency(p.paid_amount)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(p.payment_status)}>{p.payment_status}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {p.bill_image_url ? <Badge variant="info">Uploaded</Badge> : <span className="text-xs text-slate-300">—</span>}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center">
                          {p.payment_status !== 'paid' && (
                            <Button variant="ghost" size="icon" title="Record payment" onClick={() => setPayPurchase(p)}>
                              <Wallet className="h-4 w-4 text-emerald-600" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" title="View purchase" onClick={() => setViewId(p.id)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" title="Edit purchase" onClick={() => setEditId(p.id)}><Pencil className="h-4 w-4 text-slate-500" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {pagination && pagination.total_pages > 1 && (
              <div className="flex items-center justify-between flex-shrink-0 pt-1">
                <p className="text-sm text-slate-500">Page {page} of {pagination.total_pages} · {pagination.total} purchases</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page >= pagination.total_pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <NewPurchaseDialog open={newOpen} onOpenChange={setNewOpen} />
      <PurchaseDetailSheet
        purchaseId={viewId}
        open={!!viewId}
        onOpenChange={(v) => !v && setViewId(null)}
        onEdit={(id) => { setViewId(null); setEditId(id); }}
      />
      <EditPurchaseDialog purchaseId={editId} open={!!editId} onOpenChange={(v) => !v && setEditId(null)} />
      <PurchasePayDialog purchase={payPurchase} open={!!payPurchase} onOpenChange={(v) => !v && setPayPurchase(null)} />
    </div>
  );
}

function MobileStat({
  label,
  value,
  icon,
  color = 'slate',
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: 'slate' | 'danger';
}) {
  const textColor = color === 'danger' ? 'text-red-600' : 'text-slate-900';
  return (
    <div className="rounded-xl bg-white border border-slate-100 p-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-slate-400">
        {icon}
        <p className="text-[10px] uppercase tracking-wide font-medium">{label}</p>
      </div>
      <p className={`mt-1 text-base font-bold ${textColor} leading-none`}>{value}</p>
    </div>
  );
}
