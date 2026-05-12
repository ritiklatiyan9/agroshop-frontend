import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { History, Plus, Settings2, Eye } from 'lucide-react';
import { api } from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { LowStockBadge } from '@/components/products/LowStockBadge';
import { ExpiryBadge } from '@/components/products/ExpiryBadge';
import { StockLedgerSheet } from '@/components/products/StockLedgerSheet';
import { ManualAdjustmentDialog } from '@/components/inventory/ManualAdjustmentDialog';
import { NewPurchaseDialog } from '@/components/inventory/NewPurchaseDialog';
import { PurchaseDetailSheet } from '@/components/inventory/PurchaseDetailSheet';
import { BillDetailSheet } from '@/components/billing/BillDetailSheet';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type {
  InventoryRow,
  StockMovement,
  Purchase,
  Pagination,
  MovementType,
  Product,
} from '@/types';

interface Props {
  initialTab?: 'stock' | 'movements' | 'purchases';
}

export function InventoryPage({ initialTab = 'stock' }: Props) {
  const [tab, setTab] = useState<'stock' | 'movements' | 'purchases'>(initialTab);
  const [ledgerProduct, setLedgerProduct] = useState<{ id: string; name: string } | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [adjustPreselect, setAdjustPreselect] = useState<string | undefined>();
  const [viewPurchaseId, setViewPurchaseId] = useState<string | null>(null);
  const [viewBillId, setViewBillId] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col p-6 gap-4 overflow-hidden">
      <div className="flex-shrink-0">
        <PageHeader
          title="Inventory"
          description="Current stock, movements, and purchases."
          actions={
            <>
              <Button variant="outline" onClick={() => setAdjustOpen(true)}>
                <Settings2 className="mr-2 h-4 w-4" /> Adjust stock
              </Button>
              <Button onClick={() => setPurchaseOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> New purchase
              </Button>
            </>
          }
        />
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as typeof tab)}
        className="flex-1 flex flex-col overflow-hidden min-h-0"
      >
        <TabsList className="flex-shrink-0 self-start">
          <TabsTrigger value="stock">Current stock</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="flex-1 mt-3 min-h-0 overflow-hidden">
          <CurrentStock
            onOpenLedger={(p) => setLedgerProduct({ id: p.id, name: p.name })}
            onAdjustProduct={(p) => {
              setAdjustPreselect(p.id);
              setAdjustOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="movements" className="flex-1 mt-3 min-h-0 overflow-hidden">
          <Movements
            onViewBill={(billId) => setViewBillId(billId)}
            onViewPurchase={(purchaseId) => setViewPurchaseId(purchaseId)}
          />
        </TabsContent>

        <TabsContent value="purchases" className="flex-1 mt-3 min-h-0 overflow-hidden">
          <Purchases
            onNew={() => setPurchaseOpen(true)}
            onView={(id) => setViewPurchaseId(id)}
          />
        </TabsContent>
      </Tabs>

      <StockLedgerSheet
        open={!!ledgerProduct}
        onOpenChange={(v) => !v && setLedgerProduct(null)}
        productId={ledgerProduct?.id ?? null}
        productName={ledgerProduct?.name}
      />
      <ManualAdjustmentDialog
        open={adjustOpen}
        onOpenChange={(v) => {
          setAdjustOpen(v);
          if (!v) setAdjustPreselect(undefined);
        }}
        preselectProductId={adjustPreselect}
      />
      <NewPurchaseDialog open={purchaseOpen} onOpenChange={setPurchaseOpen} />
      <PurchaseDetailSheet
        purchaseId={viewPurchaseId}
        open={!!viewPurchaseId}
        onOpenChange={(v) => !v && setViewPurchaseId(null)}
      />
      <BillDetailSheet
        billId={viewBillId}
        open={!!viewBillId}
        onOpenChange={(v) => !v && setViewBillId(null)}
      />
    </div>
  );
}

function CurrentStock({
  onOpenLedger,
  onAdjustProduct,
}: {
  onOpenLedger: (p: { id: string; name: string }) => void;
  onAdjustProduct: (p: { id: string; name: string }) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await api.get<{ summary: Record<string, string | number>; data: InventoryRow[] }>('/inventory');
      return res.data;
    },
  });

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-shrink-0">
        <SummaryCard label="Total products" value={data?.summary.total_products ?? '—'} />
        <SummaryCard
          label="Total stock value"
          value={data ? formatCurrency(Number(data.summary.total_stock_value)) : '—'}
        />
        <SummaryCard
          label="Low stock items"
          value={data?.summary.low_stock_items ?? '—'}
          variant={Number(data?.summary.low_stock_items) > 0 ? 'danger' : 'default'}
        />
        <SummaryCard
          label="Expiring soon"
          value={data?.summary.expiring_soon ?? '—'}
          variant={Number(data?.summary.expiring_soon) > 0 ? 'warning' : 'default'}
        />
      </div>

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardContent className="p-4 flex flex-col h-full overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">In stock</TableHead>
                  <TableHead className="text-right">Min level</TableHead>
                  <TableHead className="text-right">Stock value</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <>
                    {[...Array(8)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={9}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
                {data && data.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-slate-500">
                      No products in inventory yet.
                    </TableCell>
                  </TableRow>
                )}
                {data?.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-slate-900">{r.name}</TableCell>
                    <TableCell>{r.category?.name || '—'}</TableCell>
                    <TableCell>{r.unit}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(r.current_stock, 2)}</TableCell>
                    <TableCell className="text-right font-mono text-slate-500">
                      {formatNumber(r.min_stock_level, 2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(r.stock_value)}</TableCell>
                    <TableCell>
                      <ExpiryBadge date={r.expiry_date} />
                    </TableCell>
                    <TableCell>
                      <LowStockBadge current={r.current_stock} min={r.min_stock_level} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" title="View ledger" onClick={() => onOpenLedger(r)}>
                          <History className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Adjust stock" onClick={() => onAdjustProduct(r)}>
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  variant = 'default',
}: {
  label: string;
  value: string | number;
  variant?: 'default' | 'danger' | 'warning';
}) {
  const color =
    variant === 'danger' ? 'text-red-600' : variant === 'warning' ? 'text-amber-600' : 'text-slate-900';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div className={`mt-1 text-2xl font-bold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

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

  const { data: products } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: async () => {
      const res = await api.get<{ data: Product[] }>('/products', {
        params: { page: 1, page_size: 500, status: 'active' },
      });
      return res.data.data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['movements', { page, movementType, fromDate, toDate, productId }],
    queryFn: async () => {
      const res = await api.get<{ data: StockMovement[]; pagination: Pagination }>('/inventory/movements', {
        params: {
          page,
          page_size: 50,
          movement_type: movementType !== 'all' ? movementType : undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          product_id: productId !== 'all' ? productId : undefined,
        },
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardContent className="p-4 flex flex-col h-full overflow-hidden gap-3">
        <div className="flex flex-wrap gap-2 flex-shrink-0">
          <Select
            value={productId}
            onValueChange={(v) => {
              setProductId(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All products</SelectItem>
              {products?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={movementType}
            onValueChange={(v) => {
              setMovementType(v as MovementType | 'all');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="purchase">Purchase</SelectItem>
              <SelectItem value="sale">Sale</SelectItem>
              <SelectItem value="adjustment_in">Adjustment in</SelectItem>
              <SelectItem value="adjustment_out">Adjustment out</SelectItem>
              <SelectItem value="return_in">Return in</SelectItem>
              <SelectItem value="return_out">Return out</SelectItem>
              <SelectItem value="damage">Damage</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="w-44"
          />
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="w-44"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-100">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Total amount</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <>
                  {[...Array(8)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              {data && data.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-slate-500">
                    No stock movements yet.
                  </TableCell>
                </TableRow>
              )}
              {data?.data.map((m) => {
                const isIn = ['purchase', 'adjustment_in', 'return_in'].includes(m.movement_type);
                const qty = Number(m.quantity);
                const rate = Number(m.rate);
                const lineTotal = qty * rate;
                const canView =
                  m.reference_id &&
                  (m.reference_type === 'bill' || m.reference_type === 'purchase');
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">
                      {new Date(m.created_at).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell className="font-medium">{m.product?.name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={isIn ? 'success' : 'danger'}>
                        {m.movement_type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {isIn ? '+' : '-'}
                      {formatNumber(m.quantity, 2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(m.rate)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {rate > 0 ? formatCurrency(lineTotal) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {m.reference_type || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{m.notes || '—'}</TableCell>
                    <TableCell>
                      {canView ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={`View ${m.reference_type}`}
                          onClick={() => {
                            if (m.reference_type === 'bill') onViewBill(m.reference_id!);
                            else if (m.reference_type === 'purchase')
                              onViewPurchase(m.reference_id!);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
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
  );
}

function Purchases({
  onNew,
  onView,
}: {
  onNew: () => void;
  onView: (id: string) => void;
}) {
  const [page, setPage] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', { page, paymentStatus }],
    queryFn: async () => {
      const res = await api.get<{ data: Purchase[]; pagination: Pagination }>('/purchases', {
        params: {
          page,
          page_size: 30,
          payment_status: paymentStatus !== 'all' ? paymentStatus : undefined,
        },
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardContent className="p-4 flex flex-col h-full overflow-hidden gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
          <Select
            value={paymentStatus}
            onValueChange={(v) => {
              setPaymentStatus(v as typeof paymentStatus);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Payment status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={onNew}>
            <Plus className="mr-2 h-4 w-4" /> New purchase
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-100">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <>
                  {[...Array(8)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              {data && data.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-slate-500">
                    No purchases yet. Click "New purchase" to add one.
                  </TableCell>
                </TableRow>
              )}
              {data?.data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{new Date(p.purchase_date).toLocaleDateString('en-IN')}</TableCell>
                  <TableCell className="font-medium">{p.party?.name || '—'}</TableCell>
                  <TableCell>{p.invoice_number || '—'}</TableCell>
                  <TableCell className="text-right">{p.item_count ?? '—'}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(p.total_amount)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(p.paid_amount)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        p.payment_status === 'paid'
                          ? 'success'
                          : p.payment_status === 'unpaid'
                          ? 'danger'
                          : 'warning'
                      }
                    >
                      {p.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="View purchase"
                      onClick={() => onView(p.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
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
  );
}

function Pager({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-between flex-shrink-0">
      <p className="text-sm text-slate-500">
        Page {page} of {totalPages} · {total} items
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(Math.max(1, page - 1))}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
