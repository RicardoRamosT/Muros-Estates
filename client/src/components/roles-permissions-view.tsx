import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PAGE_PERMISSIONS, type PermissionLevel, type RolePermission } from "@shared/schema";
import { Eye, Pencil, EyeOff, Shield, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  actualizador: "Actualizador",
  perfilador: "Perfilador",
  finanzas: "Finanzas",
  asesor: "Asesor",
  desarrollador: "Desarrollador",
};

const SECTION_LABELS: Record<string, string> = {
  desarrolladores: "Desarrolladores",
  desarrollos: "Desarrollos",
  tipologias: "Tipologías",
  prospectos: "Prospectos",
  clientes: "Clientes",
};

const FIELD_LABELS: Record<string, Record<string, string>> = {
  desarrolladores: {
    id: "ID",
    tipo: "Tipo",
    active: "Activo",
    name: "Nombre",
    razonSocial: "Razón Social",
    rfc: "RFC",
    domicilio: "Domicilio",
    antiguedad: "Antigüedad",
    tipos: "Tipos",
    representante: "Representante",
    contactName: "Contacto Nombre",
    contactPhone: "Contacto Teléfono",
    contactEmail: "Contacto Email",
    legales: "Legales",
  },
  prospectos: {
    id: "ID",
    fechaAlta: "Fecha Alta",
    asesor: "Asesor",
    nombre: "Nombre",
    apellido: "Apellido",
    telefono: "Teléfono",
    correo: "Correo",
    tipofil: "Tipo",
    perfil: "Perfil",
    comoLlega: "Cómo Llega",
    brokerExterno: "Broker Externo",
    estatus: "Estatus",
    embudo: "Embudo",
    comoPaga: "Cómo Paga",
    positivos: "Positivos",
    negativos: "Negativos",
    comentarios: "Comentarios",
  },
};

const ROLES = ["admin", "actualizador", "perfilador", "finanzas", "asesor", "desarrollador"];

function getNextPermissionLevel(current: PermissionLevel): PermissionLevel {
  if (current === "none") return "view";
  if (current === "view") return "edit";
  return "none";
}

function PermissionBadge({ 
  level, 
  fieldName, 
  roleName,
  onClick,
  isLoading
}: { 
  level: PermissionLevel; 
  fieldName: string; 
  roleName: string;
  onClick: () => void;
  isLoading: boolean;
}) {
  const testId = `badge-permission-${fieldName}-${roleName}`;
  const baseClasses = "cursor-pointer gap-1 transition-all";
  
  if (isLoading) {
    return (
      <Badge variant="outline" className={baseClasses} data-testid={testId}>
        <Loader2 className="w-3 h-3 animate-spin" />
      </Badge>
    );
  }
  
  if (level === "edit") {
    return (
      <Badge 
        variant="default" 
        className={`bg-green-600 ${baseClasses}`} 
        onClick={onClick}
        data-testid={testId}
      >
        <Pencil className="w-3 h-3" />
        Editar
      </Badge>
    );
  }
  if (level === "view") {
    return (
      <Badge 
        variant="secondary" 
        className={`bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 ${baseClasses}`} 
        onClick={onClick}
        data-testid={testId}
      >
        <Eye className="w-3 h-3" />
        Ver
      </Badge>
    );
  }
  return (
    <Badge 
      variant="outline" 
      className={`text-muted-foreground ${baseClasses}`} 
      onClick={onClick}
      data-testid={testId}
    >
      <EyeOff className="w-3 h-3" />
      Sin acceso
    </Badge>
  );
}

function PermissionsTable({ section }: { section: string }) {
  const { toast } = useToast();
  const [pendingUpdate, setPendingUpdate] = useState<string | null>(null);
  
  const sectionData = (PAGE_PERMISSIONS as Record<string, any>)[section];
  
  const { data: customPermissions = [] } = useQuery<RolePermission[]>({
    queryKey: ['/api/role-permissions', section],
  });
  
  const updateMutation = useMutation({
    mutationFn: async (data: { section: string; field: string; role: string; permissionLevel: PermissionLevel }) => {
      return apiRequest('POST', '/api/role-permissions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/role-permissions', section] });
      toast({ title: "Permiso actualizado" });
    },
    onError: () => {
      toast({ title: "Error al actualizar permiso", variant: "destructive" });
    },
    onSettled: () => {
      setPendingUpdate(null);
    }
  });
  
  if (!sectionData || !sectionData.fields) {
    return (
      <p className="text-muted-foreground text-sm">
        Permisos no configurados para esta sección
      </p>
    );
  }

  const defaultFields = sectionData.fields as Record<string, Record<string, PermissionLevel>>;
  const fieldNames = Object.keys(defaultFields);
  const fieldLabels = FIELD_LABELS[section] || {};
  
  const getEffectivePermission = (field: string, role: string): PermissionLevel => {
    const custom = customPermissions.find(
      p => p.section === section && p.field === field && p.role === role
    );
    if (custom) {
      return custom.permissionLevel as PermissionLevel;
    }
    return defaultFields[field]?.[role] || "none";
  };
  
  const handleClick = (field: string, role: string) => {
    const currentLevel = getEffectivePermission(field, role);
    const nextLevel = getNextPermissionLevel(currentLevel);
    setPendingUpdate(`${field}-${role}`);
    updateMutation.mutate({ section, field, role, permissionLevel: nextLevel });
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/60">
              <th className="text-left font-medium py-3 px-3 border-b border-r sticky left-0 top-0 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/60 z-20">
                Rol
              </th>
              {fieldNames.map((field) => (
                <th key={field} className="text-center font-medium py-3 px-2 border-b border-r min-w-[90px] sticky top-0 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/60">
                  {fieldLabels[field] || field}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROLES.map((role) => (
              <tr key={role} className="hover:bg-muted/30">
                <td className="border-b border-r py-2 px-3 font-medium sticky left-0 bg-background z-10">
                  {ROLE_LABELS[role]}
                </td>
                {fieldNames.map((field) => (
                  <td key={field} className="border-b border-r py-2 px-2 text-center">
                    <PermissionBadge 
                      level={getEffectivePermission(field, role)}
                      fieldName={field}
                      roleName={role}
                      onClick={() => handleClick(field, role)}
                      isLoading={pendingUpdate === `${field}-${role}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RolesPermissionsView() {
  const availableSections = Object.keys(PAGE_PERMISSIONS).filter(
    (key) => {
      const section = (PAGE_PERMISSIONS as Record<string, any>)[key];
      return section && section.fields;
    }
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <CardTitle>Roles y Permisos</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Matriz de permisos por rol para cada sección del sistema. Haz clic en un permiso para cambiarlo.
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-600 no-default-hover-elevate">
              <Pencil className="w-3 h-3 mr-1" />
              Editar
            </Badge>
            <span className="text-muted-foreground">= puede ver y modificar</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 no-default-hover-elevate">
              <Eye className="w-3 h-3 mr-1" />
              Ver
            </Badge>
            <span className="text-muted-foreground">= solo lectura</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-muted-foreground no-default-hover-elevate">
              <EyeOff className="w-3 h-3 mr-1" />
              Sin acceso
            </Badge>
            <span className="text-muted-foreground">= campo oculto</span>
          </div>
        </div>

        <Tabs defaultValue="desarrolladores">
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            {availableSections.map((section) => (
              <TabsTrigger 
                key={section} 
                value={section} 
                className="capitalize"
                data-testid={`tab-permissions-${section}`}
              >
                {SECTION_LABELS[section] || section}
              </TabsTrigger>
            ))}
          </TabsList>

          {availableSections.map((section) => (
            <TabsContent key={section} value={section}>
              <PermissionsTable section={section} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
