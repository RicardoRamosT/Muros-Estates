import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, FileText } from "lucide-react";
import type { Client, User, CatalogCity, CatalogZone, Developer, Development, CatalogDevelopmentType } from "@shared/schema";

export default function ProspectosResumen() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: allClients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: cities = [] } = useQuery<CatalogCity[]>({
    queryKey: ["/api/catalog/cities"],
  });

  const { data: zones = [] } = useQuery<CatalogZone[]>({
    queryKey: ["/api/catalog/zones"],
  });

  const { data: developers = [] } = useQuery<Developer[]>({
    queryKey: ["/api/developers"],
  });

  const { data: developments = [] } = useQuery<Development[]>({
    queryKey: ["/api/developments-entity"],
  });

  const { data: developmentTypes = [] } = useQuery<CatalogDevelopmentType[]>({
    queryKey: ["/api/catalog/development-types"],
  });

  const prospects = allClients.filter(c => c.isClient !== true);

  const tipoOptions = [
    { value: "inversionista", label: "Inversionista" },
    { value: "uso_propio", label: "Uso Propio" },
    { value: "revender", label: "Revender" },
  ];

  const perfilOptions = [
    { value: "estudiante", label: "Estudiante" },
    { value: "profesionista", label: "Profesionista" },
    { value: "pareja", label: "Pareja" },
    { value: "familia_joven", label: "Familia Joven" },
    { value: "familia_grande", label: "Familia Grande" },
    { value: "tercera_edad", label: "Tercera Edad" },
  ];

  const fuenteOptions = [
    { value: "instagram_ads", label: "Instagram Ads" },
    { value: "instagram_follower", label: "Instagram Follower" },
    { value: "facebook_ads", label: "Facebook Ads" },
    { value: "facebook_fan", label: "Facebook Fan" },
    { value: "landing_page", label: "Landing Page" },
    { value: "grupo_facebook", label: "Grupo Facebook" },
    { value: "fb_marketplace", label: "FB Marketplace" },
    { value: "broker_externo", label: "Broker Externo" },
    { value: "referido", label: "Referido" },
    { value: "lead_pasado", label: "Lead Pasado" },
    { value: "conocido_asesor", label: "Conocido de Asesor" },
    { value: "base_datos", label: "Base de Datos" },
    { value: "periodico", label: "Periódico" },
    { value: "flyer", label: "Flyer" },
    { value: "rotulo", label: "Rótulo" },
    { value: "google_ads", label: "Google Ads" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "tiktok", label: "TikTok" },
    { value: "twitter", label: "Twitter" },
  ];

  const estatusOptions = [
    { value: "activo", label: "Activo" },
    { value: "en_hold", label: "En Hold" },
    { value: "no_activo", label: "No Activo" },
  ];

  const embudoOptions = [
    { value: "nuevo", label: "Nuevo", color: "#87CEEB" },
    { value: "asignado", label: "Asignado", color: "#90EE90" },
    { value: "no_contesta", label: "No Contesta", color: "#FFD700" },
    { value: "no_le_intereso", label: "No le Interesó", color: "#FF6B6B" },
    { value: "validado", label: "Validado", color: "#32CD32" },
    { value: "envio_info", label: "Envío de Info", color: "#9370DB" },
    { value: "muestra_interes", label: "Muestra Interés", color: "#FF69B4" },
    { value: "presentacion", label: "Presentación", color: "#FFA500" },
    { value: "showroom", label: "Showroom", color: "#4169E1" },
    { value: "evaluando", label: "Evaluando", color: "#40E0D0" },
    { value: "negociacion", label: "Negociación", color: "#228B22" },
    { value: "cierre_ganado", label: "Cierre Ganado", color: "#00FF00" },
    { value: "cierre_perdido", label: "Cierre Perdido", color: "#DC143C" },
    { value: "separado", label: "Separado", color: "#FF1493" },
    { value: "enganche_firma", label: "Enganche y Firma", color: "#8B008B" },
  ];

  const comoPagaOptions = [
    { value: "enganche_bajo", label: "Enganche Bajo" },
    { value: "enganche_alto", label: "Enganche Alto" },
    { value: "capital_semilla", label: "Capital Semilla" },
  ];

  const positivosOptions = [
    { value: "precio", label: "Precio" },
    { value: "ubicacion", label: "Ubicación" },
    { value: "diseno", label: "Diseño" },
    { value: "tamano", label: "Tamaño" },
    { value: "amenidades", label: "Amenidades" },
    { value: "esquema_pagos", label: "Esquema de Pagos" },
  ];

  const negativosOptions = [
    { value: "precio", label: "Precio" },
    { value: "ubicacion", label: "Ubicación" },
    { value: "diseno", label: "Diseño" },
    { value: "tamano", label: "Tamaño" },
    { value: "amenidades", label: "Amenidades" },
    { value: "esquema_pagos", label: "Esquema de Pagos" },
    { value: "permisos", label: "Permisos" },
    { value: "desarrollador", label: "Desarrollador" },
    { value: "tiempo_entrega", label: "Tiempo de Entrega" },
  ];

  const asesores = users.filter(u => u.role === "asesor");

  const getDateGroups = () => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    const groups = [
      { label: "Este Mes", filter: (d: Date) => d.getMonth() === thisMonth && d.getFullYear() === thisYear },
      { label: "Mes Pasado", filter: (d: Date) => {
        const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
        const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear;
        return d.getMonth() === lastMonth && d.getFullYear() === lastYear;
      }},
      { label: "Este Año", filter: (d: Date) => d.getFullYear() === thisYear },
      { label: "Año Pasado", filter: (d: Date) => d.getFullYear() === thisYear - 1 },
    ];
    
    return groups.map(g => {
      const count = prospects.filter(p => {
        if (!p.createdAt) return false;
        const date = new Date(p.createdAt);
        return g.filter(date);
      }).length;
      return { label: g.label, count };
    });
  };

  const renderSummaryRow = (label: string, count: number, total: number) => {
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
      <div key={label} className="flex items-center justify-between text-sm py-1 border-b border-gray-100 last:border-0">
        <span className="text-gray-700">{label}</span>
        <div className="flex items-center gap-4">
          <span className="font-bold text-gray-900 w-12 text-right">{count}</span>
          <span className="text-gray-500 w-10 text-right">{percent}%</span>
        </div>
      </div>
    );
  };

  const renderSection = (title: string, items: { label: string; count: number }[]) => {
    const total = prospects.length;
    const filteredItems = items.filter(item => item.count > 0);
    if (filteredItems.length === 0) return null;
    
    return (
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3 text-gray-800 border-b pb-2">{title}</h3>
        <div className="space-y-0">
          {filteredItems.map(item => renderSummaryRow(item.label, item.count, total))}
        </div>
      </Card>
    );
  };

  const handleDownload = async () => {
    const element = document.getElementById('summary-content');
    if (element) {
      try {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(element, { backgroundColor: '#ffffff', scale: 2 });
        const link = document.createElement('a');
        link.download = `resumen-prospectos-${new Date().toISOString().split('T')[0]}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.click();
        toast({ title: "Resumen descargado" });
      } catch (err) {
        toast({ title: "Error al descargar", variant: "destructive" });
      }
    }
  };

  const dateGroups = getDateGroups();

  const asesorStats = asesores.map(u => ({
    label: u.name || u.username,
    count: prospects.filter(p => (p as any).asesorId === u.id).length,
  }));

  const cityStats = cities.map(c => ({
    label: c.name,
    count: prospects.filter(p => (p as any).ciudad === c.name).length,
  }));

  const zoneStats = zones.map(z => ({
    label: z.name,
    count: prospects.filter(p => (p as any).zona === z.name).length,
  }));

  const developerStats = developers.map(d => ({
    label: d.name,
    count: prospects.filter(p => (p as any).desarrollador === d.name).length,
  }));

  const developmentStats = developments.map(d => ({
    label: d.name,
    count: prospects.filter(p => (p as any).desarrollo === d.name).length,
  }));

  const developmentTypeStats = developmentTypes.map(dt => ({
    label: dt.name,
    count: prospects.filter(p => (p as any).tipoDesarrollo === dt.name).length,
  }));

  const tipoStats = tipoOptions.map(opt => ({
    label: opt.label,
    count: prospects.filter(p => (p as any).tipofil === opt.value).length,
  }));

  const perfilStats = perfilOptions.map(opt => ({
    label: opt.label,
    count: prospects.filter(p => (p as any).perfil === opt.value).length,
  }));

  const fuenteStats = fuenteOptions.map(opt => ({
    label: opt.label,
    count: prospects.filter(p => (p as any).comoLlega === opt.value).length,
  }));

  const brokerStats = [
    { label: "Sí", count: prospects.filter(p => (p as any).brokerExterno === "si").length },
    { label: "No", count: prospects.filter(p => (p as any).brokerExterno === "no").length },
  ];

  const estatusStats = estatusOptions.map(opt => ({
    label: opt.label,
    count: prospects.filter(p => (p as any).estatus === opt.value).length,
  }));

  const embudoStats = embudoOptions.map(opt => ({
    label: opt.label,
    count: prospects.filter(p => (p as any).embudo === opt.value).length,
    color: opt.color,
  }));

  const comoPagaStats = comoPagaOptions.map(opt => ({
    label: opt.label,
    count: prospects.filter(p => (p as any).comoPaga === opt.value).length,
  }));

  const positivosStats = positivosOptions.map(opt => ({
    label: opt.label,
    count: prospects.filter(p => {
      const vals = (p as any).positivos;
      return Array.isArray(vals) && vals.includes(opt.value);
    }).length,
  }));

  const negativosStats = negativosOptions.map(opt => ({
    label: opt.label,
    count: prospects.filter(p => {
      const vals = (p as any).negativos;
      return Array.isArray(vals) && vals.includes(opt.value);
    }).length,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/prospectos")} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">Resumen de Prospectos</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownload} data-testid="button-download-summary">
            <Download className="w-4 h-4 mr-2" />
            Descargar JPG
          </Button>
        </div>
      </div>

      <div id="summary-content" className="max-w-7xl mx-auto p-6 bg-white min-h-screen">
        <div className="flex items-center justify-between border-b pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl">
              M
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">MUROS</h2>
              <p className="text-sm text-gray-500">Plataforma Inmobiliaria</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">Resumen de Prospectos</p>
            <p className="text-xs text-gray-500">{new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="text-xs text-gray-400">Total: {prospects.length} prospectos</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {renderSection("FECHA", dateGroups)}
          {renderSection("ASESOR", asesorStats)}
          {renderSection("CIUDAD", cityStats)}
          {renderSection("ZONA", zoneStats)}
          {renderSection("DESARROLLADOR", developerStats)}
          {renderSection("DESARROLLO", developmentStats)}
          {renderSection("TIPO", developmentTypeStats)}
          {renderSection("TIPO DE PROSPECTO", tipoStats)}
          {renderSection("PERFIL", perfilStats)}
          {renderSection("FUENTE", fuenteStats)}
          {renderSection("BROKER EXTERNO", brokerStats)}
          {renderSection("ESTATUS", estatusStats)}
          
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3 text-gray-800 border-b pb-2">ETAPA DE EMBUDO</h3>
            <div className="space-y-0">
              {embudoStats.filter(s => s.count > 0).map(item => {
                const percent = prospects.length > 0 ? Math.round((item.count / prospects.length) * 100) : 0;
                return (
                  <div key={item.label} className="flex items-center justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                    <span className="flex items-center gap-2 text-gray-700">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                      {item.label}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-gray-900 w-12 text-right">{item.count}</span>
                      <span className="text-gray-500 w-10 text-right">{percent}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {renderSection("CÓMO PAGA", comoPagaStats)}
          {renderSection("POSITIVOS", positivosStats)}
          {renderSection("NEGATIVOS", negativosStats)}
        </div>
      </div>
    </div>
  );
}
