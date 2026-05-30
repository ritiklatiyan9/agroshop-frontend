import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Upload } from 'lucide-react';
import { useActionNotify } from '@/hooks/useActionNotify';
import { api } from '@/lib/axios';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  unit: z.enum(['kg', 'gm', 'ltr', 'ml', 'packet', 'bottle', 'box', 'piece']),
  pack_size: z.coerce.number().min(0).optional(),
  purchase_price: z.coerce.number().min(0),
  selling_price: z.coerce.number().min(0),
  gst_rate: z.coerce.number().refine((v) => [0, 5, 12, 18].includes(v)),
  current_stock: z.coerce.number().min(0),
  min_stock_level: z.coerce.number().min(0),
  batch_number: z.string().optional(),
  expiry_date: z.string().optional(),
  notes: z.string().optional(),
});

type FormInput = z.infer<typeof schema>;

const UNIT_OPTIONS = ['ml', 'gm', 'ltr', 'kg', 'packet', 'bottle', 'box', 'piece'] as const;

// Quick-pick pack sizes shown per unit (tap a chip to fill the size). Empty = no presets, free entry only.
const PACK_SIZE_PRESETS: Record<FormInput['unit'], number[]> = {
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
    setImageFile(null);
  }, [product, open]);

  const mutation = useMutation({
    mutationFn: async (values: FormInput) => {
      const fd = new FormData();
      Object.entries(values).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') fd.append(k, String(v));
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

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{product ? 'Edit product' : 'Add product'}</SheetTitle>
        </SheetHeader>

        <form id="product-form" onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="grid gap-5">
          <div>
            <Label>Image</Label>
            <div
              className="mt-1.5 flex h-32 w-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-slate-400 text-xs">
                  <Upload className="h-5 w-5 mb-1" />
                  <span>Upload</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={onFileChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Name *" error={form.formState.errors.name?.message}>
              <Input {...form.register('name')} placeholder="Glyphosate 41% SL" />
            </FormField>
            <FormField label="Brand">
              <Input {...form.register('brand')} placeholder="Roundup" />
            </FormField>

            <FormField label="Category">
              <Select
                value={form.watch('category_id') || ''}
                onValueChange={(v) => form.setValue('category_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="HSN code">
              <Input {...form.register('hsn_code')} placeholder="3808" />
            </FormField>

            <FormField label="Unit">
              <Select
                value={form.watch('unit')}
                onValueChange={(v) => form.setValue('unit', v as FormInput['unit'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="GST rate (%)">
              <Select
                value={String(form.watch('gst_rate') ?? 0)}
                onValueChange={(v) => form.setValue('gst_rate', Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 5, 12, 18].map((r) => (
                    <SelectItem key={r} value={String(r)}>
                      {r}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <div className="md:col-span-2 space-y-1.5">
              <Label>Pack size ({form.watch('unit')})</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="e.g. 100"
                  className="max-w-[160px]"
                  {...form.register('pack_size')}
                />
                <span className="text-sm text-slate-500">{form.watch('unit')}</span>
              </div>
              {PACK_SIZE_PRESETS[form.watch('unit')].length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PACK_SIZE_PRESETS[form.watch('unit')].map((size) => {
                    const active = Number(form.watch('pack_size')) === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => form.setValue('pack_size', size, { shouldDirty: true })}
                        className={
                          'rounded-full border px-3 py-1 text-xs font-medium transition-colors ' +
                          (active
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')
                        }
                      >
                        {size}{form.watch('unit')}
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-slate-400">Tap a preset or type a custom size. Leave 0 if not applicable.</p>
            </div>

            <FormField label="Purchase price (₹)">
              <Input type="number" step="0.01" {...form.register('purchase_price')} />
            </FormField>
            <FormField label="Selling price (₹)">
              <Input type="number" step="0.01" {...form.register('selling_price')} />
            </FormField>

            <FormField label="Opening stock">
              <Input type="number" step="0.001" {...form.register('current_stock')} />
            </FormField>
            <FormField label="Min stock level">
              <Input type="number" step="0.001" {...form.register('min_stock_level')} />
            </FormField>

            <FormField label="Batch number">
              <Input {...form.register('batch_number')} />
            </FormField>
            <FormField label="Expiry date">
              <Input type="date" {...form.register('expiry_date')} />
            </FormField>
          </div>
        </form>

        <SheetFooter>
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
