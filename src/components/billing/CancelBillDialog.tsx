import { useState } from 'react';
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
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { BillRow } from '@/types';

interface Props {
  bill: BillRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CancelBillDialog({ bill, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      if (!bill) return;
      return api.put(`/bills/${bill.id}/cancel`, { reason });
    },
    onSuccess: () => {
      toast.success('Bill cancelled — stock restored');
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['bill', bill?.id] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setReason('');
      onOpenChange(false);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to cancel bill');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel bill {bill?.bill_number}?</DialogTitle>
          <DialogDescription>
            Cancelling this bill will return the items to stock and adjust the party balance.
            This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label>Reason *</Label>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Wrong items billed, customer returned"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Keep bill
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={!reason || mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cancel bill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
