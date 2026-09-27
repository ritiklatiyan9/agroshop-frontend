import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { api } from '@/lib/axios';
import { InvoiceDocument, purchaseAsBill } from '@/components/billing/InvoiceDocument';
import type { Purchase, InvoiceLayout } from '@/types';

export function PurchasePrintPage() {
  const { id } = useParams();
  const [layout, setLayout] = useState<InvoiceLayout>('uniwest');
  const { data, isLoading, error } = useQuery({ queryKey: ['purchase-print', id], queryFn: async () => (await api.get<Purchase>(`/purchases/${id}`)).data, enabled: !!id });
  useEffect(() => {
    if (!data) return;
    setLayout(data.shop?.invoice_layout || 'uniwest');
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, [data]);
  if (isLoading) return <div className="p-6">Loading purchase document…</div>;
  if (error || !data) return <div className="p-6 text-red-600">Unable to load this purchase document.</div>;
  return <div className="min-h-screen bg-slate-100">
    <style>{`@page { size: A4 portrait; margin: 12mm; } @media print { .no-print { display: none !important; } body { background: white !important; margin: 0; } .purchase-preview { padding: 0 !important; background: white !important; } }`}</style>
    <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3"><strong>{data.document_type === 'purchase_order' ? 'Purchase order' : 'Purchase'} print preview</strong><div className="flex gap-2"><select aria-label="Document layout" value={layout} onChange={e => setLayout(e.target.value as InvoiceLayout)} className="rounded-md border px-3 py-2"><option value="uniwest">Uniwest layout</option><option value="tejas">Tejas layout</option></select><button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm text-white"><Printer className="h-4 w-4" />Print / Save PDF</button></div></div>
    <div className="purchase-preview overflow-x-auto py-6"><InvoiceDocument data={purchaseAsBill(data)} layout={layout} kind={data.document_type || 'purchase'} /></div>
  </div>;
}
