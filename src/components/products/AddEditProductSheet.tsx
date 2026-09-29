import { convertQuantity, unitConversionFactor } from '@/lib/units';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Info, Loader2, Upload } from 'lucide-react';
import { useActionNotify } from '@/hooks/useActionNotify';
import { api } from '@/lib/axios';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { UnitInput } from '@/components/ui/unit-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Product } from '@/types';
import { useCategories } from '@/hooks/useCategories';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  brand: z.string().optional(),
  category_id: z.string().optional(),
  hsn_code: z.string().optional(),
  unit: z.string().trim().min(1, 'Unit is required').max(64),
  pack_label: z.string().max(80).optional(),
  packing_type: z.string().max(40).optional(),
  units_per_pack: z.coerce.number().min(0).optional(),
  pack_size: z.coerce.number().min(0).optional(),
  purchase_price: z.coerce.number().min(0),
  selling_price: z.coerce.number().min(0),
  gst_rate: z.coerce.number().min(0).max(100),
  current_stock: z.coerce.number().min(0),
  min_stock_level: z.coerce.number().min(0),
  batch_number: z.string().optional(),
  expiry_date: z.string().optional(),
  notes: z.string().optional(),
});

type FormInput = z.infer<typeof schema>;

const UNIT_OPTIONS = ['ml', 'gm', 'ltr', 'kg', 'packet', 'bottle', 'box', 'piece'] as const;

// Quick-pick pack sizes shown per unit (tap a chip to fill the size). Empty = no presets, free entry only.
const PACK_SIZE_PRESETS: Record<string, number[]> = {
  ml: [50, 100, 200, 250, 500, 1000],
  gm: [50, 100, 250, 500, 1000],
  ltr: [1, 2, 5, 10, 20],
  kg: [1, 5, 10, 25, 50],
  packet: [],
  bottle: [],
  box: [],
  piece: [],
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product?: Product | null;
}

export function AddEditProductSheet({ open, onOpenChange, product }: Props) {
  const queryClient = useQueryClient();
  const { notify } = useActionNotify();
  const { data: categories = [] } = useCategories();
  const committedUnit = useRef('piece');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      brand: '',
      category_id: '',
      hsn_code: '',
      unit: 'piece',
      pack_size: 0,
      pack_label: '',
      packing_type: '',
      units_per_pack: 0,
      purchase_price: 0,
      selling_price: 0,
      gst_rate: 0,
      current_stock: 0,
      min_stock_level: 0,
      batch_number: '',
      expiry_date: '',
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        brand: product.brand || '',
        category_id: product.category_id || '',
        hsn_code: product.hsn_code || '',
        unit: product.unit,
        pack_size: product.pack_size ? Number(product.pack_size) : 0,
        pack_label: product.pack_label || '',
        packing_type: product.packing_type || '',
        units_per_pack: product.units_per_pack || 0,
        purchase_price: Number(product.purchase_price),
        selling_price: Number(product.selling_price),
        gst_rate: product.gst_rate,
        current_stock: Number(product.current_stock),
        min_stock_level: Number(product.min_stock_level),
        batch_number: product.batch_number || '',
        expiry_date: product.expiry_date || '',
      });
      setImagePreview(product.image_url);
    } else {
      form.reset({
        name: '',
        brand: '',
        category_id: '',
        hsn_code: '',
        unit: 'piece',
        pack_size: 0,
        pack_label: '',
        packing_type: '',
        units_per_pack: 0,
        purchase_price: 0,
        selling_price: 0,
        gst_rate: 0,
        current_stock: 0,
        min_stock_level: 0,
        batch_number: '',
        expiry_date: '',
      });
      setImagePreview(null);
    }
    committedUnit.current = product?.unit || 'piece';
    setImageFile(null);
  }, [product, open]);

  const mutation = useMutation({
    mutationFn: async (values: FormInput) => {
      const fd = new FormData();
      Object.entries(values).forEach(([k, v]) => {
        if (v !== undefined && v !== null) fd.append(k, k === 'units_per_pack' && !v ? 'null' : String(v));
      });
      if (imageFile) fd.append('image', imageFile);
      if (product) {
        return api.put(`/products/${product.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      return api.post('/products', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (_data, values) => {
      toast.success(product ? 'Product updated' : 'Product created');
      notify(product ? 'Product Updated' : 'Product Added', `${values.name} has been ${product ? 'updated' : 'added'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      onOpenChange(false);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to save product');
    },
  });

  const [unitNote, setUnitNote] = useState<{ tone: 'info' | 'warn' | 'error'; text: string } | null>(null);
  useEffect(() => setUnitNote(null), [product, open]);

  /** Applies a unit change to the form. Returns false when the values cannot be converted. */
  function commitUnit(): boolean {
    const from = committedUnit.current;
    const to = form.getValues('unit').trim();
    if (!to || to === from) return true;
    let factor: number;
    try { factor = unitConversionFactor(from, to); } catch {
      // ponytail: different dimensions (piece -> gm) are a unit correction; backend relabels the same way.
      committedUnit.current = to;
      setUnitNote({ tone: 'warn', text: `${from} and ${to} measure different things, so nothing was converted. Stock, prices and pack size below are now counted in ${to}. Check them before saving.` });
      return true;
    }
    try {
      const quantities = (['current_stock', 'min_stock_level', 'pack_size'] as const).map(key => [key, convertQuantity(Number(form.getValues(key) || 0), from, to)] as const);
      const prices = (['purchase_price', 'selling_price'] as const).map(key => {
        const old = Number(form.getValues(key) || 0);
        const next = Math.round(old / factor * 100) / 100;
        return [key, next, Math.abs(next * factor - old) > 0.005] as const;
      });
      quantities.forEach(([key, value]) => form.setValue(key, value, { shouldDirty: true }));
      prices.forEach(([key, value]) => form.setValue(key, value, { shouldDirty: true }));
      committedUnit.current = to;
      const rounded = prices.some(([, , lossy]) => lossy);
      setUnitNote({
        tone: rounded ? 'warn' : 'info',
        text: `Converted ${from} → ${to} (1 ${from} = ${+factor.toFixed(6)} ${to}). Stock, pack size and prices were updated.` + (rounded ? ' Prices were rounded to 2 decimals, so check them.' : ''),
      });
      return true;
    } catch (err) {
      setUnitNote({ tone: 'error', text: (err as Error).message });
      return false;
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  const unit = form.watch('unit') || 'unit';
  const presets = PACK_SIZE_PRESETS[unit.trim().toLowerCase()] ?? [];
  const purchase = Number(form.watch('purchase_price')) || 0;
  const selling = Number(form.watch('selling_price')) || 0;
  const margin = selling - purchase;
  const errors = form.formState.errors;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto pb-0">
        <SheetHeader>
          <SheetTitle>{product ? 'Edit product' : 'Add product'}</SheetTitle>
          <p className="text-sm text-slate-500">Stock, prices and pack size are all counted per <b className="text-slate-700">{unit}</b>.</p>
        </SheetHeader>

        <form
          id="product-form"
          onSubmit={e => { e.preventDefault(); if (commitUnit()) void form.handleSubmit(v => mutation.mutate(v))(); }}
          className="space-y-6"
        >
          <Section title="Basic details">
            <div className="flex gap-4">
              <button
                type="button"
                className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 transition-colors hover:bg-slate-100"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload product image"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex flex-col items-center text-xs text-slate-400"><Upload className="mb-1 h-5 w-5" />Image</span>
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onFileChange} />
              <div className="grid flex-1 gap-4 sm:grid-cols-2">
                <FormField label="Name *" error={errors.name?.message}>
                  <Input {...form.register('name')} placeholder="Glyphosate 41% SL" />
                </FormField>
                <FormField label="Brand">
                  <Input {...form.register('brand')} placeholder="Roundup" />
                </FormField>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Category">
                <Select value={form.watch('category_id') || ''} onValueChange={(v) => form.setValue('category_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="HSN code">
                <Input {...form.register('hsn_code')} placeholder="3808" />
              </FormField>
            </div>
          </Section>

          <Section title="Unit & packing">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Stock unit *" error={errors.unit?.message}>
                <UnitInput
                  value={form.watch('unit')}
                  onBlur={commitUnit}
                  onValueChange={value => {
                    form.setValue('unit', value, { shouldDirty: true });
                    // Datalist picks don't blur, so commit known units right away.
                    if (UNIT_OPTIONS.includes(value.trim().toLowerCase() as never)) commitUnit();
                  }}
                />
                {unitNote ? (
                  <p className={cn('flex gap-1.5 rounded-md px-2.5 py-2 text-xs', NOTE_STYLES[unitNote.tone])}>
                    {unitNote.tone === 'info' ? <Info className="mt-px h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />}
                    {unitNote.text}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">ml, ltr, gm, kg convert automatically. Or type a custom unit such as 200 ml.</p>
                )}
              </FormField>
              <FormField label={`Pack size (${unit})`}>
                <SuffixInput suffix={unit} type="number" step="0.001" min="0" placeholder="0" {...form.register('pack_size')} />
                {presets.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {presets.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => form.setValue('pack_size', size, { shouldDirty: true })}
                        className={cn(
                          'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                          Number(form.watch('pack_size')) === size ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                        )}
                      >
                        {size} {unit}
                      </button>
                    ))}
                  </div>
                )}
              </FormField>
              <FormField label="Pack label">
                <UnitInput value={form.watch('pack_label') || ''} onValueChange={value => form.setValue('pack_label', value)} options={['200 ml', '250 ml', '500 ml', '1 ltr', '1 kg', '5 kg']} placeholder="e.g. 250 ml" />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Packing type">
                  <UnitInput value={form.watch('packing_type') || ''} onValueChange={value => form.setValue('packing_type', value)} options={['CARTON', 'BAG', 'BUCKET', 'BOX', 'BOTTLE']} placeholder="CARTON" />
                </FormField>
                <FormField label="Units per pack">
                  <Input type="number" min="0" step="any" {...form.register('units_per_pack')} placeholder="40" />
                </FormField>
              </div>
            </div>
          </Section>

          <Section title="Pricing & tax">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label={`Purchase price / ${unit}`} error={errors.purchase_price?.message}>
                <SuffixInput prefix="₹" type="number" step="0.01" min="0" {...form.register('purchase_price')} />
              </FormField>
              <FormField label={`Selling price / ${unit}`} error={errors.selling_price?.message}>
                <SuffixInput prefix="₹" type="number" step="0.01" min="0" {...form.register('selling_price')} />
              </FormField>
              <FormField label="GST rate">
                <Select value={String(form.watch('gst_rate') ?? 0)} onValueChange={(v) => form.setValue('gst_rate', Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0, 5, 12, 18, 28, 40].map((r) => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
            {purchase > 0 && selling > 0 && (
              <p className={cn('text-xs', margin < 0 ? 'text-red-600' : 'text-slate-500')}>
                {margin < 0 ? 'Selling below purchase price: ' : 'Margin: '}₹{margin.toFixed(2)} per {unit} ({((margin / purchase) * 100).toFixed(1)}%)
              </p>
            )}
          </Section>

          <Section title="Stock">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={product ? 'Current stock' : 'Opening stock'} error={errors.current_stock?.message}>
                <SuffixInput suffix={unit} type="number" step="0.001" min="0" {...form.register('current_stock')} />
                {product && <p className="text-xs text-slate-500">Changing this records a stock adjustment.</p>}
              </FormField>
              <FormField label="Min stock level" error={errors.min_stock_level?.message}>
                <SuffixInput suffix={unit} type="number" step="0.001" min="0" {...form.register('min_stock_level')} />
              </FormField>
              <FormField label="Batch number">
                <Input {...form.register('batch_number')} />
              </FormField>
              <FormField label="Expiry date">
                <Input type="date" {...form.register('expiry_date')} />
              </FormField>
            </div>
          </Section>
        </form>

        <SheetFooter className="sticky bottom-0 -mx-6 mt-6 bg-white px-6 pb-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button form="product-form" type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {product ? 'Save changes' : 'Create product'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

const NOTE_STYLES = {
  info: 'bg-emerald-50 text-emerald-800',
  warn: 'bg-amber-50 text-amber-800',
  error: 'bg-red-50 text-red-700',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="border-b border-slate-100 pb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

const SuffixInput = forwardRef<HTMLInputElement, React.ComponentProps<typeof Input> & { prefix?: string; suffix?: string }>(
  ({ prefix, suffix, className, ...props }, ref) => (
    <div className="relative">
      {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{prefix}</span>}
      <Input ref={ref} className={cn(prefix && 'pl-7', suffix && 'pr-16', className)} {...props} />
      {suffix && <span className="pointer-events-none absolute right-3 top-1/2 max-w-[3.5rem] -translate-y-1/2 truncate text-sm text-slate-400">{suffix}</span>}
    </div>
  ),
);
SuffixInput.displayName = 'SuffixInput';

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
