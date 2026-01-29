import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, MoreHorizontal, Trash2, Loader2, UserCheck, UserX, Eye, Pencil, Users } from "lucide-react";
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

const SECTION_LABELS: Record<string, string> = {
  propiedades: "Propiedades",
  desarrollos: "Desarrollos",
  clientes: "Clientes",
  usuarios: "Usuarios",
};

function PermissionsSummary({ permissions }: { permissions?: UserPermissions }) {
  if (!permissions) {
    return <span className="text-muted-foreground text-xs">Sin permisos</span>;
  }

  const sections = Object.entries(permissions).filter(([_, perms]) => perms?.view || perms?.edit);
  
  if (sections.length === 0) {
    return <span className="text-muted-foreground text-xs">Sin permisos</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {sections.map(([section, perms]) => (
        <Tooltip key={section}>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-xs px-1.5 py-0.5">
              {SECTION_LABELS[section]?.[0] || section[0].toUpperCase()}
              {perms?.view && <Eye className="w-2.5 h-2.5 ml-0.5 inline" />}
              {perms?.edit && <Pencil className="w-2.5 h-2.5 ml-0.5 inline" />}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{SECTION_LABELS[section]}</p>
            <p className="text-xs">
              {perms?.view && "Ver"}{perms?.view && perms?.edit && " + "}{perms?.edit && "Editar"}
            </p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
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
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/50">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium text-sm">{users.length} Usuarios</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/60">
              <th className="text-left font-medium py-3 px-3 border-b border-r sticky top-0">#</th>
              <th className="text-left font-medium py-3 px-3 border-b border-r sticky top-0">Nombre</th>
              <th className="text-left font-medium py-3 px-3 border-b border-r sticky top-0">Usuario</th>
              <th className="text-left font-medium py-3 px-3 border-b border-r sticky top-0">Email</th>
              <th className="text-center font-medium py-3 px-3 border-b border-r sticky top-0">Rol</th>
              <th className="text-center font-medium py-3 px-3 border-b border-r sticky top-0">Permisos</th>
              <th className="text-center font-medium py-3 px-3 border-b border-r sticky top-0">Estado</th>
              <th className="text-center font-medium py-3 px-2 border-b sticky top-0 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => {
              const role = roleLabels[user.role] || { label: user.role, variant: "outline" as const };
              return (
                <tr key={user.id} className="hover:bg-muted/30" data-testid={`row-user-${user.id}`}>
                  <td className="border-b border-r px-3 py-2 text-muted-foreground">{idx + 1}</td>
                  <td className="border-b border-r px-3 py-2">
                    <span className="font-medium" data-testid={`text-name-${user.id}`}>{user.name}</span>
                  </td>
                  <td className="border-b border-r px-3 py-2">
                    <span className="text-muted-foreground">{user.username}</span>
                  </td>
                  <td className="border-b border-r px-3 py-2">
                    <span>{user.email || ""}</span>
                  </td>
                  <td className="border-b border-r px-3 py-2 text-center">
                    <Badge variant={role.variant} data-testid={`badge-role-${user.id}`}>
                      {role.label}
                    </Badge>
                  </td>
                  <td className="border-b border-r px-3 py-2 text-center">
                    <PermissionsSummary permissions={user.permissions} />
                  </td>
                  <td className="border-b border-r px-3 py-2 text-center">
                    <Badge 
                      variant={user.active ? "default" : "destructive"}
                      className={user.active ? "bg-green-500/20 text-green-700 dark:text-green-400" : ""}
                      data-testid={`badge-status-${user.id}`}
                    >
                      {user.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="border-b px-2 py-2">
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
