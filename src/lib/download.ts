import { api } from '@/lib/axios';

export async function downloadCsv(url: string, params: Record<string, unknown>, filename: string) {
  const res = await api.get(url, {
    params: { ...params, export: 'csv' },
    responseType: 'blob',
  });
  const blob = new Blob([res.data]);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}
