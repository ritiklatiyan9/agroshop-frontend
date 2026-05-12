import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Plus, UserX, UserCheck } from 'lucide-react';
import { api } from '@/lib/axios';
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
import { PageHeader } from '@/components/layout/PageHeader';
import type { Supervisor } from '@/types';

const createSchema = z.object({
  name: z.string().min(2, 'Name too short'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
});

type CreateInput = z.infer<typeof createSchema>;

export function SupervisorsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

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
    mutationFn: async (values: CreateInput) => api.post('/users/supervisors', values),
    onSuccess: () => {
      toast.success('Supervisor created');
      queryClient.invalidateQueries({ queryKey: ['supervisors'] });
      form.reset();
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

  return (
    <div className="h-full flex flex-col p-6 gap-4 overflow-hidden">
      <div className="flex-shrink-0">
        <PageHeader
          title="Supervisors"
          description="Create accounts for staff who help run your shop. They share your products, inventory, and parties."
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
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
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
                      {s.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(s.created_at).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
              <p className="text-xs text-slate-500">
                Share this with the supervisor — they can change it from their account later.
              </p>
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
    </div>
  );
}
