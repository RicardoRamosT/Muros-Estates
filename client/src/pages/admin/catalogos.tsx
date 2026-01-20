import { Header } from "@/components/header";
import { Database } from "lucide-react";

export default function AdminCatalogos() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Database className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Catálogos</h1>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <CatalogCard 
            title="Ciudades" 
            description="Gestiona las ciudades disponibles"
            count={2}
          />
          <CatalogCard 
            title="Zonas" 
            description="Gestiona las zonas por ciudad"
            count={26}
          />
          <CatalogCard 
            title="Tipos de Desarrollo" 
            description="Tipos de proyectos inmobiliarios"
            count={5}
          />
          <CatalogCard 
            title="Amenidades" 
            description="Amenidades disponibles para propiedades"
            count={32}
          />
          <CatalogCard 
            title="Características de Eficiencia" 
            description="Opciones de eficiencia energética"
            count={7}
          />
          <CatalogCard 
            title="Otras Características" 
            description="Seguridad y otras características"
            count={4}
          />
        </div>
      </main>
    </div>
  );
}

function CatalogCard({ title, description, count }: { title: string; description: string; count: number }) {
  return (
    <div className="bg-card border rounded-lg p-4 hover-elevate cursor-pointer" data-testid={`card-catalog-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-sm bg-primary/10 text-primary px-2 py-0.5 rounded-full">{count}</span>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
