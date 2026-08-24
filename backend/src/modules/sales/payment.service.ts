import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentMethod } from './dto/create-sale.dto';

type PaymentResult = {
  paidAmount: number;
  changeAmount: number;
};

@Injectable()
export class PaymentService {
  validatePayment(
    paymentMethod: PaymentMethod,
    paidAmount: number,
    grandTotal: number,
  ): PaymentResult {
    if (paidAmount < 0) {
      throw new BadRequestException('Nominal pembayaran tidak boleh negatif');
    }

    if (paymentMethod === 'CASH') {
      if (paidAmount < grandTotal) {
        throw new BadRequestException('Nominal pembayaran belum mencukupi');
      }

      return {
        paidAmount,
        changeAmount: this.roundMoney(paidAmount - grandTotal),
      };
    }

    return {
      paidAmount,
      changeAmount: 0,
    };
  }

  private roundMoney(value: number) {
    return Math.round(value + Number.EPSILON);
  }
}
