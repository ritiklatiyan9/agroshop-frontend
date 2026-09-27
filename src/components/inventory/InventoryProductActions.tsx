import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { useModulePermission } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function InventoryProductActions({ id, name, onEdit }: { id: string; name: string; onEdit: (id: string) => void }) {
  const permission = useModulePermission('inventory');
  const client = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const mutation = useMutation({
    mutationFn: () => api.delete('/products/' + id),
    onSuccess: async () => { await client.invalidateQueries(); setConfirm(false); toast.success('Item deleted from active inventory'); },
    onError: (err: { response?: { data?: { error?: string } } }) => toast.error(err.response?.data?.error || 'Unable to delete inventory item'),
  });
  return <span className="inline-flex items-center gap-1" onClick={e => e.stopPropagation()}>
    {permission.canEdit && <Button variant="outline" size="sm" aria-label="Edit inventory item" onClick={() => onEdit(id)}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button>}
    {permission.canDelete && <Button variant="outline" size="sm" aria-label="Delete inventory item" onClick={() => setConfirm(true)}><Trash2 className="mr-1.5 h-4 w-4 text-red-600" /><span className="text-red-600">Delete</span></Button>}
    <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={'Delete ' + name + '?'} description="This removes the item from active inventory and new transactions. Existing bills, purchases and stock history are retained." destructive confirmLabel="Delete item" loading={mutation.isPending} onConfirm={() => mutation.mutate()} />
  </span>;
}
