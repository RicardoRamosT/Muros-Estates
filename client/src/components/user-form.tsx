import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, X, Eye, Pencil } from "lucide-react";
import type { UserPermissions } from "@shared/schema";

interface User {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: string;
  active: boolean | null;
  permissions?: UserPermissions;
}

const permissionSectionSchema = z.object({
  view: z.boolean(),
  edit: z.boolean(),
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

const defaultPermissions = {
  propiedades: { view: false, edit: false },
  desarrollos: { view: false, edit: false },
  clientes: { view: false, edit: false },
  usuarios: { view: false, edit: false },
};

export function UserForm({ user, onSubmit, isLoading, onCancel }: UserFormProps) {
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
        propiedades: user?.permissions?.propiedades || defaultPermissions.propiedades,
        desarrollos: user?.permissions?.desarrollos || defaultPermissions.desarrollos,
        clientes: user?.permissions?.clientes || defaultPermissions.clientes,
        usuarios: user?.permissions?.usuarios || defaultPermissions.usuarios,
      },
    },
  });

  const handleSubmit = (data: UserFormData) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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

        <div className="space-y-3">
          <FormLabel className="text-base font-medium">Permisos por sección</FormLabel>
          <div className="rounded-lg border p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-sm font-medium text-muted-foreground pb-2 border-b">
              <span>Sección</span>
              <span className="text-center flex items-center justify-center gap-1">
                <Eye className="w-3 h-3" /> Ver
              </span>
              <span className="text-center flex items-center justify-center gap-1">
                <Pencil className="w-3 h-3" /> Editar
              </span>
            </div>
            {SECTIONS.map((section) => (
              <div key={section.key} className="grid grid-cols-3 gap-2 items-center">
                <span className="text-sm font-medium">{section.label}</span>
                <div className="flex justify-center">
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
                <div className="flex justify-center">
                  <FormField
                    control={form.control}
                    name={`permissions.${section.key}.edit`}
                    render={({ field }) => (
                      <FormItem className="flex items-center space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid={`checkbox-${section.key}-edit`}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Usuario activo</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Los usuarios inactivos no pueden iniciar sesión
                </p>
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

        <div className="flex justify-end gap-3 pt-4">
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
