import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { useModulePermission } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { BillActions } from '@/components/billing/BillActions';
import { PurchaseActions } from './PurchaseActions';
import type { StockMovement } from '@/types';

export function StockMovementActions({ movement, onEdit, onEditPurchase }: { movement: StockMovement; onEdit: (movement: StockMovement) => void; onEditPurchase: (id: string) => void }) {
  const permission = useModulePermission('inventory');
  const client = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const mutation = useMutation({
    mutationFn: () => api.delete('/inventory/movements/' + movement.id),
    onSuccess: async () => { await client.invalidateQueries(); setConfirm(false); toast.success('Stock adjustment deleted'); },
    onError: (err: { response?: { data?: { error?: string } } }) => toast.error(err.response?.data?.error || 'Unable to delete adjustment'),
  });
  if (movement.reference_id && movement.reference_exists !== false) {
    if (movement.reference_type === 'bill') return <BillActions showLabels id={movement.reference_id} cancelled={movement.reference_cancelled} />;
    if (movement.reference_type === 'purchase') return <PurchaseActions showLabels purchase={{ id: movement.reference_id, document_type: 'purchase' }} onEdit={onEditPurchase} />;
  }
  if (movement.reference_type !== 'adjustment' || !['adjustment_in', 'adjustment_out'].includes(movement.movement_type)) return null;
  return <span className="inline-flex items-center gap-1" onClick={e => e.stopPropagation()}>
    {permission.canEdit && <Button variant="outline" size="sm" aria-label="Edit stock adjustment" onClick={() => onEdit(movement)}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button>}
    {permission.canDelete && <Button variant="outline" size="sm" aria-label="Delete stock adjustment" onClick={() => setConfirm(true)}><Trash2 className="mr-1.5 h-4 w-4 text-red-600" /><span className="text-red-600">Delete</span></Button>}
    <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Delete this stock adjustment?" description="This reverses the adjustment quantity and recalculates current stock. It cannot leave stock below zero." destructive confirmLabel="Delete adjustment" loading={mutation.isPending} onConfirm={() => mutation.mutate()} />
  </span>;
}
