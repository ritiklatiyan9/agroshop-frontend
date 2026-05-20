import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Plus, Trash2, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { usePartyTypes, type PartyCustomType } from '@/hooks/usePartyTypes';

const BUILT_IN = [
  { value: 'customer', label: 'Customer' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'supplier_trader', label: 'Supplier (Trader)' },
  { value: 'supplier_manufacturer', label: 'Supplier (Manufacturer)' },
  { value: 'both', label: 'Both' },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function PartyTypeSelect({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { data: customTypes = [] } = usePartyTypes();

  useEffect(() => {
    if (creating) setTimeout(() => inputRef.current?.focus(), 0);
  }, [creating]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setCreating(false);
      setNewLabel('');
    }
  }

  const createMutation = useMutation({
    mutationFn: async (label: string) => {
      const res = await api.post<PartyCustomType>('/parties/types', { label });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['party-types'] });
      onChange(data.label);
      setCreating(false);
      setNewLabel('');
      setOpen(false);
      toast.success(`Type "${data.label}" created`);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Failed to create type');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/parties/types/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['party-types'] });
      const deleted = customTypes.find((t) => t.id === id);
      if (deleted && value === deleted.label) onChange('customer');
      toast.success('Type deleted');
    },
    onError: () => toast.error('Failed to delete type'),
  });

  function handleCreate() {
    const label = newLabel.trim();
    if (!label) return;
    createMutation.mutate(label);
  }

  const currentLabel =
    BUILT_IN.find((t) => t.value === value)?.label ??
    customTypes.find((t) => t.label === value)?.label ??
    value;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-10 text-sm"
        >
          <span className="truncate">{currentLabel}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-52 p-1" align="start">
        {/* Built-in types */}
        {BUILT_IN.map((t) => (
          <TypeRow
            key={t.value}
            label={t.label}
            selected={value === t.value}
            onSelect={() => { onChange(t.value); setOpen(false); }}
          />
        ))}

        {/* Custom types */}
        {customTypes.length > 0 && (
          <>
            <div className="h-px bg-slate-100 my-1" />
            {customTypes.map((t) => (
              <div key={t.id} className="flex items-center group">
                <TypeRow
                  label={t.label}
                  selected={value === t.label}
                  onSelect={() => { onChange(t.label); setOpen(false); }}
                  className="flex-1"
                />
                <button
                  type="button"
                  className="mr-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
                  onClick={() => deleteMutation.mutate(t.id)}
                  disabled={deleteMutation.isPending}
                  title="Delete type"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </>
        )}

        <div className="h-px bg-slate-100 my-1" />

        {/* Create new type */}
        {creating ? (
          <div className="flex items-center gap-1 px-1 py-0.5">
            <Input
              ref={inputRef}
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleCreate(); }
                if (e.key === 'Escape') { setCreating(false); setNewLabel(''); }
              }}
              placeholder="Type name…"
              className="h-7 text-xs flex-1 min-w-0"
              maxLength={50}
            />
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400 shrink-0" />
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!newLabel.trim()}
                  className="p-1 rounded hover:bg-emerald-50 text-emerald-600 disabled:opacity-40 shrink-0"
                  title="Save"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setCreating(false); setNewLabel(''); }}
                  className="p-1 rounded hover:bg-slate-100 text-slate-400 shrink-0"
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            onClick={() => setCreating(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add custom type
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function TypeRow({
  label,
  selected,
  onSelect,
  className,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors',
        selected
          ? 'bg-emerald-50 text-emerald-700 font-medium'
          : 'text-slate-700 hover:bg-slate-50',
        className,
      )}
      onClick={onSelect}
    >
      <Check className={cn('h-4 w-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')} />
      {label}
    </button>
  );
}
