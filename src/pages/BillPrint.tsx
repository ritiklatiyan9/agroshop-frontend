import { InvoiceDocument } from '@/components/billing/InvoiceDocument';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { api } from '@/lib/axios';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { inrInWords } from '@/lib/numberToWords';
import type { BillDetail, ThermalSize, InvoiceLayout } from '@/types';

type ThermalMm = ThermalSize;

export function BillPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [invoiceLayout, setInvoiceLayout] = useState<InvoiceLayout>('uniwest');
  const [layout, setLayout] = useState<'a4' | 'thermal'>('a4');
  const [thermalSize, setThermalSize] = useState<ThermalMm>('80mm');

  const { data, isLoading } = useQuery({
    queryKey: ['bill-print', id],
    queryFn: async () => {
      const res = await api.get<BillDetail>(`/bills/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  useEffect(() => { if (data?.shop?.invoice_layout) setInvoiceLayout(data.shop.invoice_layout); }, [data?.shop?.invoice_layout]);
  useEffect(() => {
    if (data?.shop?.thermal_paper_size) {
      setThermalSize(data.shop.thermal_paper_size);
    }
  }, [data?.shop?.thermal_paper_size]);

  useEffect(() => {
    if (data) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [data]);

  if (isLoading) return <div className="p-8 text-slate-500">Loading bill…</div>;
  if (!data) return <div className="p-8 text-red-600">Bill not found.</div>;

  return (
    <div className="bg-slate-100 min-h-screen">
      <PrintStyles layout={layout} thermalSize={thermalSize} />

      <div className="no-print bg-white border-b border-slate-200 px-4 py-3 flex flex-wrap gap-3 items-center justify-between sticky top-0 z-10">
        <h1 className="text-sm font-semibold">
          Print preview — Bill {data.bill_number}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Invoice layout" value={invoiceLayout} onChange={e => { setInvoiceLayout(e.target.value as InvoiceLayout); setLayout('a4'); }} className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"><option value="uniwest">Uniwest layout</option><option value="tejas">Tejas layout</option></select>
          <button
            onClick={() => setLayout('a4')}
            className={`px-3 py-1.5 rounded-md text-sm ${layout === 'a4' ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}
          >
            A4
          </button>
          <button
            onClick={() => {
              setLayout('thermal');
              setThermalSize('58mm');
            }}
            className={`px-3 py-1.5 rounded-md text-sm ${layout === 'thermal' && thermalSize === '58mm' ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}
          >
            Thermal 58mm
          </button>
          <button
            onClick={() => {
              setLayout('thermal');
              setThermalSize('80mm');
            }}
            className={`px-3 py-1.5 rounded-md text-sm ${layout === 'thermal' && thermalSize === '80mm' ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}
          >
            Thermal 80mm
          </button>
          <button
            onClick={() => window.print()}
            className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm"
          >
            <Printer className="h-4 w-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      <div className="flex justify-center overflow-x-auto py-6 print:py-0">
        {layout === 'a4' ? (
          <InvoiceDocument data={data} layout={invoiceLayout} />
        ) : (
          <ThermalLayout data={data} size={thermalSize} />
        )}
      </div>
    </div>
  );
}

function PrintStyles({
  layout,
  thermalSize,
}: {
  layout: 'a4' | 'thermal';
  thermalSize: ThermalMm;
}) {
  const pageSize =
    layout === 'thermal' ? `${thermalSize} auto` : 'A4 portrait';
  return (
    <style>{`
      @media print {
        .no-print { display: none !important; }
        body { background: white !important; margin: 0; }
        .bill-page { box-shadow: none !important; margin: 0 !important; }
      }
      @page {
        size: ${pageSize};
        margin: ${layout === 'thermal' ? '2mm' : '12mm'};
      }
    `}</style>
  );
}

function ThermalLayout({ data, size }: { data: BillDetail; size: ThermalMm }) {
  const isGst = data.bill_type === 'gst';
  return (
    <div
      className="bill-page bg-white shadow-md"
      style={{
        width: size,
        padding: '4mm',
        fontFamily: 'Menlo, Consolas, monospace',
        fontSize: 10,
        lineHeight: 1.3,
      }}
    >
      <div className="text-center font-bold">{data.shop?.name || 'AgroShop'}</div>
      {data.shop?.address && (
        <div className="text-center text-[9px] whitespace-pre-line">{data.shop.address}</div>
      )}
      {data.shop?.phone && <div className="text-center text-[9px]">Ph: {data.shop.phone}</div>}
      {isGst && data.shop?.gstin && (
        <div className="text-center text-[9px]">GSTIN: {data.shop.gstin}</div>
      )}

      <hr className="border-slate-400 my-1" />
      <div className="text-center font-bold">{isGst ? 'TAX INVOICE' : 'CASH MEMO'}</div>
      <div className="text-[9px]">Bill: {data.bill_number}</div>
      <div className="text-[9px]">Date: {new Date(data.bill_date).toLocaleDateString('en-IN')}</div>
      <div className="text-[9px]">
        Cust: {data.customer_name || data.party?.name || 'Walk-in'}
      </div>
      {(data.customer_mobile || data.party?.mobile) && (
        <div className="text-[9px]">Mob: {data.customer_mobile || data.party?.mobile}</div>
      )}

      <hr className="border-slate-400 my-1" />
      <div className="flex justify-between text-[9px] font-bold">
        <span>Item</span>
        <span>Qty x Rate</span>
        <span>Amt</span>
      </div>
      <hr className="border-slate-400 my-1" />

      {data.items.map((it) => (
        <div key={it.id} className="mb-1">
          <div className="text-[10px] font-medium">{it.product_name}</div>
          <div className="flex justify-between text-[9px]">
            <span>
              {formatNumber(it.quantity, 2)} {it.unit} × {Number(it.rate).toFixed(2)}
              {isGst && ` (${Number(it.gst_rate).toFixed(0)}%)`}
            </span>
            <span className="font-mono">{Number(it.total_amount).toFixed(2)}</span>
          </div>
        </div>
      ))}

      <hr className="border-slate-400 my-1" />
      <div className="flex justify-between text-[10px]">
        <span>Subtotal</span>
        <span className="font-mono">{Number(data.subtotal).toFixed(2)}</span>
      </div>
      {isGst && (
        <>
          <div className="flex justify-between text-[9px]">
            <span>CGST</span>
            <span className="font-mono">{Number(data.cgst_total).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[9px]">
            <span>SGST</span>
            <span className="font-mono">{Number(data.sgst_total).toFixed(2)}</span>
          </div>
        </>
      )}
      {Number(data.discount_amount) > 0 && (
        <div className="flex justify-between text-[9px]">
          <span>Discount</span>
          <span className="font-mono">- {Number(data.discount_amount).toFixed(2)}</span>
        </div>
      )}
      <hr className="border-slate-400 my-1" />
      <div className="flex justify-between font-bold text-[11px]">
        <span>TOTAL</span>
        <span className="font-mono">{Number(data.grand_total).toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-[9px]">
        <span>Paid ({data.payment_mode})</span>
        <span className="font-mono">{Number(data.paid_amount).toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-[9px]">
        <span>Balance</span>
        <span className="font-mono">
          {(Number(data.grand_total) - Number(data.paid_amount)).toFixed(2)}
        </span>
      </div>

      <hr className="border-slate-400 my-1" />
      <div className="text-[9px] italic">{inrInWords(Number(data.grand_total))}</div>

      {data.shop?.show_bank_details && data.shop.bank_account && (
        <>
          <hr className="border-slate-400 my-1" />
          <div className="text-[9px]">
            <div className="font-bold">Bank: {data.shop.bank_name || '—'}</div>
            <div>A/c: {data.shop.bank_account}</div>
            <div>IFSC: {data.shop.bank_ifsc || '—'}</div>
          </div>
        </>
      )}

      {data.shop?.show_terms && data.shop.bill_terms && (
        <>
          <hr className="border-slate-400 my-1" />
          <div className="text-[9px] whitespace-pre-line">{data.shop.bill_terms}</div>
        </>
      )}

      <div className="mt-3 text-center text-[9px]">
        {(isGst
          ? data.shop?.footer_message_gst
          : data.shop?.footer_message_non_gst) || 'Thank you. Visit again.'}
      </div>

      {data.status === 'cancelled' && (
        <div className="mt-2 text-center text-[10px] font-bold text-red-600">CANCELLED</div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
