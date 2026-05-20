import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  Package,
  Package2,
  Plus,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
  Clock,
  AlertCircle,
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
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/authStore';
import { cn, formatCurrency } from '@/lib/utils';

interface DashboardData {
  today: { sales_amount: number; bill_count: number; collection_amount: number };
  this_month: { sales_amount: number; bill_count: number; collection_amount: number };
  outstanding_total: number;
  low_stock_count: number;
  expiring_soon_count: number;
  top_products_this_month: { product_id: string; name: string; qty_sold: number; revenue: number }[];
  recent_bills: {
    id: string; bill_number: string; bill_date: string;
    grand_total: string; paid_amount: string;
    payment_status: 'paid' | 'unpaid' | 'partial'; party_name: string;
  }[];
}

type Range = '7d' | '30d' | '3m' | '6m' | '1y' | 'all';
type Bucket = 'day' | 'week' | 'month';
const RANGES: { value: Range; label: string; sub: string }[] = [
  { value: '7d', label: '7D', sub: 'Last 7 days' },
  { value: '30d', label: '30D', sub: 'Last 30 days' },
  { value: '3m', label: '3M', sub: 'Last 3 months' },
  { value: '6m', label: '6M', sub: 'Last 6 months' },
  { value: '1y', label: '1Y', sub: 'Last year' },
  { value: 'all', label: 'All', sub: 'All time' },
];

interface TrendResponse {
  range: Range; bucket: Bucket;
  data: { date: string; amount: number; bill_count: number }[];
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
}

function formatTick(value: string, bucket: Bucket): string {
  if (!value) return '';
  if (bucket === 'month') {
    const [y, m] = value.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  if (bucket === 'week') return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  return d.toLocaleDateString('en-IN', { weekday: 'short' });
}

/* tiny SVG sparkline for stat cards */
function Spark({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const W = 80, H = 32;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* last dot */}
      {(() => {
        const last = values[values.length - 1];
        const x = W;
        const y = H - ((last - min) / range) * (H - 6) - 3;
        return <circle cx={x} cy={y} r="3" fill={color} />;
      })()}
    </svg>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [range, setRange] = useState<Range>('7d');

  const { data, isLoading } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: async () => (await api.get<DashboardData>('/analytics/dashboard')).data,
  });

  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: ['sales-trend', range],
    queryFn: async () => (await api.get<TrendResponse>('/analytics/sales-trend', { params: { range } })).data,
    placeholderData: keepPreviousData,
  });

  const trendStats = useMemo(() => {
    const days = trend?.data ?? [];
    if (!days.length) return null;
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

  const topMax = useMemo(() => {
    const arr = data?.top_products_this_month ?? [];
    return arr.length ? Math.max(...arr.map((p) => p.revenue), 1) : 1;
  }, [data?.top_products_this_month]);

  const sparkData = (trend?.data ?? []).map((d) => d.amount);
  const bucket: Bucket = trend?.bucket ?? 'day';
  const rangeSub = RANGES.find((r) => r.value === range)?.sub ?? '';

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="text-xl font-bold text-slate-800 mt-0.5">
              Good {greeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/bills/new')}
              className="hidden sm:flex items-center gap-1.5 h-8 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <FileText className="h-3.5 w-3.5" /> Non-GST
            </button>
            <button
              onClick={() => navigate('/bills/new-gst')}
              className="flex items-center gap-1.5 h-8 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> New Bill
            </button>
          </div>
        </div>

        {/* ── ROW 1: KPI CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          {/* Today Revenue */}
          <div
            onClick={() => navigate('/bills')}
            className="group cursor-pointer col-span-2 sm:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Today's Sales</p>
                <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-600">Live</span>
                </div>
              </div>
              <Spark values={sparkData.length ? sparkData : [0, 1, 0.5, 1.2, 0.8, 1.5, 1]} color="#10b981" />
            </div>
            {isLoading
              ? <Skeleton className="h-8 w-28 rounded-lg mt-3" />
              : <p className="text-2xl font-black text-slate-900 tabular-nums mt-3">{formatCurrency(data?.today.sales_amount ?? 0)}</p>}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] text-slate-400">{data?.today.bill_count ?? 0} bills</span>
              <span className="text-slate-200">·</span>
              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-0.5">
                <Wallet className="h-3 w-3" />{formatCurrency(data?.today.collection_amount ?? 0)}
              </span>
            </div>
          </div>

          {/* This Month */}
          <StatCard
            label="This Month"
            value={isLoading ? null : formatCurrency(data?.this_month.sales_amount ?? 0)}
            sub={`${data?.this_month.bill_count ?? 0} bills`}
            icon={TrendingUp}
            accent="sky"
            onClick={() => navigate('/reports/sales')}
          />

          {/* Outstanding */}
          <StatCard
            label="Outstanding"
            value={isLoading ? null : formatCurrency(data?.outstanding_total ?? 0)}
            sub={Number(data?.outstanding_total) > 0 ? 'Dues pending' : 'All cleared ✓'}
            icon={Clock}
            accent={Number(data?.outstanding_total) > 0 ? 'amber' : 'emerald'}
            onClick={() => navigate('/outstanding')}
          />

          {/* Alerts */}
          <StatCard
            label="Alerts"
            value={isLoading ? null : String((data?.low_stock_count ?? 0) + (data?.expiring_soon_count ?? 0))}
            sub={`${data?.low_stock_count ?? 0} low · ${data?.expiring_soon_count ?? 0} expiring`}
            icon={AlertCircle}
            accent={((data?.low_stock_count ?? 0) + (data?.expiring_soon_count ?? 0)) > 0 ? 'rose' : 'slate'}
            onClick={() => navigate('/inventory')}
          />
        </div>

        {/* ── ROW 2: CHART ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm font-bold text-slate-800">Sales Overview</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{rangeSub}</p>
              </div>
              {trendStats && (
                <div className="hidden sm:flex items-center gap-4 pl-4 border-l border-slate-100">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Revenue</p>
                    <p className="text-sm font-bold text-slate-800 tabular-nums">{formatCurrency(trendStats.total)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Avg/Bill</p>
                    <p className="text-sm font-bold text-slate-800 tabular-nums">{trendStats.bills > 0 ? formatCurrency(trendStats.avg) : '—'}</p>
                  </div>
                  {trend && trend.data.length >= 2 && (
                    <div className={cn(
                      'flex items-center gap-0.5 text-xs font-black px-2 py-0.5 rounded-lg',
                      trendStats.pct >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600',
                    )}>
                      {trendStats.pct >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      {trendStats.pct >= 0 ? '+' : ''}{trendStats.pct}%
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Range pills */}
            <div className="flex items-center gap-0.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
              {RANGES.map((r) => (
                <button key={r.value} type="button" onClick={() => setRange(r.value)}
                  className={cn(
                    'h-6 px-2.5 text-[11px] font-bold rounded-lg transition-all',
                    range === r.value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-700',
                  )}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-44 sm:h-52">
            {trendLoading && !trend ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend?.data ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                    tickFormatter={(d) => formatTick(d, bucket)} minTickGap={24} dy={6} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={40}
                    tickFormatter={(v) => v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(v)} dx={-4} />
                  <Tooltip content={<LightTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} fill="url(#g1)" dot={false}
                    activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── ROW 3: BILLS + PRODUCTS + ACTIONS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

          {/* Recent Bills */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-slate-800">Recent Bills</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Latest transactions</p>
              </div>
              <button onClick={() => navigate('/bills')}
                className="text-[11px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors">
                View all →
              </button>
            </div>

            {isLoading ? (
              <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
            ) : (data?.recent_bills ?? []).length === 0 ? (
              <Empty label="No bills yet." icon={Receipt} />
            ) : (
              <div className="divide-y divide-slate-50">
                {data?.recent_bills.slice(0, 6).map((b) => (
                  <div key={b.id} role="button" onClick={() => navigate('/bills')}
                    className="group flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded-xl cursor-pointer transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-[10px] font-black text-slate-500 uppercase group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">
                        {b.party_name.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">{b.party_name}</p>
                        <p className="text-[11px] text-slate-400">
                          <span className="font-mono">{b.bill_number}</span>
                          <span className="mx-1 text-slate-200">·</span>
                          {new Date(b.bill_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md',
                        b.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-600' :
                        b.payment_status === 'unpaid' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600')}>
                        {b.payment_status}
                      </span>
                      <span className="text-sm font-black text-slate-800 tabular-nums">{formatCurrency(b.grand_total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Top Products + Quick Actions */}
          <div className="lg:col-span-5 space-y-3">

            {/* Top Products */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-slate-800">Top Products</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Revenue this month</p>
                </div>
                <button onClick={() => navigate('/products')}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-700 transition-colors">
                  All →
                </button>
              </div>

              {isLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}</div>
              ) : (data?.top_products_this_month ?? []).length === 0 ? (
                <Empty label="No sales this month." icon={Package2} />
              ) : (
                <div className="space-y-3">
                  {data?.top_products_this_month.slice(0, 5).map((p, i) => {
                    const pct = Math.max(6, Math.round((p.revenue / topMax) * 100));
                    const bars = ['bg-emerald-400', 'bg-sky-400', 'bg-violet-400', 'bg-amber-400', 'bg-rose-400'];
                    const nums = ['text-emerald-500', 'text-sky-500', 'text-violet-500', 'text-amber-500', 'text-rose-500'];
                    return (
                      <div key={p.product_id}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn('text-[11px] font-black w-4', nums[i])}>#{i+1}</span>
                            <span className="text-xs font-semibold text-slate-600 truncate">{p.name}</span>
                          </div>
                          <span className="text-xs font-black text-slate-800 tabular-nums ml-2">{formatCurrency(p.revenue)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full', bars[i])} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-400 w-12 text-right shrink-0">{p.qty_sold.toFixed(0)} sold</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Purchases', icon: ShoppingCart, bg: 'bg-indigo-50 hover:bg-indigo-100', text: 'text-indigo-600', path: '/purchases' },
                { label: 'Parties', icon: Users, bg: 'bg-violet-50 hover:bg-violet-100', text: 'text-violet-600', path: '/parties' },
                { label: 'Inventory', icon: Package, bg: 'bg-teal-50 hover:bg-teal-100', text: 'text-teal-600', path: '/inventory' },
                { label: 'Reports', icon: TrendingUp, bg: 'bg-sky-50 hover:bg-sky-100', text: 'text-sky-600', path: '/reports/sales' },
              ].map((a) => (
                <button key={a.path} onClick={() => navigate(a.path)}
                  className={cn('flex items-center gap-2.5 p-3 rounded-2xl border border-transparent text-left transition-all hover:shadow-sm hover:-translate-y-0.5 active:scale-95', a.bg)}>
                  <div className={cn('h-7 w-7 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0', a.text)}>
                    <a.icon className="h-3.5 w-3.5" />
                  </div>
                  <span className={cn('text-xs font-bold', a.text)}>{a.label}</span>
                </button>
              ))}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

/* ── helpers ── */

function StatCard({
  label, value, sub, icon: Icon, accent = 'slate', onClick,
}: {
  label: string; value: string | null; sub: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: 'emerald' | 'sky' | 'amber' | 'rose' | 'slate';
  onClick?: () => void;
}) {
  const p = {
    emerald: { icon: 'bg-emerald-100 text-emerald-600', val: 'text-emerald-700' },
    sky:     { icon: 'bg-sky-100 text-sky-600',         val: 'text-sky-700' },
    amber:   { icon: 'bg-amber-100 text-amber-600',     val: 'text-amber-700' },
    rose:    { icon: 'bg-rose-100 text-rose-600',       val: 'text-rose-700' },
    slate:   { icon: 'bg-slate-100 text-slate-500',     val: 'text-slate-800' },
  }[accent];

  return (
    <div role={onClick ? 'button' : undefined} onClick={onClick}
      className="group bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-2.5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className={cn('h-8 w-8 rounded-xl flex items-center justify-center', p.icon)}>
        <Icon className="h-4 w-4" />
      </div>
      {value === null
        ? <Skeleton className="h-7 w-24 rounded-lg" />
        : <p className={cn('text-xl font-black tabular-nums', p.val)}>{value}</p>}
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function Empty({ label, icon: Icon }: { label: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="h-24 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 bg-slate-50">
      <Icon className="h-5 w-5 text-slate-300" />
      <span className="text-xs font-medium text-slate-400">{label}</span>
    </div>
  );
}

function LightTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number }>; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs">
      {label && <p className="text-slate-400 mb-1 text-[10px] uppercase tracking-wide font-semibold">{label}</p>}
      <p className="font-black text-slate-800 tabular-nums">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}
