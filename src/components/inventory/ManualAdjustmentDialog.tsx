import type { StockMovement } from '@/types';
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAllProducts } from '@/hooks/useProducts';
import { useActionNotify } from '@/hooks/useActionNotify';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  preselectProductId?: string;
  movement?: StockMovement | null;
}

export function ManualAdjustmentDialog({ open, onOpenChange, preselectProductId, movement }: Props) {
  const queryClient = useQueryClient();
  const { notify } = useActionNotify();
  const { data: products = [] } = useAllProducts();
  const [productId, setProductId] = useState<string>(preselectProductId || '');
  const [type, setType] = useState<'in' | 'out'>('in');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    const [savedReason, ...savedNotes] = (movement?.notes || '').split(' — ');
    setProductId(movement?.product_id || preselectProductId || '');
    setType(movement?.movement_type === 'adjustment_out' ? 'out' : 'in');
    setQuantity(movement?.quantity || '');
    setReason(savedReason || ''); setNotes(savedNotes.join(' — '));
  }, [open, movement, preselectProductId]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        product_id: productId,
        type,
        quantity: Number(quantity),
        reason,
        notes: notes || undefined,
      };
      return movement ? api.put('/inventory/movements/' + movement.id, payload) : api.post('/inventory/adjustment', payload);
    },
    onSuccess: () => {
      toast.success(movement ? 'Stock adjustment updated' : 'Stock adjusted');
      const product = products.find((p) => p.id === productId);
      notify(movement ? 'Stock Adjustment Updated' : 'Stock Adjusted', `${product?.name ?? 'Product'} stock ${type === 'in' ? 'added' : 'removed'}: ${quantity} ${product?.unit ?? ''}`);
      queryClient.invalidateQueries();
      onOpenChange(false);
      setProductId(preselectProductId || '');
      setQuantity('');
      setReason('');
      setNotes('');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to adjust stock');
    },
  });

  const valid = productId && Number(quantity) > 0 && reason.trim().length > 0 && reason.length <= 120;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{movement ? 'Edit stock adjustment' : 'Stock adjustment'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Product</Label>
            <Select value={productId} disabled={!!movement} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {movement?.product && !products.some(p => p.id === movement.product_id) && <SelectItem value={movement.product_id}>{movement.product.name} (archived)</SelectItem>}
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    {p.brand ? ` · ${p.brand}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as 'in' | 'out')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Stock IN (Add)</SelectItem>
                  <SelectItem value="out">Stock OUT (Remove)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantity ({products.find(p => p.id === productId)?.unit || movement?.product?.unit || 'units'})</Label>
              <Input
                aria-label="Adjustment quantity"
                min="0.001"
                type="number"
                step="0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input
              aria-label="Adjustment reason"
              maxLength={120}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Stock count correction, damaged goods"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!valid || mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
