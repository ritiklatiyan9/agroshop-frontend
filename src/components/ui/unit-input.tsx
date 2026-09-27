import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { useCurrentShop } from '@/store/authStore';

export const DEFAULT_UNITS = ['ml', 'ltr', 'kg', 'gm', 'piece', 'packet', 'bottle', 'box', 'carton', 'bag', 'bucket', '200 ml', '250 ml'];

export function UnitInput({ value, onValueChange, className, disabled, placeholder = 'Choose or type a unit', options, onBlur }: {
  value: string; onValueChange: (value: string) => void; className?: string; disabled?: boolean; placeholder?: string; options?: string[]; onBlur?: () => void;
}) {
  const id = useId();
  const shop = useCurrentShop();
  const suggestions = options ?? shop?.unit_options ?? DEFAULT_UNITS;
  return <>
    <Input aria-label={placeholder} list={id} value={value} onChange={e => onValueChange(e.target.value)} className={className} onBlur={onBlur} disabled={disabled} placeholder={placeholder} maxLength={64} />
    <datalist id={id}>{[...new Set(suggestions)].map(unit => <option key={unit} value={unit} />)}</datalist>
  </>;
}
