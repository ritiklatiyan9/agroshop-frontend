export type BillType = 'gst' | 'non_gst';

export interface BillItemInput {
  product_id?: string | null;
  product_name: string;
  hsn_code?: string | null;
  unit: string;
  quantity: number;
  rate: number;
  gst_rate: number;
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
  grand_total: number;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function calculateBill(
  items: BillItemInput[],
  discount = 0,
  billType: BillType = 'gst',
): BillSummary {
  const calc: CalculatedItem[] = items.map((it) => {
    const taxable = round2((it.quantity || 0) * (it.rate || 0));
    const gstRate = billType === 'gst' ? it.gst_rate || 0 : 0;
    const cgstRate = gstRate / 2;
    const sgstRate = gstRate / 2;
    const cgst = round2(taxable * (cgstRate / 100));
    const sgst = round2(taxable * (sgstRate / 100));
    return {
      ...it,
      gst_rate: gstRate,
      taxable_amount: taxable,
      cgst_rate: cgstRate,
      sgst_rate: sgstRate,
      cgst_amount: cgst,
      sgst_amount: sgst,
      total_amount: round2(taxable + cgst + sgst),
    };
  });

  const subtotal = round2(calc.reduce((s, i) => s + i.taxable_amount, 0));
  const total_cgst = round2(calc.reduce((s, i) => s + i.cgst_amount, 0));
  const total_sgst = round2(calc.reduce((s, i) => s + i.sgst_amount, 0));
  const discount_amount = round2(Math.max(0, discount));
  const grand_total = round2(subtotal + total_cgst + total_sgst - discount_amount);

  return { items: calc, subtotal, total_cgst, total_sgst, discount_amount, grand_total };
}
