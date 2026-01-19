import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, X, Eye, Pencil, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EDITABLE_FIELDS, type UserPermissions } from "@shared/schema";

interface User {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: string;
  active: boolean | null;
  permissions?: UserPermissions;
}

const fieldPermissionSchema = z.object({
  view: z.boolean(),
  edit: z.boolean(),
});

const fieldPermissionsSchema = z.record(z.string(), fieldPermissionSchema).optional();

const permissionSectionSchema = z.object({
  view: z.boolean(),
  edit: z.boolean(),
  fields: fieldPermissionsSchema,
});

const userFormSchema = z.object({
  username: z.string().min(3, "El usuario debe tener al menos 3 caracteres"),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional().or(z.literal("")),
  role: z.string().min(1, "El rol es requerido"),
  active: z.boolean().default(true),
  permissions: z.object({
    propiedades: permissionSectionSchema,
    desarrollos: permissionSectionSchema,
    clientes: permissionSectionSchema,
    usuarios: permissionSectionSchema,
    documentos: permissionSectionSchema,
  }),
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserFormProps {
  user?: User | null;
  onSubmit: (data: UserFormData) => void;
  isLoading?: boolean;
  onCancel: () => void;
}

const ROLES = [
  { value: "perfilador", label: "Perfilador" },
  { value: "asesor", label: "Asesor" },
  { value: "actualizador", label: "Actualizador" },
];

const SECTIONS = [
  { key: "propiedades", label: "Propiedades" },
  { key: "desarrollos", label: "Desarrollos" },
  { key: "clientes", label: "Clientes" },
  { key: "usuarios", label: "Usuarios" },
  { key: "documentos", label: "Documentos" },
] as const;

type SectionKey = typeof SECTIONS[number]["key"];

type FieldPermission = { view: boolean; edit: boolean };

const createDefaultFieldPermissions = (sectionKey: SectionKey, defaultValue: boolean = false): Record<string, FieldPermission> => {
  const fields = EDITABLE_FIELDS[sectionKey];
  return fields.reduce((acc, field) => {
    acc[field.key] = { view: defaultValue, edit: defaultValue };
    return acc;
  }, {} as Record<string, FieldPermission>);
};

const migrateFieldPermissions = (
  sectionKey: SectionKey, 
  existingFields: Record<string, any> | undefined,
  sectionView: boolean = false,
  sectionEdit: boolean = false
): Record<string, FieldPermission> => {
  const fields = EDITABLE_FIELDS[sectionKey];
  return fields.reduce((acc, field) => {
    if (!existingFields) {
      acc[field.key] = { view: sectionView, edit: sectionEdit };
    } else {
      const existing = existingFields[field.key];
      if (existing === undefined) {
        acc[field.key] = { view: sectionView, edit: sectionEdit };
      } else if (typeof existing === "boolean") {
        acc[field.key] = { view: existing, edit: existing };
      } else if (typeof existing === "object" && existing !== null) {
        acc[field.key] = { 
          view: existing.view ?? sectionView, 
          edit: existing.edit ?? sectionEdit 
        };
      } else {
        acc[field.key] = { view: sectionView, edit: sectionEdit };
      }
    }
    return acc;
  }, {} as Record<string, FieldPermission>);
};

const deriveSectionPermissions = (fields: Record<string, FieldPermission>) => {
  const hasAnyView = Object.values(fields).some(f => f.view);
  const hasAnyEdit = Object.values(fields).some(f => f.edit);
  return { view: hasAnyView, edit: hasAnyEdit };
};

const defaultPermissions = {
  propiedades: { view: false, edit: false, fields: createDefaultFieldPermissions("propiedades") },
  desarrollos: { view: false, edit: false, fields: createDefaultFieldPermissions("desarrollos") },
  clientes: { view: false, edit: false, fields: createDefaultFieldPermissions("clientes") },
  usuarios: { view: false, edit: false, fields: createDefaultFieldPermissions("usuarios") },
};

export function UserForm({ user, onSubmit, isLoading, onCancel }: UserFormProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    propiedades: true,
    desarrollos: true,
    clientes: true,
    usuarios: true,
  });

  const getInitialSectionPermissions = (sectionKey: SectionKey) => {
    const sectionView = user?.permissions?.[sectionKey]?.view ?? false;
    const sectionEdit = user?.permissions?.[sectionKey]?.edit ?? false;
    const migratedFields = migrateFieldPermissions(
      sectionKey, 
      user?.permissions?.[sectionKey]?.fields as Record<string, any> | undefined,
      sectionView,
      sectionEdit
    );
    const derived = deriveSectionPermissions(migratedFields);
    return {
      view: derived.view,
      edit: derived.edit,
      fields: migratedFields,
    };
  };

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: user?.username || "",
      name: user?.name || "",
      email: user?.email || "",
      password: "",
      role: user?.role || "",
      active: user?.active ?? true,
      permissions: {
        propiedades: getInitialSectionPermissions("propiedades"),
        desarrollos: getInitialSectionPermissions("desarrollos"),
        clientes: getInitialSectionPermissions("clientes"),
        usuarios: getInitialSectionPermissions("usuarios"),
        documentos: getInitialSectionPermissions("documentos"),
      },
    },
  });

  const permissions = useWatch({ control: form.control, name: "permissions" });

  const handleSectionToggle = (sectionKey: string, open: boolean) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: open,
    }));
  };

  const toggleAllFieldsView = (sectionKey: SectionKey, value: boolean) => {
    const fields = EDITABLE_FIELDS[sectionKey];
    fields.forEach(field => {
      const fieldPath = `permissions.${sectionKey}.fields.${field.key}` as const;
      const currentEdit = (form.getValues(fieldPath as any) as FieldPermission | undefined)?.edit ?? true;
      form.setValue(fieldPath as any, { view: value, edit: value ? currentEdit : false });
    });
  };

  const toggleAllFieldsEdit = (sectionKey: SectionKey, value: boolean) => {
    const fields = EDITABLE_FIELDS[sectionKey];
    fields.forEach(field => {
      const fieldPath = `permissions.${sectionKey}.fields.${field.key}` as const;
      const currentView = (form.getValues(fieldPath as any) as FieldPermission | undefined)?.view ?? true;
      form.setValue(fieldPath as any, { view: value ? true : currentView, edit: value });
    });
  };

  const toggleAllFields = (sectionKey: SectionKey, viewValue: boolean, editValue: boolean) => {
    const fields = EDITABLE_FIELDS[sectionKey];
    fields.forEach(field => {
      const fieldPath = `permissions.${sectionKey}.fields.${field.key}` as const;
      form.setValue(fieldPath as any, { view: viewValue, edit: editValue });
    });
  };

  const handleSubmit = (data: UserFormData) => {
    const processedData = {
      ...data,
      permissions: {
        propiedades: {
          ...deriveSectionPermissions(data.permissions.propiedades.fields!),
          fields: data.permissions.propiedades.fields,
        },
        desarrollos: {
          ...deriveSectionPermissions(data.permissions.desarrollos.fields!),
          fields: data.permissions.desarrollos.fields,
        },
        clientes: {
          ...deriveSectionPermissions(data.permissions.clientes.fields!),
          fields: data.permissions.clientes.fields,
        },
        usuarios: {
          ...deriveSectionPermissions(data.permissions.usuarios.fields!),
          fields: data.permissions.usuarios.fields,
        },
        documentos: {
          ...deriveSectionPermissions(data.permissions.documentos.fields!),
          fields: data.permissions.documentos.fields,
        },
      },
    };
    onSubmit(processedData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre completo</FormLabel>
                <FormControl>
                  <Input placeholder="ej. Juan Pérez" {...field} data-testid="input-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Usuario</FormLabel>
                <FormControl>
                  <Input placeholder="ej. jperez" {...field} data-testid="input-username" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email (opcional)</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="ej. juan@muros.mx" {...field} data-testid="input-email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{user ? "Nueva contraseña (dejar vacío para mantener)" : "Contraseña"}</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••" {...field} data-testid="input-password" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rol</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-role">
                      <SelectValue placeholder="Selecciona el rol" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel className="text-sm">Usuario activo</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-active"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <div>
            <FormLabel className="text-lg font-semibold">Permisos por sección</FormLabel>
            <p className="text-sm text-muted-foreground mt-1">
              Define qué puede ver y editar este usuario en cada campo
            </p>
          </div>

          <div className="space-y-4">
            {SECTIONS.map((section) => {
              const isExpanded = expandedSections[section.key] ?? true;
              const sectionFields = EDITABLE_FIELDS[section.key];

              return (
                <Collapsible 
                  key={section.key} 
                  open={isExpanded} 
                  onOpenChange={(open) => handleSectionToggle(section.key, open)}
                  className="rounded-lg border"
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center justify-between w-full p-4 hover-elevate rounded-t-lg"
                      data-testid={`toggle-section-${section.key}`}
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <span className="font-semibold">{section.label}</span>
                        <span className="text-sm text-muted-foreground">
                          ({sectionFields.length} campos)
                        </span>
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t">
                      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-muted-foreground">Acciones rápidas:</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleAllFields(section.key, true, true)}
                            data-testid={`select-all-${section.key}`}
                          >
                            Todo
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleAllFields(section.key, true, false)}
                            data-testid={`view-only-${section.key}`}
                          >
                            Solo ver
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleAllFields(section.key, false, false)}
                            data-testid={`deselect-all-${section.key}`}
                          >
                            Ninguno
                          </Button>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>Ver</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Pencil className="w-3 h-3" />
                            <span>Editar</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="divide-y max-h-64 overflow-y-auto">
                        {sectionFields.map((fieldDef) => {
                          const fieldPath = `permissions.${section.key}.fields.${fieldDef.key}` as const;
                          
                          return (
                            <div 
                              key={fieldDef.key} 
                              className="flex items-center justify-between px-4 py-2 hover:bg-muted/20"
                            >
                              <span className="text-sm">{fieldDef.label}</span>
                              <div className="flex items-center gap-4">
                                <FormField
                                  control={form.control}
                                  name={`permissions.${section.key}.fields.${fieldDef.key}.view` as any}
                                  render={({ field }) => (
                                    <FormItem className="flex items-center space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value ?? true}
                                          onCheckedChange={(checked) => {
                                            field.onChange(checked);
                                            if (!checked) {
                                              form.setValue(`permissions.${section.key}.fields.${fieldDef.key}.edit` as any, false);
                                            }
                                          }}
                                          data-testid={`checkbox-field-${section.key}-${fieldDef.key}-view`}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`permissions.${section.key}.fields.${fieldDef.key}.edit` as any}
                                  render={({ field }) => (
                                    <FormItem className="flex items-center space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value ?? true}
                                          onCheckedChange={(checked) => {
                                            field.onChange(checked);
                                            if (checked) {
                                              form.setValue(`permissions.${section.key}.fields.${fieldDef.key}.view` as any, true);
                                            }
                                          }}
                                          data-testid={`checkbox-field-${section.key}-${fieldDef.key}-edit`}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} data-testid="button-cancel">
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading} data-testid="button-submit">
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {user ? "Actualizar" : "Crear"} Usuario
          </Button>
        </div>
      </form>
    </Form>
  );
}
