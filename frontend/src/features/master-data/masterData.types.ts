export type Category = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  contactPerson: string | null;
  isActive: boolean;
};

export type Unit = {
  id: string;
  name: string;
  symbol: string | null;
  isActive: boolean;
};

export type ProductUnit = {
  id: string;
  unitId: string;
  conversionToBase: number;
  isDefaultSaleUnit: boolean;
  isSaleUnit: boolean;
  minSaleQty: number;
  saleUnitNote: string | null;
  isActive: boolean;
  unit: Unit;
};

export type Product = {
  id: string;
  categoryId: string;
  baseUnitId: string;
  code: string;
  barcode: string | null;
  name: string;
  genericName: string | null;
  minStockBase: number;
  isActive: boolean;
  category: Category;
  baseUnit: Unit;
  productUnits: ProductUnit[];
};

export type CreateCategoryPayload = {
  name: string;
  description?: string;
};

export type CreateSupplierPayload = {
  name: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
};

export type CreateUnitPayload = {
  name: string;
  symbol?: string;
};

export type CreateProductPayload = {
  categoryId: string;
  baseUnitId: string;
  code: string;
  barcode?: string;
  name: string;
  genericName?: string;
  minStockBase?: number;
};

export type CreateProductUnitPayload = {
  unitId: string;
  conversionToBase: number;
  isDefaultSaleUnit?: boolean;
  isSaleUnit?: boolean;
  minSaleQty?: number;
  saleUnitNote?: string;
};

export type UpdateProductUnitPayload = Partial<CreateProductUnitPayload> & {
  isActive?: boolean;
};
