import { useMemo, useState } from 'react';
import { Search, X, User } from 'lucide-react';
import { Customer } from '@/types/pos';
import { useT } from '@/contexts/LanguageContext';

interface Props {
  customers: Customer[];
  value: string;
  onChange: (id: string) => void;
}

const norm = (s?: string) => (s || '').toLowerCase().replace(/\s+/g, '');

export function filterCustomers(customers: Customer[], query: string, limit = 8): Customer[] {
  const q = norm(query);
  if (!q) return customers.slice(0, limit);
  return customers
    .filter(c => norm(c.name).includes(q) || norm(c.phone).includes(q) || norm(c.externalId).includes(q))
    .slice(0, limit);
}

export function CustomerPicker({ customers, value, onChange }: Props) {
  const { lang } = useT();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = customers.find(c => c.id === value);
  const results = useMemo(() => filterCustomers(customers, query), [customers, query]);
  const ar = lang === 'ar';

  if (selected) {
    return (
      <div className="pos-input text-sm flex items-center gap-2">
        <User className="w-4 h-4 text-primary shrink-0" />
        <span className="flex-1 truncate font-bold">
          {selected.name}
          <span className="text-muted-foreground font-normal"> · {selected.phone}{selected.externalId ? ` · #${selected.externalId}` : ''}</span>
        </span>
        <button type="button" aria-label="clear" onClick={() => { onChange(''); setQuery(''); }} className="p-1 rounded-full hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={ar ? 'ابحث عن عميل بالاسم أو الهاتف أو المعرف…' : 'Rechercher client (nom, tél, ID)…'}
          className="pos-input text-sm ps-9"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
          {results.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground text-center">{ar ? 'لا يوجد عميل مطابق' : 'Aucun client trouvé'}</div>
          ) : results.map(c => (
            <button
              key={c.id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange(c.id); setOpen(false); setQuery(''); }}
              className="w-full text-start px-3 py-2 text-sm hover:bg-muted border-b border-border last:border-0"
            >
              <div className="font-bold">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.phone}{c.externalId ? ` · #${c.externalId}` : ''}{c.creditBalance > 0 ? ` · ${c.creditBalance.toFixed(3)}` : ''}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
