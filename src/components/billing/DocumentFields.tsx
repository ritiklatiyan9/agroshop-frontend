import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { DocumentDetails } from '@/types';

export const EMPTY_DOCUMENT: DocumentDetails = {
  place_of_supply: '', state_code: '', reverse_charge: false, delivery_note: '', delivery_note_date: '', dispatch_doc_no: '',
  dispatched_through: '', destination: '', gr_rr_no: '', vehicle_number: '', station: '', shipping_name: '', shipping_address: '',
  shipping_gstin: '', shipping_mobile: '', shipping_state: '', shipping_state_code: '', terms_of_delivery: '', copy_label: 'Original Copy',
};

const fields: Array<[keyof Omit<DocumentDetails, 'reverse_charge'>, string, string?]> = [
  ['place_of_supply', 'Place of supply'], ['state_code', 'State code'], ['delivery_note', 'Delivery note'], ['delivery_note_date', 'Delivery note date', 'date'],
  ['dispatch_doc_no', 'Dispatch document no.'], ['dispatched_through', 'Dispatched through / Transport'], ['destination', 'Destination'],
  ['gr_rr_no', 'GR / RR number'], ['vehicle_number', 'Vehicle number'], ['station', 'Station'], ['copy_label', 'Copy label'], ['terms_of_delivery', 'Terms of delivery'],
];

export function DocumentFields({ value, onChange, purchase = false }: { value: DocumentDetails; onChange: (value: DocumentDetails) => void; purchase?: boolean }) {
  const id = useId();
  const update = (key: keyof DocumentDetails, val: string | boolean) => onChange({ ...value, [key]: val });
  return <details className="rounded-xl border border-slate-200 bg-white p-4">
    <summary className="cursor-pointer text-sm font-semibold text-slate-800">Delivery, transport and {purchase ? 'ship-to' : 'invoice'} details</summary>
    <p className="mb-4 mt-2 text-xs text-slate-500">These details are saved with this document and printed in the selected layout.</p>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map(([key, label, type]) => <div key={key} className="space-y-1">
        <Label htmlFor={`${id}-${key}`}>{label}</Label>
        <Input id={`${id}-${key}`} type={type || 'text'} value={value[key]} onChange={e => update(key, e.target.value)} />
      </div>)}
    </div>
    <label className="my-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={value.reverse_charge} onChange={e => update('reverse_charge', e.target.checked)} /> Reverse charge</label>
    <div className="border-t border-slate-100 pt-4">
      <h3 className="mb-1 text-sm font-semibold">Shipped to</h3>
      <p className="mb-3 text-xs text-slate-500">Leave blank to use {purchase ? 'your shop' : 'the billed-to customer'}.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {([['shipping_name', 'Name'], ['shipping_mobile', 'Mobile'], ['shipping_gstin', 'GSTIN / UIN'], ['shipping_state', 'State'], ['shipping_state_code', 'State code']] as const).map(([key, label]) => <div key={key} className="space-y-1">
          <Label htmlFor={`${id}-${key}`}>{label}</Label><Input id={`${id}-${key}`} value={value[key]} onChange={e => update(key, e.target.value)} />
        </div>)}
        <div className="space-y-1 sm:col-span-2"><Label htmlFor={`${id}-address`}>Address</Label><Textarea id={`${id}-address`} rows={2} value={value.shipping_address} onChange={e => update('shipping_address', e.target.value)} /></div>
      </div>
    </div>
  </details>;
}
