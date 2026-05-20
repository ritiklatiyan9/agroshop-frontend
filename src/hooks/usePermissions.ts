import { useAuthStore } from '@/store/authStore';
import type { ModuleKey } from '@/types';

/**
 * Returns permission flags for a specific module.
 * Owners always have full access; supervisors get their assigned permissions.
 * Default for unset supervisor permissions is no access.
 */
export function useModulePermission(moduleKey: ModuleKey) {
  const role = useAuthStore((s) => s.user?.role);
  const permissions = useAuthStore((s) => s.permissions);

  if (role === 'owner') {
    return { visible: true, canEdit: true, canDelete: true };
  }

  const perm = permissions?.find((p) => p.module === moduleKey);
  return {
    visible: perm?.visible ?? false,
    canEdit: perm?.can_edit ?? false,
    canDelete: perm?.can_delete ?? false,
  };
}

export function useIsOwner() {
  return useAuthStore((s) => s.user?.role === 'owner');
}
