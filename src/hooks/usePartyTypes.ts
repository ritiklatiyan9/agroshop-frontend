import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface PartyCustomType {
  id: string;
  label: string;
  created_at: string;
}

export function usePartyTypes() {
  return useQuery({
    queryKey: ['party-types'],
    queryFn: async () => {
      const res = await api.get<{ data: PartyCustomType[] }>('/parties/types');
      return res.data.data;
    },
    staleTime: 30_000,
  });
}
