import { describe, expect, it } from 'vitest';
import { orderSocketEventMatchesBrand } from './orderSocketBrandScope';

describe('orderSocketEventMatchesBrand', () => {
  it('rejects when no active brand', () => {
    expect(
      orderSocketEventMatchesBrand({ brandId: 'a' }, { brandId: null, brandSubdomain: null }),
    ).toBe(false);
  });

  it('matches by brandId', () => {
    expect(
      orderSocketEventMatchesBrand(
        { brandId: 'abc' },
        { brandId: 'abc', brandSubdomain: 'foo' },
      ),
    ).toBe(true);
  });

  it('matches by brandKey / subdomain', () => {
    expect(
      orderSocketEventMatchesBrand(
        { brandKey: 'ceviche' },
        { brandId: 'x', brandSubdomain: 'ceviche' },
      ),
    ).toBe(true);
  });

  it('ignores other brands', () => {
    expect(
      orderSocketEventMatchesBrand(
        { brandId: 'other', brandKey: 'other' },
        { brandId: 'mine', brandSubdomain: 'mine' },
      ),
    ).toBe(false);
  });
});
