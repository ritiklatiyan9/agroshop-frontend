import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import type { Role } from '@/types';

export function RoleRoute({
  allow,
  children,
}: {
  allow: Role[];
  children: React.ReactNode;
}) {
  const role = useAuthStore((s) => s.user?.role);
  if (!role) return <Navigate to="/login" replace />;
  if (!allow.includes(role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
