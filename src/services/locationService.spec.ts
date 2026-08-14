import { describe, expect, it } from 'vitest';
import { readBranches } from './locationService';

describe('readBranches', () => {
  it('desempaqueta el contrato anidado de sucursales de SSGG', () => {
    const locations = readBranches(
      {
        success: true,
        data: {
          type: 'SUCCESS',
          data: [
            {
              _id: 'branch-1',
              brandId: 'brand-1',
              name: 'Local principal',
              address: 'Av. Principal 123',
              phone: '+51999999999',
              status: true,
            },
          ],
        },
      },
      'brand-1',
    );

    expect(locations).toEqual([
      {
        id: 'branch-1',
        brandId: 'brand-1',
        name: 'Local principal',
        address: 'Av. Principal 123',
        phone: '+51999999999',
        active: true,
      },
    ]);
  });
});
