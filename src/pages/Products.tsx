import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  Plus, Upload, Download, Pencil, Trash2, History,
  Search, X, Package, MoreVertical, SlidersHorizontal, Trash,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { useActionNotify } from '@/hooks/useActionNotify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AddEditProductSheet } from '@/components/products/AddEditProductSheet';
import { LowStockBadge } from '@/components/products/LowStockBadge';
import { ExpiryBadge } from '@/components/products/ExpiryBadge';
import { StockLedgerSheet } from '@/components/products/StockLedgerSheet';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useCategories } from '@/hooks/useCategories';
import { formatCurrency, formatNumber, cn } from '@/lib/utils';
import type { Product, Pagination } from '@/types';

const STATUS_CHIPS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'low_stock', label: 'Low Stock' },
  { value: 'expired', label: 'Expired' },
  { value: 'inactive', label: 'Inactive' },
] as const;

/** "100 ml" when a pack size is set, otherwise just the unit. */
function unitLabel(p: Product): string {
  const size = p.pack_size ? Number(p.pack_size) : 0;
  return size > 0 ? `${size} ${p.unit}` : p.unit;
}

export function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive' | 'low_stock' | 'expired'>('all');
  const [editing, setEditing] = useState<Product | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [ledgerProduct, setLedgerProduct] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [permanentDeleting, setPermanentDeleting] = useState<Product | null>(null);
  const [moreMenuId, setMoreMenuId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { notify } = useActionNotify();
  const { data: categories = [] } = useCategories();

  const { data, isLoading } = useQuery({
    queryKey: ['products', { page, search, categoryId, status }],
    queryFn: async () => {
      const res = await api.get<{ data: Product[]; pagination: Pagination }>('/products', {
        params: { page, page_size: 50, search: search || undefined, category_id: categoryId !== 'all' ? categoryId : undefined, status },
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/products/${id}`),
    onSuccess: (_, id) => {
      const product = data?.data.find((p) => p.id === id);
      toast.success('Product deactivated');
      notify('Product Deactivated', product ? `${product.name} has been deactivated` : 'Product deactivated');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => toast.error('Failed to delete'),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/products/${id}?permanent=true`),
    onSuccess: (_, id) => {
      const product = data?.data.find((p) => p.id === id);
      toast.success('Product permanently deleted');
      notify('Product Deleted', product ? `${product.name} has been permanently deleted` : 'Product permanently deleted');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: () => toast.error('Failed to permanently delete'),
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData(); fd.append('file', file);
      const res = await api.post('/products/import/csv', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      return res.data as { created: number; updated: number; errors: Array<{ row: number; error: string }> };
    },
    onSuccess: (d) => {
      toast.success(`Imported: ${d.created} created, ${d.updated} updated`);
      if (d.errors.length > 0) toast.error(`${d.errors.length} row(s) had errors`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => toast.error('Import failed'),
  });

  async function handleExport() {
    try {
      const res = await api.get('/products/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.setAttribute('download', `products-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a); a.click(); a.remove();
    } catch { toast.error('Export failed'); }
  }

  function openAdd() { setEditing(null); setSheetOpen(true); }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50">
      <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importMutation.mutate(f); e.target.value = ''; }} />

      {/* ── Desktop header ── */}
      <div className="hidden lg:flex flex-shrink-0 items-start justify-between gap-3 px-6 pt-6 pb-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Products</h1>
          <p className="mt-0.5 text-sm text-slate-500">Manage your catalogue.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="mr-1.5 h-4 w-4" /> Import</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="mr-1.5 h-4 w-4" /> Export</Button>
          <Button onClick={openAdd}><Plus className="mr-1.5 h-4 w-4" /> Add product</Button>
        </div>
      </div>

      {/* ── Mobile header ── */}
      <div className="lg:hidden flex-shrink-0 flex items-center justify-between px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold text-slate-900">Products</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm"
          >
            <Upload className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Search + filters ── */}
      <div className="flex-shrink-0 px-4 lg:px-6 pb-3 space-y-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search products…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 pr-9 h-10 rounded-xl bg-white border-slate-200 text-sm shadow-sm"
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>

        {/* Mobile: status chips + category select row */}
        <div className="lg:hidden flex gap-2 items-center">
          <div className="flex gap-1.5 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
            {STATUS_CHIPS.map((chip) => (
              <button
                key={chip.value}
                onClick={() => { setStatus(chip.value); setPage(1); }}
                className={cn(
                  'flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all',
                  status === chip.value
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-slate-500 border-slate-200',
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setPage(1); }}>
            <SelectTrigger className="h-7 w-auto px-2 border-slate-200 rounded-lg text-xs flex-shrink-0 gap-1">
              <SlidersHorizontal className="h-3 w-3" />
              <SelectValue placeholder="Cat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: full filter row */}
        <div className="hidden lg:flex gap-2 items-center">
          <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v as typeof status); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="low_stock">Low stock</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Desktop table ── */}
      <Card className="hidden lg:flex flex-1 min-h-0 flex-col overflow-hidden mx-6 mb-6">
        <CardContent className="p-4 flex flex-col h-full overflow-hidden gap-3">
          <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14"></TableHead>
                  <TableHead>Name</TableHead><TableHead>Brand</TableHead><TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Price</TableHead><TableHead className="text-right">GST</TableHead>
                  <TableHead className="text-right">Stock</TableHead><TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead><TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && [...Array(8)].map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={11}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))}
                {!isLoading && data?.data.length === 0 && (
                  <TableRow><TableCell colSpan={11} className="text-center py-10 text-slate-500">No products found.</TableCell></TableRow>
                )}
                {data?.data.map((p) => (
                  <TableRow key={p.id} className={!p.is_active ? 'opacity-60' : ''}>
                    <TableCell>
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded-md object-cover" />
                        : <div className="h-10 w-10 rounded-md bg-slate-100 flex items-center justify-center text-slate-400 text-xs">—</div>}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">{p.name}</TableCell>
                    <TableCell>{p.brand || '—'}</TableCell>
                    <TableCell>{p.category?.name || '—'}</TableCell>
                    <TableCell>{unitLabel(p)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(p.selling_price)}</TableCell>
                    <TableCell className="text-right"><Badge variant="muted">{p.gst_rate}%</Badge></TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(p.current_stock, 2)}</TableCell>
                    <TableCell><ExpiryBadge date={p.expiry_date} /></TableCell>
                    <TableCell><LowStockBadge current={p.current_stock} min={p.min_stock_level} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" title="Stock history" onClick={() => setLedgerProduct(p)}><History className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => { setEditing(p); setSheetOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" title="Deactivate" onClick={() => setDeleting(p)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        <Button variant="ghost" size="icon" title="Delete permanently" onClick={() => setPermanentDeleting(p)}><Trash className="h-4 w-4 text-red-600" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data && data.pagination.total_pages > 1 && (
            <div className="flex items-center justify-between flex-shrink-0 pt-1">
              <p className="text-sm text-slate-500">Page {data.pagination.page} of {data.pagination.total_pages} · {data.pagination.total} items</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= data.pagination.total_pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Mobile card list ── */}
      <div className="lg:hidden flex-1 min-h-0 overflow-y-auto px-4" onClick={() => setMoreMenuId(null)}>
        {isLoading && (
          <div className="space-y-2 pb-24">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
          </div>
        )}
        {!isLoading && data?.data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Package className="h-14 w-14 mb-3 opacity-20" />
            <p className="text-sm font-medium">{search ? 'No results found' : 'No products yet'}</p>
            <p className="text-xs mt-1 text-slate-400">Tap + to add your first product</p>
          </div>
        )}
        <div className="space-y-2.5 pb-28">
          {data?.data.map((p) => (
            <div
              key={p.id}
              className={cn('bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden', !p.is_active && 'opacity-60')}
            >
              <div className="flex gap-3 p-3">
                {/* Image */}
                <div className="flex-shrink-0">
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} className="h-14 w-14 rounded-xl object-cover" />
                    : (
                      <div className="h-14 w-14 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <Package className="h-6 w-6 text-emerald-400" />
                      </div>
                    )}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <p className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2">{p.name}</p>
                    {/* More menu */}
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setMoreMenuId(moreMenuId === p.id ? null : p.id); }}
                        className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {moreMenuId === p.id && (
                        <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-xl border border-slate-100 py-1 w-40" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => { setLedgerProduct(p); setMoreMenuId(null); }} className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                            <History className="h-4 w-4 text-slate-400" /> Stock History
                          </button>
                          <button onClick={() => { setEditing(p); setSheetOpen(true); setMoreMenuId(null); }} className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                            <Pencil className="h-4 w-4 text-slate-400" /> Edit
                          </button>
                          <div className="my-1 border-t border-slate-100" />
                          <button onClick={() => { setDeleting(p); setMoreMenuId(null); }} className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" /> Deactivate
                          </button>
                          <button onClick={() => { setPermanentDeleting(p); setMoreMenuId(null); }} className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50">
                            <Trash className="h-4 w-4" /> Delete permanently
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {[p.brand, p.category?.name, p.pack_size && Number(p.pack_size) > 0 ? unitLabel(p) : null].filter(Boolean).join(' · ') || '—'}
                  </p>
                  {/* Price + Stock row */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm font-bold text-slate-900 font-mono">{formatCurrency(p.selling_price)}</span>
                    <span className="text-[10px] text-slate-400">·</span>
                    <span className="text-xs text-slate-600 font-mono">{formatNumber(p.current_stock, 2)} {p.unit}</span>
                    {p.gst_rate > 0 && (
                      <span className="ml-auto text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">GST {p.gst_rate}%</span>
                    )}
                  </div>
                </div>
              </div>
              {/* Badge footer */}
              <div className="flex items-center gap-2 px-3 pb-2.5">
                <LowStockBadge current={p.current_stock} min={p.min_stock_level} />
                <ExpiryBadge date={p.expiry_date} />
              </div>
            </div>
          ))}
        </div>
        {/* Mobile pagination */}
        {data && data.pagination.total_pages > 1 && (
          <div className="flex items-center justify-between pb-28 px-1">
            <p className="text-xs text-slate-500">Page {page}/{data.pagination.total_pages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page >= data.pagination.total_pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile FAB ── */}
      <button
        onClick={openAdd}
        className="lg:hidden fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full bg-emerald-600 text-white shadow-xl flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* ── Sheets & Dialogs ── */}
      <AddEditProductSheet open={sheetOpen} onOpenChange={setSheetOpen} product={editing} />
      <StockLedgerSheet open={!!ledgerProduct} onOpenChange={(v) => !v && setLedgerProduct(null)} productId={ledgerProduct?.id ?? null} productName={ledgerProduct?.name} />
      <ConfirmDialog
        open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}
        title={`Deactivate "${deleting?.name ?? ''}"?`}
        description="The product will be hidden from new bills but historical sales stay intact. You can re-activate it later."
        confirmLabel="Deactivate" destructive loading={deleteMutation.isPending}
        onConfirm={() => { if (deleting) deleteMutation.mutate(deleting.id, { onSettled: () => setDeleting(null) }); }}
      />
      <ConfirmDialog
        open={!!permanentDeleting} onOpenChange={(v) => !v && setPermanentDeleting(null)}
        title={`Permanently delete "${permanentDeleting?.name ?? ''}"?`}
        description="This removes the product and its stock history for good and cannot be undone. Historical bills are preserved."
        confirmLabel="Delete permanently" destructive loading={permanentDeleteMutation.isPending}
        onConfirm={() => { if (permanentDeleting) permanentDeleteMutation.mutate(permanentDeleting.id, { onSettled: () => setPermanentDeleting(null) }); }}
      />
    </div>
  );
}
