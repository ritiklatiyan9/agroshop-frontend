import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { Party } from '@/types';

export function useParties(type: 'all' | 'customer' | 'supplier' | 'both' = 'all') {
  return useQuery({
    queryKey: ['parties', type],
    queryFn: async () => {
      const res = await api.get<{ data: Party[] }>('/parties', { params: { type } });
      return res.data.data;
    },
  });
}

export function useSuppliers() {
  return useParties('supplier');
}
