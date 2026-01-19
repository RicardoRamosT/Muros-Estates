import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Typology } from "@shared/schema";
import { Building2, DollarSign, TrendingUp, Users, TableProperties, MapPin } from "lucide-react";
import { useMemo } from "react";

export default function AdminDashboard() {
  const { data: typologies = [] } = useQuery<Typology[]>({
    queryKey: ["/api/typologies"],
  });

  const stats = useMemo(() => {
    const totalValue = typologies.reduce((sum, t) => sum + (parseFloat(t.price || "0") || 0), 0);
    const monterrey = typologies.filter((t) => t.city === "Monterrey").length;
    const cdmx = typologies.filter((t) => t.city === "CDMX").length;
    const uniqueDevelopments = new Set(typologies.map(t => t.development).filter(Boolean)).size;

    return {
      total: typologies.length,
      totalValue,
      monterrey,
      cdmx,
      developments: uniqueDevelopments,
    };
  }, [typologies]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Administración</h1>
          <p className="text-muted-foreground">Panel de control de Muros</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Tipologías
              </CardTitle>
              <Building2 className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" data-testid="stat-total">
                {stats.total}
              </p>
              <p className="text-xs text-muted-foreground">
                unidades registradas
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
                Desarrollos
              </CardTitle>
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary" data-testid="stat-developments">
                {stats.developments}
              </p>
              <p className="text-xs text-muted-foreground">proyectos activos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Por Ciudad
              </CardTitle>
              <MapPin className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div>
                  <p className="text-xl font-bold" data-testid="stat-monterrey">
                    {stats.monterrey}
                  </p>
                  <p className="text-xs text-muted-foreground">Monterrey</p>
                </div>
                <div>
                  <p className="text-xl font-bold" data-testid="stat-cdmx">
                    {stats.cdmx}
                  </p>
                  <p className="text-xs text-muted-foreground">CDMX</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        
      </main>
    </div>
  );
}
