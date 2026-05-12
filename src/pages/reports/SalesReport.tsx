import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Download, Eye, Printer, Search } from 'lucide-react';
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
import { BillDetailSheet } from '@/components/billing/BillDetailSheet';
import { useParties } from '@/hooks/useParties';
import { formatCurrency } from '@/lib/utils';
import type { BillRow, Pagination } from '@/types';

interface SalesResponse {
  data: BillRow[];
  pagination: Pagination;
  summary: {
    total_bills: number;
    subtotal: string;
    cgst: string;
    sgst: string;
    total_amount: string;
    collected: string;
    outstanding: string;
  };
}

export function SalesReportPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [billType, setBillType] = useState<'all' | 'gst' | 'non_gst'>('all');
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  const [partyId, setPartyId] = useState<string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [viewBillId, setViewBillId] = useState<string | null>(null);

  const { data: parties = [] } = useParties('customer');

  const params = {
    page,
    page_size: 25,
    search: search || undefined,
    bill_type: billType !== 'all' ? billType : undefined,
    payment_status: paymentStatus !== 'all' ? paymentStatus : undefined,
    party_id: partyId !== 'all' ? partyId : undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['report-sales', params],
    queryFn: async () => {
      const res = await api.get<SalesResponse>('/reports/sales', { params });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  async function exportCsv() {
    try {
      await downloadCsv(
        '/reports/sales',
        params,
        `sales-${new Date().toISOString().split('T')[0]}.csv`,
      );
    } catch {
      toast.error('CSV export failed');
    }
  }

  return (
    <div className="h-full flex flex-col p-6 gap-4 overflow-hidden">
      <div className="flex-shrink-0">
        <PageHeader
          title="Sales report"
          description="Filter sales by date, party, type, payment status. Export to CSV or print as PDF."
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

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 flex-shrink-0">
        <SummaryCell label="Total bills" value={data?.summary.total_bills ?? '—'} />
        <SummaryCell label="Subtotal" value={data ? formatCurrency(data.summary.subtotal) : '—'} />
        <SummaryCell label="CGST" value={data ? formatCurrency(data.summary.cgst) : '—'} />
        <SummaryCell label="SGST" value={data ? formatCurrency(data.summary.sgst) : '—'} />
        <SummaryCell label="Grand total" value={data ? formatCurrency(data.summary.total_amount) : '—'} />
        <SummaryCell label="Collected" value={data ? formatCurrency(data.summary.collected) : '—'} />
        <SummaryCell
          label="Outstanding"
          value={data ? formatCurrency(data.summary.outstanding) : '—'}
          highlight={Number(data?.summary.outstanding) > 0}
        />
      </div>

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardContent className="p-4 flex flex-col h-full overflow-hidden gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search bill # or customer..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="w-44"
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="w-44"
            />
            <Select
              value={partyId}
              onValueChange={(v) => { setPartyId(v); setPage(1); }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Party" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All parties</SelectItem>
                {parties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={billType}
              onValueChange={(v) => { setBillType(v as typeof billType); setPage(1); }}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="gst">GST</SelectItem>
                <SelectItem value="non_gst">Non-GST</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={paymentStatus}
              onValueChange={(v) => { setPaymentStatus(v as typeof paymentStatus); setPage(1); }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Taxable</TableHead>
                  <TableHead className="text-right">GST</TableHead>
                  <TableHead className="text-right">Total</TableHead>
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
                      No bills match the filters.
                    </TableCell>
                  </TableRow>
                )}
                {data?.data.map((b) => {
                  const gst = Number(b.cgst_total) + Number(b.sgst_total);
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono font-medium">{b.bill_number}</TableCell>
                      <TableCell>{new Date(b.bill_date).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell>{b.customer_name || b.party?.name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={b.bill_type === 'gst' ? 'info' : 'muted'}>
                          {b.bill_type === 'gst' ? 'GST' : 'NON-GST'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(b.subtotal)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(gst)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(b.grand_total)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            b.payment_status === 'paid'
                              ? 'success'
                              : b.payment_status === 'unpaid'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {b.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" title="View" onClick={() => setViewBillId(b.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
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
                Page {data.pagination.page} of {data.pagination.total_pages} · {data.pagination.total} bills
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.pagination.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <BillDetailSheet
        billId={viewBillId}
        open={!!viewBillId}
        onOpenChange={(v) => !v && setViewBillId(null)}
      />
    </div>
  );
}

function SummaryCell({
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
      <CardContent className="p-3">
        <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
        <div className={`mt-0.5 text-sm font-bold ${highlight ? 'text-amber-700' : 'text-slate-900'}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
