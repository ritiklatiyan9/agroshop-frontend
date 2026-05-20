import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, Eye, AlertCircle } from 'lucide-react';
import { api } from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { formatCurrency } from '@/lib/utils';
import type { BillRow } from '@/types';

export function OutstandingPage() {
  const [viewBillId, setViewBillId] = useState<string | null>(null);
  const [payBill, setPayBill] = useState<BillRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['outstanding'],
    queryFn: async () => {
      const res = await api.get<{
        data: Array<BillRow & { balance: string }>;
        summary: { total_outstanding: string; bill_count: number };
      }>('/bills/outstanding');
      return res.data;
    },
  });

  const bills = data?.data ?? [];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50">

      {/* ── Desktop header ── */}
      <div className="hidden lg:block flex-shrink-0 p-6 pb-0">
        <PageHeader title="Outstanding" description="Bills with unpaid or partial balances." />
      </div>

      {/* ── Mobile header ── */}
      <div className="lg:hidden flex-shrink-0 px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-slate-900">Outstanding</h1>
        <p className="text-xs text-slate-500 mt-0.5">Unpaid &amp; partial bills</p>
      </div>

      {/* ── Stats strip ── */}
      <div className="flex-shrink-0 px-4 lg:px-6 pt-3 pb-2">
        <div className="grid grid-cols-2 gap-2 lg:gap-3 lg:grid-cols-3">
          <div className="rounded-xl bg-white border border-slate-100 p-3 shadow-sm lg:p-4">
            <p className="text-[10px] lg:text-xs uppercase tracking-wide text-slate-400 font-medium">Outstanding Bills</p>
            <p className="mt-1 text-xl font-bold text-slate-900 leading-none">{data?.summary.bill_count ?? '—'}</p>
          </div>
          <div className="rounded-xl bg-white border border-amber-100 p-3 shadow-sm lg:p-4">
            <p className="text-[10px] lg:text-xs uppercase tracking-wide text-amber-500 font-medium">Total Due</p>
            <p className="mt-1 text-xl font-bold text-amber-700 leading-none">
              {data ? formatCurrency(data.summary.total_outstanding) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Mobile outstanding cards ── */}
      <div className="lg:hidden flex-1 overflow-y-auto px-4 pb-28 space-y-2">
        {isLoading && (
          <div className="space-y-2 pt-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
          </div>
        )}
        {!isLoading && bills.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <AlertCircle className="h-14 w-14 mb-3 opacity-20" />
            <p className="text-sm font-medium">No outstanding bills</p>
            <p className="text-xs mt-1">All bills have been paid</p>
          </div>
        )}
        {bills.map((b) => (
          <div
            key={b.id}
            className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm active:scale-[0.99] transition-transform"
            onClick={() => setViewBillId(b.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold text-slate-800">{b.bill_number}</span>
                  <Badge
                    variant={b.payment_status === 'partial' ? 'warning' : 'danger'}
                    className="text-[10px]"
                  >
                    {b.payment_status}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-slate-700 mt-1 truncate">
                  {b.customer_name || b.party?.name || 'Walk-in'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(b.bill_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-400">Total {formatCurrency(b.grand_total)}</p>
                <p className="font-mono font-bold text-amber-700 mt-0.5 text-lg leading-none">
                  {formatCurrency(b.balance)}
                </p>
                <p className="text-[10px] text-amber-500 mt-0.5">due</p>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-50" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setViewBillId(b.id)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 py-1.5 text-xs font-medium text-slate-600 active:bg-slate-100"
              >
                <Eye className="h-3.5 w-3.5" /> View Bill
              </button>
              <button
                onClick={() => setPayBill(b)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 py-1.5 text-xs font-semibold text-emerald-700 active:bg-emerald-100"
              >
                <Wallet className="h-3.5 w-3.5" /> Record Payment
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden lg:flex flex-col flex-1 min-h-0 p-6 pt-4 gap-4 overflow-hidden">
        <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <CardContent className="p-4 flex flex-col h-full overflow-hidden">
            <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-100">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && [...Array(8)].map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  ))}
                  {data && data.data.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-10 text-slate-500">No outstanding bills.</TableCell></TableRow>
                  )}
                  {data?.data.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono font-medium">{b.bill_number}</TableCell>
                      <TableCell>{new Date(b.bill_date).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell className="font-medium">{b.customer_name || b.party?.name || '—'}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(b.grand_total)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(b.paid_amount)}</TableCell>
                      <TableCell className="text-right font-mono font-medium text-amber-700">{formatCurrency(b.balance)}</TableCell>
                      <TableCell>
                        <Badge variant={b.payment_status === 'partial' ? 'warning' : 'danger'}>{b.payment_status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" title="View" onClick={() => setViewBillId(b.id)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => setPayBill(b)}>
                            <Wallet className="h-4 w-4 mr-1.5 text-emerald-600" />
                            Record
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

      <BillDetailSheet billId={viewBillId} open={!!viewBillId} onOpenChange={(v) => !v && setViewBillId(null)} />
      <RecordPaymentDialog bill={payBill} open={!!payBill} onOpenChange={(v) => !v && setPayBill(null)} />
    </div>
  );
}
