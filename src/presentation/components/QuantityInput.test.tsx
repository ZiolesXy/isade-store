import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QuantityInput } from './QuantityInput';

afterEach(cleanup);

describe('QuantityInput', () => {
  it('mengirim nilai saat angka langsung diketik', () => {
    const onChange = vi.fn();
    render(<QuantityInput value={1} onChange={onChange} max={20} itemLabel="Produk A" />);

    const input = screen.getByLabelText('Jumlah Produk A') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '12' } });

    expect(onChange).toHaveBeenLastCalledWith(12);
  });

  it('merapikan angka di luar batas saat blur', () => {
    const onChange = vi.fn();
    render(<QuantityInput value={1} onChange={onChange} max={20} itemLabel="Produk A" />);

    const input = screen.getByLabelText('Jumlah Produk A') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '50' } });

    expect(onChange).not.toHaveBeenCalled();

    fireEvent.blur(input);

    expect(onChange).toHaveBeenLastCalledWith(20);
    expect(input.value).toBe('20');
  });
});
