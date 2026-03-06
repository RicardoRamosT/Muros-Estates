import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PAGE_PERMISSIONS, type PermissionLevel, type RolePermission } from "@shared/schema";
import { Shield, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SHEET_COLOR_DARK, SHEET_COLOR_LIGHT } from "@/lib/spreadsheet-utils";

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

function getPermissionCellBg(level: PermissionLevel): string {
  if (level === "edit") return "#dcfce7";
  if (level === "view") return "#fef3c7";
  return "#fee2e2";
}

function getPermissionLabel(level: PermissionLevel): string {
  if (level === "edit") return "Editar";
  if (level === "view") return "Ver";
  return "Sin Acceso";
}

function getPermissionTextColor(level: PermissionLevel): string {
  if (level === "edit") return "#15803d";
  if (level === "view") return "#92400e";
  return "#dc2626";
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
      queryClient.invalidateQueries({ queryKey: ['/api/my-permissions'] });
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

  const sectionLabel = SECTION_LABELS[section] || section;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* ROW1: Section header */}
      <div
        className="flex items-center justify-center font-semibold text-sm text-white uppercase tracking-wide"
        style={{ height: 36, backgroundColor: SHEET_COLOR_DARK }}
      >
        {sectionLabel}
      </div>

      <div className="overflow-x-auto">
        {/* ROW2: Column headers */}
        <div className="flex" style={{ minWidth: 'max-content' }}>
          <div
            className="flex-shrink-0 sticky left-0 z-20 flex items-center font-semibold text-xs text-white px-3"
            style={{ width: 130, minWidth: 130, height: 32, backgroundColor: SHEET_COLOR_LIGHT, borderRight: '1px solid rgba(255,255,255,0.15)', borderBottom: '1px solid rgba(255,255,255,0.15)' }}
          >
            Rol
          </div>
          {fieldNames.map((field) => (
            <div
              key={field}
              className="flex-shrink-0 flex items-center justify-center font-medium text-xs text-white"
              style={{ width: 100, minWidth: 100, height: 32, backgroundColor: SHEET_COLOR_LIGHT, borderRight: '1px solid rgba(255,255,255,0.15)', borderBottom: '1px solid rgba(255,255,255,0.15)' }}
            >
              <span className="truncate px-1">{fieldLabels[field] || field}</span>
            </div>
          ))}
        </div>

        {/* Data rows */}
        {ROLES.map((role, rowIdx) => (
          <div
            key={role}
            className="flex"
            style={{ minWidth: 'max-content', backgroundColor: rowIdx % 2 === 0 ? '#ffffff' : '#f9fafb' }}
          >
            <div
              className="flex-shrink-0 sticky left-0 z-10 flex items-center font-medium text-xs px-3 border-b border-r border-gray-200"
              style={{ width: 130, minWidth: 130, height: 32, backgroundColor: rowIdx % 2 === 0 ? '#ffffff' : '#f9fafb' }}
            >
              {ROLE_LABELS[role]}
            </div>
            {fieldNames.map((field) => {
              const level = getEffectivePermission(field, role);
              const isPending = pendingUpdate === `${field}-${role}`;
              return (
                <div
                  key={field}
                  className="flex-shrink-0 flex items-center justify-center text-xs font-medium cursor-pointer select-none border-b border-r border-gray-200 transition-colors hover:brightness-95"
                  style={{
                    width: 100, minWidth: 100, height: 32,
                    backgroundColor: getPermissionCellBg(level),
                    color: getPermissionTextColor(level),
                  }}
                  onClick={() => handleClick(field, role)}
                  data-testid={`badge-permission-${field}-${role}`}
                >
                  {isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  ) : (
                    getPermissionLabel(level)
                  )}
                </div>
              );
            })}
          </div>
        ))}
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
            <span className="inline-flex items-center px-3 py-1 rounded text-xs font-medium" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>
              Editar
            </span>
            <span className="text-muted-foreground">= puede ver y modificar</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded text-xs font-medium" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
              Ver
            </span>
            <span className="text-muted-foreground">= solo lectura</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded text-xs font-medium" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
              Sin Acceso
            </span>
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
