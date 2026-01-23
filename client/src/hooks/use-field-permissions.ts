import { useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { getFieldPermission, canAccessPage, PermissionLevel, PAGE_PERMISSIONS } from "@shared/schema";

type PageName = keyof typeof PAGE_PERMISSIONS;

export function useFieldPermissions(page: PageName) {
  const { user, isLoading: authLoading } = useAuth();
  const role = user?.role || '';

  const isLoading = authLoading;
  const canAccess = useMemo(() => role ? canAccessPage(page, role) : false, [page, role]);

  const getPermission = useCallback((field: string): PermissionLevel => {
    if (!role) return 'none';
    return getFieldPermission(page, field, role);
  }, [page, role]);

  const canView = useCallback((field: string): boolean => {
    const perm = getPermission(field);
    return perm === 'view' || perm === 'edit';
  }, [getPermission]);

  const canEdit = useCallback((field: string): boolean => {
    const perm = getPermission(field);
    return perm === 'edit';
  }, [getPermission]);

  const isAdmin = role === 'admin';
  const isActualizador = role === 'actualizador';
  
  const hasFullAccess = useMemo(() => {
    if (page === 'prospectos') {
      return isAdmin;
    }
    return isAdmin || isActualizador;
  }, [page, isAdmin, isActualizador]);

  return {
    role,
    canAccess,
    isLoading,
    getPermission,
    canView,
    canEdit,
    isAdmin,
    isActualizador,
    hasFullAccess,
  };
}
