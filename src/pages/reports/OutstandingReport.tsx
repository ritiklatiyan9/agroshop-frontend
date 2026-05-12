import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Download, Printer, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { downloadCsv } from '@/lib/download';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { formatCurrency } from '@/lib/utils';

interface Row {
  party_id: string;
  party_name: string;
  mobile: string | null;
  total_bills: number;
  total_amount: number;
  total_paid: number;
  outstanding: number;
  oldest_unpaid_date: string | null;
  last_activity: string;
}

interface Response {
  data: Row[];
  summary: {
    total_outstanding: number;
    party_count: number;
    oldest_outstanding: string | null;
  };
}

export function OutstandingReportPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['report-outstanding'],
    queryFn: async () => {
      const res = await api.get<Response>('/reports/outstanding');
      return res.data;
    },
  });

  async function exportCsv() {
    try {
      await downloadCsv('/reports/outstanding', {}, `outstanding-${new Date().toISOString().split('T')[0]}.csv`);
    } catch {
      toast.error('Export failed');
    }
  }

  return (
    <div className="h-full flex flex-col p-6 gap-4 overflow-hidden">
      <div className="flex-shrink-0">
        <PageHeader
          title="Outstanding report"
          description="Parties with unpaid credit sales, grouped."
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

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 flex-shrink-0">
        <Sum label="Total outstanding" value={data ? formatCurrency(data.summary.total_outstanding) : '—'} highlight />
        <Sum label="Parties owing" value={data?.summary.party_count ?? '—'} />
        <Sum
          label="Oldest unpaid"
          value={data?.summary.oldest_outstanding
            ? new Date(data.summary.oldest_outstanding).toLocaleDateString('en-IN')
            : '—'}
        />
      </div>

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardContent className="p-4 flex flex-col h-full overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Party</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead className="text-right">Bills</TableHead>
                  <TableHead className="text-right">Total amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Oldest unpaid</TableHead>
                  <TableHead>Last activity</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <>
                    {[...Array(6)].map((_, i) => (
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
                      No outstanding bills 🎉
                    </TableCell>
                  </TableRow>
                )}
                {data?.data.map((r) => (
                  <TableRow key={r.party_id}>
                    <TableCell className="font-medium">{r.party_name}</TableCell>
                    <TableCell>{r.mobile || '—'}</TableCell>
                    <TableCell className="text-right">{r.total_bills}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(r.total_amount)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(r.total_paid)}</TableCell>
                    <TableCell className="text-right font-mono font-medium text-amber-700">
                      {formatCurrency(r.outstanding)}
                    </TableCell>
                    <TableCell>
                      {r.oldest_unpaid_date
                        ? new Date(r.oldest_unpaid_date).toLocaleDateString('en-IN')
                        : '—'}
                    </TableCell>
                    <TableCell>{new Date(r.last_activity).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/parties/${r.party_id}/ledger`)}
                      >
                        <BookOpen className="mr-1.5 h-4 w-4" />
                        Ledger
                      </Button>
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
        <div className={`mt-1 text-2xl font-bold ${highlight ? 'text-amber-700' : 'text-slate-900'}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
