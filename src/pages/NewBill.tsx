import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Trash2,
  Loader2,
  Printer,
  Save,
  X,
  FileText,
  Package2,
  User,
  CalendarDays,
  ScrollText,
  CreditCard,
  Receipt,
  ShoppingBag,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProductSearchAdd } from '@/components/billing/ProductSearchAdd';
import { PartySearchSelect } from '@/components/billing/PartySearchSelect';
import { useAllProducts } from '@/hooks/useProducts';
import { useParties } from '@/hooks/useParties';
import { useAuthStore } from '@/store/authStore';
import { calculateBill, type BillItemInput, type BillType } from '@/lib/billCalculator';
import { cn, formatCurrency } from '@/lib/utils';
import { inrInWords } from '@/lib/numberToWords';
import type { Party, Product, BillPaymentMode } from '@/types';

interface Line extends BillItemInput {
  uid: string;
  current_stock: number;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

interface Props {
  billType: BillType;
}

export function NewBillPage({ billType }: Props) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: products = [] } = useAllProducts();
  const { data: parties = [] } = useParties('customer');

  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [party, setParty] = useState<Party | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  const [items, setItems] = useState<Line[]>([]);
  const [discountInput, setDiscountInput] = useState('');
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');
  const [paymentMode, setPaymentMode] = useState<BillPaymentMode>(
    (user?.default_payment_mode as BillPaymentMode) || 'cash',
  );
  const [paidInput, setPaidInput] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (party) {
      setCustomerName(party.name);
      setCustomerMobile(party.mobile || '');
      setCustomerGstin(party.gstin || '');
      setCustomerAddress(party.address || '');
    }
  }, [party]);

  const calcItems: BillItemInput[] = items.map((i) => ({
    product_id: i.product_id,
    product_name: i.product_name,
    hsn_code: i.hsn_code,
    unit: i.unit,
    quantity: Number(i.quantity) || 0,
    rate: Number(i.rate) || 0,
    gst_rate: Number(i.gst_rate) || 0,
  }));

  const discountAmount = useMemo(() => {
    const n = Number(discountInput) || 0;
    if (n <= 0) return 0;
    if (discountType === 'percent') {
      const subtotal = calcItems.reduce((s, i) => s + i.quantity * i.rate, 0);
      return Math.round(subtotal * (n / 100) * 100) / 100;
    }
    return n;
  }, [discountInput, discountType, calcItems]);

  const summary = useMemo(
    () => calculateBill(calcItems, discountAmount, billType),
    [calcItems, discountAmount, billType],
  );

  const paidAmount = Number(paidInput) || 0;
  const balance = Math.max(0, summary.grand_total - paidAmount);
  const addedIds = useMemo(
    () => new Set(items.filter((i) => i.product_id).map((i) => i.product_id as string)),
    [items],
  );

  function addProduct(p: Product) {
    const existing = items.find((i) => i.product_id === p.id);
    if (existing) {
      updateLine(existing.uid, { quantity: Number(existing.quantity) + 1 });
      return;
    }
    setItems((rows) => [
      ...rows,
      {
        uid: uid(),
        product_id: p.id,
        product_name: p.name,
        hsn_code: p.hsn_code,
        unit: p.unit,
        quantity: 1,
        rate: Number(p.selling_price),
        gst_rate: Number(p.gst_rate),
        current_stock: Number(p.current_stock),
      },
    ]);
  }

  function updateLine(uidKey: string, patch: Partial<Line>) {
    setItems((rows) => rows.map((r) => (r.uid === uidKey ? { ...r, ...patch } : r)));
  }

  function removeLine(uidKey: string) {
    setItems((rows) => rows.filter((r) => r.uid !== uidKey));
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        bill_type: billType,
        bill_date: billDate,
        party_id: party?.id ?? null,
        customer_name: customerName || null,
        customer_mobile: customerMobile || null,
        customer_address: customerAddress || null,
        customer_gstin: customerGstin || null,
        discount_amount: discountAmount,
        payment_mode: paymentMode,
        paid_amount: paidAmount,
        notes: notes || null,
        items: items.map((i) => ({
          product_id: i.product_id ?? null,
          product_name: i.product_name,
          hsn_code: i.hsn_code ?? null,
          unit: i.unit,
          quantity: Number(i.quantity),
          rate: Number(i.rate),
          gst_rate: Number(i.gst_rate),
        })),
      };
      const res = await api.post('/bills', payload);
      return res.data as { id: string; bill_number: string };
    },
  });

  async function handleSave(printAfter = false) {
    if (!items.length) {
      toast.error('Add at least one item');
      return;
    }
    if (!customerName.trim()) {
      toast.error('Enter customer name');
      return;
    }
    if (paidAmount > summary.grand_total + 0.01) {
      toast.error('Paid amount cannot exceed grand total');
      return;
    }
    try {
      const bill = await mutation.mutateAsync();
      toast.success(`Bill ${bill.bill_number} created`);
      if (printAfter || user?.auto_print_after_save) {
        window.open(`/bills/print/${bill.id}`, '_blank');
      }
      navigate('/bills');
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || 'Failed to save bill');
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, customerName, paidAmount, billDate, party, paymentMode, discountInput, discountType, notes]);

  const isCredit = paymentMode === 'credit';

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-slate-50/60">
      <div className="flex-shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-20">
        <div className="px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-start justify-between gap-2 sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/bills')}
              title="Back to bills"
              className="h-9 w-9 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
            <div
              className={cn(
                'hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm min-[380px]:flex sm:h-10 sm:w-10 sm:rounded-xl',
                billType === 'gst'
                  ? 'bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700'
                  : 'bg-gradient-to-br from-sky-100 to-sky-50 text-sky-700',
              )}
            >
              {billType === 'gst' ? (
                <Receipt className="h-5 w-5" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate text-sm font-bold leading-tight text-slate-900 sm:text-base sm:leading-none">
                  New {billType === 'gst' ? 'GST' : 'Non-GST'} bill
                </h1>
                <Badge className="hidden shrink-0 sm:inline-flex" variant={billType === 'gst' ? 'success' : 'info'}>
                  {billType === 'gst' ? 'Tax invoice' : 'Cash memo'}
                </Badge>
              </div>
              <div className="mt-1 flex items-center gap-2 sm:hidden">
                <Badge className="px-2 py-0 text-[10px]" variant={billType === 'gst' ? 'success' : 'info'}>
                  {billType === 'gst' ? 'Tax invoice' : 'Cash memo'}
                </Badge>
                <span className="truncate text-[11px] text-slate-500">
                  {items.length} item{items.length === 1 ? '' : 's'}
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-slate-500 mt-1">
                Press{' '}
                <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono">
                  Ctrl
                </kbd>{' '}
                +{' '}
                <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono">
                  Enter
                </kbd>{' '}
                to save and print.
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Button
              variant="outline"
              onClick={() => navigate('/bills')}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={mutation.isPending}
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />}
              <Save className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Save</span>
            </Button>
            <Button onClick={() => handleSave(true)} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Printer className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Save & </span>Print
            </Button>
          </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={mutation.isPending}
              className="h-9"
            >
              {mutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
            <Button onClick={() => handleSave(true)} disabled={mutation.isPending} className="h-9">
              {mutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Printer className="mr-2 h-4 w-4" />
              )}
              Print
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden lg:grid lg:grid-cols-[1fr_400px]">
        <div className="p-3 pb-5 sm:p-5 space-y-3 sm:space-y-4 lg:overflow-y-auto">
          <Section
            icon={CalendarDays}
            title="Bill info"
            description="Date and reference for this transaction"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-500 uppercase tracking-wide font-semibold">
                  Bill date
                </Label>
                <Input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-500 uppercase tracking-wide font-semibold">
                  Type
                </Label>
                <div className="h-10 flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
                  {billType === 'gst' ? (
                    <>
                      <Receipt className="h-4 w-4 text-emerald-600" />
                      GST Invoice
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 text-sky-600" />
                      Non-GST Cash Memo
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-500 uppercase tracking-wide font-semibold">
                  Bill #
                </Label>
                <div className="h-10 flex items-center rounded-md border border-dashed border-slate-200 bg-white px-3 text-sm text-slate-400 italic">
                  auto-generated on save
                </div>
              </div>
            </div>
          </Section>

          <Section icon={User} title="Customer" description="Pick a saved party or fill walk-in details">
            <PartySearchSelect parties={parties} value={party} onChange={setParty} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <FieldLabel label="Name *" required>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Walk-in / customer name"
                />
              </FieldLabel>
              <FieldLabel label="Mobile">
                <Input
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  inputMode="numeric"
                />
              </FieldLabel>
              {billType === 'gst' && (
                <FieldLabel label="GSTIN" className="md:col-span-2">
                  <Input
                    value={customerGstin}
                    onChange={(e) => setCustomerGstin(e.target.value)}
                    placeholder="22AAAAA0000A1Z5"
                    className="font-mono"
                  />
                </FieldLabel>
              )}
              <FieldLabel label="Address" className="md:col-span-2">
                <Textarea
                  rows={2}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                />
              </FieldLabel>
            </div>
          </Section>

          <Section
            icon={ShoppingBag}
            title="Items"
            description="Search products to add them to the bill"
            rightContent={
              <Badge variant="muted">
                {items.length} item{items.length === 1 ? '' : 's'}
              </Badge>
            }
          >
            <ProductSearchAdd
              products={products}
              onSelect={addProduct}
              alreadyAddedIds={addedIds}
              autoFocus
            />

            {items.length === 0 ? (
              <div className="mt-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/40 py-12 px-4 flex flex-col items-center text-center">
                <div className="h-14 w-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-3">
                  <Package2 className="h-6 w-6 text-slate-400" strokeWidth={1.5} />
                </div>
                <h4 className="text-sm font-semibold text-slate-900">No items yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Start typing in the search above to add products. Use ↑↓ to navigate, Enter to add.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-3 space-y-3 sm:hidden">
                  {items.map((row, i) => (
                    <MobileItemCard
                      key={row.uid}
                      row={row}
                      index={i}
                      billType={billType}
                      onUpdate={updateLine}
                      onRemove={removeLine}
                    />
                  ))}
                </div>
                <div className="mt-3 hidden overflow-x-auto rounded-xl border border-slate-100 sm:block">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-2 py-2.5 w-8 text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                        #
                      </th>
                      <th className="text-left px-2 py-2.5 text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                        Product
                      </th>
                      {billType === 'gst' && (
                        <th className="hidden md:table-cell text-left px-2 py-2.5 w-24 text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                          HSN
                        </th>
                      )}
                      <th className="text-right px-2 py-2.5 w-24 text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                        Qty
                      </th>
                      <th className="hidden sm:table-cell text-left px-2 py-2.5 w-20 text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                        Unit
                      </th>
                      <th className="text-right px-2 py-2.5 w-28 text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                        Rate
                      </th>
                      {billType === 'gst' && (
                        <th className="text-right px-2 py-2.5 w-24 text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                          GST%
                        </th>
                      )}
                      <th className="text-right px-2 py-2.5 w-28 text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                        Amount
                      </th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row, i) => {
                      const qty = Number(row.quantity) || 0;
                      const rate = Number(row.rate) || 0;
                      const gstRate = billType === 'gst' ? Number(row.gst_rate) || 0 : 0;
                      const taxable = qty * rate;
                      const lineAmount = taxable + (taxable * gstRate) / 100;
                      const stockExceeded = row.product_id && qty > row.current_stock;
                      return (
                        <tr
                          key={row.uid}
                          className={cn(
                            'group border-t border-slate-100 transition-colors',
                            stockExceeded ? 'bg-red-50/40' : 'hover:bg-slate-50/60',
                          )}
                        >
                          <td className="px-2 py-1.5 text-slate-400 tabular-nums text-xs">
                            {i + 1}
                          </td>
                          <td className="px-1.5 py-1.5">
                            <Input
                              value={row.product_name}
                              onChange={(e) =>
                                updateLine(row.uid, { product_name: e.target.value })
                              }
                              className="h-9 border-slate-200/0 hover:border-slate-200 focus:border-emerald-300 focus:ring-emerald-200 bg-transparent focus:bg-white"
                            />
                            {row.product_id && (
                              <div className="text-[10px] text-slate-400 ml-2 mt-0.5">
                                Stock: {row.current_stock}
                              </div>
                            )}
                          </td>
                          {billType === 'gst' && (
                            <td className="hidden md:table-cell px-1.5 py-1.5">
                              <Input
                                value={row.hsn_code || ''}
                                onChange={(e) =>
                                  updateLine(row.uid, { hsn_code: e.target.value })
                                }
                                className="h-9 font-mono text-xs border-slate-200/0 hover:border-slate-200 focus:border-emerald-300 focus:ring-emerald-200 bg-transparent focus:bg-white"
                              />
                            </td>
                          )}
                          <td className="px-1.5 py-1.5">
                            <Input
                              type="number"
                              step="0.001"
                              value={row.quantity}
                              onChange={(e) =>
                                updateLine(row.uid, { quantity: Number(e.target.value) })
                              }
                              className={cn(
                                'h-9 text-right tabular-nums border-slate-200/0 hover:border-slate-200 focus:border-emerald-300 focus:ring-emerald-200 bg-transparent focus:bg-white',
                                stockExceeded &&
                                  'border-red-500 bg-red-50 ring-1 ring-red-300 focus:ring-red-300',
                              )}
                            />
                            {stockExceeded && (
                              <div className="text-[10px] text-red-600 mt-0.5 ml-1 font-medium">
                                ⚠ max {row.current_stock}
                              </div>
                            )}
                          </td>
                          <td className="hidden sm:table-cell px-1.5 py-1.5">
                            <Input
                              value={row.unit}
                              onChange={(e) => updateLine(row.uid, { unit: e.target.value })}
                              className="h-9 text-xs border-slate-200/0 hover:border-slate-200 focus:border-emerald-300 focus:ring-emerald-200 bg-transparent focus:bg-white"
                            />
                          </td>
                          <td className="px-1.5 py-1.5">
                            <Input
                              type="number"
                              step="0.01"
                              value={row.rate}
                              onChange={(e) =>
                                updateLine(row.uid, { rate: Number(e.target.value) })
                              }
                              className="h-9 text-right tabular-nums border-slate-200/0 hover:border-slate-200 focus:border-emerald-300 focus:ring-emerald-200 bg-transparent focus:bg-white"
                            />
                          </td>
                          {billType === 'gst' && (
                            <td className="px-1.5 py-1.5">
                              <GstRateInput
                                value={row.gst_rate ?? 0}
                                onChange={(v) => updateLine(row.uid, { gst_rate: v })}
                              />
                            </td>
                          )}
                          <td className="px-2 py-1.5 text-right">
                            <div className="font-semibold tabular-nums text-slate-900">
                              {formatCurrency(lineAmount)}
                            </div>
                            {billType === 'gst' && gstRate > 0 && (
                              <div className="text-[10px] text-slate-500 tabular-nums">
                                +{formatCurrency(lineAmount - taxable)} tax
                              </div>
                            )}
                          </td>
                          <td className="px-1 py-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLine(row.uid)}
                              className="h-8 w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-50"
                              title="Remove"
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
              </>
            )}
          </Section>

          <Section icon={ScrollText} title="Notes" description="Optional — printed on the bill">
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Delivery instructions, terms, etc."
            />
          </Section>
        </div>

        <aside className="border-t lg:border-t-0 lg:border-l border-slate-200 bg-white flex flex-col lg:overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-gradient-to-br from-emerald-50/60 via-white to-white flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Receipt className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500 font-semibold">
                Live preview
              </span>
            </div>
            <div className="text-[10px] text-slate-500 truncate ml-2">
              {customerName || 'Walk-in'} ·{' '}
              {new Date(billDate).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
              })}
            </div>
          </div>

          <div className="px-4 py-3 space-y-1.5 text-sm border-b border-slate-100 flex-shrink-0">
            <SummaryRow label="Subtotal" value={formatCurrency(summary.subtotal)} />
            {billType === 'gst' && (
              <>
                <SummaryRow label="CGST" value={formatCurrency(summary.total_cgst)} />
                <SummaryRow label="SGST" value={formatCurrency(summary.total_sgst)} />
              </>
            )}
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-500 text-xs">Discount</span>
              <div className="flex items-center gap-1.5">
                <Select
                  value={discountType}
                  onValueChange={(v) => setDiscountType(v as 'flat' | 'percent')}
                >
                  <SelectTrigger className="h-7 w-14 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">₹</SelectItem>
                    <SelectItem value="percent">%</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  className="h-7 w-20 text-right tabular-nums text-xs"
                  placeholder="0"
                />
              </div>
            </div>
            {summary.discount_amount > 0 && (
              <SummaryRow
                label="Discount applied"
                value={`- ${formatCurrency(summary.discount_amount)}`}
                muted
              />
            )}
          </div>

          <div className="px-4 py-3 bg-gradient-to-br from-slate-900 to-slate-800 text-white flex-shrink-0">
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-semibold">
                Grand total
              </span>
              <span className="text-[10px] text-slate-400 tabular-nums">
                {items.length} item{items.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="font-bold text-2xl tabular-nums tracking-tight mt-0.5">
              {formatCurrency(summary.grand_total)}
            </div>
            {summary.grand_total > 0 && (
              <p className="text-[10px] italic text-slate-400 mt-1 leading-snug line-clamp-2">
                {inrInWords(summary.grand_total)}
              </p>
            )}
          </div>

          <div className="px-4 py-3 space-y-2 flex-1 min-h-0">
            <div className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-slate-500" />
              <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 font-semibold">
                Payment
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">
                  Mode
                </Label>
                <Select
                  value={paymentMode}
                  onValueChange={(v) => setPaymentMode(v as BillPaymentMode)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                    <SelectItem value="credit">Credit (unpaid)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">
                  Amount paid
                </Label>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    step="0.01"
                    value={paidInput}
                    onChange={(e) => setPaidInput(e.target.value)}
                    className="text-right tabular-nums h-8 text-xs"
                    disabled={isCredit}
                    placeholder={isCredit ? 'Credit' : '0'}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setPaidInput(String(summary.grand_total))}
                    className="h-8 px-2 text-xs shrink-0"
                    disabled={summary.grand_total === 0 || isCredit}
                  >
                    Full
                  </Button>
                </div>
              </div>
            </div>
            <div
              className={cn(
                'flex justify-between items-center rounded-lg px-2.5 py-1.5 mt-1',
                balance > 0
                  ? 'bg-amber-50 border border-amber-100'
                  : 'bg-emerald-50 border border-emerald-100',
              )}
            >
              <span className="text-[11px] font-semibold text-slate-700">Balance due</span>
              <span
                className={cn(
                  'tabular-nums font-bold text-sm',
                  balance > 0 ? 'text-amber-800' : 'text-emerald-700',
                )}
              >
                {formatCurrency(balance)}
              </span>
            </div>
          </div>

          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/30 flex-shrink-0">
            <Button
              size="lg"
              className="w-full h-10"
              onClick={() => handleSave(true)}
              disabled={mutation.isPending || items.length === 0}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Printer className="mr-2 h-4 w-4" /> Save & Print
            </Button>
            <button
              type="button"
              className="w-full text-xs text-slate-500 hover:text-slate-900 mt-1.5 text-center py-0.5"
              onClick={() => handleSave(false)}
              disabled={mutation.isPending || items.length === 0}
            >
              Save without printing
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MobileItemCard({
  row,
  index,
  billType,
  onUpdate,
  onRemove,
}: {
  row: Line;
  index: number;
  billType: BillType;
  onUpdate: (uidKey: string, patch: Partial<Line>) => void;
  onRemove: (uidKey: string) => void;
}) {
  const qty = Number(row.quantity) || 0;
  const rate = Number(row.rate) || 0;
  const gstRate = billType === 'gst' ? Number(row.gst_rate) || 0 : 0;
  const taxable = qty * rate;
  const lineAmount = taxable + (taxable * gstRate) / 100;
  const stockExceeded = Boolean(row.product_id && qty > row.current_stock);

  return (
    <div
      className={cn(
        'rounded-lg border bg-white p-3 shadow-sm',
        stockExceeded ? 'border-red-200 bg-red-50/40' : 'border-slate-200',
      )}
    >
      <div className="flex items-start gap-2">
        <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold tabular-nums text-slate-500">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <Input
            value={row.product_name}
            onChange={(e) => onUpdate(row.uid, { product_name: e.target.value })}
            className="h-9 min-w-0 bg-white font-medium"
          />
          {row.product_id && (
            <div className="px-1 text-[10px] text-slate-400">Stock: {row.current_stock}</div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(row.uid)}
          className="h-8 w-8 shrink-0 hover:bg-red-50"
          title="Remove"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>

      {billType === 'gst' && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <FieldLabel label="HSN">
            <Input
              value={row.hsn_code || ''}
              onChange={(e) => onUpdate(row.uid, { hsn_code: e.target.value })}
              className="h-9 font-mono text-xs"
            />
          </FieldLabel>
          <FieldLabel label="GST %">
            <GstRateInput value={row.gst_rate ?? 0} onChange={(v) => onUpdate(row.uid, { gst_rate: v })} />
          </FieldLabel>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 min-[420px]:grid-cols-3">
        <FieldLabel label="Qty">
          <Input
            type="number"
            step="0.001"
            value={row.quantity}
            onChange={(e) => onUpdate(row.uid, { quantity: Number(e.target.value) })}
            className={cn(
              'h-9 text-right tabular-nums',
              stockExceeded && 'border-red-500 bg-red-50 ring-1 ring-red-300 focus:ring-red-300',
            )}
          />
        </FieldLabel>
        <FieldLabel label="Rate">
          <Input
            type="number"
            step="0.01"
            value={row.rate}
            onChange={(e) => onUpdate(row.uid, { rate: Number(e.target.value) })}
            className="h-9 text-right tabular-nums"
          />
        </FieldLabel>
        <FieldLabel label="Unit" className="col-span-2 min-[420px]:col-span-1">
          <Input
            value={row.unit}
            onChange={(e) => onUpdate(row.uid, { unit: e.target.value })}
            className="h-9 text-xs"
          />
        </FieldLabel>
      </div>

      {stockExceeded && (
        <div className="mt-2 rounded-md border border-red-100 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700">
          Max stock: {row.current_stock}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Amount
        </span>
        <div className="min-w-0 text-right">
          <div className="font-semibold tabular-nums text-slate-900">
            {formatCurrency(lineAmount)}
          </div>
          {billType === 'gst' && gstRate > 0 && (
            <div className="text-[10px] tabular-nums text-slate-500">
              +{formatCurrency(lineAmount - taxable)} tax
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  rightContent,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  rightContent?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-emerald-700" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>
          </div>
        </div>
        {rightContent}
      </div>
      {children}
    </div>
  );
}

function FieldLabel({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <Label className="text-[11px] text-slate-500 uppercase tracking-wide font-semibold">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className={muted ? 'text-slate-400 text-xs' : 'text-slate-500'}>{label}</span>
      <span className={cn('tabular-nums', muted ? 'text-slate-500 text-xs' : 'text-slate-900')}>
        {value}
      </span>
    </div>
  );
}

const COMMON_GST_RATES = [0, 5, 12, 18, 28] as const;

function GstRateInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const isCommon = COMMON_GST_RATES.includes(value as (typeof COMMON_GST_RATES)[number]);

  return (
    <div className="relative">
      <div className="relative">
        <Input
          type="number"
          min={0}
          max={28}
          step={0.01}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(Math.max(0, Math.min(28, n)));
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          className="h-9 pr-7 text-right tabular-nums border-slate-200/0 hover:border-slate-200 focus:border-emerald-300 focus:ring-emerald-200 bg-transparent focus:bg-white"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
          %
        </span>
      </div>
      {open && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 rounded-md border border-slate-200 bg-white shadow-lg p-1.5">
          <div className="text-[10px] uppercase tracking-wide text-slate-400 px-1 pb-1 font-semibold">
            Common rates
          </div>
          <div className="flex flex-wrap gap-1">
            {COMMON_GST_RATES.map((r) => (
              <button
                key={r}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(r);
                  setOpen(false);
                }}
                className={cn(
                  'h-7 px-2 rounded-md text-xs font-medium transition-colors',
                  value === r
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700',
                )}
              >
                {r}%
              </button>
            ))}
          </div>
          {!isCommon && (
            <div className="text-[10px] text-slate-500 mt-1 px-1">
              Custom rate: <span className="font-mono font-semibold">{value}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
