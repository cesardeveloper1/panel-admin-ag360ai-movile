import { describe, expect, it } from 'vitest';
import { getTokenExpirationMs } from './authSession';

function encodePayload(payload: Record<string, unknown>): string {
  return btoa(JSON.stringify(payload))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

describe('getTokenExpirationMs', () => {
  it('reads the JWT expiration in milliseconds', () => {
    const token = `header.${encodePayload({ exp: 1_800_000_000 })}.signature`;
    expect(getTokenExpirationMs(token)).toBe(1_800_000_000_000);
  });

  it('returns null for malformed tokens or payloads without exp', () => {
    expect(getTokenExpirationMs('invalid')).toBeNull();
    expect(getTokenExpirationMs(`header.${encodePayload({ sub: 'user' })}.signature`)).toBeNull();
  });
});
