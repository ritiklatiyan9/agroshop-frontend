import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UnitInput } from '@/components/ui/unit-input';
import type { BillItemInput } from '@/lib/billCalculator';

type Packing = Pick<BillItemInput, 'pack_label' | 'packing_type' | 'units_per_pack' | 'pack_count' | 'list_price' | 'discount_percent'>;
export function PackingFields({ value, onChange }: { value: Packing; onChange: (value: Partial<Packing>) => void }) {
  return <details className="mt-2 rounded-md border border-slate-100 p-2 text-xs">
    <summary className="cursor-pointer text-slate-500">{value.pack_label || 'Pack size / packing'}{value.units_per_pack ? ` × ${value.units_per_pack}` : ''}{value.packing_type ? ` · ${value.packing_type}` : ''}{value.discount_percent ? ` · ${value.discount_percent}% off` : ''}</summary>
    <div className="mt-2 grid grid-cols-2 gap-2">
      <div><Label className="text-xs">Pack size</Label><UnitInput value={value.pack_label || ''} onValueChange={pack_label => onChange({ pack_label })} options={['50 ml', '100 ml', '200 ml', '250 ml', '500 ml', '1 ltr', '5 ltr', '100 gm', '250 gm', '1 kg', '5 kg']} placeholder="e.g. 250 ml" className="h-8 text-xs" /></div>
      <div><Label className="text-xs">Packing</Label><UnitInput value={value.packing_type || ''} onValueChange={packing_type => onChange({ packing_type })} options={['CARTON', 'BAG', 'BUCKET', 'BOX', 'BOTTLE']} placeholder="e.g. CARTON" className="h-8 text-xs" /></div>
      {([['units_per_pack', 'Units / pack', 'any'], ['pack_count', 'No. of packs', '0.001'], ['list_price', 'List price', '0.01'], ['discount_percent', 'Discount %', '0.01']] as const).map(([key, label, step]) => <div key={key}>
        <Label className="text-xs">{label}</Label>
        <Input aria-label={label} type="number" min="0" max={key === 'discount_percent' ? 100 : undefined} step={step} inputMode="decimal" value={value[key] ?? ''}
          onChange={e => onChange({ [key]: e.target.value === '' && (key === 'units_per_pack' || key === 'pack_count') ? null : Number(e.target.value) })} className="h-8 text-xs" />
      </div>)}
    </div>
  </details>;
}
