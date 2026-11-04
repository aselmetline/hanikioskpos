import { describe, it, expect } from 'bun:test';
import { addQuantity, parseQuantity, roundQuantity } from './quantity';

describe('fractional measurement quantities', () => {
  it('accepts 1.5 litres without truncation', () => expect(parseQuantity('1.5')).toBe(1.5));
  it('accepts 0.750 kilograms', () => expect(parseQuantity('0.750')).toBe(0.75));
  it('accepts comma decimal input', () => expect(parseQuantity('1,5')).toBe(1.5));
  it('accepts Arabic decimal input', () => expect(parseQuantity('٠٫٧٥٠')).toBe(0.75));
  it('deducts fractional stock exactly', () => expect(addQuantity(1.5, -0.75)).toBe(0.75));
  it('does not accumulate float residue', () => expect(addQuantity(0.3, -0.1)).toBe(0.2));
  it('retains three-decimal precision', () => expect(roundQuantity(1.23456)).toBe(1.235));
  it('calculates 1.5 litres at 2.200 TND', () => expect(roundQuantity(parseQuantity('1.5') * 2.2)).toBe(3.3));
  it('rejects invalid quantities', () => expect(Number.isNaN(parseQuantity('1abc'))).toBe(true));
});