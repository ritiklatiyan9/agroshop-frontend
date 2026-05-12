import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Eye, Printer, Wallet, XCircle, Plus, Search } from 'lucide-react';
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
import { BillDetailSheet } from '@/components/billing/BillDetailSheet';
import { RecordPaymentDialog } from '@/components/billing/RecordPaymentDialog';
import { CancelBillDialog } from '@/components/billing/CancelBillDialog';
import { formatCurrency } from '@/lib/utils';
import type { BillRow, Pagination, BillSummaryAgg } from '@/types';

export function BillHistoryPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [billType, setBillType] = useState<'all' | 'gst' | 'non_gst'>('all');
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [viewBillId, setViewBillId] = useState<string | null>(null);
  const [payBill, setPayBill] = useState<BillRow | null>(null);
  const [cancelBill, setCancelBill] = useState<BillRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['bills', { page, search, billType, paymentStatus, fromDate, toDate }],
    queryFn: async () => {
      const res = await api.get<{ data: BillRow[]; pagination: Pagination; summary: BillSummaryAgg }>(
        '/bills',
        {
          params: {
            page,
            page_size: 30,
            search: search || undefined,
            bill_type: billType !== 'all' ? billType : undefined,
            payment_status: paymentStatus !== 'all' ? paymentStatus : undefined,
            from_date: fromDate || undefined,
            to_date: toDate || undefined,
          },
        },
      );
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  return (
    <div className="h-full flex flex-col p-6 gap-4 overflow-hidden">
      <div className="flex-shrink-0">
        <PageHeader
          title="Bill history"
          description="All sales bills with status and outstanding balances."
          actions={
            <>
              <Button variant="outline" onClick={() => navigate('/bills/new')}>
                <Plus className="mr-2 h-4 w-4" /> Non-GST
              </Button>
              <Button onClick={() => navigate('/bills/new-gst')}>
                <Plus className="mr-2 h-4 w-4" /> New GST bill
              </Button>
            </>
          }
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-shrink-0">
        <SummaryCard label="Total bills" value={data?.summary.total_bills ?? '—'} />
        <SummaryCard
          label="Total amount"
          value={data ? formatCurrency(data.summary.total_amount) : '—'}
        />
        <SummaryCard
          label="Collected"
          value={data ? formatCurrency(data.summary.collected) : '—'}
        />
        <SummaryCard
          label="Outstanding"
          value={data ? formatCurrency(data.summary.outstanding) : '—'}
          highlight={Number(data?.summary.outstanding) > 0}
        />
      </div>

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardContent className="p-4 flex flex-col h-full overflow-hidden gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search bill # or customer..."
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select
              value={billType}
              onValueChange={(v) => {
                setBillType(v as typeof billType);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-36">
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
              onValueChange={(v) => {
                setPaymentStatus(v as typeof paymentStatus);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payments</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
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
                  <TableHead>Bill #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <>
                    {[...Array(8)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={10}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
                {data && data.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-slate-500">
                      No bills found.
                    </TableCell>
                  </TableRow>
                )}
                {data?.data.map((b) => {
                  const balance = Number(b.grand_total) - Number(b.paid_amount);
                  const isCancelled = b.status === 'cancelled';
                  return (
                    <TableRow key={b.id} className={isCancelled ? 'opacity-60' : ''}>
                      <TableCell className="font-mono font-medium">{b.bill_number}</TableCell>
                      <TableCell>{new Date(b.bill_date).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell className="font-medium">
                        {b.customer_name || b.party?.name || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={b.bill_type === 'gst' ? 'info' : 'muted'}>
                          {b.bill_type === 'gst' ? 'GST' : 'NON-GST'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{b.item_count ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(b.grand_total)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(b.paid_amount)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(balance)}</TableCell>
                      <TableCell>
                        {isCancelled ? (
                          <Badge variant="danger">Cancelled</Badge>
                        ) : (
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
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" title="View" onClick={() => setViewBillId(b.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Print / PDF"
                            onClick={() => window.open(`/bills/print/${b.id}`, '_blank')}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          {!isCancelled && balance > 0 && (
                            <Button variant="ghost" size="icon" title="Record payment" onClick={() => setPayBill(b)}>
                              <Wallet className="h-4 w-4 text-emerald-600" />
                            </Button>
                          )}
                          {!isCancelled && (
                            <Button variant="ghost" size="icon" title="Cancel bill" onClick={() => setCancelBill(b)}>
                              <XCircle className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
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
                Page {data.pagination.page} of {data.pagination.total_pages} · {data.pagination.total} items
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

      <BillDetailSheet billId={viewBillId} open={!!viewBillId} onOpenChange={(v) => !v && setViewBillId(null)} />
      <RecordPaymentDialog bill={payBill} open={!!payBill} onOpenChange={(v) => !v && setPayBill(null)} />
      <CancelBillDialog bill={cancelBill} open={!!cancelBill} onOpenChange={(v) => !v && setCancelBill(null)} />
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
        <div className={`mt-1 text-xl font-bold ${highlight ? 'text-amber-700' : 'text-slate-900'}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
