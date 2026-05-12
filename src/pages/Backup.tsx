import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Download,
  Database,
  FileJson,
  Loader2,
  ShieldCheck,
  Info,
  Archive,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';

interface SummaryResponse {
  counts: {
    categories: number;
    parties: number;
    products: number;
    stock_movements: number;
    purchases: number;
    bills: number;
    payments: number;
    supervisors: number;
  };
  last_export: string | null;
}

const KEY_LABELS: Record<string, string> = {
  categories: 'Categories',
  parties: 'Parties',
  products: 'Products',
  stock_movements: 'Stock movements',
  purchases: 'Purchases',
  bills: 'Bills',
  payments: 'Payments',
  supervisors: 'Supervisors',
};

export function BackupPage() {
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['backup-summary'],
    queryFn: async () => {
      const res = await api.get<SummaryResponse>('/backup/summary');
      return res.data;
    },
  });

  async function handleExport() {
    setExporting(true);
    try {
      const res = await api.get('/backup/export', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const stamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, 16);
      link.href = url;
      link.download = `agroshop-backup-${stamp}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded');
    } catch {
      toast.error('Failed to export backup');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50/60 p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <PageHeader
          title="Backup"
          description="Download a full JSON snapshot of your shop data — keep it somewhere safe."
        />

        <Card className="bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/30 border-emerald-100/60">
          <CardContent className="p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <Archive className="h-6 w-6 text-emerald-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">Full data export</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Generates a single JSON file containing every product, party, bill,
                  payment, stock movement, purchase, and your shop profile. The file is
                  human-readable and can be restored manually if needed.
                </p>
              </div>
            </div>

            <Button
              size="lg"
              onClick={handleExport}
              disabled={exporting}
              className="w-full sm:w-auto"
            >
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export full backup (JSON)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-lg bg-sky-50 flex items-center justify-center">
                <Database className="h-4 w-4 text-sky-700" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">What's included</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Current record counts for your shop
                </p>
              </div>
            </div>

            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(KEY_LABELS).map(([k, label]) => {
                  const count = data?.counts[k as keyof SummaryResponse['counts']] ?? 0;
                  return (
                    <div
                      key={k}
                      className="rounded-lg border border-slate-100 bg-slate-50/50 p-3"
                    >
                      <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                        {label}
                      </div>
                      <div className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                <Info className="h-4 w-4 text-amber-700" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Good to know</h3>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <FileJson className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                The download is a plain <code className="font-mono">.json</code> file you
                can open in any text editor.
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                Password hashes are <strong>not</strong> included for security — you'll
                need to reset passwords manually after a restore.
              </li>
              <li className="flex items-start gap-2">
                <Database className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                Bills, items, payments, and stock movements are all included so reports
                stay accurate after a restore.
              </li>
            </ul>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
              <Badge variant="muted">Coming soon</Badge>
              Backup import / restore — currently exports are one-way.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
