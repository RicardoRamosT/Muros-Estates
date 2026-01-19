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

const fieldPermissionsSchema = z.record(z.string(), z.boolean()).optional();

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
] as const;

type SectionKey = typeof SECTIONS[number]["key"];

const createDefaultFieldPermissions = (sectionKey: SectionKey): Record<string, boolean> => {
  const fields = EDITABLE_FIELDS[sectionKey];
  return fields.reduce((acc, field) => {
    acc[field.key] = true;
    return acc;
  }, {} as Record<string, boolean>);
};

const defaultPermissions = {
  propiedades: { view: false, edit: false, fields: createDefaultFieldPermissions("propiedades") },
  desarrollos: { view: false, edit: false, fields: createDefaultFieldPermissions("desarrollos") },
  clientes: { view: false, edit: false, fields: createDefaultFieldPermissions("clientes") },
  usuarios: { view: false, edit: false, fields: createDefaultFieldPermissions("usuarios") },
};

export function UserForm({ user, onSubmit, isLoading, onCancel }: UserFormProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

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
        propiedades: {
          view: user?.permissions?.propiedades?.view ?? false,
          edit: user?.permissions?.propiedades?.edit ?? false,
          fields: user?.permissions?.propiedades?.fields || createDefaultFieldPermissions("propiedades"),
        },
        desarrollos: {
          view: user?.permissions?.desarrollos?.view ?? false,
          edit: user?.permissions?.desarrollos?.edit ?? false,
          fields: user?.permissions?.desarrollos?.fields || createDefaultFieldPermissions("desarrollos"),
        },
        clientes: {
          view: user?.permissions?.clientes?.view ?? false,
          edit: user?.permissions?.clientes?.edit ?? false,
          fields: user?.permissions?.clientes?.fields || createDefaultFieldPermissions("clientes"),
        },
        usuarios: {
          view: user?.permissions?.usuarios?.view ?? false,
          edit: user?.permissions?.usuarios?.edit ?? false,
          fields: user?.permissions?.usuarios?.fields || createDefaultFieldPermissions("usuarios"),
        },
      },
    },
  });

  const permissions = useWatch({ control: form.control, name: "permissions" });

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const toggleAllFields = (sectionKey: SectionKey, value: boolean) => {
    const fields = EDITABLE_FIELDS[sectionKey];
    fields.forEach(field => {
      form.setValue(`permissions.${sectionKey}.fields.${field.key}`, value);
    });
  };

  const handleSubmit = (data: UserFormData) => {
    onSubmit(data);
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
              Define qué puede ver y editar este usuario en cada sección
            </p>
          </div>

          <div className="space-y-3">
            {SECTIONS.map((section) => {
              const sectionPermissions = permissions[section.key];
              const canEdit = sectionPermissions?.edit ?? false;
              const isExpanded = expandedSections[section.key] ?? false;
              const sectionFields = EDITABLE_FIELDS[section.key];

              return (
                <div key={section.key} className="rounded-lg border">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{section.label}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                        <FormField
                          control={form.control}
                          name={`permissions.${section.key}.view`}
                          render={({ field }) => (
                            <FormItem className="flex items-center space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid={`checkbox-${section.key}-view`}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                        <FormField
                          control={form.control}
                          name={`permissions.${section.key}.edit`}
                          render={({ field }) => (
                            <FormItem className="flex items-center space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    if (checked) {
                                      setExpandedSections(prev => ({ ...prev, [section.key]: true }));
                                    }
                                  }}
                                  data-testid={`checkbox-${section.key}-edit`}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {canEdit && (
                    <Collapsible open={isExpanded} onOpenChange={() => toggleSection(section.key)}>
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full justify-between px-4 py-2 border-t rounded-none"
                          data-testid={`toggle-fields-${section.key}`}
                        >
                          <span className="text-sm text-muted-foreground">
                            Campos editables ({sectionFields.length} campos)
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-4 pt-2 border-t bg-muted/30">
                          <div className="flex justify-end gap-2 mb-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => toggleAllFields(section.key, true)}
                              data-testid={`select-all-${section.key}`}
                            >
                              Todos
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => toggleAllFields(section.key, false)}
                              data-testid={`deselect-all-${section.key}`}
                            >
                              Ninguno
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {sectionFields.map((fieldDef) => (
                              <FormField
                                key={fieldDef.key}
                                control={form.control}
                                name={`permissions.${section.key}.fields.${fieldDef.key}`}
                                render={({ field }) => (
                                  <FormItem className="flex items-center gap-2 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value ?? true}
                                        onCheckedChange={field.onChange}
                                        data-testid={`checkbox-field-${section.key}-${fieldDef.key}`}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal cursor-pointer">
                                      {fieldDef.label}
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
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
