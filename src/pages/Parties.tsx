import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BookOpen, Pencil, Plus, Search, Trash2, Wallet,
  X, Users, Phone, MoreVertical, TrendingUp,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AddEditPartyDialog } from '@/components/parties/AddEditPartyDialog';
import { PartyPaymentDialog } from '@/components/parties/PartyPaymentDialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatCurrency, cn } from '@/lib/utils';
import { useActionNotify } from '@/hooks/useActionNotify';
import type { Party } from '@/types';

interface PartyWithStats extends Party {
  total_bills: number;
  total_amount: string;
  outstanding: string;
}

const TYPE_CHIPS = [
  { value: 'all', label: 'All' },
  { value: 'customer', label: 'Customers' },
  { value: 'supplier', label: 'Suppliers' },
  { value: 'both', label: 'Both' },
] as const;

function partyTypeLabel(type: string) {
  if (type === 'customer') return 'Customer';
  if (type === 'supplier') return 'Supplier';
  if (type === 'supplier_trader') return 'Supplier';
  if (type === 'supplier_manufacturer') return 'Supplier';
  if (type === 'both') return 'Both';
  return type;
}

function partyTypeVariant(type: string) {
  if (type === 'customer') return 'success';
  if (type.startsWith('supplier')) return 'info';
  return 'muted';
}

function PartyAvatar({ name, type }: { name: string; type: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  const bg = type === 'customer'
    ? 'bg-emerald-100 text-emerald-700'
    : type.startsWith('supplier')
    ? 'bg-blue-100 text-blue-700'
    : 'bg-purple-100 text-purple-700';
  return (
    <div className={cn('h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0', bg)}>
      {initials || '?'}
    </div>
  );
}

export function PartiesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useActionNotify();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'all' | 'customer' | 'supplier' | 'both'>('all');
  const [editing, setEditing] = useState<Party | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [payParty, setPayParty] = useState<Party | null>(null);
  const [deleting, setDeleting] = useState<Party | null>(null);
  const [moreMenuId, setMoreMenuId] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['parties', { type, search, with_stats: true }],
    queryFn: async () => {
      const res = await api.get<{ data: PartyWithStats[] }>('/parties', {
        params: { type, search: search || undefined, with_stats: 'true' },
      });
      return res.data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/parties/${id}`),
    onSuccess: (_, id) => {
      const party = data.find((p) => p.id === id);
      toast.success('Party deactivated');
      notify('Party Deactivated', party ? `${party.name} has been deactivated` : 'Party deactivated');
      queryClient.invalidateQueries({ queryKey: ['parties'] });
    },
    onError: () => toast.error('Failed to deactivate'),
  });

  function openAdd() { setEditing(null); setDialogOpen(true); }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50">

      {/* ── Desktop header ── */}
      <div className="hidden lg:flex flex-shrink-0 items-start justify-between gap-3 px-6 pt-6 pb-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Parties</h1>
          <p className="mt-0.5 text-sm text-slate-500">Customers and suppliers — ledgers and payments.</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-1.5 h-4 w-4" /> Add party</Button>
      </div>

      {/* ── Mobile header ── */}
      <div className="lg:hidden flex-shrink-0 flex items-center justify-between px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold text-slate-900">Parties</h1>
        <p className="text-xs text-slate-400">{data.length} {data.length === 1 ? 'party' : 'parties'}</p>
      </div>

      {/* ── Search + filters ── */}
      <div className="flex-shrink-0 px-4 lg:px-6 pb-3 space-y-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search name or mobile…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9 h-10 rounded-xl bg-white border-slate-200 text-sm shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>

        {/* Mobile: type chips */}
        <div className="lg:hidden flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TYPE_CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => setType(chip.value)}
              className={cn(
                'flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all',
                type === chip.value
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200',
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Desktop: type select */}
        <div className="hidden lg:flex gap-2">
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="customer">Customers</SelectItem>
              <SelectItem value="supplier">Suppliers</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Desktop table ── */}
      <Card className="hidden lg:flex flex-1 min-h-0 flex-col overflow-hidden mx-6 mb-6">
        <CardContent className="p-4 flex flex-col h-full overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Mobile</TableHead>
                  <TableHead>GSTIN</TableHead><TableHead className="text-right">Bills</TableHead>
                  <TableHead className="text-right">Total amount</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Status</TableHead><TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && [...Array(6)].map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))}
                {!isLoading && data.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-10 text-slate-500">No parties yet.</TableCell></TableRow>
                )}
                {data.map((p) => {
                  const outstanding = Number(p.outstanding);
                  return (
                    <TableRow key={p.id} className={!p.is_active ? 'opacity-60' : ''}>
                      <TableCell className="font-medium text-slate-900">{p.name}</TableCell>
                      <TableCell><Badge variant={partyTypeVariant(p.type) as 'success' | 'info' | 'muted'}>{partyTypeLabel(p.type)}</Badge></TableCell>
                      <TableCell>{p.mobile || '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{p.gstin || '—'}</TableCell>
                      <TableCell className="text-right">{p.total_bills}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(p.total_amount)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {outstanding === 0 ? <span className="text-emerald-700">{formatCurrency(0)}</span>
                          : outstanding > 0 ? <span className="text-amber-700 font-medium">{formatCurrency(outstanding)}</span>
                          : <span className="text-blue-700">{formatCurrency(outstanding)}</span>}
                      </TableCell>
                      <TableCell>{p.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/parties/${p.id}/ledger`)}><BookOpen className="mr-1.5 h-4 w-4" /> Ledger</Button>
                          <Button variant="ghost" size="sm" onClick={() => setPayParty(p)}><Wallet className="mr-1.5 h-4 w-4 text-emerald-600" /> Payment</Button>
                          <Button variant="ghost" size="sm" onClick={() => { setEditing(p); setDialogOpen(true); }}><Pencil className="mr-1.5 h-4 w-4" /> Edit</Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleting(p)}><Trash2 className="mr-1.5 h-4 w-4 text-red-500" /> Deactivate</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Mobile card list ── */}
      <div className="lg:hidden flex-1 min-h-0 overflow-y-auto px-4" onClick={() => setMoreMenuId(null)}>
        {isLoading && (
          <div className="space-y-2 pb-24">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
          </div>
        )}
        {!isLoading && data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Users className="h-14 w-14 mb-3 opacity-20" />
            <p className="text-sm font-medium">{search ? 'No results found' : 'No parties yet'}</p>
            <p className="text-xs mt-1">Tap + to add your first party</p>
          </div>
        )}
        <div className="space-y-2.5 pb-28">
          {(data as PartyWithStats[]).map((p) => {
            const outstanding = Number(p.outstanding);
            const hasOutstanding = outstanding !== 0;
            return (
              <div
                key={p.id}
                className={cn('bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden', !p.is_active && 'opacity-55')}
              >
                {/* Main row */}
                <div className="flex items-center gap-3 p-3 pb-2">
                  <PartyAvatar name={p.name} type={p.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900 text-sm truncate leading-tight">{p.name}</p>
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setMoreMenuId(moreMenuId === p.id ? null : p.id); }}
                          className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {moreMenuId === p.id && (
                          <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-xl border border-slate-100 py-1 w-44" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => { navigate(`/parties/${p.id}/ledger`); setMoreMenuId(null); }} className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                              <BookOpen className="h-4 w-4 text-slate-400" /> View Ledger
                            </button>
                            <button onClick={() => { setPayParty(p); setMoreMenuId(null); }} className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                              <Wallet className="h-4 w-4 text-emerald-500" /> Record Payment
                            </button>
                            <button onClick={() => { setEditing(p); setDialogOpen(true); setMoreMenuId(null); }} className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                              <Pencil className="h-4 w-4 text-slate-400" /> Edit
                            </button>
                            <div className="my-1 border-t border-slate-100" />
                            <button onClick={() => { setDeleting(p); setMoreMenuId(null); }} className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" /> Deactivate
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={partyTypeVariant(p.type) as 'success' | 'info' | 'muted'} className="text-[10px] py-0">
                        {partyTypeLabel(p.type)}
                      </Badge>
                      {p.mobile && (
                        <a
                          href={`tel:${p.mobile}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-[11px] text-slate-400"
                        >
                          <Phone className="h-3 w-3" /> {p.mobile}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats footer */}
                <div className="flex border-t border-slate-50 divide-x divide-slate-50">
                  <button
                    onClick={() => navigate(`/parties/${p.id}/ledger`)}
                    className="flex-1 flex flex-col items-center py-2 hover:bg-slate-50 transition-colors"
                  >
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Bills</p>
                    <p className="text-sm font-bold text-slate-700">{p.total_bills}</p>
                  </button>
                  <div className="flex-1 flex flex-col items-center py-2">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total</p>
                    <p className="text-sm font-bold text-slate-700 font-mono">{formatCurrency(p.total_amount)}</p>
                  </div>
                  <button
                    onClick={() => setPayParty(p)}
                    className="flex-1 flex flex-col items-center py-2 hover:bg-slate-50 transition-colors"
                  >
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide flex items-center gap-0.5">
                      <TrendingUp className="h-2.5 w-2.5" /> Due
                    </p>
                    <p className={cn('text-sm font-bold font-mono',
                      !hasOutstanding ? 'text-emerald-600'
                        : outstanding > 0 ? 'text-amber-600'
                        : 'text-blue-600',
                    )}>
                      {formatCurrency(Math.abs(outstanding))}
                    </p>
                  </button>
                </div>

                {/* Quick action bar */}
                <div className="flex border-t border-slate-50">
                  <button
                    onClick={() => navigate(`/parties/${p.id}/ledger`)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-slate-500 font-medium hover:bg-slate-50 transition-colors"
                  >
                    <BookOpen className="h-3.5 w-3.5" /> Ledger
                  </button>
                  <button
                    onClick={() => setPayParty(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-emerald-600 font-semibold hover:bg-emerald-50 transition-colors border-l border-slate-50"
                  >
                    <Wallet className="h-3.5 w-3.5" /> Payment
                  </button>
                  <button
                    onClick={() => { setEditing(p); setDialogOpen(true); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-slate-500 font-medium hover:bg-slate-50 transition-colors border-l border-slate-50"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Mobile FAB ── */}
      <button
        onClick={openAdd}
        className="lg:hidden fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full bg-emerald-600 text-white shadow-xl flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* ── Dialogs ── */}
      <AddEditPartyDialog party={editing} open={dialogOpen} onOpenChange={setDialogOpen} />
      <PartyPaymentDialog
        partyId={payParty?.id ?? null} partyName={payParty?.name}
        open={!!payParty} onOpenChange={(v) => !v && setPayParty(null)}
      />
      <ConfirmDialog
        open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}
        title={`Deactivate ${deleting?.name ?? ''}?`}
        description="The party will be hidden from new bills and purchases but existing transactions stay intact."
        confirmLabel="Deactivate" destructive loading={deleteMutation.isPending}
        onConfirm={() => { if (deleting) deleteMutation.mutate(deleting.id, { onSettled: () => setDeleting(null) }); }}
      />
    </div>
  );
}
