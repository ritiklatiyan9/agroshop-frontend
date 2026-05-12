import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Upload, Store, MapPin, FileText, Building, Receipt } from 'lucide-react';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/layout/PageHeader';

interface FormState {
  shop_name: string;
  shop_phone: string;
  shop_email: string;
  shop_address: string;
  shop_city: string;
  shop_state: string;
  shop_pin: string;
  shop_gstin: string;
  shop_license_no: string;
  shop_pesticide_license_no: string;
  bank_name: string;
  bank_account: string;
  bank_ifsc: string;
  bill_terms: string;
}

const EMPTY: FormState = {
  shop_name: '',
  shop_phone: '',
  shop_email: '',
  shop_address: '',
  shop_city: '',
  shop_state: '',
  shop_pin: '',
  shop_gstin: '',
  shop_license_no: '',
  shop_pesticide_license_no: '',
  bank_name: '',
  bank_account: '',
  bank_ifsc: '',
  bill_terms: '',
};

export function ShopProfilePage() {
  const { user, setUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(user?.logo_url ?? null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  useEffect(() => {
    if (user) {
      setForm({
        shop_name: user.shop_name ?? '',
        shop_phone: user.shop_phone ?? '',
        shop_email: user.shop_email ?? '',
        shop_address: user.shop_address ?? '',
        shop_city: user.shop_city ?? '',
        shop_state: user.shop_state ?? '',
        shop_pin: user.shop_pin ?? '',
        shop_gstin: user.shop_gstin ?? '',
        shop_license_no: user.shop_license_no ?? '',
        shop_pesticide_license_no: user.shop_pesticide_license_no ?? '',
        bank_name: user.bank_name ?? '',
        bank_account: user.bank_account ?? '',
        bank_ifsc: user.bank_ifsc ?? '',
        bill_terms: user.bill_terms ?? '',
      });
      setLogoPreview(user.logo_url ?? null);
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (logoFile) fd.append('logo', logoFile);
      const res = await api.put<{ user: typeof user }>('/auth/shop-profile', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('Shop profile saved');
      if (data.user) setUser(data.user);
      setLogoFile(null);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to save profile');
    },
  });

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be under 5 MB');
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50/60 p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <PageHeader
          title="Shop profile"
          description="These details appear on bills, invoices, and reports."
          actions={
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          }
        />

        <Section icon={Store} title="Identity" description="Logo and brand details printed on bills.">
          <div className="flex items-start gap-4">
            <div
              className="h-24 w-24 rounded-xl border-2 border-dashed border-slate-200 bg-white hover:bg-slate-50 cursor-pointer overflow-hidden flex items-center justify-center shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-slate-400 text-xs">
                  <Upload className="h-5 w-5 mb-1" />
                  <span>Upload</span>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <Field label="Shop name *">
                <Input
                  value={form.shop_name}
                  onChange={(e) => update('shop_name', e.target.value)}
                />
              </Field>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={onFileChange}
              />
              <p className="text-xs text-slate-500">
                Click the square to upload a logo. PNG or JPG, square format, under 5 MB.
              </p>
              {logoFile && (
                <p className="text-xs text-emerald-600">New file selected: {logoFile.name}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <Field label="Phone">
              <Input
                value={form.shop_phone}
                onChange={(e) => update('shop_phone', e.target.value)}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.shop_email}
                onChange={(e) => update('shop_email', e.target.value)}
              />
            </Field>
          </div>
        </Section>

        <Section icon={MapPin} title="Address" description="Used on bill headers.">
          <Field label="Street address">
            <Textarea
              rows={2}
              value={form.shop_address}
              onChange={(e) => update('shop_address', e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <Field label="City">
              <Input value={form.shop_city} onChange={(e) => update('shop_city', e.target.value)} />
            </Field>
            <Field label="State">
              <Input
                value={form.shop_state}
                onChange={(e) => update('shop_state', e.target.value)}
              />
            </Field>
            <Field label="PIN">
              <Input value={form.shop_pin} onChange={(e) => update('shop_pin', e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section
          icon={FileText}
          title="Tax & licenses"
          description="Mandatory for GST bills and pesticide retail compliance."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="GSTIN">
              <Input
                value={form.shop_gstin}
                onChange={(e) => update('shop_gstin', e.target.value)}
                placeholder="22AAAAA0000A1Z5"
              />
            </Field>
            <Field label="Drug license #">
              <Input
                value={form.shop_license_no}
                onChange={(e) => update('shop_license_no', e.target.value)}
              />
            </Field>
            <Field label="Pesticide license #">
              <Input
                value={form.shop_pesticide_license_no}
                onChange={(e) => update('shop_pesticide_license_no', e.target.value)}
              />
            </Field>
          </div>
        </Section>

        <Section
          icon={Building}
          title="Bank details"
          description="Printed on the bill footer if you enable 'Show bank details' in bill settings."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Bank name">
              <Input
                value={form.bank_name}
                onChange={(e) => update('bank_name', e.target.value)}
              />
            </Field>
            <Field label="Account #">
              <Input
                value={form.bank_account}
                onChange={(e) => update('bank_account', e.target.value)}
              />
            </Field>
            <Field label="IFSC">
              <Input
                value={form.bank_ifsc}
                onChange={(e) => update('bank_ifsc', e.target.value)}
                placeholder="SBIN0001234"
              />
            </Field>
          </div>
        </Section>

        <Section
          icon={Receipt}
          title="Bill terms & conditions"
          description="Printed at the bottom of every bill when terms are enabled."
        >
          <Field label="Terms text">
            <Textarea
              rows={4}
              value={form.bill_terms}
              onChange={(e) => update('bill_terms', e.target.value)}
              placeholder={`E&OE. Goods once sold will not be taken back.\nInterest at 18% p.a. on overdue accounts.`}
            />
          </Field>
        </Section>

        <div className="flex justify-end pb-4">
          <Button size="lg" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Icon className="h-4 w-4 text-emerald-700" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
