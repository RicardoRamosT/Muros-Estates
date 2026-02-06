import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, FileText, FileImage } from "lucide-react";
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

  const getDateRange = () => {
    const dates = prospects
      .filter(p => p.createdAt)
      .map(p => new Date(p.createdAt!));
    if (dates.length === 0) return null;
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    const fmt = (d: Date) => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
    if (min.getFullYear() !== max.getFullYear()) {
      const fmtY = (d: Date) => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
      return `Del ${fmtY(min)} al ${fmtY(max)}`;
    }
    return `Del ${fmt(min)} al ${fmt(max)}`;
  };

  const renderRow = (label: string, count: number, total: number, colorDot?: string, idx?: number) => {
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
      <div key={idx !== undefined ? idx : label} className="flex items-center justify-between gap-1" style={{ fontSize: '9px', lineHeight: '14px', borderBottom: '1px solid #f3f4f6', padding: '1px 0' }}>
        <span className="text-gray-700 truncate flex items-center gap-1" style={{ maxWidth: '60%' }}>
          {colorDot && <span className="inline-block rounded-full flex-shrink-0" style={{ width: 6, height: 6, backgroundColor: colorDot }}></span>}
          {label}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-bold text-gray-900" style={{ minWidth: '16px', textAlign: 'right' }}>{count}</span>
          <span className="text-gray-400" style={{ minWidth: '24px', textAlign: 'right' }}>{percent}%</span>
        </div>
      </div>
    );
  };

  const renderSection = (title: string, items: { label: string; count: number; color?: string }[]) => {
    const total = prospects.length;
    return (
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', padding: '4px 6px' }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: '#374151', borderBottom: '1px solid #d1d5db', paddingBottom: '2px', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{title}</div>
        <div>
          {items.map((item, idx) => renderRow(item.label, item.count, total, item.color, idx))}
        </div>
      </div>
    );
  };

  const captureElement = async () => {
    const element = document.getElementById('summary-content');
    if (!element) return null;

    const origWidth = element.style.width;
    const origHeight = element.style.height;
    const origMaxWidth = element.style.maxWidth;
    const origOverflow = element.style.overflow;
    element.style.width = '1056px';
    element.style.height = '816px';
    element.style.maxWidth = '1056px';
    element.style.overflow = 'hidden';

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        width: 1056,
        height: 816,
        windowWidth: 1056,
        windowHeight: 816,
      });
      return canvas;
    } finally {
      element.style.width = origWidth;
      element.style.height = origHeight;
      element.style.maxWidth = origMaxWidth;
      element.style.overflow = origOverflow;
    }
  };

  const handleDownloadJPG = async () => {
    try {
      const canvas = await captureElement();
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `resumen-prospectos-${new Date().toISOString().split('T')[0]}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
      toast({ title: "JPG descargado" });
    } catch (err) {
      toast({ title: "Error al descargar", variant: "destructive" });
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const canvas = await captureElement();
      if (!canvas) return;
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: 'letter' });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, 11, 8.5);
      pdf.save(`resumen-prospectos-${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: "PDF descargado" });
    } catch (err) {
      toast({ title: "Error al descargar", variant: "destructive" });
    }
  };

  const dateRange = getDateRange();

  const asesorStats = asesores.map(u => ({
    label: u.name || u.username,
    count: prospects.filter(p => (p as any).asesorId === u.id).length,
  }));

  const cityStats = cities.map(c => ({
    label: c.name,
    count: prospects.filter(p => (p as any).ciudad === c.name).length,
  }));

  const citiesWithProspects = cityStats.filter(c => c.count > 0);
  const showAllZones = citiesWithProspects.length > 1;

  const zoneStats = showAllZones
    ? [{ label: "Todas", count: prospects.length }]
    : (() => {
        const singleCity = citiesWithProspects.length === 1 ? citiesWithProspects[0].label : null;
        const filteredZones = singleCity
          ? zones.filter(z => (z as any).cityId ? cities.find(c => c.id === (z as any).cityId)?.name === singleCity : true)
          : zones;
        return filteredZones.map(z => ({
          label: z.name,
          count: prospects.filter(p => (p as any).zona === z.name).length,
        }));
      })();

  const developerStats = developers.map(d => ({
    label: d.name,
    count: prospects.filter(p => (p as any).desarrollador === d.name).length,
  }));

  const uniqueDevNames = Array.from(new Set(developments.map(d => d.name))).sort();
  const developmentStats = uniqueDevNames.map(name => ({
    label: name,
    count: prospects.filter(p => (p as any).desarrollo === name).length,
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
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/prospectos")} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Volver
            </Button>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h1 className="text-sm font-semibold">Resumen de Prospectos</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadJPG} data-testid="button-download-jpg">
              <FileImage className="w-4 h-4 mr-1" />
              JPG
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} data-testid="button-download-pdf">
              <Download className="w-4 h-4 mr-1" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="py-4 px-4 print:py-0">
        <div
          id="summary-content"
          style={{
            width: '100%',
            minHeight: '400px',
            padding: '16px 20px',
            backgroundColor: '#ffffff',
            boxSizing: 'border-box',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #e5e7eb', paddingBottom: '6px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', backgroundColor: 'hsl(var(--primary))', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '14px' }}>
                M
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>MUROS</div>
                <div style={{ fontSize: '9px', color: '#6b7280' }}>Plataforma Inmobiliaria</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#111827' }}>Resumen de Prospectos</div>
              <div style={{ fontSize: '9px', color: '#6b7280' }}>
                {new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#374151' }}>
                Total: {prospects.length} prospectos
              </div>
              {dateRange && (
                <div style={{ fontSize: '8px', color: '#9ca3af' }}>{dateRange}</div>
              )}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '6px',
          }}>
            {renderSection("ASESOR", asesorStats)}
            {renderSection("CIUDAD", cityStats)}
            {renderSection("ZONA", zoneStats)}
            {renderSection("DESARROLLADOR", developerStats)}
            {renderSection("DESARROLLO", developmentStats)}

            {renderSection("TIPO DESARROLLO", developmentTypeStats)}
            {renderSection("TIPO DE PROSPECTO", tipoStats)}
            {renderSection("PERFIL", perfilStats)}
            {renderSection("ESTATUS", estatusStats)}
            {renderSection("BROKER EXTERNO", brokerStats)}

            {renderSection("FUENTE", fuenteStats)}
            {renderSection("ETAPA DE EMBUDO", embudoStats)}
            {renderSection("CÓMO PAGA", comoPagaStats)}
            {renderSection("POSITIVOS", positivosStats)}
            {renderSection("NEGATIVOS", negativosStats)}
          </div>
        </div>
      </div>
    </div>
  );
}
