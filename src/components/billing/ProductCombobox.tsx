import { useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { formatNumber } from '@/lib/utils';
import type { Product } from '@/types';

interface Props {
  products: Product[];
  onSelect: (p: Product) => void;
  placeholder?: string;
}

export function ProductCombobox({ products, onSelect, placeholder = 'Search & add product...' }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query) return products.slice(0, 50);
    const q = query.toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.brand?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 50);
  }, [products, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={placeholder}
            className="pl-9 cursor-text"
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            readOnly
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
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
            <li className="px-3 py-6 text-center text-sm text-slate-500">No products found</li>
          )}
          {filtered.map((p) => {
            const stock = Number(p.current_stock);
            const isLow = stock <= Number(p.min_stock_level);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-emerald-50 hover:text-emerald-700"
                  onClick={() => {
                    onSelect(p);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-900 truncate">{p.name}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {p.brand || '—'} · {p.hsn_code || 'no HSN'} · {p.unit}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono">₹{p.selling_price}</div>
                    <div className={`text-xs ${isLow ? 'text-red-600' : 'text-slate-500'}`}>
                      stock: {formatNumber(stock, 2)}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
