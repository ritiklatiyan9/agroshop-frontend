import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Party } from '@/types';

interface Props {
  parties: Party[];
  value: Party | null;
  onChange: (p: Party | null) => void;
}

export function PartySearchSelect({ parties, value, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parties.slice(0, 8);
    return parties
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.mobile?.toLowerCase().includes(q) ||
          p.gstin?.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [parties, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function select(p: Party) {
    onChange(p);
    setQuery('');
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((i) => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const p = filtered[highlight] || filtered[0];
      if (p) select(p);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-2">
        <User className="h-4 w-4 text-emerald-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-900 truncate">{value.name}</div>
          {(value.mobile || value.gstin) && (
            <div className="text-xs text-slate-600 truncate">
              {value.mobile || ''}
              {value.gstin && <span className="ml-2">GSTIN: {value.gstin}</span>}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange(null)}
          title="Switch to walk-in"
          className="h-7 w-7"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search customer, or leave empty for walk-in"
        className="pl-9 h-10"
      />

      {open && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-slate-500">No customers found</div>
          ) : (
            <ul className="max-h-72 overflow-y-auto">
              {filtered.map((p, i) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => select(p)}
                    onMouseEnter={() => setHighlight(i)}
                    className={`flex w-full flex-col items-start px-3 py-2 text-left ${
                      i === highlight ? 'bg-emerald-50' : 'bg-white'
                    }`}
                  >
                    <span className="text-sm font-medium text-slate-900">{p.name}</span>
                    <span className="text-xs text-slate-500">
                      {p.mobile || 'no mobile'} · {p.gstin || 'no GSTIN'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
