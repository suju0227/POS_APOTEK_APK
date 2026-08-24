export class StockNotEnoughError extends Error {
  constructor() {
    super('Stok produk tidak mencukupi');
  }
}
