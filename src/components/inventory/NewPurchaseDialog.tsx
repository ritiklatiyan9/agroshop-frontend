import { useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react';
import { useActionNotify } from '@/hooks/useActionNotify';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSuppliers } from '@/hooks/useParties';
import { useAllProducts } from '@/hooks/useProducts';
import { formatCurrency } from '@/lib/utils';

interface LineItem {
  id: string;
  product_id: string;
  quantity: string;
  rate: string;
  gst_rate: string;
  batch_number: string;
  expiry_date: string;
}

const GST_RATES = ['0', '5', '12', '18', '28'] as const;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function newRow(): LineItem {
  return {
    id: Math.random().toString(36).slice(2),
    product_id: '',
    quantity: '',
    rate: '',
    gst_rate: '0',
    batch_number: '',
    expiry_date: '',
  };
}

export function NewPurchaseDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { notify } = useActionNotify();
  const { data: suppliers = [] } = useSuppliers();
  const { data: products = [] } = useAllProducts();

  const [partyId, setPartyId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [gstEnabled, setGstEnabled] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'cheque' | 'bank_transfer'>('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([newRow()]);
  const [billFile, setBillFile] = useState<File | null>(null);
  const [billPreview, setBillPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totals = useMemo(() => {
    let subtotal = 0;
    let gst = 0;
    for (const it of items) {
      const q = Number(it.quantity) || 0;
      const r = Number(it.rate) || 0;
      const taxable = q * r;
      subtotal += taxable;
      if (gstEnabled) gst += taxable * ((Number(it.gst_rate) || 0) / 100);
    }
    const cgst = gst / 2;
    const sgst = gst / 2;
    return { subtotal, cgst, sgst, gst, grandTotal: subtotal + gst };
  }, [items, gstEnabled]);

  const total = totals.grandTotal;
  const balance = Math.max(0, total - (Number(paidAmount) || 0));

  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setItems((rows) => [...rows, newRow()]);
  }

  function removeRow(id: string) {
    setItems((rows) => (rows.length === 1 ? rows : rows.filter((r) => r.id !== id)));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBillFile(file);
    if (file.type.startsWith('image/')) {
      setBillPreview(URL.createObjectURL(file));
    } else {
      setBillPreview(null);
    }
  }

  function clearFile() {
    setBillFile(null);
    setBillPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function reset() {
    setPartyId('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setInvoiceNumber('');
    setGstEnabled(false);
    setPaymentMode('cash');
    setPaidAmount('');
    setNotes('');
    setItems([newRow()]);
    setBillFile(null);
    setBillPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        party_id: partyId,
        purchase_date: purchaseDate,
        invoice_number: invoiceNumber || undefined,
        gst_enabled: gstEnabled,
        payment_mode: paymentMode,
        paid_amount: Number(paidAmount) || 0,
        notes: notes || undefined,
        items: items
          .filter((i) => i.product_id && Number(i.quantity) > 0)
          .map((i) => ({
            product_id: i.product_id,
            quantity: Number(i.quantity),
            rate: Number(i.rate) || 0,
            gst_rate: gstEnabled ? Number(i.gst_rate) || 0 : 0,
            batch_number: i.batch_number || undefined,
            expiry_date: i.expiry_date || undefined,
          })),
      };
      if (billFile) {
        const fd = new FormData();
        fd.append('data', JSON.stringify(payload));
        fd.append('bill_image', billFile);
        return api.post('/purchases', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      return api.post('/purchases', payload);
    },
    onSuccess: () => {
      const supplier = suppliers.find((s) => s.id === partyId);
      toast.success('Purchase recorded');
      notify('Purchase Recorded', `Stock IN from ${supplier?.name ?? 'supplier'} recorded successfully`);
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      reset();
      onOpenChange(false);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to save purchase');
    },
  });

  const valid =
    partyId &&
    purchaseDate &&
    items.some((i) => i.product_id && Number(i.quantity) > 0 && Number(i.rate) >= 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>New purchase (Stock IN)</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Supplier *</Label>
            <Select value={partyId} onValueChange={setPartyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.length === 0 && (
                  <div className="px-3 py-2 text-sm text-slate-500">
                    No suppliers yet. Add one in Parties.
                  </div>
                )}
                {suppliers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
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

        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 mt-2">
          <div>
            <Label className="cursor-pointer" htmlFor="purchase-gst">GST purchase</Label>
            <p className="text-xs text-slate-500">Add CGST/SGST tax per item on this purchase.</p>
          </div>
          <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden mt-2">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-left p-2 w-1/3">Product</th>
                <th className="text-left p-2">Batch</th>
                <th className="text-left p-2">Expiry</th>
                <th className="text-right p-2">Qty</th>
                <th className="text-right p-2">Rate</th>
                {gstEnabled && <th className="text-right p-2 w-24">GST %</th>}
                <th className="text-right p-2">Amount</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const taxable = (Number(it.quantity) || 0) * (Number(it.rate) || 0);
                const amount = gstEnabled
                  ? taxable * (1 + (Number(it.gst_rate) || 0) / 100)
                  : taxable;
                return (
                  <tr key={it.id} className="border-t border-slate-100">
                    <td className="p-1.5">
                      <Select
                        value={it.product_id}
                        onValueChange={(v) => updateItem(it.id, { product_id: v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                              {p.brand ? ` · ${p.brand}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-1.5">
                      <Input
                        value={it.batch_number}
                        onChange={(e) => updateItem(it.id, { batch_number: e.target.value })}
                        className="h-9"
                      />
                    </td>
                    <td className="p-1.5">
                      <Input
                        type="date"
                        value={it.expiry_date}
                        onChange={(e) => updateItem(it.id, { expiry_date: e.target.value })}
                        className="h-9"
                      />
                    </td>
                    <td className="p-1.5">
                      <Input
                        type="number"
                        step="0.001"
                        value={it.quantity}
                        onChange={(e) => updateItem(it.id, { quantity: e.target.value })}
                        className="h-9 text-right"
                      />
                    </td>
                    <td className="p-1.5">
                      <Input
                        type="number"
                        step="0.01"
                        value={it.rate}
                        onChange={(e) => updateItem(it.id, { rate: e.target.value })}
                        className="h-9 text-right"
                      />
                    </td>
                    {gstEnabled && (
                      <td className="p-1.5">
                        <Select
                          value={it.gst_rate}
                          onValueChange={(v) => updateItem(it.id, { gst_rate: v })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GST_RATES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {r}%
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    )}
                    <td className="p-2 text-right font-mono">{formatCurrency(amount)}</td>
                    <td className="p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(it.id)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Button variant="outline" size="sm" onClick={addRow} className="self-start">
          <Plus className="mr-2 h-4 w-4" /> Add item
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Bill / Invoice photo</Label>
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
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Sub total{gstEnabled ? ' (taxable)' : ''}</span>
              <span className="font-mono">{formatCurrency(totals.subtotal)}</span>
            </div>
            {gstEnabled && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">CGST</span>
                  <span className="font-mono">{formatCurrency(totals.cgst)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">SGST</span>
                  <span className="font-mono">{formatCurrency(totals.sgst)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium border-t border-slate-100 pt-1">
                  <span>Grand total</span>
                  <span className="font-mono">{formatCurrency(total)}</span>
                </div>
              </>
            )}
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
              <span className="font-mono">{formatCurrency(balance)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!valid || mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save purchase
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
