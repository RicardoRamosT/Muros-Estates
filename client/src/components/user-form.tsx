import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Save, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: string;
  active: boolean | null;
}

const userFormSchema = z.object({
  username: z.string().min(3, "El usuario debe tener al menos 3 caracteres"),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional().or(z.literal("")),
  role: z.string().min(1, "El rol es requerido"),
  active: z.boolean().default(true),
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserFormProps {
  user?: User | null;
  onSubmit: (data: UserFormData) => void;
  isLoading?: boolean;
  onCancel: () => void;
}

const BUILT_IN_ROLES = [
  { value: "perfilador", label: "Perfilador" },
  { value: "asesor", label: "Asesor" },
  { value: "actualizador", label: "Actualizador" },
  { value: "finanzas", label: "Finanzas" },
  { value: "desarrollador", label: "Desarrollador" },
];

export function UserForm({ user, onSubmit, isLoading, onCancel }: UserFormProps) {
  const { data: customRoles = [] } = useQuery<{ id: number; name: string; key: string }[]>({
    queryKey: ["/api/custom-roles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/custom-roles");
      return res.json();
    },
  });

  const allRoles = [
    ...BUILT_IN_ROLES,
    ...customRoles.map(r => ({ value: r.key, label: r.name })),
  ];

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: user?.username || "",
      name: user?.name || "",
      email: user?.email || "",
      password: "",
      role: user?.role || "",
      active: user?.active ?? true,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    {allRoles.map((role) => (
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
