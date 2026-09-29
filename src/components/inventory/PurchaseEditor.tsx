import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Plus, Printer, Trash2 } from 'lucide-react';
import { api } from '@/lib/axios';
import { openPurchasePrint } from '@/lib/printBill';
import { useCurrentShop } from '@/store/authStore';
import { useSuppliers } from '@/hooks/useParties';
import { useAllProducts } from '@/hooks/useProducts';
import { calculateBill, type BillItemInput } from '@/lib/billCalculator';
import { localDateInput, formatCurrency } from '@/lib/utils';
import type { Purchase, DocumentDetails } from '@/types';
import { DocumentFields, EMPTY_DOCUMENT } from '@/components/billing/DocumentFields';
import { PackingFields } from '@/components/billing/PackingFields';
import { AddEditPartyDialog } from '@/components/parties/AddEditPartyDialog';
import { UnitInput } from '@/components/ui/unit-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Line extends BillItemInput { uid: string; product_id: string; batch_number: string; expiry_date: string }
const newLine = (): Line => ({ uid: crypto.randomUUID(), product_id: '', product_name: '', unit: 'piece', quantity: 1, rate: 0, gst_rate: 0, batch_number: '', expiry_date: '' });
export interface PurchaseEditorProps { open: boolean; onOpenChange: (open: boolean) => void; purchaseId?: string | null; defaultDocumentType?: 'purchase' | 'purchase_order' }

export function PurchaseEditor({ open, onOpenChange, purchaseId, defaultDocumentType = 'purchase' }: PurchaseEditorProps) {
  const client = useQueryClient(); const navigate = useNavigate(); const shop = useCurrentShop();
  const { data: suppliers = [] } = useSuppliers(); const { data: products = [] } = useAllProducts();
  const [partyId, setPartyId] = useState(''); const [purchaseDate, setPurchaseDate] = useState('');
  const [documentType, setDocumentType] = useState<'purchase' | 'purchase_order'>(defaultDocumentType);
  const [invoiceNumber, setInvoiceNumber] = useState(''); const [orderNumber, setOrderNumber] = useState('');
  const [gstEnabled, setGstEnabled] = useState(false); const [paidAmount, setPaidAmount] = useState('0');
  const [paymentMode, setPaymentMode] = useState<Purchase['payment_mode']>('cash'); const [notes, setNotes] = useState('');
  const [details, setDetails] = useState<DocumentDetails>(EMPTY_DOCUMENT); const [items, setItems] = useState<Line[]>([newLine()]);
  const [file, setFile] = useState<File | null>(null); const [newSupplier, setNewSupplier] = useState(false);
  const [printAfter, setPrintAfter] = useState(false); const fileRef = useRef<HTMLInputElement>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ['purchase-edit', purchaseId], enabled: !!purchaseId && open, queryFn: async () => (await api.get<Purchase>(`/purchases/${purchaseId}`)).data });

  useEffect(() => {
    if (!open) return;
    if (purchaseId && !data) return;
    setFile(null); if (fileRef.current) fileRef.current.value = '';
    setPartyId(data?.party_id || ''); setPurchaseDate(data?.purchase_date || localDateInput());
    setDocumentType(data?.document_type || defaultDocumentType); setInvoiceNumber(data?.invoice_number || ''); setOrderNumber(data?.order_number || '');
    setGstEnabled(data?.gst_enabled || false); setPaidAmount(data?.paid_amount || '0'); setPaymentMode(data?.payment_mode || 'cash'); setNotes(data?.notes || '');
    setDetails({ ...EMPTY_DOCUMENT, place_of_supply: shop?.state || '', state_code: shop?.state_code || '', ...data?.document_details });
    setItems(data?.items?.length ? data.items.map(it => ({
      uid: it.id, product_id: it.product_id, product_name: it.product_name || it.product?.name || '', unit: it.unit || it.product?.unit || 'piece', hsn_code: it.hsn_code,
      quantity: Number(it.quantity), rate: Number(it.rate), gst_rate: Number(it.gst_rate || 0), pack_label: it.pack_label, packing_type: it.packing_type,
      units_per_pack: it.units_per_pack, pack_count: it.pack_count == null ? null : Number(it.pack_count), list_price: Number(it.list_price || 0), discount_percent: Number(it.discount_percent || 0),
      batch_number: it.batch_number || '', expiry_date: it.expiry_date || '',
    })) : [newLine()]);
  }, [open, purchaseId, data, defaultDocumentType, shop?.id]);

  const summary = useMemo(() => calculateBill(items, 0, gstEnabled ? 'gst' : 'non_gst'), [items, gstEnabled]);
  const order = documentType === 'purchase_order';
  // First blocking problem, shown as a toast (rows without a product are skipped, not errors).
  function problem() {
    if (!partyId) return 'Select a supplier';
    if (!items.some(it => it.product_id)) return 'Select at least one product';
    const bad = items.findIndex(it => it.product_id && !(Number(it.quantity) > 0));
    if (bad >= 0) return `Item ${bad + 1}: enter a quantity`;
    return null;
  }
  function save(print: boolean) {
    const msg = problem();
    if (msg) { toast.error(msg); return; }
    setPrintAfter(print); mutation.mutate();
  }
  const updateLine = (uid: string, patch: Partial<Line>) => setItems(rows => rows.map(row => row.uid === uid ? { ...row, ...patch } : row));
  function selectProduct(uid: string, id: string) {
    const p = products.find(product => product.id === id); if (!p) return;
    updateLine(uid, { product_id: id, product_name: p.name, unit: p.unit, hsn_code: p.hsn_code, rate: Number(p.purchase_price), gst_rate: p.gst_rate,
      pack_label: p.pack_label || (p.pack_size ? `${Number(p.pack_size)} ${p.unit}` : ''), packing_type: p.packing_type, units_per_pack: p.units_per_pack, batch_number: p.batch_number || '', expiry_date: p.expiry_date || '' });
  }
  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { party_id: partyId, purchase_date: purchaseDate, document_type: documentType, order_number: orderNumber || null, invoice_number: invoiceNumber || null,
        gst_enabled: gstEnabled, payment_mode: paymentMode, paid_amount: order ? 0 : Math.min(Math.max(0, Number(paidAmount) || 0), summary.grand_total), notes: notes || null, document_details: details,
        items: items.filter(it => it.product_id).map(({ uid, ...item }) => ({ ...item, batch_number: item.batch_number || null, expiry_date: item.expiry_date || null })),
      };
      let body: typeof payload | FormData = payload;
      if (file) { body = new FormData(); body.append('data', JSON.stringify(payload)); body.append('bill_image', file); }
      const config = file ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;
      return (purchaseId ? await api.put<Purchase>(`/purchases/${purchaseId}`, body, config) : await api.post<Purchase>('/purchases', body, config)).data;
    },
    onSuccess: async saved => { await client.invalidateQueries(); toast.success(`${order ? 'Purchase order' : 'Purchase'} ${purchaseId ? 'updated' : 'saved'}`); onOpenChange(false); if (printAfter) openPurchasePrint(saved.id, navigate); },
    onError: (err: { response?: { data?: { error?: string } } }) => toast.error(err.response?.data?.error || 'Unable to save purchase'),
  });
  return <>
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto"><DialogHeader><DialogTitle>{purchaseId ? 'Edit' : 'New'} {order ? 'purchase order' : 'purchase'}</DialogTitle></DialogHeader>
      {purchaseId && isLoading ? <div className="py-10">Loading purchase…</div> : error ? <div className="py-6 text-red-600">Unable to load this purchase.</div> : <>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1"><Label>Document type</Label><Select value={documentType} disabled={data?.document_type === 'purchase'} onValueChange={value => { setDocumentType(value as 'purchase' | 'purchase_order'); if (value === 'purchase_order') setPaidAmount('0'); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="purchase">Purchase — receive stock</SelectItem><SelectItem value="purchase_order">Purchase order</SelectItem></SelectContent></Select></div>
          <div className="space-y-1"><div className="flex justify-between"><Label>Supplier *</Label><button type="button" className="text-xs text-emerald-700" onClick={() => setNewSupplier(true)}>+ Add supplier</button></div><Select value={partyId} onValueChange={setPartyId}><SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger><SelectContent>{data?.party && !suppliers.some(p => p.id === data.party_id) && <SelectItem value={data.party_id}>{data.party.name} (archived)</SelectItem>}{suppliers.map(supplier => <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label>Date *</Label><Input aria-label="Purchase date" type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} /></div>
          <div className="space-y-1"><Label>{order ? 'Order number' : 'Supplier invoice number'}</Label><Input value={order ? orderNumber : invoiceNumber} onChange={e => order ? setOrderNumber(e.target.value) : setInvoiceNumber(e.target.value)} placeholder={order ? 'Auto-generated on save' : 'Invoice reference'} /></div>
        </div>
        {order && <p className="rounded-lg border border-sky-100 bg-sky-50 p-3 text-sm text-sky-800">A purchase order records the items you intend to buy. Stock and supplier balances update when you receive the order.</p>}
        <DocumentFields value={details} onChange={setDetails} purchase />
        <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Items ({items.length})</h3><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={gstEnabled} onChange={e => setGstEnabled(e.target.checked)} />Include GST</label></div>
        <div className="space-y-3">{items.map((item, index) => <div key={item.uid} className="rounded-lg border border-slate-200 p-3">
          <div className="mb-3 flex items-center gap-2"><span className="text-xs text-slate-400">{index + 1}.</span><div className="min-w-0 flex-1"><Select value={item.product_id} onValueChange={id => selectProduct(item.uid, id)}><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger><SelectContent>{item.product_id && !products.some(p => p.id === item.product_id) && <SelectItem value={item.product_id}>{item.product_name} (archived)</SelectItem>}{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}{p.pack_label || p.pack_size ? ` · ${p.pack_label || `${Number(p.pack_size)} ${p.unit}`}` : ''}</SelectItem>)}</SelectContent></Select></div><Button variant="ghost" size="icon" aria-label="Remove item" title="Remove item" disabled={mutation.isPending} onClick={() => setItems(rows => rows.filter(row => row.uid !== item.uid))}><Trash2 className="h-4 w-4 text-red-500" /></Button></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7"><div><Label>Quantity *</Label><Input aria-label="Quantity" type="number" step="0.001" min="0" value={item.quantity} onChange={e => updateLine(item.uid, { quantity: Number(e.target.value) })} /></div><div><Label>Unit *</Label><UnitInput value={item.unit} onValueChange={unit => updateLine(item.uid, { unit })} /></div><div><Label>Rate (₹)</Label><Input aria-label="Rate" type="number" step="0.01" min="0" value={item.rate} onChange={e => updateLine(item.uid, { rate: Number(e.target.value) })} /></div><div><Label>GST %</Label><Input aria-label="GST percentage" type="number" min="0" max="100" step="0.01" disabled={!gstEnabled} value={item.gst_rate} onChange={e => updateLine(item.uid, { gst_rate: Number(e.target.value) })} /></div><div><Label>HSN / SAC</Label><Input value={item.hsn_code || ''} onChange={e => updateLine(item.uid, { hsn_code: e.target.value })} /></div><div><Label>Batch</Label><Input value={item.batch_number} onChange={e => updateLine(item.uid, { batch_number: e.target.value })} /></div><div><Label>Expiry</Label><Input type="date" value={item.expiry_date} onChange={e => updateLine(item.uid, { expiry_date: e.target.value })} /></div></div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]"><PackingFields value={item} onChange={patch => updateLine(item.uid, patch)} /><div className="flex items-center justify-end text-sm font-semibold">{formatCurrency(summary.items[index]?.total_amount || 0)}</div></div>
        </div>)}</div>
        <Button variant="outline" size="sm" onClick={() => setItems(rows => [...rows, newLine()])}><Plus className="mr-2 h-4 w-4" />Add item</Button>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-3"><div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} /></div><div><Label>Attach supplier bill / order</Label><Input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} />{data?.bill_image_url && <a href={data.bill_image_url} target="_blank" rel="noreferrer" className="text-xs text-emerald-700">View current attachment</a>}</div></div><div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4"><div className="flex justify-between text-sm"><span>Subtotal</span><strong>{formatCurrency(summary.subtotal)}</strong></div>{gstEnabled && <><div className="flex justify-between text-sm"><span>CGST</span><span>{formatCurrency(summary.total_cgst)}</span></div><div className="flex justify-between text-sm"><span>SGST</span><span>{formatCurrency(summary.total_sgst)}</span></div></>}<div className="flex justify-between border-t pt-2"><strong>Total</strong><strong>{formatCurrency(summary.grand_total)}</strong></div>{!order && <div className="grid grid-cols-2 gap-2 pt-2"><div><Label>Payment mode</Label><Select value={paymentMode} onValueChange={v => setPaymentMode(v as Purchase['payment_mode'])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['cash', 'upi', 'cheque', 'bank_transfer'].map(mode => <SelectItem key={mode} value={mode}>{mode.replace('_', ' ')}</SelectItem>)}</SelectContent></Select></div><div><Label>Paid (₹)</Label><Input type="number" min="0" max={summary.grand_total} step="0.01" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} /></div></div>}</div></div>
        <DialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="outline" disabled={mutation.isPending} onClick={() => save(false)}>{mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button><Button disabled={mutation.isPending} onClick={() => save(true)}><Printer className="mr-2 h-4 w-4" />Save & Print</Button></DialogFooter>
      </>}
    </DialogContent></Dialog>
    <AddEditPartyDialog defaultType="supplier" party={null} open={newSupplier} onOpenChange={setNewSupplier} />
  </>;
}
