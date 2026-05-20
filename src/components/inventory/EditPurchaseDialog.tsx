import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ImagePlus, Loader2, X } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useSuppliers } from '@/hooks/useParties';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { Purchase } from '@/types';

interface Props {
  purchaseId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function EditPurchaseDialog({ purchaseId, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { data: suppliers = [] } = useSuppliers();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [partyId, setPartyId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'cheque' | 'bank_transfer'>('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [billFile, setBillFile] = useState<File | null>(null);
  const [billPreview, setBillPreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['purchase', purchaseId],
    queryFn: async () => {
      const res = await api.get<Purchase & { bill_image_url?: string }>(`/purchases/${purchaseId}`);
      return res.data;
    },
    enabled: !!purchaseId && open,
  });

  // Pre-fill form when data loads
  useEffect(() => {
    if (!data) return;
    setPartyId(data.party_id);
    setPurchaseDate(data.purchase_date);
    setInvoiceNumber(data.invoice_number ?? '');
    setPaymentMode(data.payment_mode);
    setPaidAmount(data.paid_amount);
    setNotes(data.notes ?? '');
    setExistingImageUrl(data.bill_image_url ?? null);
    setBillFile(null);
    setBillPreview(null);
  }, [data]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setBillFile(null);
      setBillPreview(null);
    }
  }, [open]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBillFile(file);
    setBillPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
  }

  function clearFile() {
    setBillFile(null);
    setBillPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        party_id: partyId,
        purchase_date: purchaseDate,
        invoice_number: invoiceNumber || null,
        payment_mode: paymentMode,
        paid_amount: Number(paidAmount) || 0,
        notes: notes || null,
      };
      if (billFile) {
        const fd = new FormData();
        fd.append('data', JSON.stringify(payload));
        fd.append('bill_image', billFile);
        return api.put(`/purchases/${purchaseId}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      return api.put(`/purchases/${purchaseId}`, payload);
    },
    onSuccess: () => {
      toast.success('Purchase updated');
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['purchase', purchaseId] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      onOpenChange(false);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to update purchase');
    },
  });

  const totalAmount = Number(data?.total_amount ?? 0);
  const balance = Math.max(0, totalAmount - (Number(paidAmount) || 0));
  const valid = !!partyId && !!purchaseDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit purchase</DialogTitle>
        </DialogHeader>

        {isLoading && <Skeleton className="h-64 w-full" />}

        {data && (
          <div className="space-y-4">
            {/* Header fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Supplier *</Label>
                <Select value={partyId} onValueChange={setPartyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Invoice number</Label>
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
              </div>
            </div>

            {/* Items — read-only */}
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Items (read-only)</div>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="text-left p-2">Product</th>
                      <th className="text-right p-2 w-20">Qty</th>
                      <th className="text-right p-2 w-24">Rate</th>
                      <th className="text-right p-2 w-24">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.items ?? []).map((it) => (
                      <tr key={it.id} className="border-t border-slate-100">
                        <td className="p-2">
                          <div className="font-medium">{it.product?.name ?? '—'}</div>
                          {it.batch_number && (
                            <div className="text-xs text-slate-400">Batch {it.batch_number}</div>
                          )}
                        </td>
                        <td className="p-2 text-right font-mono">
                          {formatNumber(it.quantity, 2)} {it.product?.unit ?? ''}
                        </td>
                        <td className="p-2 text-right font-mono">{formatCurrency(it.rate)}</td>
                        <td className="p-2 text-right font-mono">{formatCurrency(it.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment + Notes + Bill Image */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Bill / Invoice image</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {billFile ? (
                    <div className="relative inline-block">
                      {billPreview ? (
                        <img
                          src={billPreview}
                          alt="Bill preview"
                          className="h-24 w-auto rounded-lg border border-slate-200 object-cover"
                        />
                      ) : (
                        <div className="flex h-16 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">
                          <ImagePlus className="h-4 w-4 text-slate-400" />
                          {billFile.name}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={clearFile}
                        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : existingImageUrl ? (
                    <div className="flex items-center gap-2">
                      <img
                        src={existingImageUrl}
                        alt="Current bill"
                        className="h-16 w-auto rounded-lg border border-slate-200 object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-blue-600 underline"
                      >
                        Replace
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-16 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-colors"
                    >
                      <ImagePlus className="h-4 w-4" />
                      Upload bill image or PDF
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm flex justify-between">
                  <span className="text-slate-500">Total amount</span>
                  <span className="font-mono font-medium">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Payment mode</Label>
                    <Select
                      value={paymentMode}
                      onValueChange={(v) => setPaymentMode(v as typeof paymentMode)}
                    >
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
                    <Label>Amount paid (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-sm font-medium pt-1">
                  <span>Balance due</span>
                  <span className="font-mono text-amber-700">{formatCurrency(balance)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!valid || mutation.isPending || isLoading}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
