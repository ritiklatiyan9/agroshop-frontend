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
import { formatCurrency } from '@/lib/utils';
import type { BillRow, LedgerPaymentMode } from '@/types';

interface Props {
  bill: BillRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function RecordPaymentDialog({ bill, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const due = bill ? Number(bill.grand_total) - Number(bill.paid_amount) : 0;

  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<LedgerPaymentMode>('cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      if (!bill) return;
      return api.post(`/bills/${bill.id}/record-payment`, {
        amount: Number(amount),
        payment_mode: mode,
        payment_date: date,
        reference_number: reference || undefined,
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Payment recorded');
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['bill', bill?.id] });
      queryClient.invalidateQueries({ queryKey: ['outstanding'] });
      setAmount('');
      setReference('');
      setNotes('');
      onOpenChange(false);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to record payment');
    },
  });

  const amt = Number(amount) || 0;
  const valid = bill && amt > 0 && amt <= due + 0.01;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment {bill ? `· ${bill.bill_number}` : ''}</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Bill total</span>
            <span className="font-mono">{formatCurrency(bill?.grand_total ?? 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Already paid</span>
            <span className="font-mono">{formatCurrency(bill?.paid_amount ?? 0)}</span>
          </div>
          <div className="flex justify-between font-medium pt-1 border-t mt-1">
            <span>Due</span>
            <span className="font-mono">{formatCurrency(due)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Amount *</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setAmount(String(due))}
            >
              Pay full ({formatCurrency(due)})
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as LedgerPaymentMode)}>
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
            <Label>Reference #</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
