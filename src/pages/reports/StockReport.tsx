import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { downloadCsv } from '@/lib/download';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { useCategories } from '@/hooks/useCategories';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface StockRow {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  unit: string;
  current_stock: string;
  min_stock_level: string;
  purchase_price: string;
  selling_price: string;
  expiry_date: string | null;
  batch_number: string | null;
  stock_value: number;
  status: 'expired' | 'low' | 'expiring_30' | 'expiring_60' | 'ok' | 'out';
}

interface StockResponse {
  data: StockRow[];
  summary: {
    total_products: number;
    total_stock_value: number;
    low_stock: number;
    expiring_30_days: number;
  };
}

export function StockReportPage() {
  const [categoryId, setCategoryId] = useState<string>('all');
  const [status, setStatus] = useState<'all' | 'low' | 'expiring' | 'expired'>('all');
  const { data: categories = [] } = useCategories();

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
    } catch {
      toast.error('Export failed');
    }
  }

  function rowClass(s: StockRow['status']): string {
    if (s === 'expired' || s === 'out') return 'bg-red-50/60';
    if (s === 'low' || s === 'expiring_30') return 'bg-amber-50/60';
    return '';
  }

  return (
    <div className="h-full flex flex-col p-6 gap-4 overflow-hidden">
      <div className="flex-shrink-0">
        <PageHeader
          title="Stock report"
          description="Current stock with value at cost, low-stock flags, and expiry alerts."
          actions={
            <>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" /> Print / PDF
              </Button>
              <Button variant="outline" onClick={exportCsv}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </>
          }
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-shrink-0">
        <SummaryCard label="Total products" value={data?.summary.total_products ?? '—'} />
        <SummaryCard
          label="Total stock value"
          value={data ? formatCurrency(data.summary.total_stock_value) : '—'}
        />
        <SummaryCard
          label="Low / out of stock"
          value={data?.summary.low_stock ?? '—'}
          highlight={Number(data?.summary.low_stock) > 0}
        />
        <SummaryCard
          label="Expiring / expired"
          value={data?.summary.expiring_30_days ?? '—'}
          highlight={Number(data?.summary.expiring_30_days) > 0}
        />
      </div>

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardContent className="p-4 flex flex-col h-full overflow-hidden gap-3">
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="low">Low / out</SelectItem>
                <SelectItem value="expiring">Expiring in 30 days</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Min</TableHead>
                  <TableHead className="text-right">Stock value</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
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
                      No products match the filters.
                    </TableCell>
                  </TableRow>
                )}
                {data?.data.map((p) => (
                  <TableRow key={p.id} className={rowClass(p.status)}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.brand || '—'}</TableCell>
                    <TableCell>{p.category || '—'}</TableCell>
                    <TableCell>{p.unit}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatNumber(p.current_stock, 2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-500">
                      {formatNumber(p.min_stock_level, 2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(p.stock_value)}</TableCell>
                    <TableCell className="text-sm">
                      {p.expiry_date ? new Date(p.expiry_date).toLocaleDateString('en-IN') : '—'}
                    </TableCell>
                    <TableCell>
                      {p.status === 'expired' ? <Badge variant="danger">Expired</Badge> :
                       p.status === 'out' ? <Badge variant="danger">Out of stock</Badge> :
                       p.status === 'low' ? <Badge variant="danger">Low stock</Badge> :
                       p.status === 'expiring_30' ? <Badge variant="warning">Expiring &lt;30d</Badge> :
                       p.status === 'expiring_60' ? <Badge variant="warning">Expiring &lt;60d</Badge> :
                       <Badge variant="success">OK</Badge>}
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
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div className={`mt-1 text-2xl font-bold ${highlight ? 'text-amber-700' : 'text-slate-900'}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
