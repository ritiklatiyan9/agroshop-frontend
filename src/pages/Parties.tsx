import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookOpen, Pencil, Plus, Search, Trash2, Wallet } from 'lucide-react';
import { api } from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { AddEditPartyDialog } from '@/components/parties/AddEditPartyDialog';
import { PartyPaymentDialog } from '@/components/parties/PartyPaymentDialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatCurrency } from '@/lib/utils';
import type { Party } from '@/types';

interface PartyWithStats extends Party {
  total_bills: number;
  total_amount: string;
  outstanding: string;
}

export function PartiesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'all' | 'customer' | 'supplier' | 'both'>('all');
  const [editing, setEditing] = useState<Party | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [payParty, setPayParty] = useState<Party | null>(null);
  const [deleting, setDeleting] = useState<Party | null>(null);

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
    onSuccess: () => {
      toast.success('Party deactivated');
      queryClient.invalidateQueries({ queryKey: ['parties'] });
    },
    onError: () => toast.error('Failed to deactivate'),
  });

  return (
    <div className="h-full flex flex-col p-6 gap-4 overflow-hidden">
      <div className="flex-shrink-0">
        <PageHeader
          title="Parties"
          description="Customers and suppliers — view their ledgers and record payments."
          actions={
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add party
            </Button>
          }
        />
      </div>

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardContent className="p-4 flex flex-col h-full overflow-hidden gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search name or mobile..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="customer">Customers</SelectItem>
                <SelectItem value="supplier">Suppliers</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead className="text-right">Bills</TableHead>
                  <TableHead className="text-right">Total amount</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Status</TableHead>
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
                {!isLoading && data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-slate-500">
                      No parties yet. Click "Add party" to create one.
                    </TableCell>
                  </TableRow>
                )}
                {data.map((p) => {
                  const outstanding = Number(p.outstanding);
                  return (
                    <TableRow key={p.id} className={!p.is_active ? 'opacity-60' : ''}>
                      <TableCell className="font-medium text-slate-900">{p.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            p.type === 'customer'
                              ? 'success'
                              : p.type.startsWith('supplier')
                                ? 'info'
                                : p.type === 'both'
                                  ? 'muted'
                                  : 'muted'
                          }
                        >
                          {p.type === 'customer' ? 'Customer'
                            : p.type === 'supplier' ? 'Supplier'
                            : p.type === 'supplier_trader' ? 'Supplier (Trader)'
                            : p.type === 'supplier_manufacturer' ? 'Supplier (Manufacturer)'
                            : p.type === 'both' ? 'Both'
                            : p.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{p.mobile || '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{p.gstin || '—'}</TableCell>
                      <TableCell className="text-right">{p.total_bills}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(p.total_amount)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {outstanding === 0 ? (
                          <span className="text-emerald-700">{formatCurrency(0)}</span>
                        ) : outstanding > 0 ? (
                          <span className="text-amber-700 font-medium">{formatCurrency(outstanding)}</span>
                        ) : (
                          <span className="text-blue-700">{formatCurrency(outstanding)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.is_active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="muted">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View ledger"
                            onClick={() => navigate(`/parties/${p.id}/ledger`)}
                          >
                            <BookOpen className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Record payment"
                            onClick={() => setPayParty(p)}
                          >
                            <Wallet className="h-4 w-4 text-emerald-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit"
                            onClick={() => {
                              setEditing(p);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Deactivate"
                            onClick={() => setDeleting(p)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
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

      <AddEditPartyDialog party={editing} open={dialogOpen} onOpenChange={setDialogOpen} />
      <PartyPaymentDialog
        partyId={payParty?.id ?? null}
        partyName={payParty?.name}
        open={!!payParty}
        onOpenChange={(v) => !v && setPayParty(null)}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`Deactivate ${deleting?.name ?? ''}?`}
        description="The party will be hidden from new bills and purchases but existing transactions stay intact."
        confirmLabel="Deactivate"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleting)
            deleteMutation.mutate(deleting.id, {
              onSettled: () => setDeleting(null),
            });
        }}
      />
    </div>
  );
}
