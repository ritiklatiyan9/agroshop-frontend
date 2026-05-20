import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Eye, IndianRupee, Pencil, Plus, ShoppingCart, TrendingDown, Wallet } from 'lucide-react';
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

function SummaryCard({
  label,
  value,
  icon,
  variant = 'default',
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: 'default' | 'danger' | 'warning';
}) {
  const color =
    variant === 'danger'
      ? 'text-red-600'
      : variant === 'warning'
        ? 'text-amber-600'
        : 'text-slate-900';
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          {icon}
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
          <div className={`mt-0.5 text-xl font-bold ${color}`}>{value}</div>
        </div>
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
    <div className="flex items-center justify-between flex-shrink-0 pt-1">
      <p className="text-sm text-slate-500">
        Page {page} of {totalPages} · {total} purchases
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

export function PurchasesPage() {
  const [newOpen, setNewOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [payPurchase, setPayPurchase] = useState<Purchase | null>(null);
  const [page, setPage] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

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

  // Compute stats from current page (indicative, not total)
  const pageTotal = purchases.reduce((s, p) => s + Number(p.total_amount), 0);
  const pageUnpaid = purchases.filter((p) => p.payment_status !== 'paid').length;

  return (
    <div className="h-full flex flex-col p-3 sm:p-6 gap-4 overflow-hidden">
      <div className="flex-shrink-0">
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

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-shrink-0">
        <SummaryCard
          label="Purchases shown"
          value={pagination?.total ?? '—'}
          icon={<ShoppingCart className="h-4 w-4" />}
        />
        <SummaryCard
          label="Page total"
          value={formatCurrency(pageTotal)}
          icon={<IndianRupee className="h-4 w-4" />}
        />
        <SummaryCard
          label="Unpaid on page"
          value={pageUnpaid}
          icon={<TrendingDown className="h-4 w-4" />}
          variant={pageUnpaid > 0 ? 'danger' : 'default'}
        />
      </div>

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardContent className="p-4 flex flex-col h-full overflow-hidden gap-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            <Select
              value={paymentStatus}
              onValueChange={(v) => { setPaymentStatus(v as typeof paymentStatus); setPage(1); }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="w-full sm:w-40"
              placeholder="From date"
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="w-full sm:w-40"
              placeholder="To date"
            />
          </div>

          {/* Table */}
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
                {!isLoading && purchases.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                      No purchases found. Click "New purchase" to add one.
                    </TableCell>
                  </TableRow>
                )}
                {purchases.map((p) => {
                  const hasBill = !!p.bill_image_url;
                  return (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-slate-50/60" onClick={() => setViewId(p.id)}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(p.purchase_date).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell className="font-medium">{p.party?.name || '—'}</TableCell>
                      <TableCell className="hidden sm:table-cell font-mono text-xs">
                        {p.invoice_number || '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-right">{p.item_count ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(p.total_amount)}</TableCell>
                      <TableCell className="hidden md:table-cell text-right font-mono">{formatCurrency(p.paid_amount)}</TableCell>
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
                      <TableCell className="hidden md:table-cell">
                        {hasBill ? (
                          <Badge variant="info">Uploaded</Badge>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center">
                          {p.payment_status !== 'paid' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Record payment"
                              onClick={() => setPayPurchase(p)}
                            >
                              <Wallet className="h-4 w-4 text-emerald-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View purchase"
                            onClick={() => setViewId(p.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit purchase"
                            onClick={() => setEditId(p.id)}
                          >
                            <Pencil className="h-4 w-4 text-slate-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {pagination && pagination.total_pages > 1 && (
            <Pager
              page={page}
              totalPages={pagination.total_pages}
              total={pagination.total}
              onChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      <NewPurchaseDialog open={newOpen} onOpenChange={setNewOpen} />
      <PurchaseDetailSheet
        purchaseId={viewId}
        open={!!viewId}
        onOpenChange={(v) => !v && setViewId(null)}
        onEdit={(id) => { setViewId(null); setEditId(id); }}
      />
      <EditPurchaseDialog
        purchaseId={editId}
        open={!!editId}
        onOpenChange={(v) => !v && setEditId(null)}
      />
      <PurchasePayDialog
        purchase={payPurchase}
        open={!!payPurchase}
        onOpenChange={(v) => !v && setPayPurchase(null)}
      />
    </div>
  );
}
