import { expect, it } from 'vitest';
import { isWithinFleetHours } from './fleetHours';

const at = (clock: string) => new Date(`2026-10-29T${clock}:00-05:00`);

it('keeps tracking inside the Lima window', () => {
  expect(isWithinFleetHours('08:00', '22:00', at('15:00'))).toBe(true);
});

it('stops at the end of the shift and before it starts', () => {
  expect(isWithinFleetHours('08:00', '22:00', at('22:00'))).toBe(false);
  expect(isWithinFleetHours('08:00', '22:00', at('07:59'))).toBe(false);
});

it('does not stop tracking when the partner has no hours', () => {
  expect(isWithinFleetHours(null, null, at('03:00'))).toBe(true);
});
