import { describe, expect, it } from 'vitest';
import { isMongoObjectId } from './orderService';

describe('isMongoObjectId', () => {
  it('acepta ObjectIds de 24 hex', () => {
    expect(isMongoObjectId('507f1f77bcf86cd799439011')).toBe(true);
    expect(isMongoObjectId('ABCDEF0123456789abcdef01')).toBe(true);
  });

  it('rechaza orderNumber u otros ids', () => {
    expect(isMongoObjectId('SMASHBURGER-20240807-0001')).toBe(false);
    expect(isMongoObjectId('A-2850')).toBe(false);
    expect(isMongoObjectId('')).toBe(false);
    expect(isMongoObjectId('507f1f77bcf86cd79943901')).toBe(false);
  });
});
