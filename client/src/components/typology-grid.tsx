import { TypologyCard } from "@/components/typology-card";
import type { Typology } from "@shared/schema";
import { Loader2, Building2 } from "lucide-react";

interface TypologyWithImages extends Typology {
  images?: string[] | null;
}

interface TypologyGridProps {
  typologies: TypologyWithImages[];
  isLoading?: boolean;
  limit?: number;
}

export function TypologyGrid({ typologies, isLoading, limit }: TypologyGridProps) {
  const displayTypologies = limit ? typologies.slice(0, limit) : typologies;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Cargando departamentos...</p>
      </div>
    );
  }

  if (displayTypologies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center" data-testid="empty-state">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <Building2 className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No se encontraron departamentos</h3>
        <p className="text-muted-foreground max-w-md">
          Intenta ajustar los filtros de búsqueda o vuelve más tarde para ver nuevas opciones.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="typology-grid">
      {displayTypologies.map((typology, index) => (
        <TypologyCard 
          key={typology.id} 
          typology={typology} 
          index={index} 
          imageUrl={typology.images?.[0]}
        />
      ))}
    </div>
  );
}
