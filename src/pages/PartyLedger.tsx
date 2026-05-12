import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Wallet, Printer } from 'lucide-react';
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
import { PartyPaymentDialog } from '@/components/parties/PartyPaymentDialog';
import { BillDetailSheet } from '@/components/billing/BillDetailSheet';
import { formatCurrency } from '@/lib/utils';
import type { Party } from '@/types';

interface LedgerEntry {
  date: string;
  created_at: string;
  type: 'bill' | 'payment';
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  bill_id?: string;
  payment_id?: string;
}

interface LedgerResponse {
  party: Party;
  opening_balance: number;
  summary: {
    total_billed: number;
    total_paid: number;
    current_outstanding: number;
  };
  entries: LedgerEntry[];
}

export function PartyLedgerPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [payOpen, setPayOpen] = useState(false);
  const [viewBillId, setViewBillId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['party-ledger', id],
    queryFn: async () => {
      const res = await api.get<LedgerResponse>(`/parties/${id}/ledger`);
      return res.data;
    },
    enabled: !!id,
  });

  return (
    <div className="h-full flex flex-col p-6 gap-4 overflow-hidden">
      <div className="flex-shrink-0">
        <PageHeader
          title={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate('/parties')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span>Party ledger</span>
            </div>
          }
          description={data?.party?.name || ''}
          actions={
            <>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
              <Button onClick={() => setPayOpen(true)} disabled={!data}>
                <Wallet className="mr-2 h-4 w-4" /> Record payment
              </Button>
            </>
          }
        />
      </div>

      {isLoading && <Skeleton className="h-32 w-full" />}

      {data && (
        <>
          <Card className="flex-shrink-0">
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Info label="Name" value={data.party.name} />
              <Info label="Type" value={<Badge>{data.party.type}</Badge>} />
              <Info label="Mobile" value={data.party.mobile || '—'} />
              <Info label="GSTIN" value={data.party.gstin || '—'} />
              <Info label="Address" value={data.party.address || '—'} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 flex-shrink-0">
            <Sum label="Opening balance" value={formatCurrency(data.opening_balance)} />
            <Sum label="Total billed" value={formatCurrency(data.summary.total_billed)} />
            <Sum label="Total paid" value={formatCurrency(data.summary.total_paid)} />
            <Sum
              label="Current outstanding"
              value={formatCurrency(data.summary.current_outstanding)}
              highlight={data.summary.current_outstanding > 0}
            />
          </div>

          <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <CardContent className="p-4 flex flex-col h-full overflow-hidden">
              <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-100">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.entries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10 text-slate-500">
                          No transactions yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {data.entries.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell>{new Date(e.date).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell>
                          <Badge variant={e.type === 'bill' ? 'info' : 'success'}>
                            {e.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{e.reference}</TableCell>
                        <TableCell className="text-sm">{e.description}</TableCell>
                        <TableCell className="text-right font-mono">
                          {e.debit > 0 ? formatCurrency(e.debit) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {e.credit > 0 ? formatCurrency(e.credit) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {formatCurrency(e.balance)}
                        </TableCell>
                        <TableCell>
                          {e.bill_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewBillId(e.bill_id!)}
                            >
                              View
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <PartyPaymentDialog
        partyId={id ?? null}
        partyName={data?.party?.name}
        open={payOpen}
        onOpenChange={setPayOpen}
      />
      <BillDetailSheet
        billId={viewBillId}
        open={!!viewBillId}
        onOpenChange={(v) => !v && setViewBillId(null)}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function Sum({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div className={`mt-1 text-xl font-bold font-mono ${highlight ? 'text-amber-700' : 'text-slate-900'}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
