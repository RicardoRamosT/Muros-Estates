import { useAuth } from "@/lib/auth";
import { getFieldPermission, canAccessPage, PermissionLevel, PAGE_PERMISSIONS } from "@shared/schema";

type PageName = keyof typeof PAGE_PERMISSIONS;

export function useFieldPermissions(page: PageName) {
  const { user } = useAuth();
  const role = user?.role || '';

  const canAccess = canAccessPage(page, role);

  const getPermission = (field: string): PermissionLevel => {
    if (!role) return 'none';
    return getFieldPermission(page, field, role);
  };

  const canView = (field: string): boolean => {
    const perm = getPermission(field);
    return perm === 'view' || perm === 'edit';
  };

  const canEdit = (field: string): boolean => {
    const perm = getPermission(field);
    return perm === 'edit';
  };

  const isAdmin = role === 'admin';
  const isActualizador = role === 'actualizador';
  
  const hasFullAccess = (() => {
    if (page === 'prospectos') {
      return isAdmin;
    }
    return isAdmin || isActualizador;
  })();

  return {
    role,
    canAccess,
    getPermission,
    canView,
    canEdit,
    isAdmin,
    isActualizador,
    hasFullAccess,
  };
}
