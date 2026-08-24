import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { counselingApi } from './counseling.api';

export function useCounselingRecords() {
  return useQuery({
    queryKey: ['counseling-records'],
    queryFn: counselingApi.list,
  });
}

export function useCreateCounselingRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: counselingApi.create,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['counseling-records'] }),
  });
}
