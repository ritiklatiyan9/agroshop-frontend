export interface BillItemInput {
  product_id?: string | null;
  product_name: string;
  hsn_code?: string | null;
  unit: string;
  quantity: number;
  rate: number;
  gst_rate: number;
  pack_label?: string | null;
  packing_type?: string | null;
  units_per_pack?: number | null;
  pack_count?: number | null;
  list_price?: number;
  discount_percent?: number;
}
export interface CalculatedItem extends BillItemInput {
  taxable_amount: number;
  cgst_rate: number;
  sgst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  total_amount: number;
}
export interface BillSummary {
  items: CalculatedItem[];
  subtotal: number;
  total_cgst: number;
  total_sgst: number;
  discount_amount: number;
  round_off: number;
  grand_total: number;
}
export type BillType = 'gst' | 'non_gst';
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
export function calculateBill(items: BillItemInput[], discount = 0, billType: BillType = 'gst', gstBeforeDiscount = false, roundOff = 0): BillSummary {
  const bases = items.map(it => round2((it.quantity || 0) * (it.rate || 0) * (1 - Math.min(100, Math.max(0, it.discount_percent || 0)) / 100)));
  const subtotal = round2(bases.reduce((sum, value) => sum + value, 0));
  const discount_amount = round2(Math.max(0, discount));
  let allocated = 0;
  const calc: CalculatedItem[] = items.map((it, index) => {
    let taxable = bases[index];
    if (gstBeforeDiscount && billType === 'gst' && subtotal > 0) {
      const applied = Math.min(subtotal, discount_amount);
      const share = index === items.length - 1 ? round2(applied - allocated) : round2(applied * taxable / subtotal);
      allocated = round2(allocated + share);
      taxable = round2(taxable - share);
    }
    const gstRate = billType === 'gst' ? it.gst_rate || 0 : 0;
    const cgst = round2(taxable * gstRate / 200);
    const sgst = round2(taxable * gstRate / 200);
    return { ...it, gst_rate: gstRate, taxable_amount: taxable, cgst_rate: gstRate / 2, sgst_rate: gstRate / 2, cgst_amount: cgst, sgst_amount: sgst, total_amount: round2(taxable + cgst + sgst) };
  });
  const total_cgst = round2(calc.reduce((sum, it) => sum + it.cgst_amount, 0));
  const total_sgst = round2(calc.reduce((sum, it) => sum + it.sgst_amount, 0));
  const round_off = round2(roundOff);
  const grand_total = round2(subtotal - discount_amount + total_cgst + total_sgst + round_off);
  return { items: calc, subtotal, total_cgst, total_sgst, discount_amount, round_off, grand_total };
}
