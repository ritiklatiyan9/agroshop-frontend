import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useModulePermission } from '@/hooks/usePermissions';
import type { ModuleKey } from '@/types';

export function BillActions({ id, cancelled = false, module = 'bills_history', showLabels = false, onDeleted }: { id: string; cancelled?: boolean; module?: ModuleKey; showLabels?: boolean; onDeleted?: () => void }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const permissions = useModulePermission(module);
  const [confirm, setConfirm] = useState(false);
  const mutation = useMutation({
    mutationFn: () => api.delete(`/bills/${id}`),
    onSuccess: async () => { await client.invalidateQueries(); setConfirm(false); toast.success('Bill deleted'); onDeleted?.(); },
    onError: (err: { response?: { data?: { error?: string } } }) => toast.error(err.response?.data?.error || 'Unable to delete bill'),
  });
  return <span className="inline-flex items-center gap-1" onClick={e => e.stopPropagation()}>
    {!cancelled && permissions.canEdit && <Button variant={showLabels ? 'outline' : 'ghost'} size={showLabels ? 'sm' : 'icon'} title="Edit bill" aria-label="Edit bill" onClick={() => navigate(`/bills/${id}/edit`)}><Pencil className="h-4 w-4" />{showLabels && <span className="ml-1.5">Edit</span>}</Button>}
    {permissions.canDelete && <Button variant={showLabels ? 'outline' : 'ghost'} size={showLabels ? 'sm' : 'icon'} title="Delete bill" aria-label="Delete bill" onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4 text-red-600" />{showLabels && <span className="ml-1.5 text-red-600">Delete</span>}</Button>}
    <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Delete this bill?" description="This removes the bill and its payments, restores sold stock, and updates the party balance." destructive confirmLabel="Delete bill" loading={mutation.isPending} onConfirm={() => mutation.mutate()} />
  </span>;
}
