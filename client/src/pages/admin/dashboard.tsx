import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Typology, Client } from "@shared/schema";
import { 
  Building2, 
  DollarSign, 
  TrendingUp, 
  MapPin, 
  Users, 
  UserPlus,
  Phone,
  Calendar,
  ArrowRight,
  Activity
} from "lucide-react";
import { useMemo } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  nuevo: "#3b82f6",
  contactado: "#eab308",
  interesado: "#22c55e",
  cita_agendada: "#a855f7",
  cerrado: "#6b7280",
  no_interesado: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  interesado: "Interesado",
  cita_agendada: "Cita Agendada",
  cerrado: "Cerrado",
  no_interesado: "No Interesado",
};

export default function AdminDashboard() {
  const { data: typologies = [] } = useQuery<Typology[]>({
    queryKey: ["/api/typologies"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const typologyStats = useMemo(() => {
    const totalValue = typologies.reduce((sum, t) => sum + (parseFloat(t.price || "0") || 0), 0);
    const monterrey = typologies.filter((t) => t.city === "Monterrey").length;
    const cdmx = typologies.filter((t) => t.city === "CDMX").length;
    const uniqueDevelopments = new Set(typologies.map(t => t.development).filter(Boolean)).size;
    const activeCount = typologies.filter(t => t.active).length;

    return {
      total: typologies.length,
      active: activeCount,
      totalValue,
      monterrey,
      cdmx,
      developments: uniqueDevelopments,
    };
  }, [typologies]);

  const clientStats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    clients.forEach(c => {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    });

    const today = new Date();
    const thisMonth = clients.filter(c => {
      if (!c.createdAt) return false;
      const created = new Date(c.createdAt);
      return created.getMonth() === today.getMonth() && created.getFullYear() === today.getFullYear();
    }).length;

    const thisWeek = clients.filter(c => {
      if (!c.createdAt) return false;
      const created = new Date(c.createdAt);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return created >= weekAgo;
    }).length;

    return {
      total: clients.length,
      thisMonth,
      thisWeek,
      byStatus,
      new: byStatus.nuevo || 0,
      contacted: byStatus.contactado || 0,
      interested: byStatus.interesado || 0,
    };
  }, [clients]);

  const developmentData = useMemo(() => {
    const counts: Record<string, number> = {};
    typologies.forEach(t => {
      if (t.development) {
        counts[t.development] = (counts[t.development] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ 
        name, 
        displayName: name.length > 15 ? name.slice(0, 15) + "..." : name,
        count 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [typologies]);

  const clientStatusData = useMemo(() => {
    return Object.entries(clientStats.byStatus)
      .map(([status, count]) => ({
        name: STATUS_LABELS[status] || status,
        value: count,
        color: STATUS_COLORS[status] || "#6b7280",
      }))
      .filter(d => d.value > 0);
  }, [clientStats.byStatus]);

  const recentClients = useMemo(() => {
    return [...clients]
      .filter(c => c.createdAt)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, 5);
  }, [clients]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const formatDate = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      nuevo: "bg-blue-500",
      contactado: "bg-yellow-500",
      interesado: "bg-green-500",
      cita_agendada: "bg-purple-500",
      cerrado: "bg-gray-500",
      no_interesado: "bg-red-500",
    };
    return (
      <Badge className={`${colors[status] || "bg-gray-500"} text-white text-xs`}>
        {STATUS_LABELS[status] || status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Dashboard</h1>
          <p className="text-muted-foreground">Panel de control de Muros</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Desarrollos
              </CardTitle>
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-bold text-primary" data-testid="stat-developments">
                {typologyStats.developments}
              </p>
              <p className="text-xs text-muted-foreground">
                {typologyStats.total} unidades
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Clientes
              </CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-bold" data-testid="stat-clients">
                {clientStats.total}
              </p>
              <p className="text-xs text-muted-foreground">
                {clientStats.thisMonth} este mes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Nuevos Leads
              </CardTitle>
              <UserPlus className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-bold text-blue-600" data-testid="stat-new-leads">
                {clientStats.new}
              </p>
              <p className="text-xs text-muted-foreground">sin contactar</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Unidades por Ciudad
              </CardTitle>
              <MapPin className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-3">
                <div>
                  <p className="text-lg font-bold" data-testid="stat-monterrey">
                    {typologyStats.monterrey}
                  </p>
                  <p className="text-xs text-muted-foreground">MTY</p>
                </div>
                <div>
                  <p className="text-lg font-bold" data-testid="stat-cdmx">
                    {typologyStats.cdmx}
                  </p>
                  <p className="text-xs text-muted-foreground">CDMX</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Unidades por Desarrollo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {developmentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={developmentData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="displayName" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: number) => [`${value} unidades`, "Tipologías"]}
                      labelFormatter={(label) => {
                        const item = developmentData.find(d => d.displayName === label);
                        return item?.name || label;
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  No hay datos disponibles
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Clientes por Estado
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clientStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={clientStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {clientStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value} clientes`, ""]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  No hay clientes registrados
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Últimos Clientes</CardTitle>
              <Link href="/admin/clientes">
                <Button variant="ghost" size="sm" className="gap-1">
                  Ver todos
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentClients.length > 0 ? (
                <div className="space-y-3">
                  {recentClients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{client.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {client.phone}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(client.status)}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(client.createdAt!)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No hay clientes registrados
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Resumen de Actividad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Leads nuevos</p>
                      <p className="text-xs text-muted-foreground">Pendientes de contactar</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{clientStats.new}</p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Contactados</p>
                      <p className="text-xs text-muted-foreground">En seguimiento</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">{clientStats.contacted}</p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Interesados</p>
                      <p className="text-xs text-muted-foreground">Prospectos calificados</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{clientStats.interested}</p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Esta semana</p>
                      <p className="text-xs text-muted-foreground">Nuevos registros</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{clientStats.thisWeek}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
