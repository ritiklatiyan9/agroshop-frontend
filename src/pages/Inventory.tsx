import { useState, useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  History, Plus, Settings2, Eye, Search, X,
  ArrowDownLeft, ArrowUpRight, Package, ChevronDown, ChevronUp,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { LowStockBadge } from '@/components/products/LowStockBadge';
import { ExpiryBadge } from '@/components/products/ExpiryBadge';
import { StockLedgerSheet } from '@/components/products/StockLedgerSheet';
import { ManualAdjustmentDialog } from '@/components/inventory/ManualAdjustmentDialog';
import { NewPurchaseDialog } from '@/components/inventory/NewPurchaseDialog';
import { PurchaseDetailSheet } from '@/components/inventory/PurchaseDetailSheet';
import { BillDetailSheet } from '@/components/billing/BillDetailSheet';
import { formatCurrency, formatNumber, cn } from '@/lib/utils';
import type { InventoryRow, StockMovement, Purchase, Pagination, MovementType, Product } from '@/types';

const MOVEMENT_LABELS: Record<MovementType, string> = {
  purchase: 'Purchase', sale: 'Sale',
  adjustment_in: 'Adj. In', adjustment_out: 'Adj. Out',
  return_in: 'Return In', return_out: 'Return Out', damage: 'Damage',
};

interface Props { initialTab?: 'stock' | 'movements' | 'purchases' }

export function InventoryPage({ initialTab = 'stock' }: Props) {
  const [tab, setTab] = useState<'stock' | 'movements' | 'purchases'>(initialTab);
  const [ledgerProduct, setLedgerProduct] = useState<{ id: string; name: string } | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [adjustPreselect, setAdjustPreselect] = useState<string | undefined>();
  const [viewPurchaseId, setViewPurchaseId] = useState<string | null>(null);
  const [viewBillId, setViewBillId] = useState<string | null>(null);
  const [fabOpen, setFabOpen] = useState(false);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── Desktop header ── */}
      <div className="hidden lg:flex flex-shrink-0 flex-wrap items-start justify-between gap-3 px-6 pt-6 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Inventory</h1>
          <p className="mt-0.5 text-sm text-slate-500">Current stock, movements, and purchases.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAdjustOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" /> Adjust stock
          </Button>
          <Button onClick={() => setPurchaseOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New purchase
          </Button>
        </div>
      </div>

      {/* ── Mobile header ── */}
      <div className="lg:hidden flex-shrink-0 flex items-center justify-between px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold text-slate-900">Inventory</h1>
        <button
          onClick={() => setAdjustOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm"
        >
          <Settings2 className="h-3.5 w-3.5" /> Adjust
        </button>
      </div>

      {/* ── Tabs ── */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as typeof tab)}
        className="flex-1 flex flex-col overflow-hidden min-h-0 px-4 lg:px-6"
      >
        {/* Desktop tabs */}
        <TabsList className="hidden lg:flex flex-shrink-0 self-start mb-3">
          <TabsTrigger value="stock">Current stock</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
        </TabsList>

        {/* Mobile segment control */}
        <div className="lg:hidden flex bg-slate-100 rounded-xl p-1 mb-3 flex-shrink-0">
          {(['stock', 'movements', 'purchases'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 rounded-lg py-2 text-xs font-semibold transition-all',
                tab === t
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {t === 'stock' ? 'Stock' : t === 'movements' ? 'Movements' : 'Purchases'}
            </button>
          ))}
        </div>

        <TabsContent value="stock" className="flex-1 min-h-0 overflow-hidden mt-0">
          <CurrentStock
            onOpenLedger={(p) => setLedgerProduct({ id: p.id, name: p.name })}
            onAdjustProduct={(p) => { setAdjustPreselect(p.id); setAdjustOpen(true); }}
          />
        </TabsContent>
        <TabsContent value="movements" className="flex-1 min-h-0 overflow-hidden mt-0">
          <Movements
            onViewBill={(id) => setViewBillId(id)}
            onViewPurchase={(id) => setViewPurchaseId(id)}
          />
        </TabsContent>
        <TabsContent value="purchases" className="flex-1 min-h-0 overflow-hidden mt-0">
          <Purchases onNew={() => setPurchaseOpen(true)} onView={(id) => setViewPurchaseId(id)} />
        </TabsContent>
      </Tabs>

      {/* ── Mobile FAB ── */}
      <div className="lg:hidden fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
        {fabOpen && (
          <div className="flex flex-col gap-2 items-end mb-1">
            <button
              onClick={() => { setAdjustOpen(true); setFabOpen(false); }}
              className="flex items-center gap-2 rounded-full bg-white border border-slate-200 shadow-lg px-4 py-2.5 text-sm font-medium text-slate-700"
            >
              <Settings2 className="h-4 w-4 text-slate-500" /> Adjust Stock
            </button>
            <button
              onClick={() => { setPurchaseOpen(true); setFabOpen(false); }}
              className="flex items-center gap-2 rounded-full bg-white border border-slate-200 shadow-lg px-4 py-2.5 text-sm font-medium text-slate-700"
            >
              <Plus className="h-4 w-4 text-slate-500" /> New Purchase
            </button>
          </div>
        )}
        <button
          onClick={() => setFabOpen((v) => !v)}
          className="h-14 w-14 rounded-full bg-emerald-600 text-white shadow-xl flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className={cn('h-6 w-6 transition-transform duration-200', fabOpen && 'rotate-45')} />
        </button>
      </div>

      {/* ── Sheets & Dialogs ── */}
      <StockLedgerSheet
        open={!!ledgerProduct} onOpenChange={(v) => !v && setLedgerProduct(null)}
        productId={ledgerProduct?.id ?? null} productName={ledgerProduct?.name}
      />
      <ManualAdjustmentDialog
        open={adjustOpen}
        onOpenChange={(v) => { setAdjustOpen(v); if (!v) setAdjustPreselect(undefined); }}
        preselectProductId={adjustPreselect}
      />
      <NewPurchaseDialog open={purchaseOpen} onOpenChange={setPurchaseOpen} />
      <PurchaseDetailSheet
        purchaseId={viewPurchaseId} open={!!viewPurchaseId}
        onOpenChange={(v) => !v && setViewPurchaseId(null)}
      />
      <BillDetailSheet
        billId={viewBillId} open={!!viewBillId}
        onOpenChange={(v) => !v && setViewBillId(null)}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   CURRENT STOCK
───────────────────────────────────────────── */
function CurrentStock({
  onOpenLedger,
  onAdjustProduct,
}: {
  onOpenLedger: (p: { id: string; name: string }) => void;
  onAdjustProduct: (p: { id: string; name: string }) => void;
}) {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await api.get<{ summary: Record<string, string | number>; data: InventoryRow[] }>('/inventory');
      return res.data;
    },
  });

  const filtered = useMemo(() => {
    if (!data?.data) return [];
    if (!search.trim()) return data.data;
    const q = search.toLowerCase();
    return data.data.filter(
      (r) => r.name.toLowerCase().includes(q) || r.category?.name?.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* ── Desktop stats ── */}
      <div className="hidden lg:grid grid-cols-4 gap-3 flex-shrink-0">
        <SummaryCard label="Total products" value={data?.summary.total_products ?? '—'} />
        <SummaryCard label="Total stock value" value={data ? formatCurrency(Number(data.summary.total_stock_value)) : '—'} />
        <SummaryCard label="Low stock items" value={data?.summary.low_stock_items ?? '—'} variant={Number(data?.summary.low_stock_items) > 0 ? 'danger' : 'default'} />
        <SummaryCard label="Expiring soon" value={data?.summary.expiring_soon ?? '—'} variant={Number(data?.summary.expiring_soon) > 0 ? 'warning' : 'default'} />
      </div>

      {/* ── Mobile stats ── */}
      <div className="lg:hidden grid grid-cols-2 gap-2 flex-shrink-0">
        <MobileStatCard label="Products" value={data?.summary.total_products ?? '—'} />
        <MobileStatCard label="Stock Value" value={data ? formatCurrency(Number(data.summary.total_stock_value)) : '—'} />
        <MobileStatCard label="Low Stock" value={data?.summary.low_stock_items ?? '—'} variant={Number(data?.summary.low_stock_items) > 0 ? 'danger' : 'default'} />
        <MobileStatCard label="Expiring Soon" value={data?.summary.expiring_soon ?? '—'} variant={Number(data?.summary.expiring_soon) > 0 ? 'warning' : 'default'} />
      </div>

      {/* ── Mobile search ── */}
      <div className="lg:hidden relative flex-shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-9 h-10 rounded-xl bg-slate-50 border-slate-200 text-sm"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* ── Desktop table ── */}
      <Card className="hidden lg:flex flex-1 min-h-0 flex-col overflow-hidden">
        <CardContent className="p-4 flex flex-col h-full overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="hidden sm:table-cell">Unit</TableHead>
                  <TableHead className="text-right">In stock</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Min level</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Stock value</TableHead>
                  <TableHead className="hidden lg:table-cell">Expiry</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && [...Array(8)].map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))}
                {!isLoading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-10 text-slate-500">No products in inventory.</TableCell></TableRow>
                )}
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-slate-900">{r.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{r.category?.name || '—'}</TableCell>
                    <TableCell className="hidden sm:table-cell">{r.unit}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(r.current_stock, 2)}</TableCell>
                    <TableCell className="hidden md:table-cell text-right font-mono text-slate-500">{formatNumber(r.min_stock_level, 2)}</TableCell>
                    <TableCell className="hidden sm:table-cell text-right font-mono">{formatCurrency(r.stock_value)}</TableCell>
                    <TableCell className="hidden lg:table-cell"><ExpiryBadge date={r.expiry_date} /></TableCell>
                    <TableCell className="hidden sm:table-cell"><LowStockBadge current={r.current_stock} min={r.min_stock_level} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" title="View ledger" onClick={() => onOpenLedger(r)}><History className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" title="Adjust stock" onClick={() => onAdjustProduct(r)}><Settings2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Mobile card list ── */}
      <div className="lg:hidden flex-1 min-h-0 overflow-y-auto">
        {isLoading && (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Package className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm">{search ? 'No results found' : 'No products in inventory.'}</p>
          </div>
        )}
        <div className="space-y-2 pb-24">
          {filtered.map((r) => {
            const isLow = Number(r.current_stock) <= Number(r.min_stock_level);
            const isOut = Number(r.current_stock) <= 0;
            return (
              <div
                key={r.id}
                className="flex gap-0 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden"
              >
                {/* Accent bar */}
                <div className={cn('w-1 flex-shrink-0', isOut ? 'bg-red-500' : isLow ? 'bg-amber-400' : 'bg-emerald-500')} />
                <div className="flex-1 p-3 min-w-0">
                  {/* Row 1 */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-900 text-sm leading-tight truncate">{r.name}</p>
                    <div className="flex-shrink-0 text-right">
                      <span className="font-bold text-slate-900 font-mono text-sm">{formatNumber(r.current_stock, 2)}</span>
                      <span className="text-[11px] text-slate-400 ml-1">{r.unit}</span>
                    </div>
                  </div>
                  {/* Row 2 */}
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[11px] text-slate-400">{r.category?.name || 'Uncategorised'}</span>
                    <span className="text-[11px] text-slate-500 font-mono">{formatCurrency(r.stock_value)}</span>
                  </div>
                  {/* Row 3 */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-1 flex-wrap">
                      <LowStockBadge current={r.current_stock} min={r.min_stock_level} />
                      <ExpiryBadge date={r.expiry_date} />
                    </div>
                    <div className="flex gap-0.5">
                      <button
                        onClick={() => onOpenLedger(r)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <History className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onAdjustProduct(r)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MOVEMENTS
───────────────────────────────────────────── */
function Movements({
  onViewBill,
  onViewPurchase,
}: {
  onViewBill: (id: string) => void;
  onViewPurchase: (id: string) => void;
}) {
  const [page, setPage] = useState(1);
  const [movementType, setMovementType] = useState<MovementType | 'all'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [productId, setProductId] = useState<string>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: products } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: async () => {
      const res = await api.get<{ data: Product[] }>('/products', { params: { page: 1, page_size: 500, status: 'active' } });
      return res.data.data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['movements', { page, movementType, fromDate, toDate, productId }],
    queryFn: async () => {
      const res = await api.get<{ data: StockMovement[]; pagination: Pagination }>('/inventory/movements', {
        params: {
          page, page_size: 50,
          movement_type: movementType !== 'all' ? movementType : undefined,
          from_date: fromDate || undefined, to_date: toDate || undefined,
          product_id: productId !== 'all' ? productId : undefined,
        },
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const activeFilterCount = [movementType !== 'all', productId !== 'all', !!fromDate, !!toDate].filter(Boolean).length;

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* ── Desktop filters ── */}
      <div className="hidden lg:flex flex-wrap gap-2 flex-shrink-0">
        <Select value={productId} onValueChange={(v) => { setProductId(v); setPage(1); }}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Product" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All products</SelectItem>
            {products?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={movementType} onValueChange={(v) => { setMovementType(v as MovementType | 'all'); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(MOVEMENT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} className="w-44" />
        <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} className="w-44" />
      </div>

      {/* ── Mobile filter toggle ── */}
      <div className="lg:hidden flex-shrink-0">
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm w-full justify-between"
        >
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            Filters
            {activeFilterCount > 0 && (
              <span className="h-5 w-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </span>
          {filtersOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>
        {filtersOpen && (
          <div className="mt-2 grid grid-cols-2 gap-2 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
            <Select value={productId} onValueChange={(v) => { setProductId(v); setPage(1); }}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Product" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All products</SelectItem>
                {products?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={movementType} onValueChange={(v) => { setMovementType(v as MovementType | 'all'); setPage(1); }}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.entries(MOVEMENT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} className="h-9 text-xs col-span-1" />
            <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} className="h-9 text-xs col-span-1" />
          </div>
        )}
      </div>

      {/* ── Desktop table ── */}
      <Card className="hidden lg:flex flex-1 min-h-0 flex-col overflow-hidden">
        <CardContent className="p-4 flex flex-col h-full overflow-hidden gap-3">
          <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead><TableHead>Product</TableHead><TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Rate</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Total</TableHead>
                  <TableHead className="hidden md:table-cell">Reference</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && [...Array(8)].map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))}
                {!isLoading && data?.data.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-slate-500">No stock movements yet.</TableCell></TableRow>
                )}
                {data?.data.map((m) => {
                  const isIn = ['purchase', 'adjustment_in', 'return_in'].includes(m.movement_type);
                  const qty = Number(m.quantity); const rate = Number(m.rate);
                  const canView = m.reference_id && (m.reference_type === 'bill' || m.reference_type === 'purchase');
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm">{new Date(m.created_at).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell className="font-medium">{m.product?.name || '—'}</TableCell>
                      <TableCell><Badge variant={isIn ? 'success' : 'danger'}>{MOVEMENT_LABELS[m.movement_type]}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{isIn ? '+' : '-'}{formatNumber(m.quantity, 2)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-right font-mono">{formatCurrency(m.rate)}</TableCell>
                      <TableCell className="hidden md:table-cell text-right font-mono">{rate > 0 ? formatCurrency(qty * rate) : '—'}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-slate-500">{m.reference_type || '—'}</TableCell>
                      <TableCell>
                        {canView ? (
                          <Button variant="ghost" size="icon" onClick={() => { if (m.reference_type === 'bill') onViewBill(m.reference_id!); else onViewPurchase(m.reference_id!); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {data && data.pagination.total_pages > 1 && (
            <Pager page={page} totalPages={data.pagination.total_pages} total={data.pagination.total} onChange={setPage} />
          )}
        </CardContent>
      </Card>

      {/* ── Mobile card list ── */}
      <div className="lg:hidden flex-1 min-h-0 overflow-y-auto">
        {isLoading && <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>}
        {!isLoading && data?.data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Package className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm">No stock movements yet.</p>
          </div>
        )}
        <div className="space-y-2 pb-24">
          {data?.data.map((m) => {
            const isIn = ['purchase', 'adjustment_in', 'return_in'].includes(m.movement_type);
            const qty = Number(m.quantity); const rate = Number(m.rate);
            const canView = m.reference_id && (m.reference_type === 'bill' || m.reference_type === 'purchase');
            return (
              <div key={m.id} className="flex gap-3 bg-white rounded-xl border border-slate-100 shadow-sm p-3">
                {/* Icon */}
                <div className={cn(
                  'h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                  isIn ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500',
                )}>
                  {isIn ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate leading-tight">{m.product?.name || '—'}</p>
                      <span className={cn(
                        'inline-block mt-0.5 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full',
                        isIn ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600',
                      )}>
                        {MOVEMENT_LABELS[m.movement_type]}
                      </span>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className={cn('font-bold font-mono text-sm', isIn ? 'text-emerald-600' : 'text-red-500')}>
                        {isIn ? '+' : '-'}{formatNumber(m.quantity, 2)}
                      </p>
                      <p className="text-[11px] text-slate-400">{new Date(m.created_at).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                  {rate > 0 && (
                    <div className="flex justify-between mt-1.5 text-[11px] text-slate-500">
                      <span>Rate {formatCurrency(m.rate)}</span>
                      <span>Total {formatCurrency(qty * rate)}</span>
                    </div>
                  )}
                </div>
                {canView && (
                  <button
                    onClick={() => { if (m.reference_type === 'bill') onViewBill(m.reference_id!); else onViewPurchase(m.reference_id!); }}
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0 self-start mt-0.5"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {data && data.pagination.total_pages > 1 && (
          <div className="flex-shrink-0 pb-24">
            <Pager page={page} totalPages={data.pagination.total_pages} total={data.pagination.total} onChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PURCHASES
───────────────────────────────────────────── */
function Purchases({ onNew, onView }: { onNew: () => void; onView: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', { page, paymentStatus }],
    queryFn: async () => {
      const res = await api.get<{ data: Purchase[]; pagination: Pagination }>('/purchases', {
        params: { page, page_size: 30, payment_status: paymentStatus !== 'all' ? paymentStatus : undefined },
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const statusVariant = (s: string) => s === 'paid' ? 'success' : s === 'unpaid' ? 'danger' : 'warning';

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* ── Filter bar ── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Select value={paymentStatus} onValueChange={(v) => { setPaymentStatus(v as typeof paymentStatus); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-44 h-9 text-sm">
            <SelectValue placeholder="Payment status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={onNew} className="hidden lg:flex ml-auto"><Plus className="mr-2 h-4 w-4" /> New purchase</Button>
      </div>

      {/* ── Desktop table ── */}
      <Card className="hidden lg:flex flex-1 min-h-0 flex-col overflow-hidden">
        <CardContent className="p-4 flex flex-col h-full overflow-hidden gap-3">
          <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead><TableHead>Supplier</TableHead>
                  <TableHead className="hidden sm:table-cell">Invoice</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Paid</TableHead>
                  <TableHead>Status</TableHead><TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && [...Array(8)].map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))}
                {!isLoading && data?.data.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-slate-500">No purchases yet.</TableCell></TableRow>
                )}
                {data?.data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.purchase_date).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell className="font-medium">{p.party?.name || '—'}</TableCell>
                    <TableCell className="hidden sm:table-cell">{p.invoice_number || '—'}</TableCell>
                    <TableCell className="hidden sm:table-cell text-right">{p.item_count ?? '—'}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(p.total_amount)}</TableCell>
                    <TableCell className="hidden md:table-cell text-right font-mono">{formatCurrency(p.paid_amount)}</TableCell>
                    <TableCell><Badge variant={statusVariant(p.payment_status)}>{p.payment_status}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => onView(p.id)}><Eye className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data && data.pagination.total_pages > 1 && (
            <Pager page={page} totalPages={data.pagination.total_pages} total={data.pagination.total} onChange={setPage} />
          )}
        </CardContent>
      </Card>

      {/* ── Mobile card list ── */}
      <div className="lg:hidden flex-1 min-h-0 overflow-y-auto">
        {isLoading && <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>}
        {!isLoading && data?.data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Package className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm">No purchases yet.</p>
          </div>
        )}
        <div className="space-y-2 pb-24">
          {data?.data.map((p) => (
            <button
              key={p.id}
              onClick={() => onView(p.id)}
              className="w-full text-left bg-white rounded-xl border border-slate-100 shadow-sm p-3 active:bg-slate-50 transition-colors"
            >
              {/* Row 1 */}
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-900 text-sm truncate leading-tight">{p.party?.name || '—'}</p>
                <Badge variant={statusVariant(p.payment_status)} className="flex-shrink-0 text-[10px]">
                  {p.payment_status}
                </Badge>
              </div>
              {/* Row 2 */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-slate-400">{p.invoice_number || 'No invoice'}</span>
                {p.item_count != null && (
                  <span className="text-[11px] text-slate-400">· {p.item_count} items</span>
                )}
                <span className="text-[11px] text-slate-400 ml-auto">
                  {new Date(p.purchase_date).toLocaleDateString('en-IN')}
                </span>
              </div>
              {/* Row 3 */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total</p>
                  <p className="font-bold font-mono text-sm text-slate-900">{formatCurrency(p.total_amount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Paid</p>
                  <p className="font-mono text-sm text-slate-600">{formatCurrency(p.paid_amount)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
        {data && data.pagination.total_pages > 1 && (
          <div className="flex-shrink-0 pb-24">
            <Pager page={page} totalPages={data.pagination.total_pages} total={data.pagination.total} onChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SHARED COMPONENTS
───────────────────────────────────────────── */
function SummaryCard({ label, value, variant = 'default' }: { label: string; value: string | number; variant?: 'default' | 'danger' | 'warning' }) {
  const color = variant === 'danger' ? 'text-red-600' : variant === 'warning' ? 'text-amber-600' : 'text-slate-900';
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${color}`}>{value}</div>
    </CardContent></Card>
  );
}

function MobileStatCard({ label, value, variant = 'default' }: { label: string; value: string | number; variant?: 'default' | 'danger' | 'warning' }) {
  const color = variant === 'danger' ? 'text-red-600' : variant === 'warning' ? 'text-amber-600' : 'text-slate-900';
  const bg = variant === 'danger' ? 'bg-red-50 border-red-100' : variant === 'warning' ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-100';
  return (
    <div className={`rounded-xl border p-3 ${bg}`}>
      <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}

function Pager({ page, totalPages, total, onChange }: { page: number; totalPages: number; total: number; onChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between flex-shrink-0 px-1 py-2">
      <p className="text-xs text-slate-500">Page {page}/{totalPages} · {total} items</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Prev</Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next</Button>
      </div>
    </div>
  );
}
