import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Header } from "@/components/header";
import { AdminPropertyTable } from "@/components/admin-property-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Property } from "@shared/schema";
import { Plus, Building2, DollarSign, TrendingUp, Search, BarChart3 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/properties/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Propiedad eliminada",
        description: "La propiedad ha sido eliminada correctamente.",
      });
      setDeleteId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la propiedad. Intenta de nuevo.",
        variant: "destructive",
      });
    },
  });

  const filteredProperties = useMemo(() => {
    if (!searchQuery.trim()) return properties;
    const query = searchQuery.toLowerCase();
    return properties.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.city.toLowerCase().includes(query) ||
        p.developmentName?.toLowerCase().includes(query)
    );
  }, [properties, searchQuery]);

  const stats = useMemo(() => {
    const totalValue = properties.reduce((sum, p) => sum + parseFloat(p.price), 0);
    const available = properties.filter((p) => p.status === "available").length;
    const reserved = properties.filter((p) => p.status === "reserved").length;
    const sold = properties.filter((p) => p.status === "sold").length;

    return {
      total: properties.length,
      totalValue,
      available,
      reserved,
      sold,
    };
  }, [properties]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Administración</h1>
            <p className="text-muted-foreground">Gestiona tus propiedades y desarrollos</p>
          </div>
          <Link href="/admin/properties/new">
            <Button data-testid="button-add-property">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Propiedad
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Propiedades
              </CardTitle>
              <Building2 className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" data-testid="stat-total">
                {stats.total}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.available} disponibles
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Valor Total
              </CardTitle>
              <DollarSign className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" data-testid="stat-value">
                {formatCurrency(stats.totalValue)}
              </p>
              <p className="text-xs text-muted-foreground">MXN en inventario</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Reservados
              </CardTitle>
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-secondary" data-testid="stat-reserved">
                {stats.reserved}
              </p>
              <p className="text-xs text-muted-foreground">propiedades</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Vendidos
              </CardTitle>
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary" data-testid="stat-sold">
                {stats.sold}
              </p>
              <p className="text-xs text-muted-foreground">propiedades</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Listado de Propiedades</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar propiedades..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
          </CardHeader>
          <CardContent>
            <AdminPropertyTable
              properties={filteredProperties}
              isLoading={isLoading}
              onDelete={handleDelete}
              isDeleting={deleteMutation.isPending}
            />
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar propiedad?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La propiedad será eliminada permanentemente del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
