import { create } from 'zustand';
import type { CashierCartItem, CashierProduct, CashierProductUnit } from './cashier.types';

type AddItemPayload = {
  product: CashierProduct;
  unit: CashierProductUnit;
};

type CartState = {
  items: CashierCartItem[];
  addItem: (payload: AddItemPayload) => void;
  updateQty: (cartItemId: string, qtySaleUnit: number) => void;
  removeItem: (cartItemId: string) => void;
  clear: () => void;
};

function makeCartItemId(productId: string, productUnitId: string) {
  return `${productId}:${productUnitId}`;
}

export const useCashierCartStore = create<CartState>((set) => ({
  items: [],
  addItem: ({ product, unit }) =>
    set((state) => {
      if (unit.stockAvailable < unit.minSaleQty) return state;

      const cartItemId = makeCartItemId(product.id, unit.productUnitId);
      const existing = state.items.find((item) => item.cartItemId === cartItemId);
      const nextQty = existing
        ? existing.qtySaleUnit + unit.minSaleQty
        : unit.minSaleQty;

      if (existing) {
        return {
          items: state.items.map((item) =>
            item.cartItemId === cartItemId
              ? { ...item, qtySaleUnit: Math.min(nextQty, unit.stockAvailable) }
              : item,
          ),
        };
      }

      return {
        items: [
          ...state.items,
          {
            cartItemId,
            productId: product.id,
            productName: product.name,
            productCode: product.code,
            productUnitId: unit.productUnitId,
            unitName: unit.unitName,
            unitSymbol: unit.unitSymbol,
            qtySaleUnit: Math.min(unit.minSaleQty, unit.stockAvailable),
            minSaleQty: unit.minSaleQty,
            sellingPrice: unit.sellingPrice,
            stockAvailable: unit.stockAvailable,
          },
        ],
      };
    }),
  updateQty: (cartItemId, qtySaleUnit) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.cartItemId === cartItemId
          ? {
              ...item,
              qtySaleUnit: Math.min(
                Math.max(qtySaleUnit, item.minSaleQty),
                item.stockAvailable,
              ),
            }
          : item,
      ),
    })),
  removeItem: (cartItemId) =>
    set((state) => ({
      items: state.items.filter((item) => item.cartItemId !== cartItemId),
    })),
  clear: () => set({ items: [] }),
}));
