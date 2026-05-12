import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  IndianRupee,
  Package2,
  Plus,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/authStore';
import { cn, formatCurrency } from '@/lib/utils';

interface Dashboard {
  today: { sales_amount: number; bill_count: number; collection_amount: number };
  this_month: { sales_amount: number; bill_count: number; collection_amount: number };
  outstanding_total: number;
  low_stock_count: number;
  expiring_soon_count: number;
  sales_last_7_days: { date: string; amount: number; bill_count: number }[];
  top_products_this_month: { product_id: string; name: string; qty_sold: number; revenue: number }[];
  recent_bills: {
    id: string;
    bill_number: string;
    bill_date: string;
    grand_total: string;
    paid_amount: string;
    payment_status: 'paid' | 'unpaid' | 'partial';
    party_name: string;
  }[];
}

const ACCENT = '#10b981';

type Range = '7d' | '30d' | '3m' | '6m' | '1y' | 'all';
type Bucket = 'day' | 'week' | 'month';

const RANGES: { value: Range; label: string; sub: string }[] = [
  { value: '7d', label: '7d', sub: 'Last 7 days' },
  { value: '30d', label: '30d', sub: 'Last 30 days' },
  { value: '3m', label: '3m', sub: 'Last 3 months' },
  { value: '6m', label: '6m', sub: 'Last 6 months' },
  { value: '1y', label: '1y', sub: 'Last 12 months' },
  { value: 'all', label: 'All', sub: 'All time' },
];

interface TrendResponse {
  range: Range;
  bucket: Bucket;
  from: string;
  data: { date: string; amount: number; bill_count: number }[];
}

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [range, setRange] = useState<Range>('7d');

  const { data, isLoading } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: async () => {
      const res = await api.get<Dashboard>('/analytics/dashboard');
      return res.data;
    },
  });

  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: ['sales-trend', range],
    queryFn: async () => {
      const res = await api.get<TrendResponse>('/analytics/sales-trend', { params: { range } });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const trendStats = useMemo(() => {
    const days = trend?.data ?? [];
    if (days.length < 1) return null;
    const total = days.reduce((s, d) => s + d.amount, 0);
    const bills = days.reduce((s, d) => s + d.bill_count, 0);
    const avg = bills > 0 ? total / bills : 0;
    let pct = 0;
    if (days.length >= 2) {
      const mid = Math.floor(days.length / 2);
      const a = days.slice(0, mid).reduce((s, d) => s + d.amount, 0);
      const b = days.slice(mid).reduce((s, d) => s + d.amount, 0);
      pct = a === 0 ? (b > 0 ? 100 : 0) : Number((((b - a) / a) * 100).toFixed(0));
    }
    return { total, bills, pct, avg };
  }, [trend?.data]);

  const rangeSub = RANGES.find((r) => r.value === range)?.sub ?? '';
  const bucket: Bucket = trend?.bucket ?? 'day';

  const topProductsMax = useMemo(() => {
    const arr = data?.top_products_this_month ?? [];
    return arr.length ? Math.max(...arr.map((p) => p.revenue), 1) : 1;
  }, [data?.top_products_this_month]);

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-[1500px] mx-auto p-6 space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.14em]">
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
            <h1 className="mt-0.5 text-xl font-bold text-slate-900">
              {greeting()}
              {user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/bills/new')}>
              <Plus className="mr-1.5 h-4 w-4" /> Quick bill
            </Button>
            <Button size="sm" onClick={() => navigate('/bills/new-gst')}>
              <Plus className="mr-1.5 h-4 w-4" /> New GST bill
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Card className="lg:col-span-4 bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 text-black border-0 overflow-hidden relative">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
            <CardContent className="relative p-5 flex flex-col justify-between min-h-[180px] h-full">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-semibold">
                  Today's Sales
                </span>
                <div className="h-8 w-8 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
                  <IndianRupee className="h-4 w-4 text-emerald-300" />
                </div>
              </div>

              <div>
                <div className="text-3xl font-bold tabular-nums tracking-tight">
                  {isLoading ? '…' : formatCurrency(data?.today.sales_amount ?? 0)}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-300 mt-1.5">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {data?.today.bill_count ?? 0} bills
                  </span>
                  <span className="h-3 w-px bg-slate-700" />
                  <span>
                    Collected{' '}
                    <span className="font-semibold text-white">
                      {formatCurrency(data?.today.collection_amount ?? 0)}
                    </span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/bills')}
                className="flex items-center justify-between text-[11px] text-slate-300 hover:text-white transition-colors pt-2 border-t border-white/10"
              >
                <span>View all bills</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-8">
            <CardContent className="p-5 h-full flex flex-col">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Sales activity</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">{rangeSub}</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-end">
                  <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5">
                    {RANGES.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setRange(r.value)}
                        className={cn(
                          'h-6 px-2 text-[11px] font-semibold rounded transition-colors',
                          range === r.value
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-900',
                        )}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <Stat
                      label="Revenue"
                      value={trendStats ? formatCurrency(trendStats.total) : '—'}
                    />
                    <Stat
                      label="Bills"
                      value={trendStats ? String(trendStats.bills) : '—'}
                    />
                    <Stat
                      label="Avg / bill"
                      value={
                        trendStats && trendStats.bills > 0
                          ? formatCurrency(trendStats.avg)
                          : '—'
                      }
                    />
                    {trendStats && trend && trend.data.length >= 2 && (
                      <TrendBadge pct={trendStats.pct} />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-[160px]" style={{ height: 180 }}>
                {trendLoading && !trend ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={trend?.data ?? []}
                      margin={{ top: 5, right: 8, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="dashAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={ACCENT} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(d) => formatTick(d, bucket)}
                        minTickGap={20}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={false}
                        width={44}
                        tickFormatter={(v) =>
                          v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                        }
                      />
                      <Tooltip content={<CurrencyTooltip />} cursor={{ fill: '#f8fafc' }} />
                      <Area
                        type="monotone"
                        dataKey="amount"
                        stroke={ACCENT}
                        strokeWidth={2}
                        fill="url(#dashAreaGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Metric
            label="This month"
            value={isLoading ? '…' : formatCurrency(data?.this_month.sales_amount ?? 0)}
            sub={`${data?.this_month.bill_count ?? 0} bills · ${formatCurrency(data?.this_month.collection_amount ?? 0)} collected`}
            icon={TrendingUp}
            onClick={() => navigate('/reports/sales')}
          />
          <Metric
            label="Outstanding"
            value={isLoading ? '…' : formatCurrency(data?.outstanding_total ?? 0)}
            sub={Number(data?.outstanding_total) > 0 ? 'Credit bills unpaid' : 'No dues 🎉'}
            icon={Wallet}
            valueClassName={
              Number(data?.outstanding_total) > 0 ? 'text-amber-700' : 'text-slate-900'
            }
            onClick={() => navigate('/outstanding')}
          />
          <Metric
            label="Low stock"
            value={isLoading ? '…' : String(data?.low_stock_count ?? 0)}
            sub="Below min level"
            icon={Package2}
            valueClassName={Number(data?.low_stock_count) > 0 ? 'text-rose-700' : 'text-slate-900'}
            onClick={() => navigate('/reports/stock')}
          />
          <Metric
            label="Expiring soon"
            value={isLoading ? '…' : String(data?.expiring_soon_count ?? 0)}
            sub="Within 60 days"
            icon={Package2}
            valueClassName={
              Number(data?.expiring_soon_count) > 0 ? 'text-amber-700' : 'text-slate-900'
            }
            onClick={() => navigate('/reports/stock')}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Card className="lg:col-span-7">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Recent bills</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">Latest sales</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/bills')}
                  className="text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1"
                >
                  See all <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              {isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : data?.recent_bills.length === 0 ? (
                <EmptyBlock label="No bills yet. Create your first one →" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data?.recent_bills.slice(0, 5).map((b) => (
                    <li
                      key={b.id}
                      role="button"
                      onClick={() => navigate('/bills')}
                      className="flex items-center justify-between gap-3 py-2.5 cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded-md transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 text-[11px] font-semibold uppercase">
                          {b.party_name.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">
                            {b.party_name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {b.bill_number} ·{' '}
                            {new Date(b.bill_date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
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
                        <span className="text-sm font-semibold tabular-nums text-slate-900 w-20 text-right">
                          {formatCurrency(b.grand_total)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-5">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Top products</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">By revenue, this month</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/products')}
                  className="text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1"
                >
                  All <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              {isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (data?.top_products_this_month ?? []).length === 0 ? (
                <EmptyBlock label="No sales this month yet." />
              ) : (
                <ul className="space-y-3">
                  {data?.top_products_this_month.slice(0, 5).map((p, i) => {
                    const pct = Math.max(4, Math.round((p.revenue / topProductsMax) * 100));
                    return (
                      <li key={p.product_id}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-5 w-5 rounded-md bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                              {i + 1}
                            </div>
                            <span className="text-sm font-medium text-slate-900 truncate">
                              {p.name}
                            </span>
                          </div>
                          <span className="text-sm tabular-nums font-semibold text-slate-900 shrink-0">
                            {formatCurrency(p.revenue)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pl-7">
                          <div className="h-1 bg-slate-100 rounded-full flex-1 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 tabular-nums w-12 text-right">
                            {p.qty_sold.toFixed(0)} sold
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function formatTick(value: string, bucket: Bucket): string {
  if (!value) return '';
  if (bucket === 'month') {
    const [y, m] = value.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  if (bucket === 'week') {
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }
  return d.toLocaleDateString('en-IN', { weekday: 'short' });
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function Metric({
  label,
  value,
  sub,
  icon: Icon,
  valueClassName,
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  valueClassName?: string;
  onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'transition-shadow',
        onClick && 'cursor-pointer hover:shadow-md hover:border-slate-300',
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 font-semibold">
              {label}
            </div>
            <div
              className={cn(
                'mt-1.5 text-xl font-bold tabular-nums tracking-tight truncate',
                valueClassName ?? 'text-slate-900',
              )}
            >
              {value}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 truncate">{sub}</div>
          </div>
          <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 ring-1 ring-slate-100">
            <Icon className="h-4 w-4 text-slate-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
        {label}
      </div>
      <div className="text-sm font-bold tabular-nums text-slate-900 mt-0.5">{value}</div>
    </div>
  );
}

function TrendBadge({ pct }: { pct: number }) {
  const positive = pct >= 0;
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold',
        positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
      )}
    >
      {positive ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {positive ? '+' : ''}
      {pct}%
    </div>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <div className="h-40 flex items-center justify-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
      {label}
    </div>
  );
}

function CurrencyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm text-xs">
      {label && <div className="font-semibold text-slate-700 mb-1">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-slate-500">{p.name}:</span>
          <span className="tabular-nums font-semibold text-slate-900">
            {formatCurrency(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
