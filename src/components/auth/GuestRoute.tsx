import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
