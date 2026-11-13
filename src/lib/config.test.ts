import { describe, expect, it } from 'vitest';
import { parseMidtransFlag } from './config';

describe('lib/config parseMidtransFlag (Tahap 2)', () => {
  it('"true" aktif tanpa peringatan', () => {
    expect(parseMidtransFlag('true')).toEqual({ enabled: true, invalid: false });
  });

  it('"false" nonaktif tanpa peringatan', () => {
    expect(parseMidtransFlag('false')).toEqual({ enabled: false, invalid: false });
  });

  it('nilai lain dianggap false dan ditandai invalid', () => {
    expect(parseMidtransFlag('TRUE')).toEqual({ enabled: false, invalid: true });
    expect(parseMidtransFlag('yes')).toEqual({ enabled: false, invalid: true });
    expect(parseMidtransFlag('1')).toEqual({ enabled: false, invalid: true });
    expect(parseMidtransFlag('')).toEqual({ enabled: false, invalid: true });
  });

  it('tidak diset dianggap false dan ditandai invalid', () => {
    expect(parseMidtransFlag(undefined)).toEqual({ enabled: false, invalid: true });
    expect(parseMidtransFlag(null)).toEqual({ enabled: false, invalid: true });
  });
});
