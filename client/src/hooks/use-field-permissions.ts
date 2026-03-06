import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { getFieldPermission, canAccessPage, PermissionLevel, PAGE_PERMISSIONS } from "@shared/schema";
import type { RolePermission } from "@shared/schema";

type PageName = keyof typeof PAGE_PERMISSIONS;

export function useFieldPermissions(page: PageName) {
  const { user, isLoading: authLoading } = useAuth();
  const role = user?.role || '';

  const { data: myPermissions = [], isLoading: permissionsLoading } = useQuery<RolePermission[]>({
    queryKey: ['/api/my-permissions'],
    enabled: !!role,
    staleTime: Infinity,
  });

  const overrideMap = useMemo(() => {
    const map = new Map<string, PermissionLevel>();
    for (const p of myPermissions) {
      map.set(`${p.section}:${p.field}`, p.permissionLevel as PermissionLevel);
    }
    return map;
  }, [myPermissions]);

  const isLoading = authLoading || permissionsLoading;
  const canAccess = useMemo(() => role ? canAccessPage(page, role) : false, [page, role]);

  const getPermission = useCallback((field: string): PermissionLevel => {
    if (!role) return 'none';
    const override = overrideMap.get(`${page}:${field}`);
    if (override) return override;
    return getFieldPermission(page, field, role);
  }, [page, role, overrideMap]);

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
