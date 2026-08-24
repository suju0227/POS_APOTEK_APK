import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { masterDataApi } from './masterData.api';
import type { CreateProductUnitPayload } from './masterData.types';

export function useCategories() {
  return useQuery({
    queryKey: ['master-data', 'categories'],
    queryFn: masterDataApi.categories,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: masterDataApi.createCategory,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['master-data', 'categories'] }),
  });
}

export function useDeactivateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: masterDataApi.deactivateCategory,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['master-data', 'categories'] }),
  });
}

export function useSuppliers() {
  return useQuery({
    queryKey: ['master-data', 'suppliers'],
    queryFn: masterDataApi.suppliers,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: masterDataApi.createSupplier,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['master-data', 'suppliers'] }),
  });
}

export function useDeactivateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: masterDataApi.deactivateSupplier,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['master-data', 'suppliers'] }),
  });
}

export function useUnits() {
  return useQuery({
    queryKey: ['master-data', 'units'],
    queryFn: masterDataApi.units,
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: masterDataApi.createUnit,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['master-data', 'units'] }),
  });
}

export function useDeactivateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: masterDataApi.deactivateUnit,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['master-data', 'units'] }),
  });
}

export function useProducts(q: string) {
  return useQuery({
    queryKey: ['master-data', 'products', q],
    queryFn: () => masterDataApi.products(q),
  });
}

export function useProductUnits(productId: string | null) {
  return useQuery({
    queryKey: ['master-data', 'products', productId, 'units'],
    queryFn: () => masterDataApi.productUnits(productId ?? ''),
    enabled: Boolean(productId),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: masterDataApi.createProduct,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['master-data', 'products'] }),
  });
}

export function useDeactivateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: masterDataApi.deactivateProduct,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['master-data', 'products'] }),
  });
}

export function useCreateProductUnit(productId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProductUnitPayload) =>
      masterDataApi.createProductUnit(productId ?? '', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-data', 'products'] });
      queryClient.invalidateQueries({
        queryKey: ['master-data', 'products', productId, 'units'],
      });
    },
  });
}

export function useUpdateProductUnit(productId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productUnitId,
      payload,
    }: {
      productUnitId: string;
      payload: Parameters<typeof masterDataApi.updateProductUnit>[2];
    }) => masterDataApi.updateProductUnit(productId ?? '', productUnitId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-data', 'products'] });
      queryClient.invalidateQueries({
        queryKey: ['master-data', 'products', productId, 'units'],
      });
    },
  });
}

export function useDeactivateProductUnit(productId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productUnitId: string) =>
      masterDataApi.deactivateProductUnit(productId ?? '', productUnitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-data', 'products'] });
      queryClient.invalidateQueries({
        queryKey: ['master-data', 'products', productId, 'units'],
      });
    },
  });
}
