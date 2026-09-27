import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { useCurrentShop, useAuthStore } from '@/store/authStore';
import type { Shop } from '@/types';
import { DEFAULT_UNITS } from '@/components/ui/unit-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function UnitSettings() {
  const shop = useCurrentShop();
  const upsertShop = useAuthStore(s => s.upsertShop);
  const [units, setUnits] = useState<string[]>([]);
  const [newUnit, setNewUnit] = useState('');
  useEffect(() => setUnits(shop?.unit_options || DEFAULT_UNITS), [shop?.id, shop?.unit_options]);
  const mutation = useMutation({
    mutationFn: async () => {
      const clean = units.map(u => u.trim());
      if (clean.some(u => !u || u.length > 64)) throw new Error('Each unit must contain 1–64 characters.');
      return (await api.put<{ shop: Shop }>('/auth/shop-profile', { unit_options: [...new Set(clean)] })).data;
    },
    onSuccess: data => { upsertShop(data.shop); toast.success('Unit options saved'); },
    onError: (err: Error & { response?: { data?: { error?: string } } }) => toast.error(err.response?.data?.error || err.message),
  });
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-900">Units and pack sizes</h3><p className="mt-1 text-xs text-slate-500">Edit or delete suggestions used in products, bills and purchases. You can also type any custom unit.</p></div><Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save units</Button></div>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{units.map((unit, index) => <div key={index} className="flex gap-1"><Input aria-label={`Unit option ${index + 1}`} value={unit} maxLength={64} onChange={e => setUnits(current => current.map((u, i) => i === index ? e.target.value : u))} /><Button variant="ghost" size="icon" title={`Delete ${unit}`} onClick={() => setUnits(current => current.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4 text-red-500" /></Button></div>)}</div>
    <div className="mt-3 flex max-w-sm gap-2"><Input aria-label="New custom unit" placeholder="e.g. 200 ml, 250 ml, 5 kg" value={newUnit} maxLength={64} onChange={e => setNewUnit(e.target.value)} /><Button variant="outline" disabled={!newUnit.trim() || units.length >= 100} onClick={() => { if (!units.includes(newUnit.trim())) setUnits(current => [...current, newUnit.trim()]); setNewUnit(''); }}><Plus className="mr-1 h-4 w-4" />Add</Button></div>
  </section>;
}
