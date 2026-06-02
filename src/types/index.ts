export type Role = 'owner' | 'supervisor';

export type ModuleKey =
  | 'products'
  | 'categories'
  | 'bills_gst'
  | 'bills_nongst'
  | 'bills_history'
  | 'purchases'
  | 'inventory'
  | 'parties'
  | 'outstanding'
  | 'reports_sales'
  | 'reports_purchases'
  | 'reports_outstanding'
  | 'reports_gst'
  | 'reports_stock';

export interface ModulePermission {
  module: ModuleKey;
  visible: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export type ThermalSize = '58mm' | '80mm';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  owner_id: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

/** A shop owned by an owner. Holds shop profile + bill settings (per-shop). */
export interface Shop {
  id: string;
  owner_id: string | null;
  name: string;
  // legacy aliases mirrored by the API for existing forms
  shop_name: string | null;
  shop_address: string | null;
  shop_phone: string | null;
  shop_email: string | null;
  shop_gstin: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pin: string | null;
  gstin: string | null;
  license_no: string | null;
  pesticide_license_no: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_ifsc: string | null;
  bill_terms: string | null;
  gst_bill_prefix: string;
  non_gst_bill_prefix: string;
  default_payment_mode: string;
  show_bank_details: boolean;
  show_signature_line: boolean;
  show_terms: boolean;
  footer_message_gst: string | null;
  footer_message_non_gst: string | null;
  thermal_paper_size: ThermalSize;
  auto_print_after_save: boolean;
  auto_generate_pdf: boolean;
  gst_before_discount: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Supervisor {
  id: string;
  name: string;
  email: string;
  role: Role;
  owner_id: string | null;
  shop_ids: string[];
  is_active: boolean;
  created_at: string;
}

export type ProductUnit = 'kg' | 'gm' | 'ltr' | 'ml' | 'packet' | 'bottle' | 'box' | 'piece';
export type GstRate = 0 | 5 | 12 | 18;

export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  category_id: string | null;
  category?: { id: string; name: string } | null;
  hsn_code: string | null;
  unit: ProductUnit;
  pack_size: string | null;
  purchase_price: string;
  selling_price: string;
  gst_rate: number;
  current_stock: string;
  min_stock_level: string;
  image_url: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Party {
  id: string;
  name: string;
  type: string;
  mobile: string | null;
  address: string | null;
  gstin: string | null;
  opening_balance: string;
  current_balance: string;
  is_active: boolean;
  created_at: string;
}

export type MovementType =
  | 'purchase'
  | 'sale'
  | 'adjustment_in'
  | 'adjustment_out'
  | 'return_in'
  | 'return_out'
  | 'damage';

export interface StockMovement {
  id: string;
  product_id: string;
  party_id: string | null;
  movement_type: MovementType;
  quantity: string;
  rate: string;
  batch_number: string | null;
  expiry_date: string | null;
  reference_id: string | null;
  reference_type: 'purchase' | 'bill' | 'adjustment' | 'return' | null;
  notes: string | null;
  created_at: string;
  product?: { id: string; name: string; unit: ProductUnit };
  signed_quantity?: number;
  running_balance?: number;
}

export interface InventoryRow {
  id: string;
  name: string;
  brand: string | null;
  unit: ProductUnit;
  category: { id: string; name: string } | null;
  current_stock: string;
  sold_stock: string;
  min_stock_level: string;
  purchase_price: string;
  selling_price: string;
  expiry_date: string | null;
  batch_number: string | null;
  image_url: string | null;
  is_active: boolean;
  stock_value: string;
  is_low_stock: boolean;
  expiry_status: 'expired' | 'expiring_soon' | 'expiring_warn' | 'ok';
}

export interface Purchase {
  id: string;
  party_id: string;
  party?: { id: string; name: string };
  purchase_date: string;
  invoice_number: string | null;
  gst_enabled?: boolean;
  subtotal?: string;
  cgst_total?: string;
  sgst_total?: string;
  total_amount: string;
  paid_amount: string;
  payment_status: 'paid' | 'unpaid' | 'partial';
  payment_mode: 'cash' | 'upi' | 'cheque' | 'bank_transfer';
  notes: string | null;
  bill_image_url?: string | null;
  item_count?: number;
  items?: Array<{
    id: string;
    product_id: string;
    product?: { id: string; name: string; unit: ProductUnit };
    quantity: string;
    rate: string;
    gst_rate?: string;
    batch_number: string | null;
    expiry_date: string | null;
    taxable_amount?: string;
    cgst_amount?: string;
    sgst_amount?: string;
    total_amount: string;
  }>;
  created_at: string;
}

export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export type BillType = 'gst' | 'non_gst';
export type BillStatus = 'active' | 'cancelled';
export type BillPaymentMode = 'cash' | 'upi' | 'cheque' | 'credit' | 'bank_transfer';
export type BillPaymentStatus = 'paid' | 'unpaid' | 'partial';
export type LedgerPaymentMode = 'cash' | 'upi' | 'cheque' | 'bank_transfer';

export interface BillItem {
  id: string;
  bill_id: string;
  product_id: string | null;
  product_name: string;
  hsn_code: string | null;
  unit: string;
  quantity: string;
  rate: string;
  gst_rate: string;
  taxable_amount: string;
  cgst_amount: string;
  sgst_amount: string;
  total_amount: string;
}

export interface BillRow {
  id: string;
  bill_number: string;
  bill_type: BillType;
  bill_date: string;
  party_id: string | null;
  party?: { id: string; name: string } | null;
  customer_name: string | null;
  customer_mobile: string | null;
  customer_address: string | null;
  customer_gstin: string | null;
  subtotal: string;
  cgst_total: string;
  sgst_total: string;
  discount_amount: string;
  grand_total: string;
  payment_mode: BillPaymentMode;
  paid_amount: string;
  payment_status: BillPaymentStatus;
  status: BillStatus;
  notes: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  pdf_url: string | null;
  item_count?: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentRecord {
  id: string;
  user_id: string;
  party_id: string | null;
  bill_id: string | null;
  type: 'received' | 'paid';
  amount: string;
  payment_mode: LedgerPaymentMode;
  payment_date: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface BillDetail extends BillRow {
  party: {
    id: string;
    name: string;
    mobile: string | null;
    address: string | null;
    gstin: string | null;
  } | null;
  shop: {
    name: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    pin: string | null;
    gstin: string | null;
    license_no: string | null;
    pesticide_license_no: string | null;
    phone: string | null;
    email: string | null;
    logo_url: string | null;
    bank_name: string | null;
    bank_account: string | null;
    bank_ifsc: string | null;
    bill_terms: string | null;
    show_bank_details: boolean;
    show_signature_line: boolean;
    show_terms: boolean;
    footer_message_gst: string | null;
    footer_message_non_gst: string | null;
    thermal_paper_size: ThermalSize;
  } | null;
  items: BillItem[];
  payments: PaymentRecord[];
}

export interface BillSummaryAgg {
  total_bills: number;
  total_amount: string;
  collected: string;
  outstanding: string;
}
