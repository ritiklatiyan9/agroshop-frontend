import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Plus, Upload, Download, Pencil, Trash2, History, Search } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { AddEditProductSheet } from '@/components/products/AddEditProductSheet';
import { LowStockBadge } from '@/components/products/LowStockBadge';
import { ExpiryBadge } from '@/components/products/ExpiryBadge';
import { StockLedgerSheet } from '@/components/products/StockLedgerSheet';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useCategories } from '@/hooks/useCategories';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { Product, Pagination } from '@/types';

export function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive' | 'low_stock' | 'expired'>('all');
  const [editing, setEditing] = useState<Product | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [ledgerProduct, setLedgerProduct] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { data: categories = [] } = useCategories();

  const { data, isLoading } = useQuery({
    queryKey: ['products', { page, search, categoryId, status }],
    queryFn: async () => {
      const res = await api.get<{ data: Product[]; pagination: Pagination }>('/products', {
        params: {
          page,
          page_size: 50,
          search: search || undefined,
          category_id: categoryId !== 'all' ? categoryId : undefined,
          status,
        },
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      toast.success('Product deactivated');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => toast.error('Failed to delete'),
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/products/import/csv', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data as { created: number; updated: number; errors: Array<{ row: number; error: string }> };
    },
    onSuccess: (data) => {
      toast.success(`Imported: ${data.created} created, ${data.updated} updated`);
      if (data.errors.length > 0) toast.error(`${data.errors.length} row(s) had errors`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => toast.error('Import failed'),
  });

  async function handleExport() {
    try {
      const res = await api.get('/products/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `products-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error('Export failed');
    }
  }

  function onImportClick() {
    fileInputRef.current?.click();
  }

  function onImportChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) importMutation.mutate(file);
    e.target.value = '';
  }

  return (
    <div className="h-full flex flex-col p-6 gap-4 overflow-hidden">
      <div className="flex-shrink-0">
        <PageHeader
          title="Products"
          description="Manage your catalogue."
          actions={
            <>
              <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={onImportChange} />
              <Button variant="outline" onClick={onImportClick}>
                <Upload className="mr-2 h-4 w-4" /> Import CSV
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
              <Button
                onClick={() => {
                  setEditing(null);
                  setSheetOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add product
              </Button>
            </>
          }
        />
      </div>

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardContent className="p-4 flex flex-col h-full overflow-hidden gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search products..."
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select
              value={categoryId}
              onValueChange={(v) => {
                setCategoryId(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as typeof status);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="low_stock">Low stock</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">GST</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <>
                    {[...Array(8)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={11}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
                {data && data.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-10 text-slate-500">
                      No products found. Click "Add product" to create one.
                    </TableCell>
                  </TableRow>
                )}
                {data?.data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded-md object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-md bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                          —
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">{p.name}</TableCell>
                    <TableCell>{p.brand || '—'}</TableCell>
                    <TableCell>{p.category?.name || '—'}</TableCell>
                    <TableCell>{p.unit}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(p.selling_price)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="muted">{p.gst_rate}%</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(p.current_stock, 2)}</TableCell>
                    <TableCell>
                      <ExpiryBadge date={p.expiry_date} />
                    </TableCell>
                    <TableCell>
                      <LowStockBadge current={p.current_stock} min={p.min_stock_level} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" title="Stock history" onClick={() => setLedgerProduct(p)}>
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit"
                          onClick={() => {
                            setEditing(p);
                            setSheetOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Deactivate"
                          onClick={() => setDeleting(p)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {data && data.pagination.total_pages > 1 && (
            <div className="flex items-center justify-between flex-shrink-0 pt-1">
              <p className="text-sm text-slate-500">
                Page {data.pagination.page} of {data.pagination.total_pages} · {data.pagination.total} items
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= data.pagination.total_pages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AddEditProductSheet open={sheetOpen} onOpenChange={setSheetOpen} product={editing} />
      <StockLedgerSheet
        open={!!ledgerProduct}
        onOpenChange={(v) => !v && setLedgerProduct(null)}
        productId={ledgerProduct?.id ?? null}
        productName={ledgerProduct?.name}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`Deactivate "${deleting?.name ?? ''}"?`}
        description="The product will be hidden from new bills but historical sales stay intact. You can re-activate it later."
        confirmLabel="Deactivate"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleting)
            deleteMutation.mutate(deleting.id, {
              onSettled: () => setDeleting(null),
            });
        }}
      />
    </div>
  );
}
