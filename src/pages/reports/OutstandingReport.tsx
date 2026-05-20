import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Download, Printer, BookOpen, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { downloadCsv } from '@/lib/download';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatCurrency } from '@/lib/utils';

interface Row {
  party_id: string; party_name: string; mobile: string | null;
  total_bills: number; total_amount: number; total_paid: number;
  outstanding: number; oldest_unpaid_date: string | null; last_activity: string;
}

interface Response {
  data: Row[];
  summary: { total_outstanding: number; party_count: number; oldest_outstanding: string | null };
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
    } catch { toast.error('Export failed'); }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50">

      {/* ── Desktop header ── */}
      <div className="hidden lg:block flex-shrink-0 p-6 pb-0">
        <PageHeader
          title="Outstanding Report"
          description="Parties with unpaid credit sales, grouped."
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
            <h1 className="text-xl font-bold text-slate-900">Outstanding Report</h1>
            <p className="text-xs text-slate-500 mt-0.5">{data?.summary.party_count ?? '—'} parties owing</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 active:bg-slate-50"><Printer className="h-4 w-4" /></button>
            <button onClick={exportCsv} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 active:bg-slate-50"><Download className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="flex-shrink-0 px-4 lg:px-6 pt-3 pb-2">
        <div className="grid grid-cols-3 gap-2 lg:gap-3">
          <div className="rounded-xl bg-white border border-amber-100 p-3 shadow-sm col-span-1 lg:col-span-1">
            <p className="text-[10px] uppercase tracking-wide text-amber-500 font-medium">Total Due</p>
            <p className="mt-1 text-lg font-bold text-amber-700 leading-none">{data ? formatCurrency(data.summary.total_outstanding) : '—'}</p>
          </div>
          <div className="rounded-xl bg-white border border-slate-100 p-3 shadow-sm">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Parties</p>
            <p className="mt-1 text-lg font-bold text-slate-900 leading-none">{data?.summary.party_count ?? '—'}</p>
          </div>
          <div className="rounded-xl bg-white border border-slate-100 p-3 shadow-sm">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Oldest</p>
            <p className="mt-1 text-sm font-bold text-slate-900 leading-none">
              {data?.summary.oldest_outstanding ? new Date(data.summary.oldest_outstanding).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Mobile cards ── */}
      <div className="lg:hidden flex-1 overflow-y-auto px-4 pb-24 space-y-2">
        {isLoading && [...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        {!isLoading && (data?.data ?? []).length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Wallet className="h-14 w-14 mb-3 opacity-20" />
            <p className="text-sm font-medium">No outstanding amounts</p>
            <p className="text-xs mt-1">All parties are settled</p>
          </div>
        )}
        {data?.data.map((r) => (
          <div key={r.party_id} className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900 truncate">{r.party_name}</p>
                {r.mobile && <p className="text-xs text-slate-400 mt-0.5">{r.mobile}</p>}
                <p className="text-xs text-slate-400 mt-1">{r.total_bills} bills · Last: {new Date(r.last_activity).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono font-bold text-amber-700 text-lg leading-none">{formatCurrency(r.outstanding)}</p>
                <p className="text-[10px] text-amber-500 mt-0.5">outstanding</p>
                {r.oldest_unpaid_date && (
                  <p className="text-[10px] text-slate-400 mt-0.5">since {new Date(r.oldest_unpaid_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end mt-3 pt-3 border-t border-slate-50">
              <button
                onClick={() => navigate(`/parties/${r.party_id}/ledger`)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 active:bg-emerald-100"
              >
                <BookOpen className="h-3.5 w-3.5" /> View Ledger
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden lg:flex flex-col flex-1 min-h-0 p-6 pt-3 gap-3 overflow-hidden">
        <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <CardContent className="p-3 sm:p-4 flex flex-col h-full overflow-hidden">
            <div className="overflow-x-auto flex-1 min-h-0 overflow-auto rounded-lg border border-slate-100">
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
                  {isLoading && [...Array(6)].map((_, i) => <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)}
                  {data && data.data.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-10 text-slate-500">No outstanding bills</TableCell></TableRow>}
                  {data?.data.map((r) => (
                    <TableRow key={r.party_id}>
                      <TableCell className="font-medium">{r.party_name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{r.mobile || '—'}</TableCell>
                      <TableCell className="hidden sm:table-cell text-right">{r.total_bills}</TableCell>
                      <TableCell className="hidden md:table-cell text-right font-mono">{formatCurrency(r.total_amount)}</TableCell>
                      <TableCell className="hidden md:table-cell text-right font-mono">{formatCurrency(r.total_paid)}</TableCell>
                      <TableCell className="text-right font-mono font-medium text-amber-700">{formatCurrency(r.outstanding)}</TableCell>
                      <TableCell className="hidden md:table-cell">{r.oldest_unpaid_date ? new Date(r.oldest_unpaid_date).toLocaleDateString('en-IN') : '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell">{new Date(r.last_activity).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/parties/${r.party_id}/ledger`)}>
                          <BookOpen className="mr-1.5 h-4 w-4" /> Ledger
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
    </div>
  );
}
