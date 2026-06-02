import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Printer, PackageSearch, Boxes, IndianRupee, AlertTriangle, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { downloadCsv } from '@/lib/download';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { useCategories } from '@/hooks/useCategories';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface StockRow {
  id: string; name: string; brand: string | null; category: string | null;
  unit: string; current_stock: string; min_stock_level: string;
  purchase_price: string; selling_price: string; expiry_date: string | null;
  batch_number: string | null; stock_value: number;
  status: 'expired' | 'low' | 'expiring_30' | 'expiring_60' | 'ok' | 'out';
}

interface StockResponse {
  data: StockRow[];
  summary: { total_products: number; total_stock_value: number; low_stock: number; expiring_30_days: number };
}

const STATUS_CHIPS = [
  { label: 'All', value: 'all' },
  { label: 'Low / Out', value: 'low' },
  { label: 'Expiring', value: 'expiring' },
  { label: 'Expired', value: 'expired' },
] as const;

function statusBadge(s: StockRow['status']) {
  if (s === 'expired') return <Badge variant="danger">Expired</Badge>;
  if (s === 'out') return <Badge variant="danger">Out</Badge>;
  if (s === 'low') return <Badge variant="danger">Low</Badge>;
  if (s === 'expiring_30') return <Badge variant="warning">Exp &lt;30d</Badge>;
  if (s === 'expiring_60') return <Badge variant="warning">Exp &lt;60d</Badge>;
  return <Badge variant="success">OK</Badge>;
}

function rowBg(s: StockRow['status']) {
  if (s === 'expired' || s === 'out') return 'bg-red-50/60';
  if (s === 'low' || s === 'expiring_30') return 'bg-amber-50/60';
  return '';
}

export function StockReportPage() {
  const [categoryId, setCategoryId] = useState<string>('all');
  const [status, setStatus] = useState<'all' | 'low' | 'expiring' | 'expired'>('all');
  const { data: categories = [] } = useCategories();

  // Toggle a status filter from the summary cards (click again to clear).
  const toggleStatus = (s: 'low' | 'expiring') => setStatus((cur) => (cur === s ? 'all' : s));

  const params = {
    category_id: categoryId !== 'all' ? categoryId : undefined,
    status,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['report-stock', params],
    queryFn: async () => {
      const res = await api.get<StockResponse>('/reports/stock', { params });
      return res.data;
    },
  });

  async function exportCsv() {
    try {
      await downloadCsv('/reports/stock', params, `stock-${new Date().toISOString().split('T')[0]}.csv`);
    } catch { toast.error('Export failed'); }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50">

      {/* ── Desktop header ── */}
      <div className="hidden lg:block flex-shrink-0 p-6 pb-0">
        <PageHeader
          title="Stock Report"
          description="Current stock with value at cost, low-stock flags, and expiry alerts."
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
            <h1 className="text-xl font-bold text-slate-900">Stock Report</h1>
            <p className="text-xs text-slate-500 mt-0.5">{data?.summary.total_products ?? '—'} products</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 active:bg-slate-50"><Printer className="h-4 w-4" /></button>
            <button onClick={exportCsv} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 active:bg-slate-50"><Download className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* ── Stats strip (clickable filters) ── */}
      <div className="flex-shrink-0 px-4 lg:px-6 pt-3 pb-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:gap-3">
          <StatCard label="Products" value={data?.summary.total_products ?? '—'} icon={Boxes} active={status === 'all'} onClick={() => setStatus('all')} />
          <StatCard label="Stock Value" value={data ? formatCurrency(data.summary.total_stock_value) : '—'} icon={IndianRupee} onClick={() => setStatus('all')} />
          <StatCard label="Low / Out" value={data?.summary.low_stock ?? '—'} icon={AlertTriangle} color={Number(data?.summary.low_stock) > 0 ? 'danger' : 'slate'} active={status === 'low'} onClick={() => toggleStatus('low')} />
          <StatCard label="Expiring" value={data?.summary.expiring_30_days ?? '—'} icon={CalendarClock} color={Number(data?.summary.expiring_30_days) > 0 ? 'amber' : 'slate'} active={status === 'expiring'} onClick={() => toggleStatus('expiring')} />
        </div>
      </div>

      {/* ── Mobile filters ── */}
      <div className="lg:hidden flex-shrink-0 px-4 pb-2 space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {STATUS_CHIPS.map((c) => (
            <button key={c.value} onClick={() => setStatus(c.value)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium active:scale-95 ${status === c.value ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
              {c.label}
            </button>
          ))}
          <div className="w-2 shrink-0" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setCategoryId('all')}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium active:scale-95 ${categoryId === 'all' ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
          >
            All Categories
          </button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setCategoryId(c.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium active:scale-95 ${categoryId === c.id ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
              {c.name}
            </button>
          ))}
          <div className="w-2 shrink-0" />
        </div>
      </div>

      {/* ── Mobile cards ── */}
      <div className="lg:hidden flex-1 overflow-y-auto px-4 pb-24 space-y-2">
        {isLoading && [...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        {!isLoading && (data?.data ?? []).length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <PackageSearch className="h-14 w-14 mb-3 opacity-20" />
            <p className="text-sm font-medium">No products match filters</p>
          </div>
        )}
        {data?.data.map((p) => (
          <div key={p.id} className={`rounded-2xl bg-white border border-slate-100 p-4 shadow-sm ${rowBg(p.status)}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-800 truncate">{p.name}</span>
                  {statusBadge(p.status)}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{p.category || 'Uncategorized'} · {p.brand || ''}</p>
                {p.expiry_date && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Exp: {new Date(p.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono font-bold text-slate-900">{formatNumber(p.current_stock, 2)} <span className="text-xs font-normal text-slate-400">{p.unit}</span></p>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">{formatCurrency(p.stock_value)}</p>
                <p className="text-[10px] text-slate-300">min {formatNumber(p.min_stock_level, 2)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden lg:flex flex-col flex-1 min-h-0 p-6 pt-3 gap-3 overflow-hidden">
        <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <CardContent className="p-3 sm:p-4 flex flex-col h-full overflow-hidden gap-3">
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="low">Low / out</SelectItem>
                  <SelectItem value="expiring">Expiring in 30 days</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto flex-1 min-h-0 overflow-auto rounded-lg border border-slate-100">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="hidden sm:table-cell">Brand</TableHead>
                    <TableHead className="hidden sm:table-cell">Category</TableHead>
                    <TableHead className="hidden md:table-cell">Unit</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Min</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">Stock value</TableHead>
                    <TableHead className="hidden md:table-cell">Expiry</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && [...Array(8)].map((_, i) => <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)}
                  {data && data.data.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-10 text-slate-500">No products match the filters.</TableCell></TableRow>}
                  {data?.data.map((p) => (
                    <TableRow key={p.id} className={rowBg(p.status)}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{p.brand || '—'}</TableCell>
                      <TableCell className="hidden sm:table-cell">{p.category || '—'}</TableCell>
                      <TableCell className="hidden md:table-cell">{p.unit}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(p.current_stock, 2)}</TableCell>
                      <TableCell className="hidden md:table-cell text-right font-mono text-slate-500">{formatNumber(p.min_stock_level, 2)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-right font-mono">{formatCurrency(p.stock_value)}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{p.expiry_date ? new Date(p.expiry_date).toLocaleDateString('en-IN') : '—'}</TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label, value, color = 'slate', icon: Icon, active = false, onClick,
}: {
  label: string;
  value: string | number;
  color?: 'slate' | 'danger' | 'amber';
  icon?: React.ComponentType<{ className?: string }>;
  active?: boolean;
  onClick?: () => void;
}) {
  const textColor = color === 'danger' ? 'text-red-600' : color === 'amber' ? 'text-amber-700' : 'text-slate-900';
  const chip = color === 'danger' ? 'bg-red-50 text-red-500' : color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600';
  const ring = color === 'danger' ? 'ring-red-400/70' : color === 'amber' ? 'ring-amber-400/70' : 'ring-emerald-400/70';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl bg-white border border-slate-100 p-3 shadow-sm text-left transition-all active:scale-[0.98] hover:shadow-md',
        active && `ring-2 ring-inset ${ring}`,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium truncate">{label}</p>
        {Icon && (
          <div className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md', chip)}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      <p className={`mt-1 text-lg font-bold ${textColor} leading-none`}>{value}</p>
      {active && <p className="mt-1 text-[10px] font-semibold text-slate-400">Filtering</p>}
    </button>
  );
}
