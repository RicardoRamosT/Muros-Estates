import { PropertyCard } from "@/components/property-card";
import type { Property } from "@shared/schema";
import { Building2, Loader2 } from "lucide-react";

interface PropertyGridProps {
  properties: Property[];
  isLoading?: boolean;
  limit?: number;
}

export function PropertyGrid({ properties, isLoading, limit }: PropertyGridProps) {
  const displayProperties = limit ? properties.slice(0, limit) : properties;
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Cargando propiedades...</p>
      </div>
    );
  }

  if (displayProperties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center" data-testid="empty-state">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <Building2 className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No se encontraron propiedades</h3>
        <p className="text-muted-foreground max-w-md">
          Intenta ajustar los filtros de búsqueda para encontrar propiedades que coincidan con tus criterios.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6" data-testid="property-grid">
      {displayProperties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}
