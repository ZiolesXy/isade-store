import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Minus, Plus } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  /** Nama item untuk aria-label, mis. judul produk. */
  itemLabel?: string;
  /** Varian lebih rapat untuk daftar keranjang. */
  compact?: boolean;
  className?: string;
}

/**
 * Stepper jumlah dengan angka yang bisa langsung diketik.
 * Nilai di luar batas baru dirapikan saat blur/Enter agar mengetik tidak terganggu.
 */
export function QuantityInput({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  itemLabel,
  compact = false,
  className,
}: QuantityInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(String(value));

  const clamp = (n: number): number => Math.min(Math.max(n, min), max);

  // Sinkronkan angka saat nilai berubah dari luar (tombol +/- atau stok berubah),
  // tapi jangan ganggu ketikan pengguna yang sedang fokus di input.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setDraft(String(value));
    }
  }, [value]);

  function commit(next: number) {
    const clamped = clamp(next);
    onChange(clamped);
    setDraft(String(clamped));
  }

  function step(delta: number) {
    const base = draft === '' ? value : Number(draft);
    commit((Number.isFinite(base) ? base : value) + delta);
  }

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 3);
    setDraft(digits);
    if (digits === '') return;
    const next = Number(digits);
    // Simpan langsung bila valid; angka di luar batas menunggu blur.
    if (next >= min && next <= max) onChange(next);
  }

  function handleBlur() {
    if (draft === '') {
      commit(value);
      return;
    }
    commit(Number(draft));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      step(1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      step(-1);
    } else if (event.key === 'Enter') {
      event.currentTarget.blur();
    } else if (event.key === 'Escape') {
      setDraft(String(value));
      event.currentTarget.blur();
    }
  }

  const suffix = itemLabel ? ` ${itemLabel}` : '';

  return (
    <div
      className={cn('flex items-center rounded-md border', className)}
      aria-label="Jumlah"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled || value <= min}
        aria-label={`Kurangi jumlah${suffix}`}
        onClick={() => step(-1)}
      >
        <Minus className={compact ? 'size-3.5' : 'size-4'} weight="bold" />
      </Button>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        pattern="[0-9]*"
        aria-label={`Jumlah${suffix}`}
        value={draft}
        disabled={disabled}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={handleBlur}
        onFocus={(event) => event.currentTarget.select()}
        onKeyDown={handleKeyDown}
        className={cn(
          'h-9 bg-transparent text-center text-sm tabular-nums outline-none disabled:cursor-not-allowed disabled:opacity-50',
          compact ? 'w-8' : 'w-10'
        )}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled || value >= max}
        aria-label={`Tambah jumlah${suffix}`}
        onClick={() => step(1)}
      >
        <Plus className={compact ? 'size-3.5' : 'size-4'} weight="bold" />
      </Button>
    </div>
  );
}
