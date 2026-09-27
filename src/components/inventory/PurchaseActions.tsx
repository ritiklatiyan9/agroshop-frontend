import { localDateInput } from '@/lib/utils';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Printer, Trash2, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { openPurchasePrint } from '@/lib/printBill';
import { useModulePermission } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { Purchase } from '@/types';

export function PurchaseActions({ purchase, onEdit, showLabels = false, onDeleted }: { purchase: Pick<Purchase, 'id' | 'document_type'>; onEdit?: (id: string) => void; showLabels?: boolean; onDeleted?: () => void }) {
  const [action, setAction] = useState<'delete' | 'receive' | null>(null);
  const navigate = useNavigate(); const client = useQueryClient(); const permission = useModulePermission('purchases');
  const order = purchase.document_type === 'purchase_order';
  const mutation = useMutation({
    mutationFn: () => action === 'delete' ? api.delete(`/purchases/${purchase.id}`) : api.put(`/purchases/${purchase.id}`, { document_type: 'purchase', purchase_date: localDateInput() }),
    onSuccess: async () => { await client.invalidateQueries(); toast.success(action === 'delete' ? 'Purchase deleted' : 'Order received and stock updated'); if (action === 'delete') onDeleted?.(); setAction(null); },
    onError: (err: { response?: { data?: { error?: string } } }) => toast.error(err.response?.data?.error || 'Unable to update purchase'),
  });
  return <span className="inline-flex items-center gap-1" onClick={e => e.stopPropagation()}>
    <Button variant="ghost" size="icon" title="Print / PDF" aria-label="Print purchase" onClick={() => openPurchasePrint(purchase.id, navigate)}><Printer className="h-4 w-4" /></Button>
    {onEdit && permission.canEdit && <Button variant={showLabels ? 'outline' : 'ghost'} size={showLabels ? 'sm' : 'icon'} title="Edit purchase" aria-label="Edit purchase" onClick={() => onEdit(purchase.id)}><Pencil className="h-4 w-4" />{showLabels && <span className="ml-1.5">Edit</span>}</Button>}
    {order && permission.canEdit && <Button variant="ghost" size="icon" title="Receive order" aria-label="Receive order" onClick={() => setAction('receive')}><PackageCheck className="h-4 w-4 text-emerald-600" /></Button>}
    {permission.canDelete && <Button variant={showLabels ? 'outline' : 'ghost'} size={showLabels ? 'sm' : 'icon'} title="Delete purchase" aria-label="Delete purchase" onClick={() => setAction('delete')}><Trash2 className="h-4 w-4 text-red-500" />{showLabels && <span className="ml-1.5 text-red-600">Delete</span>}</Button>}
    <ConfirmDialog open={action !== null} onOpenChange={open => !open && setAction(null)} title={action === 'delete' ? `Delete this ${order ? 'purchase order' : 'purchase'}?` : 'Receive this purchase order?'} description={action === 'delete' ? order ? 'This removes the purchase order.' : 'This reverses purchased stock and updates the supplier balance. Stock already sold must be restored first.' : 'This adds the ordered quantities to stock and records the supplier balance for today.'} destructive={action === 'delete'} confirmLabel={action === 'delete' ? 'Delete' : 'Receive order'} loading={mutation.isPending} onConfirm={() => mutation.mutate()} />
  </span>;
}
