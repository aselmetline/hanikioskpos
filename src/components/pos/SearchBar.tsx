import { Search, X, ScanBarcode } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  const t = useT();
  const ph = placeholder ?? `${t('common.search')}...`;
  return (
    <div className="relative">
      <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={ph}
        className="pos-input pr-12 pl-12"
      />
      {value ? (
        <button
          onClick={() => onChange('')}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-muted rounded-full flex items-center justify-center"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      ) : (
        <button className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <ScanBarcode className="w-4 h-4 text-primary-foreground" />
        </button>
      )}
    </div>
  );
}
