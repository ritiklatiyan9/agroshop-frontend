import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, Tags, MoreVertical } from 'lucide-react';
import { api } from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import type { Category } from '@/types';

const schema = z.object({
  name: z.string().min(1, 'Required').max(120),
  description: z.string().max(500).optional(),
});

type FormInput = z.infer<typeof schema>;

const DEFAULTS = ['Insecticide', 'Fungicide', 'Herbicide', 'Fertilizer', 'Bio-Pesticide', 'Other'];

const TAG_COLORS = [
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
];

function tagColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Category | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<{ data: Category[] }>('/categories');
      return res.data.data;
    },
  });

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '' },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ name: '', description: '' });
    setDialogOpen(true);
  }

  function openEdit(c: Category) {
    setEditing(c);
    form.reset({ name: c.name, description: c.description || '' });
    setDialogOpen(true);
    setOpenMenuId(null);
  }

  const upsertMutation = useMutation({
    mutationFn: async (values: FormInput) => {
      if (editing) return api.put(`/categories/${editing.id}`, values);
      return api.post('/categories', values);
    },
    onSuccess: () => {
      toast.success(editing ? 'Category updated' : 'Category created');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDialogOpen(false);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to save');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      toast.success('Category deleted');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeletingId(null);
    },
    onError: () => {
      toast.error('Failed to delete (it may have products linked)');
      setDeletingId(null);
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const existing = new Set(data.map((c) => c.name.toLowerCase()));
      const toCreate = DEFAULTS.filter((d) => !existing.has(d.toLowerCase()));
      for (const name of toCreate) await api.post('/categories', { name });
      return toCreate.length;
    },
    onSuccess: (created) => {
      if (created === 0) toast.info('Defaults already exist');
      else toast.success(`Created ${created} default categories`);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: () => toast.error('Failed to seed defaults'),
  });

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50">

      {/* ── Desktop header ── */}
      <div className="hidden lg:block flex-shrink-0 p-6 pb-0">
        <PageHeader
          title="Categories"
          description="Group your products for easier browsing and reports."
          actions={
            <>
              {data.length === 0 && (
                <Button variant="outline" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
                  {seedMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Seed defaults
                </Button>
              )}
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Add category
              </Button>
            </>
          }
        />
      </div>

      {/* ── Mobile header ── */}
      <div className="lg:hidden flex-shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Categories</h1>
            <p className="text-xs text-slate-500 mt-0.5">{data.length} categories</p>
          </div>
          {data.length === 0 && (
            <button
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 active:bg-slate-50 disabled:opacity-50"
            >
              {seedMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Seed defaults'}
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile category grid ── */}
      <div className="lg:hidden flex-1 overflow-y-auto px-4 pb-28">
        {isLoading && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
          </div>
        )}
        {!isLoading && data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Tags className="h-14 w-14 mb-3 opacity-20" />
            <p className="text-sm font-medium">No categories yet</p>
            <p className="text-xs mt-1 text-center px-8">Tap "Seed defaults" to add Insecticide, Fungicide, and more</p>
          </div>
        )}
        {!isLoading && data.length > 0 && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            {data.map((c) => {
              const color = tagColor(c.name);
              const isMenuOpen = openMenuId === c.id;
              return (
                <div key={c.id} className="relative rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
                  {/* Color tag dot */}
                  <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>
                    <Tags className="h-3 w-3" />
                    {c.name}
                  </div>
                  {c.description && (
                    <p className="mt-2 text-xs text-slate-400 line-clamp-2">{c.description}</p>
                  )}
                  <p className="mt-2 text-[10px] text-slate-300">
                    {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>

                  {/* 3-dot menu */}
                  <button
                    className="absolute top-3 right-3 rounded-lg p-1 text-slate-400 active:bg-slate-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(isMenuOpen ? null : c.id);
                    }}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {isMenuOpen && (
                    <div className="absolute right-2 top-9 z-20 w-36 rounded-xl border border-slate-100 bg-white py-1 shadow-lg">
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 active:bg-slate-50"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 active:bg-red-50"
                        onClick={() => { setDeletingId(c.id); setOpenMenuId(null); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── FAB (mobile) ── */}
      <button
        onClick={openCreate}
        className="lg:hidden fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3.5 shadow-xl text-white text-sm font-semibold active:scale-95 transition-transform"
      >
        <Plus className="h-5 w-5" />
        Add Category
      </button>

      {/* ── Desktop layout ── */}
      <div className="hidden lg:flex flex-col flex-1 min-h-0 p-6 pt-4 gap-4 overflow-hidden">
        <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <CardContent className="p-4 flex flex-col h-full overflow-hidden">
            <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-100">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="w-28"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && [...Array(5)].map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  ))}
                  {!isLoading && data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12">
                        <div className="flex flex-col items-center text-slate-500">
                          <Tags className="h-10 w-10 text-slate-300 mb-2" />
                          <p className="text-sm font-medium">No categories yet</p>
                          <p className="text-xs mt-1">Click "Seed defaults" to add Insecticide, Fungicide, Herbicide, Fertilizer, Bio-Pesticide, Other.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {data.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-slate-900">{c.name}</TableCell>
                      <TableCell className="text-sm text-slate-500">{c.description || '—'}</TableCell>
                      <TableCell className="text-sm text-slate-500">{new Date(c.created_at).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeletingId(c.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upsert dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit category' : 'New category'}</DialogTitle>
          </DialogHeader>
          <form id="category-form" className="space-y-4" onSubmit={form.handleSubmit((v) => upsertMutation.mutate(v))}>
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input autoFocus {...form.register('name')} placeholder="e.g. Insecticide" />
              {form.formState.errors.name && (
                <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={2} {...form.register('description')} />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={upsertMutation.isPending}>Cancel</Button>
            <Button form="category-form" type="submit" disabled={upsertMutation.isPending}>
              {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save changes' : 'Create category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete category?</DialogTitle>
            <DialogDescription>
              Products linked to this category will keep their reference set to none. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)} disabled={deleteMutation.isPending}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
