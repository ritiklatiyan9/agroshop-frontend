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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { useActionNotify } from '@/hooks/useActionNotify';
import type { Purchase } from '@/types';

interface Props {
  purchase: Purchase | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function PurchasePayDialog({ purchase, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { notify } = useActionNotify();
  const balance = purchase
    ? Math.max(0, Number(purchase.total_amount) - Number(purchase.paid_amount))
    : 0;

  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'cash' | 'upi' | 'cheque' | 'bank_transfer'>('cash');

  useEffect(() => {
    if (open && purchase) {
      setAmount(balance.toFixed(2));
      setMode(purchase.payment_mode);
    }
  }, [open, purchase?.id]);

  const mutation = useMutation({
    mutationFn: async () => {
      const paying = Number(amount) || 0;
      const newPaid = Number(purchase!.paid_amount) + paying;
      return api.put(`/purchases/${purchase!.id}`, {
        paid_amount: newPaid,
        payment_mode: mode,
      });
    },
    onSuccess: () => {
      toast.success('Payment recorded');
      notify('Purchase Payment', `₹${Number(amount).toFixed(2)} paid to ${purchase?.party?.name ?? 'supplier'}`);
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['purchase', purchase?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      onOpenChange(false);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to record payment');
    },
  });

  const paying = Number(amount) || 0;
  const valid = paying > 0 && paying <= balance + 0.001;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Supplier</span>
              <span className="font-medium">{purchase?.party?.name ?? '—'}</span>
            </div>
            {purchase?.invoice_number && (
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice #</span>
                <span className="font-mono text-xs">{purchase.invoice_number}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Total amount</span>
              <span className="font-mono">{formatCurrency(purchase?.total_amount ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Already paid</span>
              <span className="font-mono">{formatCurrency(purchase?.paid_amount ?? 0)}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-1.5 mt-1.5">
              <span>Balance due</span>
              <span className="font-mono text-amber-700">{formatCurrency(balance)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Payment mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="bank_transfer">Bank transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Amount paying now (₹)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-slate-400">
              Paying ₹{balance.toFixed(2)} marks this purchase as fully paid.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!valid || mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
