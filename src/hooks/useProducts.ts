import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { Product, Pagination } from '@/types';

export function useAllProducts() {
  return useQuery({
    queryKey: ['products', 'all'],
    queryFn: async () => {
      const res = await api.get<{ data: Product[]; pagination: Pagination }>('/products', {
        params: { page: 1, page_size: 200, status: 'active' },
      });
      return res.data.data;
    },
  });
}
