import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { parseQuantity, formatQuantity } from '@/lib/quantity';

interface Props {
  value: number;
  onChange: (quantity: number) => void;
  max?: number;
  className?: string;
  'aria-label'?: string;
}

export function QuantityInput({ value, onChange, max, className, 'aria-label': label }: Props) {
  const [draft, setDraft] = useState(formatQuantity(value));
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setDraft(formatQuantity(value)); }, [value, editing]);
  const commit = () => {
    const parsed = parseQuantity(draft);
    if (Number.isFinite(parsed) && parsed > 0) onChange(Math.min(parsed, max ?? 9999999.999));
    else setDraft(formatQuantity(value));
    setEditing(false);
  };
  return <Input type="text" inputMode="decimal" step="any" value={draft} dir="ltr" className={className} aria-label={label}
    onFocus={event => { setEditing(true); event.currentTarget.select(); }}
    onChange={event => {
      setDraft(event.target.value);
      const parsed = parseQuantity(event.target.value);
      if (Number.isFinite(parsed) && parsed > 0 && parsed <= (max ?? 9999999.999)) onChange(parsed);
    }}
    onBlur={commit} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} />;
}