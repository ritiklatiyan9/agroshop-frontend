import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, Eye } from 'lucide-react';
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

  return (
    <div className="h-full flex flex-col p-6 gap-4 overflow-hidden">
      <div className="flex-shrink-0">
        <PageHeader title="Outstanding" description="Bills with unpaid or partial balances." />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 flex-shrink-0">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Outstanding bills</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{data?.summary.bill_count ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Total due</div>
            <div className="mt-1 text-2xl font-bold text-amber-700">
              {data ? formatCurrency(data.summary.total_outstanding) : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

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
                      No outstanding bills.
                    </TableCell>
                  </TableRow>
                )}
                {data?.data.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono font-medium">{b.bill_number}</TableCell>
                    <TableCell>{new Date(b.bill_date).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell className="font-medium">{b.customer_name || b.party?.name || '—'}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(b.grand_total)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(b.paid_amount)}</TableCell>
                    <TableCell className="text-right font-mono font-medium text-amber-700">
                      {formatCurrency(b.balance)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={b.payment_status === 'partial' ? 'warning' : 'danger'}>{b.payment_status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" title="View" onClick={() => setViewBillId(b.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
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

      <BillDetailSheet billId={viewBillId} open={!!viewBillId} onOpenChange={(v) => !v && setViewBillId(null)} />
      <RecordPaymentDialog bill={payBill} open={!!payBill} onOpenChange={(v) => !v && setPayBill(null)} />
    </div>
  );
}
