import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Link } from "wouter";
import { Header } from "@/components/header";
import { UserForm } from "@/components/user-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, UserCog, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

export default function AdminUserEdit() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const userId = params.id;

  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const user = users.find(u => u.id === userId);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/users/${userId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuario actualizado",
        description: "El usuario ha sido actualizado correctamente.",
      });
      setLocation("/admin/users");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el usuario. Intenta de nuevo.",
        variant: "destructive",
      });
    },
  });

  const handleFormSubmit = (data: any) => {
    const updateData: any = { ...data };
    if (!updateData.password) {
      delete updateData.password;
    }
    updateMutation.mutate(updateData);
  };

  const handleCancel = () => {
    setLocation("/admin/users");
  };

  if (isLoadingUsers) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center py-20">
            <h1 className="text-2xl font-bold mb-4">Usuario no encontrado</h1>
            <p className="text-muted-foreground mb-6">
              El usuario que buscas no existe o ha sido eliminado.
            </p>
            <Link href="/admin/users">
              <Button data-testid="button-back-to-list">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al listado
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/admin/users">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-page-title">Editar Usuario</h1>
              <p className="text-muted-foreground">Modifica los datos de {user.name}</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <UserCog className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Información del usuario</CardTitle>
                  <CardDescription>
                    Actualiza los datos del usuario
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <UserForm
                user={user}
                onSubmit={handleFormSubmit}
                isLoading={updateMutation.isPending}
                onCancel={handleCancel}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
