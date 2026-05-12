import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Printer, Info } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { downloadCsv } from '@/lib/download';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  TableFooter,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface GstRow {
  hsn: string;
  description: string;
  uom: string;
  qty: number;
  taxable_value: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  total: number;
}

interface GstResponse {
  period: { month: number; year: number; from: string; to: string };
  data: GstRow[];
  totals: {
    qty: number;
    taxable_value: number;
    cgst_amount: number;
    sgst_amount: number;
    total: number;
  };
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function GstReportPage() {
  const now = new Date();
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ['report-gstr1', month, year],
    queryFn: async () => {
      const res = await api.get<GstResponse>('/reports/gstr1', { params: { month, year } });
      return res.data;
    },
  });

  async function exportCsv() {
    try {
      await downloadCsv(
        '/reports/gstr1',
        { month, year },
        `gstr1-${year}-${String(month).padStart(2, '0')}.csv`,
      );
    } catch {
      toast.error('Export failed');
    }
  }

  const years: number[] = [];
  for (let y = now.getFullYear() + 1; y >= now.getFullYear() - 4; y--) years.push(y);

  return (
    <div className="h-full flex flex-col p-6 gap-4 overflow-hidden">
      <div className="flex-shrink-0">
        <PageHeader
          title="GSTR-1 — HSN summary"
          description={
            data
              ? `${MONTHS[month - 1]} ${year} · ${data.period.from} to ${data.period.to}`
              : 'HSN-wise outward supply for filing.'
          }
          actions={
            <>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" /> Print / PDF
              </Button>
              <Button variant="outline" onClick={exportCsv}>
                <Download className="mr-2 h-4 w-4" /> Download CSV for Tally
              </Button>
            </>
          }
        />
      </div>

      <Card className="border-amber-200 bg-amber-50/60 flex-shrink-0">
        <CardContent className="p-3 flex items-start gap-2">
          <Info className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">
            This is a summary report aggregated from GST bills only. Please verify the figures with your CA
            before filing GSTR-1.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardContent className="p-4 flex flex-col h-full overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>HSN</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Taxable value</TableHead>
                  <TableHead className="text-right">CGST %</TableHead>
                  <TableHead className="text-right">CGST amt</TableHead>
                  <TableHead className="text-right">SGST %</TableHead>
                  <TableHead className="text-right">SGST amt</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <>
                    {[...Array(6)].map((_, i) => (
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
                      No GST bills in this period.
                    </TableCell>
                  </TableRow>
                )}
                {data?.data.map((r, i) => (
                  <TableRow key={`${r.hsn}-${r.cgst_rate}-${i}`}>
                    <TableCell className="font-mono">{r.hsn}</TableCell>
                    <TableCell>{r.description}</TableCell>
                    <TableCell>{r.uom}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(r.qty, 2)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(r.taxable_value)}</TableCell>
                    <TableCell className="text-right text-xs">{r.cgst_rate}%</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(r.cgst_amount)}</TableCell>
                    <TableCell className="text-right text-xs">{r.sgst_rate}%</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(r.sgst_amount)}</TableCell>
                    <TableCell className="text-right font-mono font-medium">{formatCurrency(r.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {data && data.data.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="font-bold">Total</TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {formatNumber(data.totals.qty, 2)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {formatCurrency(data.totals.taxable_value)}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {formatCurrency(data.totals.cgst_amount)}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {formatCurrency(data.totals.sgst_amount)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {formatCurrency(data.totals.total)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
