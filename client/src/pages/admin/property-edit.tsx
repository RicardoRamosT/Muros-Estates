import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Header } from "@/components/header";
import { PropertyForm } from "@/components/property-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Property, InsertProperty } from "@shared/schema";
import { ArrowLeft, Building2 } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function PropertyEdit() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isNew = id === "new";

  const { data: property, isLoading, error } = useQuery<Property>({
    queryKey: [`/api/properties/${id}`],
    enabled: !isNew && !!id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertProperty) => {
      const response = await apiRequest("POST", "/api/properties", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Propiedad creada",
        description: "La propiedad ha sido creada correctamente.",
      });
      setLocation("/admin");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear la propiedad. Intenta de nuevo.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertProperty) => {
      const response = await apiRequest("PUT", `/api/properties/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Propiedad actualizada",
        description: "Los cambios han sido guardados correctamente.",
      });
      setLocation("/admin");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la propiedad. Intenta de nuevo.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InsertProperty) => {
    if (isNew) {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  const handleCancel = () => {
    setLocation("/admin");
  };

  if (!isNew && isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <LoadingState message="Cargando propiedad..." />
      </div>
    );
  }

  if (!isNew && (error || !property)) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Propiedad no encontrada</h1>
          <p className="text-muted-foreground mb-6">
            La propiedad que buscas no existe o ha sido eliminada.
          </p>
          <Link href="/admin">
            <Button data-testid="button-back-admin">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a administración
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6">
        <Link href="/admin">
          <Button variant="ghost" className="mb-6" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a administración
          </Button>
        </Link>

        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold" data-testid="text-page-title">
              {isNew ? "Nueva Propiedad" : "Editar Propiedad"}
            </h1>
            <p className="text-muted-foreground">
              {isNew
                ? "Completa la información para agregar una nueva propiedad"
                : "Modifica la información de la propiedad"}
            </p>
          </div>

          <PropertyForm
            property={isNew ? undefined : property}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </div>
      </main>
    </div>
  );
}
