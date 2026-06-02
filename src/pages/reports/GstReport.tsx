import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Printer, Info, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { downloadCsv } from '@/lib/download';
import { printHtml, escapeHtml } from '@/lib/printHtml';
import { useCurrentShop } from '@/store/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableFooter,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface GstRow {
  hsn: string; description: string; uom: string; qty: number;
  taxable_value: number; cgst_rate: number; cgst_amount: number;
  sgst_rate: number; sgst_amount: number; total: number;
}

interface GstResponse {
  type: 'sales' | 'purchase';
  period: { month: number; year: number; from: string; to: string };
  data: GstRow[];
  totals: { qty: number; taxable_value: number; cgst_amount: number; sgst_amount: number; total: number };
}

type GstType = 'sales' | 'purchase';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function GstReportPage() {
  const now = new Date();
  const currentShop = useCurrentShop();
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [type, setType] = useState<GstType>('sales');

  const { data, isLoading } = useQuery({
    queryKey: ['report-gstr1', type, month, year],
    queryFn: async () => {
      const res = await api.get<GstResponse>('/reports/gstr1', { params: { type, month, year } });
      return res.data;
    },
  });

  async function exportCsv() {
    try {
      await downloadCsv('/reports/gstr1', { type, month, year }, `gst-${type}-${year}-${String(month).padStart(2, '0')}.csv`);
    } catch { toast.error('Export failed'); }
  }

  const isPurchase = type === 'purchase';

  function handlePrint() {
    if (!data || data.data.length === 0) {
      toast.error('Nothing to print for this period');
      return;
    }
    printHtml(
      buildGstReportHtml({
        shopName: currentShop?.name ?? 'Shop',
        isPurchase,
        periodLabel: `${MONTHS[month - 1]} ${year}`,
        period: data.period,
        rows: data.data,
        totals: data.totals,
      }),
    );
  }

  const years: number[] = [];
  for (let y = now.getFullYear() + 1; y >= now.getFullYear() - 4; y--) years.push(y);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50">

      {/* ── Desktop header ── */}
      <div className="hidden lg:block flex-shrink-0 p-6 pb-0">
        <PageHeader
          title={isPurchase ? 'GST Purchases — HSN Summary' : 'GSTR-1 — HSN Summary'}
          description={data ? `${isPurchase ? 'Inward (purchases)' : 'Outward (sales)'} · ${MONTHS[month - 1]} ${year} · ${data.period.from} to ${data.period.to}` : 'HSN-wise GST summary for filing.'}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print / PDF</Button>
              <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-2" /> Download CSV</Button>
            </>
          }
        />
      </div>

      {/* ── Mobile header ── */}
      <div className="lg:hidden flex-shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">GST Report</h1>
            <p className="text-xs text-slate-500 mt-0.5">{isPurchase ? 'Purchases (Inward)' : 'Sales (Outward)'} · HSN Summary</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 active:bg-slate-50"><Printer className="h-4 w-4" /></button>
            <button onClick={exportCsv} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 active:bg-slate-50"><Download className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* ── Type + Period selector ── */}
      <div className="flex-shrink-0 px-4 lg:px-6 pt-3 pb-2">
        <div className="flex flex-wrap gap-2">
          <Select value={type} onValueChange={(v) => setType(v as GstType)}>
            <SelectTrigger className="w-36 bg-white font-medium"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sales">Sell (Sales)</SelectItem>
              <SelectItem value="purchase">Purchase</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-40 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Disclaimer ── */}
      <div className="flex-shrink-0 px-4 lg:px-6 pb-2">
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
          <Info className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">
            {isPurchase
              ? 'Summary from GST purchases only (input tax credit). Verify with your CA before filing.'
              : 'Summary from GST bills only (outward supply). Verify with your CA before filing GSTR-1.'}
          </p>
        </div>
      </div>

      {/* ── Mobile: Summary stats + HSN cards ── */}
      <div className="lg:hidden flex-1 overflow-y-auto px-4 pb-24 space-y-3">
        {data && data.totals && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white border border-slate-100 p-3 shadow-sm">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Taxable Value</p>
              <p className="mt-1 text-base font-bold text-slate-900 leading-none">{formatCurrency(data.totals.taxable_value)}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-100 p-3 shadow-sm">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Total Tax</p>
              <p className="mt-1 text-base font-bold text-slate-900 leading-none">{formatCurrency(data.totals.cgst_amount + data.totals.sgst_amount)}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-100 p-3 shadow-sm">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">CGST</p>
              <p className="mt-1 text-base font-bold text-slate-900 leading-none">{formatCurrency(data.totals.cgst_amount)}</p>
            </div>
            <div className="rounded-xl bg-white border border-emerald-100 p-3 shadow-sm">
              <p className="text-[10px] uppercase tracking-wide text-emerald-500 font-medium">Grand Total</p>
              <p className="mt-1 text-base font-bold text-emerald-700 leading-none">{formatCurrency(data.totals.total)}</p>
            </div>
          </div>
        )}

        {isLoading && [...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}

        {!isLoading && (data?.data ?? []).length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <FileSpreadsheet className="h-14 w-14 mb-3 opacity-20" />
            <p className="text-sm font-medium">No GST {isPurchase ? 'purchases' : 'bills'} in this period</p>
          </div>
        )}

        {data?.data.map((r, i) => (
          <div key={`${r.hsn}-${r.cgst_rate}-${i}`} className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-slate-800">{r.hsn}</span>
                  <span className="text-xs text-slate-400">{r.uom} · GST {r.cgst_rate * 2}%</span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{r.description}</p>
                <p className="text-xs text-slate-400 mt-1">Qty: {formatNumber(r.qty, 2)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono font-bold text-slate-900">{formatCurrency(r.total)}</p>
                <p className="text-xs text-slate-400 mt-0.5">Taxable {formatCurrency(r.taxable_value)}</p>
              </div>
            </div>
            <div className="flex gap-4 mt-3 pt-2 border-t border-slate-50">
              <div className="text-xs">
                <span className="text-slate-400">CGST: </span>
                <span className="font-mono font-medium text-slate-700">{formatCurrency(r.cgst_amount)}</span>
              </div>
              <div className="text-xs">
                <span className="text-slate-400">SGST: </span>
                <span className="font-mono font-medium text-slate-700">{formatCurrency(r.sgst_amount)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden lg:flex flex-col flex-1 min-h-0 p-6 pt-0 gap-3 overflow-hidden">
        <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <CardContent className="p-3 sm:p-4 flex flex-col h-full overflow-hidden">
            <div className="overflow-x-auto flex-1 min-h-0 overflow-auto rounded-lg border border-slate-100">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>HSN</TableHead>
                    <TableHead className="hidden sm:table-cell">Description</TableHead>
                    <TableHead className="hidden md:table-cell">UOM</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Qty</TableHead>
                    <TableHead className="text-right">Taxable</TableHead>
                    <TableHead className="hidden lg:table-cell text-right">CGST %</TableHead>
                    <TableHead className="text-right">CGST</TableHead>
                    <TableHead className="hidden lg:table-cell text-right">SGST %</TableHead>
                    <TableHead className="text-right">SGST</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && [...Array(6)].map((_, i) => <TableRow key={i}><TableCell colSpan={10}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)}
                  {data && data.data.length === 0 && <TableRow><TableCell colSpan={10} className="text-center py-10 text-slate-500">No GST {isPurchase ? 'purchases' : 'bills'} in this period.</TableCell></TableRow>}
                  {data?.data.map((r, i) => (
                    <TableRow key={`${r.hsn}-${r.cgst_rate}-${i}`}>
                      <TableCell className="font-mono">{r.hsn}</TableCell>
                      <TableCell className="hidden sm:table-cell">{r.description}</TableCell>
                      <TableCell className="hidden md:table-cell">{r.uom}</TableCell>
                      <TableCell className="hidden md:table-cell text-right font-mono">{formatNumber(r.qty, 2)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(r.taxable_value)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-right text-xs">{r.cgst_rate}%</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(r.cgst_amount)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-right text-xs">{r.sgst_rate}%</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(r.sgst_amount)}</TableCell>
                      <TableCell className="text-right font-mono font-medium">{formatCurrency(r.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                {data && data.data.length > 0 && (
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-bold">Total</TableCell>
                      <TableCell className="hidden sm:table-cell" />
                      <TableCell className="hidden md:table-cell" />
                      <TableCell className="hidden md:table-cell text-right font-mono font-bold">{formatNumber(data.totals.qty, 2)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{formatCurrency(data.totals.taxable_value)}</TableCell>
                      <TableCell className="hidden lg:table-cell" />
                      <TableCell className="text-right font-mono font-bold">{formatCurrency(data.totals.cgst_amount)}</TableCell>
                      <TableCell className="hidden lg:table-cell" />
                      <TableCell className="text-right font-mono font-bold">{formatCurrency(data.totals.sgst_amount)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{formatCurrency(data.totals.total)}</TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ── HTML print document (rendered in a hidden iframe, not a screen capture) ── */
function buildGstReportHtml(opts: {
  shopName: string;
  isPurchase: boolean;
  periodLabel: string;
  period: GstResponse['period'];
  rows: GstRow[];
  totals: GstResponse['totals'];
}): string {
  const { shopName, isPurchase, periodLabel, period, rows, totals } = opts;
  const title = isPurchase ? 'GST Purchases — HSN Summary' : 'GSTR-1 — HSN Summary';
  const flow = isPurchase ? 'Inward supply (purchases)' : 'Outward supply (sales)';
  const inr = (n: number) =>
    '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = (n: number) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const bodyRows = rows
    .map(
      (r) => `
      <tr>
        <td class="mono">${escapeHtml(r.hsn)}</td>
        <td>${escapeHtml(r.description)}</td>
        <td class="center">${escapeHtml(r.uom)}</td>
        <td class="num">${num(r.qty)}</td>
        <td class="num">${inr(r.taxable_value)}</td>
        <td class="num small">${r.cgst_rate}%</td>
        <td class="num">${inr(r.cgst_amount)}</td>
        <td class="num small">${r.sgst_rate}%</td>
        <td class="num">${inr(r.sgst_amount)}</td>
        <td class="num">${inr(r.total)}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} · ${escapeHtml(periodLabel)}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #0f172a; margin: 0; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #047857; padding-bottom: 10px; margin-bottom: 14px; }
    .shop { font-size: 18px; font-weight: 700; }
    .title { font-size: 14px; font-weight: 600; color: #047857; margin-top: 2px; }
    .meta { text-align: right; font-size: 11px; color: #475569; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    thead th { background: #f1f5f9; text-align: left; padding: 6px 8px; border-bottom: 1px solid #cbd5e1; text-transform: uppercase; font-size: 10px; letter-spacing: .03em; color: #334155; }
    tbody td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
    tfoot td { padding: 7px 8px; border-top: 2px solid #cbd5e1; font-weight: 700; background: #f8fafc; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .center { text-align: center; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .small { color: #64748b; }
    .note { margin-top: 12px; font-size: 10px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; padding: 8px 10px; border-radius: 6px; }
    .footer { margin-top: 10px; font-size: 10px; color: #94a3b8; text-align: right; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="shop">${escapeHtml(shopName)}</div>
      <div class="title">${escapeHtml(title)}</div>
    </div>
    <div class="meta">
      <div><strong>${escapeHtml(flow)}</strong></div>
      <div>Period: ${escapeHtml(periodLabel)}</div>
      <div>${escapeHtml(period.from)} to ${escapeHtml(period.to)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>HSN</th><th>Description</th><th class="center">UOM</th>
        <th class="num">Qty</th><th class="num">Taxable</th>
        <th class="num">CGST %</th><th class="num">CGST</th>
        <th class="num">SGST %</th><th class="num">SGST</th>
        <th class="num">Total</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows || '<tr><td colspan="10" class="center">No records.</td></tr>'}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3">Total</td>
        <td class="num">${num(totals.qty)}</td>
        <td class="num">${inr(totals.taxable_value)}</td>
        <td></td>
        <td class="num">${inr(totals.cgst_amount)}</td>
        <td></td>
        <td class="num">${inr(totals.sgst_amount)}</td>
        <td class="num">${inr(totals.total)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="note">
    ${
      isPurchase
        ? 'Summary from GST purchases only (input tax credit). Verify with your CA before filing.'
        : 'Summary from GST bills only (outward supply). Verify with your CA before filing GSTR-1.'
    }
  </div>
  <div class="footer">Generated ${escapeHtml(new Date().toLocaleString('en-IN'))}</div>
</body>
</html>`;
}
