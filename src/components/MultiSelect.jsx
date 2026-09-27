import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export default function MultiSelect({ value, options = [], onChange, disabled = false, placeholder = 'Pilih...', multi = false }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  
  const valArray = multi ? (Array.isArray(value) ? value : []) : (value !== undefined && value !== null ? [value] : []);
  
  const selected = useMemo(() => options.filter(([id]) => valArray.includes(id)), [options, valArray]);
  const visible = useMemo(() => options.filter(([,label]) => String(label).toLowerCase().includes(query.toLowerCase())), [options, query]);

  function toggle(id) {
    if (multi) {
      onChange(valArray.includes(id) ? valArray.filter(x => x !== id) : [...valArray, id]);
    } else {
      onChange(id);
      setOpen(false);
    }
  }

  const ref = useRef();
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className={`multi-select ${disabled ? 'disabled' : ''}`} ref={ref}>
      <button type="button" className="multi-trigger" disabled={disabled} onClick={() => setOpen(!open)}>
        <span>{selected.length ? selected.map(([,label]) => label).join(', ') : placeholder}</span>
        <ChevronDown size={14} />
      </button>
      {open && !disabled && (
        <div className="multi-menu">
          <div className="multi-search">
            <Search size={13} />
            <input autoFocus placeholder="Cari pilihan..." value={query} onChange={e => setQuery(e.target.value)} />
            <button type="button" onClick={() => setQuery('')}><X size={12} /></button>
          </div>
          <div className="multi-options">
            {visible.map(([id, label]) => (
              <button type="button" className={valArray.includes(id) ? 'chosen' : ''} key={id} onClick={() => toggle(id)}>
                <span>{label}</span>
                {valArray.includes(id) && <Check size={13} />}
              </button>
            ))}
            {!visible.length && <small>Tidak ada hasil</small>}
          </div>

        </div>
      )}
    </div>
  );
}
