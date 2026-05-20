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
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function AddEditPartyDialog({ party, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { notify } = useActionNotify();

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      type: 'customer',
      mobile: '',
      gstin: '',
      address: '',
      opening_balance: 0,
    },
  });

  useEffect(() => {
    if (party) {
      form.reset({
        name: party.name,
        type: party.type,
        mobile: party.mobile || '',
        gstin: party.gstin || '',
        address: party.address || '',
        opening_balance: Number(party.opening_balance),
      });
    } else {
      form.reset({
        name: '',
        type: 'customer',
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
      <DialogContent>
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
