import { useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Party } from '@/types';

interface Props {
  parties: Party[];
  value: Party | null;
  onChange: (p: Party | null) => void;
}

export function PartyCombobox({ parties, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return parties.slice(0, 50);
    return parties
      .filter(
        (p) => p.name.toLowerCase().includes(q) || p.mobile?.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [parties, query]);

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-emerald-50/50 px-3 py-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-900 truncate">{value.name}</div>
          {value.mobile && (
            <div className="text-xs text-slate-500 truncate">{value.mobile}</div>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => onChange(null)} title="Remove">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search customer or leave for walk-in..."
            className="pl-9 cursor-text"
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            readOnly
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="p-2 border-b border-slate-100">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to filter..."
            autoFocus
          />
        </div>
        <ul className="max-h-72 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-slate-500">No customers found</li>
          )}
          {filtered.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-emerald-50"
                onClick={() => {
                  onChange(p);
                  setOpen(false);
                  setQuery('');
                }}
              >
                <span className="font-medium text-slate-900">{p.name}</span>
                <span className="text-xs text-slate-500">
                  {p.mobile || '—'} · {p.gstin || 'no GSTIN'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
