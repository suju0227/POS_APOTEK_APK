import { BadRequestException, Injectable } from '@nestjs/common';
import { DiscountType } from './dto/create-sale.dto';

@Injectable()
export class DiscountService {
  calculateDiscount(
    discountType: DiscountType,
    discountValue: number,
    subtotal: number,
  ) {
    if (discountValue < 0) {
      throw new BadRequestException('Diskon tidak boleh negatif');
    }

    if (discountType === 'NONE') return 0;

    if (discountType === 'PERCENT') {
      if (discountValue > 100) {
        throw new BadRequestException('Diskon persen tidak boleh lebih dari 100');
      }
      return this.roundMoney((subtotal * discountValue) / 100);
    }

    if (discountValue > subtotal) {
      throw new BadRequestException('Diskon tidak boleh melebihi subtotal');
    }

    return this.roundMoney(discountValue);
  }

  allocateDiscount(subtotals: number[], discountTotal: number) {
    if (discountTotal < 0) {
      throw new BadRequestException('Diskon tidak boleh negatif');
    }
    if (!subtotals.length) return [];
    if (discountTotal === 0) return subtotals.map(() => 0);

    const subtotalTotal = subtotals.reduce((sum, subtotal) => sum + subtotal, 0);
    if (subtotalTotal <= 0) {
      throw new BadRequestException('Subtotal alokasi diskon tidak valid');
    }

    let allocated = 0;
    return subtotals.map((subtotal, index) => {
      if (index === subtotals.length - 1) {
        return this.roundMoney(discountTotal - allocated);
      }
      const value = this.roundMoney((subtotal / subtotalTotal) * discountTotal);
      allocated = this.roundMoney(allocated + value);
      return value;
    });
  }

  private roundMoney(value: number) {
    return Math.round(value + Number.EPSILON);
  }
}
