import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { api } from '@/lib/axios';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { inrInWords } from '@/lib/numberToWords';
import type { BillDetail, ThermalSize } from '@/types';

type ThermalMm = ThermalSize;

export function BillPrintPage() {
  const { id } = useParams<{ id: string }>();
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

      <div className="no-print bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-sm font-semibold">
          Print preview — Bill {data.bill_number}
        </h1>
        <div className="flex items-center gap-2">
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

      <div className="flex justify-center py-6 print:py-0">
        {layout === 'a4' ? (
          <A4Layout data={data} />
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

function A4Layout({ data }: { data: BillDetail }) {
  const isGst = data.bill_type === 'gst';
  return (
    <div
      className="bill-page bg-white p-8 shadow-md"
      style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Inter, sans-serif', fontSize: 12 }}
    >
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
        <div>
          <h1 className="text-2xl font-bold">{data.shop?.name || 'AgroShop'}</h1>
          {data.shop?.address && (
            <div className="text-xs text-slate-600 whitespace-pre-line max-w-md">
              {data.shop.address}
            </div>
          )}
          <div className="text-xs text-slate-600 mt-1">
            {data.shop?.phone && <span>Phone: {data.shop.phone}</span>}
            {data.shop?.gstin && <span className="ml-3">GSTIN: {data.shop.gstin}</span>}
            {data.shop?.license_no && <span className="ml-3">License: {data.shop.license_no}</span>}
          </div>
        </div>
        {data.shop?.logo_url && (
          <img src={data.shop.logo_url} alt="Logo" style={{ height: 56, objectFit: 'contain' }} />
        )}
      </div>

      <div className="text-center my-3">
        <div className="text-sm font-bold tracking-widest">
          {isGst ? 'TAX INVOICE' : 'CASH MEMO'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="border border-slate-200 rounded p-2">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Billed to</div>
          <div className="font-semibold">{data.customer_name || data.party?.name || 'Walk-in customer'}</div>
          {(data.customer_mobile || data.party?.mobile) && (
            <div className="text-xs">{data.customer_mobile || data.party?.mobile}</div>
          )}
          {isGst && (data.customer_gstin || data.party?.gstin) && (
            <div className="text-xs">GSTIN: {data.customer_gstin || data.party?.gstin}</div>
          )}
          {(data.customer_address || data.party?.address) && (
            <div className="text-xs whitespace-pre-line">
              {data.customer_address || data.party?.address}
            </div>
          )}
        </div>
        <div className="border border-slate-200 rounded p-2">
          <div className="grid grid-cols-2 gap-y-0.5 text-xs">
            <span className="text-slate-500">Bill #</span>
            <span className="font-mono font-semibold">{data.bill_number}</span>
            <span className="text-slate-500">Date</span>
            <span>{new Date(data.bill_date).toLocaleDateString('en-IN')}</span>
            <span className="text-slate-500">Payment</span>
            <span className="uppercase">{data.payment_mode}</span>
            <span className="text-slate-500">Status</span>
            <span className="uppercase font-semibold">{data.payment_status}</span>
          </div>
        </div>
      </div>

      <table className="w-full border border-slate-300 text-xs">
        <thead className="bg-slate-100 border-b border-slate-300">
          <tr>
            <th className="p-1.5 text-left w-8">#</th>
            <th className="p-1.5 text-left">Product</th>
            {isGst && <th className="p-1.5 text-left w-16">HSN</th>}
            <th className="p-1.5 text-right w-14">Qty</th>
            <th className="p-1.5 text-left w-12">Unit</th>
            <th className="p-1.5 text-right w-16">Rate</th>
            {isGst && (
              <>
                <th className="p-1.5 text-right w-12">GST%</th>
                <th className="p-1.5 text-right w-16">CGST</th>
                <th className="p-1.5 text-right w-16">SGST</th>
              </>
            )}
            <th className="p-1.5 text-right w-20">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((it, i) => (
            <tr key={it.id} className="border-b border-slate-200">
              <td className="p-1.5">{i + 1}</td>
              <td className="p-1.5">{it.product_name}</td>
              {isGst && <td className="p-1.5">{it.hsn_code || '-'}</td>}
              <td className="p-1.5 text-right font-mono">{formatNumber(it.quantity, 2)}</td>
              <td className="p-1.5">{it.unit}</td>
              <td className="p-1.5 text-right font-mono">{Number(it.rate).toFixed(2)}</td>
              {isGst && (
                <>
                  <td className="p-1.5 text-right">{Number(it.gst_rate).toFixed(0)}%</td>
                  <td className="p-1.5 text-right font-mono">{Number(it.cgst_amount).toFixed(2)}</td>
                  <td className="p-1.5 text-right font-mono">{Number(it.sgst_amount).toFixed(2)}</td>
                </>
              )}
              <td className="p-1.5 text-right font-mono">{Number(it.total_amount).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-4 mt-3">
        <div className="text-xs">
          <div className="border border-slate-200 rounded p-2 min-h-[80px]">
            <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
              Amount in words
            </div>
            <div className="italic">{inrInWords(Number(data.grand_total))}</div>
          </div>
          {data.notes && (
            <div className="mt-2 text-[11px] text-slate-600">
              <span className="font-semibold">Notes:</span> {data.notes}
            </div>
          )}
        </div>
        <div className="text-xs">
          <div className="border border-slate-200 rounded p-2 space-y-1">
            <Row label="Subtotal" value={formatCurrency(data.subtotal)} />
            {isGst && (
              <>
                <Row label="CGST" value={formatCurrency(data.cgst_total)} />
                <Row label="SGST" value={formatCurrency(data.sgst_total)} />
              </>
            )}
            <Row label="Discount" value={`- ${formatCurrency(data.discount_amount)}`} />
            <div className="flex justify-between border-t pt-1 mt-1 font-bold text-sm">
              <span>Grand total</span>
              <span className="font-mono">{formatCurrency(data.grand_total)}</span>
            </div>
            <Row label="Paid" value={formatCurrency(data.paid_amount)} />
            <Row
              label="Balance"
              value={formatCurrency(Number(data.grand_total) - Number(data.paid_amount))}
            />
          </div>
        </div>
      </div>

      {data.shop?.show_bank_details && data.shop.bank_account && (
        <div className="mt-4 border border-slate-200 rounded p-2 text-xs">
          <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">
            Bank details
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-slate-500">Bank:</span> {data.shop.bank_name || '—'}
            </div>
            <div>
              <span className="text-slate-500">A/c:</span>{' '}
              <span className="font-mono">{data.shop.bank_account}</span>
            </div>
            <div>
              <span className="text-slate-500">IFSC:</span>{' '}
              <span className="font-mono">{data.shop.bank_ifsc || '—'}</span>
            </div>
          </div>
        </div>
      )}

      {data.shop?.show_terms && data.shop.bill_terms && (
        <div className="mt-4 text-[10px] text-slate-600 whitespace-pre-line border-t border-dashed border-slate-300 pt-2">
          <span className="font-semibold text-slate-700">Terms & conditions:</span>{' '}
          {data.shop.bill_terms}
        </div>
      )}

      {data.shop?.show_signature_line !== false && (
        <div className="mt-8 grid grid-cols-2 gap-8 text-xs">
          <div className="text-center border-t border-slate-400 pt-1">Receiver signature</div>
          <div className="text-center border-t border-slate-400 pt-1">
            For {data.shop?.name || 'AgroShop'}
            <div className="mt-4 text-slate-500">Authorized signatory</div>
          </div>
        </div>
      )}

      {(isGst ? data.shop?.footer_message_gst : data.shop?.footer_message_non_gst) && (
        <div className="mt-4 text-center text-[11px] italic text-slate-600">
          {isGst ? data.shop?.footer_message_gst : data.shop?.footer_message_non_gst}
        </div>
      )}

      {data.status === 'cancelled' && (
        <div className="mt-4 text-center text-red-600 font-bold uppercase tracking-widest">
          CANCELLED — {data.cancellation_reason}
        </div>
      )}
    </div>
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
