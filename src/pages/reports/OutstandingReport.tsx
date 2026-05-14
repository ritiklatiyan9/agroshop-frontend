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
    <div className="h-full flex flex-col p-3 sm:p-6 gap-3 sm:gap-4 overflow-y-auto lg:overflow-hidden">
      <div className="flex-shrink-0">
        <PageHeader
          title="Outstanding report"
          description="Parties with unpaid credit sales, grouped."
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

      <Card className="lg:flex-1 lg:min-h-0 flex flex-col lg:overflow-hidden">
        <CardContent className="p-3 sm:p-4 flex flex-col lg:h-full lg:overflow-hidden">
          <div className="overflow-x-auto lg:flex-1 lg:min-h-0 lg:overflow-auto rounded-lg border border-slate-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Party</TableHead>
                  <TableHead className="hidden sm:table-cell">Mobile</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Bills</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Total amount</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="hidden md:table-cell">Oldest unpaid</TableHead>
                  <TableHead className="hidden lg:table-cell">Last activity</TableHead>
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
                    <TableCell className="hidden sm:table-cell">{r.mobile || '—'}</TableCell>
                    <TableCell className="hidden sm:table-cell text-right">{r.total_bills}</TableCell>
                    <TableCell className="hidden md:table-cell text-right font-mono">{formatCurrency(r.total_amount)}</TableCell>
                    <TableCell className="hidden md:table-cell text-right font-mono">{formatCurrency(r.total_paid)}</TableCell>
                    <TableCell className="text-right font-mono font-medium text-amber-700">
                      {formatCurrency(r.outstanding)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {r.oldest_unpaid_date
                        ? new Date(r.oldest_unpaid_date).toLocaleDateString('en-IN')
                        : '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{new Date(r.last_activity).toLocaleDateString('en-IN')}</TableCell>
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
