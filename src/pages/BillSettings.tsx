import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Receipt, Printer, MessageSquare, Hash } from 'lucide-react';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent } from '@/components/ui/card';
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
import { PageHeader } from '@/components/layout/PageHeader';
import type { ThermalSize } from '@/types';

interface BillSettingsForm {
  gst_bill_prefix: string;
  non_gst_bill_prefix: string;
  default_payment_mode: string;
  show_bank_details: boolean;
  show_signature_line: boolean;
  show_terms: boolean;
  footer_message_gst: string;
  footer_message_non_gst: string;
  thermal_paper_size: ThermalSize;
  auto_print_after_save: boolean;
  auto_generate_pdf: boolean;
}

const EMPTY: BillSettingsForm = {
  gst_bill_prefix: 'INV',
  non_gst_bill_prefix: 'BILL',
  default_payment_mode: 'cash',
  show_bank_details: false,
  show_signature_line: true,
  show_terms: true,
  footer_message_gst: '',
  footer_message_non_gst: '',
  thermal_paper_size: '80mm',
  auto_print_after_save: false,
  auto_generate_pdf: false,
};

export function BillSettingsPage() {
  const { user, setUser } = useAuthStore();
  const [form, setForm] = useState<BillSettingsForm>(EMPTY);

  useEffect(() => {
    if (!user) return;
    setForm({
      gst_bill_prefix: user.gst_bill_prefix ?? 'INV',
      non_gst_bill_prefix: user.non_gst_bill_prefix ?? 'BILL',
      default_payment_mode: user.default_payment_mode ?? 'cash',
      show_bank_details: user.show_bank_details ?? false,
      show_signature_line: user.show_signature_line ?? true,
      show_terms: user.show_terms ?? true,
      footer_message_gst: user.footer_message_gst ?? '',
      footer_message_non_gst: user.footer_message_non_gst ?? '',
      thermal_paper_size: user.thermal_paper_size ?? '80mm',
      auto_print_after_save: user.auto_print_after_save ?? false,
      auto_generate_pdf: user.auto_generate_pdf ?? false,
    });
  }, [user]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.put<{ user: typeof user }>('/auth/bill-settings', form);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('Bill settings saved');
      if (data.user) setUser(data.user);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to save');
    },
  });

  function update<K extends keyof BillSettingsForm>(key: K, value: BillSettingsForm[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50/60 p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <PageHeader
          title="Bill settings"
          description="Control how bills are numbered, printed, and shown."
          actions={
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save settings
            </Button>
          }
        />

        <Section
          icon={Hash}
          title="Bill numbering"
          description="Prefix added to new bill numbers. Existing bills keep their old numbers."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="GST bill prefix">
              <Input
                value={form.gst_bill_prefix}
                onChange={(e) => update('gst_bill_prefix', e.target.value.toUpperCase())}
                placeholder="INV"
                maxLength={16}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Example: <span className="font-mono">{form.gst_bill_prefix || 'INV'}/2627-0001</span>
              </p>
            </Field>
            <Field label="Non-GST bill prefix">
              <Input
                value={form.non_gst_bill_prefix}
                onChange={(e) => update('non_gst_bill_prefix', e.target.value.toUpperCase())}
                placeholder="BILL"
                maxLength={16}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Example:{' '}
                <span className="font-mono">{form.non_gst_bill_prefix || 'BILL'}/2627-0001</span>
              </p>
            </Field>
          </div>
        </Section>

        <Section
          icon={Receipt}
          title="Defaults"
          description="Pre-filled values when creating a new bill."
        >
          <Field label="Default payment mode">
            <Select
              value={form.default_payment_mode}
              onValueChange={(v) => update('default_payment_mode', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                <SelectItem value="credit">Credit (unpaid)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Section>

        <Section
          icon={Receipt}
          title="What to show on bills"
          description="Toggle sections of the printed bill on or off."
        >
          <ToggleRow
            label="Show bank details"
            description="Print the bank account and IFSC from Shop Profile on the bill footer."
            checked={form.show_bank_details}
            onChange={(v) => update('show_bank_details', v)}
          />
          <ToggleRow
            label="Show signature line"
            description="Add 'Receiver signature' and 'Authorized signatory' lines at the bottom."
            checked={form.show_signature_line}
            onChange={(v) => update('show_signature_line', v)}
          />
          <ToggleRow
            label="Show terms & conditions"
            description="Print the terms text from Shop Profile on bills."
            checked={form.show_terms}
            onChange={(v) => update('show_terms', v)}
          />
        </Section>

        <Section
          icon={MessageSquare}
          title="Footer message"
          description="Custom thank-you / contact message at the bottom of bills."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="GST bill footer">
              <Textarea
                rows={2}
                value={form.footer_message_gst}
                onChange={(e) => update('footer_message_gst', e.target.value)}
                placeholder="Thank you for your business!"
              />
            </Field>
            <Field label="Non-GST bill footer">
              <Textarea
                rows={2}
                value={form.footer_message_non_gst}
                onChange={(e) => update('footer_message_non_gst', e.target.value)}
                placeholder="Thank you. Visit again!"
              />
            </Field>
          </div>
        </Section>

        <Section
          icon={Printer}
          title="Printing"
          description="How bills are printed and saved."
        >
          <Field label="Thermal paper size">
            <Select
              value={form.thermal_paper_size}
              onValueChange={(v) => update('thermal_paper_size', v as ThermalSize)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="58mm">58 mm</SelectItem>
                <SelectItem value="80mm">80 mm</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="space-y-1 mt-3">
            <ToggleRow
              label="Auto-print after save"
              description="Open the print dialog automatically after creating a bill."
              checked={form.auto_print_after_save}
              onChange={(v) => update('auto_print_after_save', v)}
            />
            <ToggleRow
              label="Auto-open print dialog as PDF"
              description="In the browser's print dialog, default to 'Save as PDF'."
              checked={form.auto_generate_pdf}
              onChange={(v) => update('auto_generate_pdf', v)}
            />
          </div>
        </Section>

        <div className="flex justify-end pb-4">
          <Button size="lg" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save settings
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

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 py-2.5 cursor-pointer">
      <div className="relative inline-flex shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <div className="h-5 w-9 rounded-full bg-slate-200 peer-checked:bg-emerald-600 transition-colors" />
        <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-slate-900">{label}</div>
        <div className="text-[11px] text-slate-500 mt-0.5">{description}</div>
      </div>
    </label>
  );
}
