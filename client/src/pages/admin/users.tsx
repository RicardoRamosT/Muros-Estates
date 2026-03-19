import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Header } from "@/components/header";
import { AdminUserTable } from "@/components/admin-user-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { RolesPermissionsView } from "@/components/roles-permissions-view";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { UserPermissions } from "@shared/schema";

interface User {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: string;
  active: boolean | null;
  permissions?: UserPermissions;
  createdAt: string | null;
}

const BUILT_IN_ROLES = [
  { value: "perfilador", label: "Perfilador" },
  { value: "asesor", label: "Asesor" },
  { value: "actualizador", label: "Actualizador" },
  { value: "finanzas", label: "Finanzas" },
  { value: "desarrollador", label: "Desarrollador" },
];

export default function AdminUsers() {
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: customRoles = [] } = useQuery<{ id: number; name: string; key: string }[]>({
    queryKey: ["/api/custom-roles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/custom-roles");
      return res.json();
    },
  });

  const allRoles = useMemo(() => [
    ...BUILT_IN_ROLES,
    ...customRoles.map(r => ({ value: r.key, label: r.name })),
  ], [customRoles]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/users/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuario actualizado",
        description: "El usuario ha sido actualizado correctamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el usuario. Intenta de nuevo.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado correctamente.",
      });
      setDeleteId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el usuario. Intenta de nuevo.",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = useMemo(() => {
    return users.filter(u => u.role !== "admin");
  }, [users]);

  const handleUpdateUser = useCallback((id: string, data: Partial<User>) => {
    updateMutation.mutate({ id, data });
  }, [updateMutation]);

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const handleToggleActive = (id: string, active: boolean) => {
    updateMutation.mutate({ id, data: { active } });
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-background">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold" data-testid="text-page-title">Usuarios</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{filteredUsers.length} usuarios</span>
          <Link href="/admin/users/new">
            <Button size="sm" data-testid="button-add-user">
              <Plus className="w-4 h-4 mr-1" />
              Nuevo
            </Button>
          </Link>
        </div>
      </div>

      <AdminUserTable
        users={filteredUsers}
        isLoading={isLoading}
        onUpdateUser={handleUpdateUser}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
        isDeleting={deleteMutation.isPending}
        availableRoles={allRoles}
      />

      <RolesPermissionsView />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El usuario será eliminado permanentemente del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
