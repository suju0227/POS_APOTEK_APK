import { BadRequestException } from '@nestjs/common';
import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(() => {
    service = new PaymentService();
  });

  it('accepts enough cash and calculates change', () => {
    expect(service.validatePayment('CASH', 12000, 10000)).toEqual({
      paidAmount: 12000,
      changeAmount: 2000,
    });
  });

  it('rejects insufficient cash', () => {
    expect(() => service.validatePayment('CASH', 9000, 10000)).toThrow(
      BadRequestException,
    );
  });

  it('accepts non-cash payments without change', () => {
    expect(service.validatePayment('TRANSFER', 0, 10000)).toEqual({
      paidAmount: 0,
      changeAmount: 0,
    });
    expect(service.validatePayment('QRIS', 10000, 10000)).toEqual({
      paidAmount: 10000,
      changeAmount: 0,
    });
    expect(service.validatePayment('DEBIT', 15000, 10000)).toEqual({
      paidAmount: 15000,
      changeAmount: 0,
    });
  });

  it('rejects negative paid amount', () => {
    expect(() => service.validatePayment('TRANSFER', -1, 10000)).toThrow(
      BadRequestException,
    );
  });
});
