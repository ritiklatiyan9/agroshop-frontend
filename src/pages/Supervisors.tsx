import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Plus, UserX, UserCheck, Store, Trash2 } from 'lucide-react';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import type { Supervisor } from '@/types';

const createSchema = z.object({
  name: z.string().min(2, 'Name too short'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
});

type CreateInput = z.infer<typeof createSchema>;

export function SupervisorsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createShopIds, setCreateShopIds] = useState<string[]>([]);
  const [shopsFor, setShopsFor] = useState<Supervisor | null>(null);
  const [deleting, setDeleting] = useState<Supervisor | null>(null);
  const queryClient = useQueryClient();
  const shops = useAuthStore((s) => s.shops);
  const shopName = (id: string) => shops.find((s) => s.id === id)?.name ?? '—';

  const { data, isLoading } = useQuery({
    queryKey: ['supervisors'],
    queryFn: async () => {
      const res = await api.get<{ data: Supervisor[] }>('/users/supervisors');
      return res.data.data;
    },
  });

  const form = useForm<CreateInput>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const createMutation = useMutation({
    mutationFn: async (values: CreateInput) =>
      api.post('/users/supervisors', { ...values, shop_ids: createShopIds }),
    onSuccess: () => {
      toast.success('Supervisor created');
      queryClient.invalidateQueries({ queryKey: ['supervisors'] });
      form.reset();
      setCreateShopIds([]);
      setDialogOpen(false);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to create supervisor');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (s: Supervisor) =>
      api.put(`/users/supervisors/${s.id}`, { is_active: !s.is_active }),
    onSuccess: (_data, s) => {
      toast.success(s.is_active ? 'Supervisor deactivated' : 'Supervisor activated');
      queryClient.invalidateQueries({ queryKey: ['supervisors'] });
    },
    onError: () => toast.error('Failed to update supervisor'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/users/supervisors/${id}`),
    onSuccess: () => {
      toast.success('Supervisor deleted');
      queryClient.invalidateQueries({ queryKey: ['supervisors'] });
      setDeleting(null);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to delete supervisor');
    },
  });

  const shopsMutation = useMutation({
    mutationFn: async ({ id, shop_ids }: { id: string; shop_ids: string[] }) =>
      api.put(`/users/supervisors/${id}`, { shop_ids }),
    onSuccess: () => {
      toast.success('Shop access updated');
      queryClient.invalidateQueries({ queryKey: ['supervisors'] });
      setShopsFor(null);
    },
    onError: () => toast.error('Failed to update shop access'),
  });

  return (
    <div className="h-full flex flex-col p-6 gap-4 overflow-hidden">
      <div className="flex-shrink-0">
        <PageHeader
          title="Supervisors"
          description="Create staff accounts and choose which shops each can access. Permissions are set per shop on the Permissions page."
          actions={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add supervisor
            </Button>
          }
        />
      </div>

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardContent className="p-4 flex flex-col h-full overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Shops</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {data && data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                      No supervisors yet. Click "Add supervisor" to create one.
                    </TableCell>
                  </TableRow>
                )}
                {data?.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-slate-900">{s.name}</TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => setShopsFor(s)}
                        className="flex flex-wrap gap-1 max-w-[260px] text-left"
                      >
                        {s.shop_ids.length === 0 ? (
                          <span className="text-xs text-amber-600">No shops — click to assign</span>
                        ) : (
                          s.shop_ids.map((id) => (
                            <Badge key={id} variant="muted" className="gap-1">
                              <Store className="h-3 w-3" /> {shopName(id)}
                            </Badge>
                          ))
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      {s.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="muted">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setShopsFor(s)}>
                          <Store className="mr-1.5 h-4 w-4 text-slate-500" /> Shops
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleMutation.mutate(s)}
                          disabled={toggleMutation.isPending}
                        >
                          {s.is_active ? (
                            <>
                              <UserX className="mr-1.5 h-4 w-4 text-red-500" /> Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="mr-1.5 h-4 w-4 text-emerald-600" /> Activate
                            </>
                          )}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleting(s)}>
                          <Trash2 className="mr-1.5 h-4 w-4 text-red-500" /> Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create supervisor */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add supervisor</DialogTitle>
          </DialogHeader>
          <form
            id="create-supervisor-form"
            onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" autoComplete="off" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Temporary password</Label>
              <Input type="text" autoComplete="off" {...form.register('password')} />
              {form.formState.errors.password && (
                <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Shop access</Label>
              <ShopChecklist
                shopIds={createShopIds}
                onChange={setCreateShopIds}
                shops={shops.filter((s) => s.is_active)}
              />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button form="create-supervisor-form" type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create supervisor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit shop access */}
      <EditShopsDialog
        supervisor={shopsFor}
        shops={shops}
        onClose={() => setShopsFor(null)}
        onSave={(ids) => shopsFor && shopsMutation.mutate({ id: shopsFor.id, shop_ids: ids })}
        saving={shopsMutation.isPending}
      />

      {/* Delete supervisor */}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`Delete "${deleting?.name ?? ''}"?`}
        description="This permanently removes the supervisor account along with their shop access and permissions. This cannot be undone. To keep their history, use Deactivate instead."
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  );
}

function ShopChecklist({
  shopIds,
  onChange,
  shops,
}: {
  shopIds: string[];
  onChange: (ids: string[]) => void;
  shops: { id: string; name: string }[];
}) {
  function toggle(id: string) {
    onChange(shopIds.includes(id) ? shopIds.filter((x) => x !== id) : [...shopIds, id]);
  }
  if (shops.length === 0) {
    return <p className="text-xs text-slate-500">No active shops. Create a shop first.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto rounded-lg border border-slate-200 p-2">
      {shops.map((s) => {
        const checked = shopIds.includes(s.id);
        return (
          <label
            key={s.id}
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer',
              checked ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-slate-50',
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(s.id)}
              className="h-4 w-4 accent-emerald-600"
            />
            <Store className="h-4 w-4 text-slate-400" />
            <span className="truncate">{s.name}</span>
          </label>
        );
      })}
    </div>
  );
}

function EditShopsDialog({
  supervisor,
  shops,
  onClose,
  onSave,
  saving,
}: {
  supervisor: Supervisor | null;
  shops: { id: string; name: string; is_active: boolean }[];
  onClose: () => void;
  onSave: (ids: string[]) => void;
  saving: boolean;
}) {
  const [ids, setIds] = useState<string[]>([]);
  // sync local state when a supervisor is opened
  const key = supervisor?.id ?? '';
  useStateSync(key, () => setIds(supervisor?.shop_ids ?? []));

  return (
    <Dialog open={!!supervisor} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Shop access — {supervisor?.name}</DialogTitle>
        </DialogHeader>
        <ShopChecklist shopIds={ids} onChange={setIds} shops={shops.filter((s) => s.is_active)} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => onSave(ids)} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Runs `fn` whenever `key` changes (used to seed dialog state on open). */
function useStateSync(key: string, fn: () => void) {
  const [seen, setSeen] = useState<string | null>(null);
  if (key && key !== seen) {
    setSeen(key);
    fn();
  }
}
