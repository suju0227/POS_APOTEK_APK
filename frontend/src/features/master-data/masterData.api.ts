import { apiClient } from '../../shared/api/apiClient';
import type {
  Category,
  CreateCategoryPayload,
  CreateProductPayload,
  CreateProductUnitPayload,
  CreateSupplierPayload,
  CreateUnitPayload,
  Product,
  ProductUnit,
  Supplier,
  Unit,
  UpdateProductUnitPayload,
} from './masterData.types';

export const masterDataApi = {
  categories: () => apiClient.get<Category[]>('/categories'),
  createCategory: (payload: CreateCategoryPayload) =>
    apiClient.post<Category>('/categories', payload),
  deactivateCategory: (id: string) =>
    apiClient.patch<Category>(`/categories/${id}/deactivate`),

  suppliers: () => apiClient.get<Supplier[]>('/suppliers'),
  createSupplier: (payload: CreateSupplierPayload) =>
    apiClient.post<Supplier>('/suppliers', payload),
  deactivateSupplier: (id: string) =>
    apiClient.patch<Supplier>(`/suppliers/${id}/deactivate`),

  units: () => apiClient.get<Unit[]>('/units'),
  createUnit: (payload: CreateUnitPayload) =>
    apiClient.post<Unit>('/units', payload),
  deactivateUnit: (id: string) =>
    apiClient.patch<Unit>(`/units/${id}/deactivate`),

  products: (q?: string) => {
    const params = new URLSearchParams();
    if (q?.trim()) params.set('q', q.trim());
    const query = params.toString();
    return apiClient.get<Product[]>(`/products${query ? `?${query}` : ''}`);
  },
  createProduct: (payload: CreateProductPayload) =>
    apiClient.post<Product>('/products', payload),
  deactivateProduct: (id: string) =>
    apiClient.patch<Product>(`/products/${id}/deactivate`),

  productUnits: (productId: string) =>
    apiClient.get<ProductUnit[]>(`/products/${productId}/units`),
  createProductUnit: (productId: string, payload: CreateProductUnitPayload) =>
    apiClient.post<ProductUnit>(`/products/${productId}/units`, payload),
  updateProductUnit: (
    productId: string,
    productUnitId: string,
    payload: UpdateProductUnitPayload,
  ) =>
    apiClient.patch<ProductUnit>(
      `/products/${productId}/units/${productUnitId}`,
      payload,
    ),
  deactivateProductUnit: (productId: string, productUnitId: string) =>
    apiClient.patch<ProductUnit>(
      `/products/${productId}/units/${productUnitId}/deactivate`,
    ),
};
