import { BadRequestException } from '@nestjs/common';
import { DiscountService } from './discount.service';

describe('DiscountService', () => {
  let service: DiscountService;

  beforeEach(() => {
    service = new DiscountService();
  });

  it('returns zero for NONE discount', () => {
    expect(service.calculateDiscount('NONE', 0, 10000)).toBe(0);
  });

  it('calculates percent discount as rounded rupiah', () => {
    expect(service.calculateDiscount('PERCENT', 12.5, 10000)).toBe(1250);
  });

  it('calculates nominal discount as rounded rupiah', () => {
    expect(service.calculateDiscount('NOMINAL', 1250.4, 10000)).toBe(1250);
  });

  it('rejects negative discount', () => {
    expect(() => service.calculateDiscount('NOMINAL', -1, 10000)).toThrow(
      BadRequestException,
    );
  });

  it('rejects percent above 100', () => {
    expect(() => service.calculateDiscount('PERCENT', 101, 10000)).toThrow(
      BadRequestException,
    );
  });

  it('rejects nominal discount above subtotal', () => {
    expect(() => service.calculateDiscount('NOMINAL', 10001, 10000)).toThrow(
      BadRequestException,
    );
  });

  it('allocates discount proportionally and keeps total equal to discount', () => {
    const allocations = service.allocateDiscount([3000, 2400], 500);

    expect(allocations).toEqual([278, 222]);
    expect(allocations.reduce((sum, value) => sum + value, 0)).toBe(500);
  });

  it('puts rounding remainder on the last allocation', () => {
    const allocations = service.allocateDiscount([1, 1, 1], 1);

    expect(allocations).toEqual([0, 0, 1]);
    expect(allocations.reduce((sum, value) => sum + value, 0)).toBe(1);
  });
});
