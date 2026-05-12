import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { Product } from '@/types';

interface Props {
  products: Product[];
  onSelect: (p: Product) => void;
  alreadyAddedIds?: Set<string>;
  autoFocus?: boolean;
}

export function ProductSearchAdd({ products, onSelect, alreadyAddedIds, autoFocus }: Props) {
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as Product[];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.hsn_code?.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [products, query]);

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

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function add(p: Product) {
    onSelect(p);
    setQuery('');
    setHighlight(0);
    inputRef.current?.focus();
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
      if (p) add(p);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
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
        placeholder="Search product by name, brand, or HSN — press Enter to add"
        className="pl-9 h-11 text-sm"
      />

      {open && query && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-slate-500">
              No products match "{query}"
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto">
              {filtered.map((p, i) => {
                const alreadyAdded = alreadyAddedIds?.has(p.id);
                const stock = Number(p.current_stock);
                const isLow = stock <= Number(p.min_stock_level);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => add(p)}
                      onMouseEnter={() => setHighlight(i)}
                      className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                        i === highlight ? 'bg-emerald-50' : 'bg-white'
                      }`}
                    >
                      <Package className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 truncate">{p.name}</span>
                          {alreadyAdded && (
                            <span className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">
                              added
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {p.brand || '—'} · HSN {p.hsn_code || '—'} · {p.unit}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-sm font-medium">
                          {formatCurrency(p.selling_price)}
                        </div>
                        <div className={`text-[11px] ${isLow ? 'text-red-600' : 'text-slate-500'}`}>
                          stock: {formatNumber(stock, 2)} {p.unit}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
