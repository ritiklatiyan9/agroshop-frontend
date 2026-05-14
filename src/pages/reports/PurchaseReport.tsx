import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Eye, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { downloadCsv } from '@/lib/download';
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
import { PurchaseDetailSheet } from '@/components/inventory/PurchaseDetailSheet';
import { useParties } from '@/hooks/useParties';
import { formatCurrency } from '@/lib/utils';
import type { Purchase } from '@/types';

interface Response {
  data: Purchase[];
  summary: {
    total_purchases: number;
    total_paid: number;
    total_pending: number;
    count: number;
  };
}

export function PurchaseReportPage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [partyId, setPartyId] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  const [viewId, setViewId] = useState<string | null>(null);

  const { data: parties = [] } = useParties('supplier');

  const params = {
    from: fromDate || undefined,
    to: toDate || undefined,
    party_id: partyId !== 'all' ? partyId : undefined,
    payment_status: paymentStatus !== 'all' ? paymentStatus : undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['report-purchases', params],
    queryFn: async () => {
      const res = await api.get<Response>('/reports/purchases', { params });
      return res.data;
    },
  });

  async function exportCsv() {
    try {
      await downloadCsv('/reports/purchases', params, `purchases-${new Date().toISOString().split('T')[0]}.csv`);
    } catch {
      toast.error('Export failed');
    }
  }

  return (
    <div className="h-full flex flex-col p-3 sm:p-6 gap-3 sm:gap-4 overflow-y-auto lg:overflow-hidden">
      <div className="flex-shrink-0">
        <PageHeader
          title="Purchase report"
          description="Stock-in entries from suppliers with payment status."
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Print / PDF</span>
              </Button>
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Export CSV</span>
              </Button>
            </>
          }
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-shrink-0">
        <Sum label="Purchases" value={data?.summary.count ?? '—'} />
        <Sum label="Total amount" value={data ? formatCurrency(data.summary.total_purchases) : '—'} />
        <Sum label="Paid" value={data ? formatCurrency(data.summary.total_paid) : '—'} />
        <Sum
          label="Pending"
          value={data ? formatCurrency(data.summary.total_pending) : '—'}
          highlight={Number(data?.summary.total_pending) > 0}
        />
      </div>

      <Card className="lg:flex-1 lg:min-h-0 flex flex-col lg:overflow-hidden">
        <CardContent className="p-3 sm:p-4 flex flex-col lg:h-full lg:overflow-hidden gap-3">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 flex-shrink-0">
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full sm:w-44" />
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full sm:w-44" />
            <Select value={partyId} onValueChange={setPartyId}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All suppliers</SelectItem>
                {parties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as typeof paymentStatus)}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto lg:flex-1 lg:min-h-0 lg:overflow-auto rounded-lg border border-slate-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden sm:table-cell">Invoice #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Paid</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Balance</TableHead>
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
                      No purchases match the filters.
                    </TableCell>
                  </TableRow>
                )}
                {data?.data.map((p) => {
                  const balance = Number(p.total_amount) - Number(p.paid_amount);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{new Date(p.purchase_date).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell className="hidden sm:table-cell">{p.invoice_number || '—'}</TableCell>
                      <TableCell>{p.party?.name || '—'}</TableCell>
                      <TableCell className="hidden sm:table-cell text-right">{p.item_count ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(p.total_amount)}</TableCell>
                      <TableCell className="hidden md:table-cell text-right font-mono">{formatCurrency(p.paid_amount)}</TableCell>
                      <TableCell className="hidden md:table-cell text-right font-mono">{formatCurrency(balance)}</TableCell>
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
                        <Button variant="ghost" size="icon" title="View" onClick={() => setViewId(p.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PurchaseDetailSheet
        purchaseId={viewId}
        open={!!viewId}
        onOpenChange={(v) => !v && setViewId(null)}
      />
    </div>
  );
}

function Sum({
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
        <div className={`mt-1 text-xl font-bold ${highlight ? 'text-amber-700' : 'text-slate-900'}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
