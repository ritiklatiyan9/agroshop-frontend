import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { showLocalNotification } from '@/lib/fcm';

export function useActionNotify() {
  const queryClient = useQueryClient();

  async function notify(title: string, body: string) {
    showLocalNotification(title, body);
    try {
      await api.post('/notifications/action', { title, body });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch { /* ignore */ }
  }

  return { notify };
}
