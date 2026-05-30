import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Archive, Store, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import type { Shop } from '@/types';

interface ShopForm {
  name: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  pin: string;
  license_no: string;
  pesticide_license_no: string;
}

const EMPTY: ShopForm = {
  name: '',
  phone: '',
  email: '',
  gstin: '',
  address: '',
  city: '',
  state: '',
  pin: '',
  license_no: '',
  pesticide_license_no: '',
};

function toForm(s: Shop): ShopForm {
  return {
    name: s.name ?? '',
    phone: s.phone ?? '',
    email: s.email ?? '',
    gstin: s.gstin ?? '',
    address: s.address ?? '',
    city: s.city ?? '',
    state: s.state ?? '',
    pin: s.pin ?? '',
    license_no: s.license_no ?? '',
    pesticide_license_no: s.pesticide_license_no ?? '',
  };
}

export function ShopManagementPage() {
  const queryClient = useQueryClient();
  const setShops = useAuthStore((s) => s.setShops);
  const currentShopId = useAuthStore((s) => s.currentShopId);

  const [editing, setEditing] = useState<Shop | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ShopForm>(EMPTY);
  const [archiving, setArchiving] = useState<Shop | null>(null);

  const { data: shops = [], isLoading } = useQuery({
    queryKey: ['admin-shops'],
    queryFn: async () => {
      const res = await api.get<{ data: Shop[] }>('/shops');
      return res.data.data;
    },
  });

  // Keep the sidebar switcher in sync with the active shops here.
  useEffect(() => {
    setShops(shops.filter((s) => s.is_active));
  }, [shops, setShops]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) return api.put(`/shops/${editing.id}`, form);
      return api.post('/shops', form);
    },
    onSuccess: () => {
      toast.success(editing ? 'Shop updated' : 'Shop created');
      queryClient.invalidateQueries({ queryKey: ['admin-shops'] });
      setDialogOpen(false);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to save shop');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/shops/${id}`),
    onSuccess: () => {
      toast.success('Shop archived');
      queryClient.invalidateQueries({ queryKey: ['admin-shops'] });
      setArchiving(null);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to archive shop');
    },
  });

  function openAdd() {
    setEditing(null);
    setForm(EMPTY);
    setDialogOpen(true);
  }
  function openEdit(s: Shop) {
    setEditing(s);
    setForm(toForm(s));
    setDialogOpen(true);
  }
  function update<K extends keyof ShopForm>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-6 gap-4 overflow-hidden">
      <div className="flex-shrink-0">
        <PageHeader
          title="Shop Management"
          description="Create and manage your shops. Each shop keeps its own products, parties, bills, and settings. Switch shops from the menu at the top of the sidebar."
          actions={
            <Button onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" /> Add shop
            </Button>
          }
        />
      </div>

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardContent className="p-3 md:p-4 flex flex-col h-full overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block flex-1 min-h-0 overflow-auto rounded-lg border border-slate-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  [...Array(4)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {!isLoading && shops.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                      No shops yet. Click "Add shop" to create one.
                    </TableCell>
                  </TableRow>
                )}
                {shops.map((s) => (
                  <TableRow key={s.id} className={!s.is_active ? 'opacity-60' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium text-slate-900">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                          <Store className="h-4 w-4 text-emerald-700" />
                        </div>
                        {s.name}
                        {s.id === currentShopId && (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Current
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{s.phone || '—'}</TableCell>
                    <TableCell>{s.gstin || '—'}</TableCell>
                    <TableCell>{s.city || '—'}</TableCell>
                    <TableCell>
                      {s.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="muted">Archived</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                          <Pencil className="mr-1.5 h-4 w-4" /> Edit
                        </Button>
                        {s.is_active ? (
                          <Button variant="ghost" size="sm" onClick={() => setArchiving(s)}>
                            <Archive className="mr-1.5 h-4 w-4 text-red-500" /> Archive
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              saveMutationReactivate(api, queryClient, s.id).catch(() =>
                                toast.error('Failed to restore'),
                              )
                            }
                          >
                            Restore
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden flex-1 min-h-0 overflow-y-auto space-y-2.5">
            {isLoading &&
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
            {!isLoading && shops.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Store className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">No shops yet</p>
                <p className="text-xs mt-1">Tap "Add shop" to create one.</p>
              </div>
            )}
            {shops.map((s) => (
              <div
                key={s.id}
                className={cn(
                  'rounded-2xl border border-slate-100 bg-white p-3 shadow-sm',
                  !s.is_active && 'opacity-60',
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                    <Store className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-slate-900">{s.name}</p>
                      {s.id === currentShopId && (
                        <Badge variant="success" className="gap-1 flex-shrink-0">
                          <CheckCircle2 className="h-3 w-3" /> Current
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {[s.phone, s.city, s.gstin].filter(Boolean).join(' · ') || 'No details yet'}
                    </p>
                    <div className="mt-1">
                      {s.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="muted">Archived</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 flex gap-2 border-t border-slate-100 pt-2.5">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(s)}>
                    <Pencil className="mr-1.5 h-4 w-4" /> Edit
                  </Button>
                  {s.is_active ? (
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setArchiving(s)}>
                      <Archive className="mr-1.5 h-4 w-4 text-red-500" /> Archive
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        saveMutationReactivate(api, queryClient, s.id).catch(() =>
                          toast.error('Failed to restore'),
                        )
                      }
                    >
                      Restore
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create / edit shop */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit shop' : 'Add shop'}</DialogTitle>
          </DialogHeader>
          <form
            id="shop-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.name.trim()) {
                toast.error('Shop name is required');
                return;
              }
              saveMutation.mutate();
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            <Field label="Shop name *" className="md:col-span-2">
              <Input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Najibabad Branch" />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
            </Field>
            <Field label="GSTIN">
              <Input value={form.gstin} onChange={(e) => update('gstin', e.target.value)} placeholder="09AAAAA0000A1Z5" />
            </Field>
            <Field label="Drug license #">
              <Input value={form.license_no} onChange={(e) => update('license_no', e.target.value)} />
            </Field>
            <Field label="Pesticide license #" className="md:col-span-2">
              <Input
                value={form.pesticide_license_no}
                onChange={(e) => update('pesticide_license_no', e.target.value)}
              />
            </Field>
            <Field label="Address" className="md:col-span-2">
              <Textarea rows={2} value={form.address} onChange={(e) => update('address', e.target.value)} />
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={(e) => update('city', e.target.value)} />
            </Field>
            <Field label="State">
              <Input value={form.state} onChange={(e) => update('state', e.target.value)} />
            </Field>
            <Field label="PIN">
              <Input value={form.pin} onChange={(e) => update('pin', e.target.value)} />
            </Field>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saveMutation.isPending}>
              Cancel
            </Button>
            <Button form="shop-form" type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save changes' : 'Create shop'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(v) => !v && setArchiving(null)}
        title={`Archive "${archiving?.name ?? ''}"?`}
        description="The shop will be hidden from the switcher and its data kept safe. You can restore it later. Your last active shop cannot be archived."
        confirmLabel="Archive"
        destructive
        loading={archiveMutation.isPending}
        onConfirm={() => archiving && archiveMutation.mutate(archiving.id)}
      />
    </div>
  );
}

// Restore = update is_active back to true.
async function saveMutationReactivate(
  apiClient: typeof api,
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
) {
  await apiClient.put(`/shops/${id}`, { is_active: true });
  toast.success('Shop restored');
  queryClient.invalidateQueries({ queryKey: ['admin-shops'] });
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={'space-y-1.5 ' + (className ?? '')}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
