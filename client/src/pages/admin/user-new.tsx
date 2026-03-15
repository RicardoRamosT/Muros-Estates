import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { Header } from "@/components/header";
import { UserForm } from "@/components/user-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, UserPlus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminUserNew() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/users", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuario creado",
        description: "El usuario ha sido creado correctamente.",
      });
      setLocation("/admin/users");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el usuario. Intenta de nuevo.",
        variant: "destructive",
      });
    },
  });

  const handleFormSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  const handleCancel = () => {
    setLocation("/admin/users");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/admin/users">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-page-title">Nuevo Usuario</h1>
              <p className="text-muted-foreground">Crea una cuenta para un nuevo miembro del equipo</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <UserPlus className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Información del usuario</CardTitle>
                  <CardDescription>
                    Completa los datos para crear el nuevo usuario
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <UserForm
                onSubmit={handleFormSubmit}
                isLoading={createMutation.isPending}
                onCancel={handleCancel}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
