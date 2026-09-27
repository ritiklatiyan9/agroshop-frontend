import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PartyTypeSelect } from '@/components/parties/PartyTypeSelect';
import { useActionNotify } from '@/hooks/useActionNotify';
import type { Party } from '@/types';

const schema = z.object({
  state: z.string().optional(),
  state_code: z.string().optional(),
  country: z.string().optional(),
  pin: z.string().optional(),
  pan: z.string().optional(),
  registration_type: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  bank_ifsc: z.string().optional(),

  name: z.string().min(1, 'Required').max(200),
  type: z.string().min(1).max(50),
  mobile: z.string().max(24).optional(),
  gstin: z.string().max(32).optional(),
  address: z.string().max(1000).optional(),
  opening_balance: z.coerce.number().default(0),
});

type FormInput = z.infer<typeof schema>;

interface Props {
  party?: Party | null;
  defaultType?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function AddEditPartyDialog({ party, open, onOpenChange, defaultType = 'customer' }: Props) {
  const queryClient = useQueryClient();
  const { notify } = useActionNotify();

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      state: '',
      state_code: '',
      country: 'India',
      pin: '',
      pan: '',
      registration_type: 'Regular',
      bank_name: '',
      bank_account: '',
      bank_ifsc: '',
      name: '',
      type: defaultType,
      mobile: '',
      gstin: '',
      address: '',
      opening_balance: 0,
    },
  });

  useEffect(() => {
    if (party) {
      form.reset({
        state: party.state || '',
        state_code: party.state_code || '',
        country: party.country || 'India',
        pin: party.pin || '',
        pan: party.pan || '',
        registration_type: party.registration_type || 'Regular',
        bank_name: party.bank_name || '',
        bank_account: party.bank_account || '',
        bank_ifsc: party.bank_ifsc || '',
        name: party.name,
        type: party.type,
        mobile: party.mobile || '',
        gstin: party.gstin || '',
        address: party.address || '',
        opening_balance: Number(party.opening_balance),
      });
    } else {
      form.reset({
        state: '',
      state_code: '',
      country: 'India',
      pin: '',
      pan: '',
      registration_type: 'Regular',
      bank_name: '',
      bank_account: '',
      bank_ifsc: '',
      name: '',
        type: defaultType,
        mobile: '',
        gstin: '',
        address: '',
        opening_balance: 0,
      });
    }
  }, [party, open]);

  const mutation = useMutation({
    mutationFn: async (values: FormInput) => {
      const payload = {
        state: values.state || null,
        state_code: values.state_code || null,
        country: values.country || null,
        pin: values.pin || null,
        pan: values.pan || null,
        registration_type: values.registration_type || null,
        bank_name: values.bank_name || null,
        bank_account: values.bank_account || null,
        bank_ifsc: values.bank_ifsc || null,
        name: values.name,
        type: values.type,
        mobile: values.mobile || null,
        gstin: values.gstin || null,
        address: values.address || null,
        opening_balance: values.opening_balance,
      };
      if (party) return api.put(`/parties/${party.id}`, payload);
      return api.post('/parties', payload);
    },
    onSuccess: (_data, values) => {
      toast.success(party ? 'Party updated' : 'Party created');
      notify(party ? 'Party Updated' : 'Party Added', `${values.name} has been ${party ? 'updated' : 'added'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      onOpenChange(false);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to save');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{party ? 'Edit party' : 'New party'}</DialogTitle>
        </DialogHeader>
        <form
          id="party-form"
          className="space-y-4"
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
        >
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input autoFocus {...form.register('name')} placeholder="Party name" />
            {form.formState.errors.name && (
              <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <PartyTypeSelect
                value={form.watch('type')}
                onChange={(v) => form.setValue('type', v)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <Input {...form.register('mobile')} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>GSTIN</Label>
              <Input {...form.register('gstin')} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Address</Label>
              <Textarea rows={2} {...form.register('address')} />
            </div>
<div className="space-y-1.5"><Label>State</Label><Input {...form.register('state')} /></div><div className="space-y-1.5"><Label>State code</Label><Input {...form.register('state_code')} /></div><div className="space-y-1.5"><Label>Country</Label><Input {...form.register('country')} /></div><div className="space-y-1.5"><Label>Pincode</Label><Input {...form.register('pin')} /></div><div className="space-y-1.5"><Label>PAN / IT number</Label><Input {...form.register('pan')} /></div><div className="space-y-1.5"><Label>Registration type</Label><Input {...form.register('registration_type')} /></div><div className="space-y-1.5"><Label>Bank name</Label><Input {...form.register('bank_name')} /></div><div className="space-y-1.5"><Label>Bank account</Label><Input {...form.register('bank_account')} /></div><div className="space-y-1.5"><Label>Bank IFSC</Label><Input {...form.register('bank_ifsc')} /></div>
            <div className="space-y-1.5 col-span-2">
              <Label>Opening balance (₹)</Label>
              <Input type="number" step="0.01" {...form.register('opening_balance')} />
              <p className="text-[11px] text-slate-500">
                Positive = party owes you. Negative = you owe party.
              </p>
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button form="party-form" type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {party ? 'Save changes' : 'Create party'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
