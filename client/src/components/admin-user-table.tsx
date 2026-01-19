import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit, MoreHorizontal, Trash2, Loader2, UserCheck, UserX } from "lucide-react";
import { useState } from "react";

interface User {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: string;
  active: boolean | null;
  createdAt: string | null;
}

interface AdminUserTableProps {
  users: User[];
  isLoading?: boolean;
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  isDeleting?: boolean;
}

const roleLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  admin: { label: "Administrador", variant: "default" },
  perfilador: { label: "Perfilador", variant: "secondary" },
  asesor: { label: "Asesor", variant: "outline" },
  actualizador: { label: "Actualizador", variant: "outline" },
};

export function AdminUserTable({ users, isLoading, onEdit, onDelete, onToggleActive, isDeleting }: AdminUserTableProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Cargando usuarios...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border rounded-lg bg-muted/30">
        <h3 className="text-lg font-semibold mb-2">No hay usuarios</h3>
        <p className="text-muted-foreground mb-4">Comienza agregando tu primer usuario.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Nombre</TableHead>
            <TableHead>Usuario</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-center">Rol</TableHead>
            <TableHead className="text-center">Estado</TableHead>
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const role = roleLabels[user.role] || { label: user.role, variant: "outline" as const };
            return (
              <TableRow key={user.id} className="hover-elevate" data-testid={`row-user-${user.id}`}>
                <TableCell>
                  <p className="font-medium" data-testid={`text-name-${user.id}`}>{user.name}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-muted-foreground">{user.username}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm">{user.email || "-"}</p>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={role.variant} data-testid={`badge-role-${user.id}`}>
                    {role.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge 
                    variant={user.active ? "default" : "destructive"} 
                    data-testid={`badge-status-${user.id}`}
                  >
                    {user.active ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-actions-${user.id}`}>
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        className="cursor-pointer" 
                        onClick={() => onEdit(user)}
                        data-testid={`action-edit-${user.id}`}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="cursor-pointer"
                        onClick={() => onToggleActive(user.id, !user.active)}
                        data-testid={`action-toggle-${user.id}`}
                      >
                        {user.active ? (
                          <>
                            <UserX className="w-4 h-4 mr-2" />
                            Desactivar
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4 mr-2" />
                            Activar
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="cursor-pointer text-destructive focus:text-destructive"
                        onClick={() => onDelete(user.id)}
                        disabled={isDeleting}
                        data-testid={`action-delete-${user.id}`}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
