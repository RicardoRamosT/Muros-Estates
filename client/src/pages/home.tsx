import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { PropertyGrid } from "@/components/property-grid";
import { PropertyFilters } from "@/components/property-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Property, PropertyFilter } from "@shared/schema";
import { Search, MapPin, Building2, SlidersHorizontal, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function Home() {
  const [filters, setFilters] = useState<PropertyFilter>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const cities = useMemo(() => {
    const uniqueCities = [...new Set(properties.map((p) => p.city))];
    return uniqueCities.sort();
  }, [properties]);

  const propertyTypes = useMemo(() => {
    const uniqueTypes = [...new Set(properties.map((p) => p.propertyType))];
    return uniqueTypes.sort();
  }, [properties]);

  const filteredProperties = useMemo(() => {
    let result = properties;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.location.toLowerCase().includes(query) ||
          p.city.toLowerCase().includes(query) ||
          p.developmentName?.toLowerCase().includes(query)
      );
    }

    if (filters.minPrice) {
      result = result.filter((p) => parseFloat(p.price) >= filters.minPrice!);
    }
    if (filters.maxPrice) {
      result = result.filter((p) => parseFloat(p.price) <= filters.maxPrice!);
    }
    if (filters.minBedrooms) {
      result = result.filter((p) => p.bedrooms >= filters.minBedrooms!);
    }
    if (filters.minBathrooms) {
      result = result.filter((p) => p.bathrooms >= filters.minBathrooms!);
    }
    if (filters.minArea) {
      result = result.filter((p) => parseFloat(p.area) >= filters.minArea!);
    }
    if (filters.maxArea) {
      result = result.filter((p) => parseFloat(p.area) <= filters.maxArea!);
    }
    if (filters.city) {
      result = result.filter((p) => p.city === filters.city);
    }
    if (filters.propertyType) {
      result = result.filter((p) => p.propertyType === filters.propertyType);
    }
    if (filters.status) {
      result = result.filter((p) => p.status === filters.status);
    }

    return result.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return 0;
    });
  }, [properties, filters, searchQuery]);

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmIzNDkiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40"></div>
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="flex items-center justify-center gap-2 text-primary mb-4">
              <Building2 className="w-6 h-6" />
              <span className="text-sm font-semibold uppercase tracking-wider">Desarrollos Inmobiliarios</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Encuentra tu{" "}
              <span className="text-primary">hogar ideal</span>{" "}
              en México
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Explora nuestra exclusiva selección de departamentos y desarrollos inmobiliarios en las mejores ubicaciones del país.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto mt-8">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por ubicación, desarrollo o tipo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 text-base bg-card"
                  data-testid="input-search"
                />
              </div>
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="h-12 lg:hidden" data-testid="button-mobile-filters">
                    <SlidersHorizontal className="w-5 h-5 mr-2" />
                    Filtros
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[320px] sm:w-[400px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filtros de búsqueda</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <PropertyFilters
                      filters={filters}
                      onFilterChange={setFilters}
                      cities={cities}
                      propertyTypes={propertyTypes}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="flex flex-wrap justify-center gap-2 pt-4">
              <Badge variant="outline" className="bg-card/50 hover-elevate cursor-pointer">
                <MapPin className="w-3 h-3 mr-1" />
                Monterrey
              </Badge>
              <Badge variant="outline" className="bg-card/50 hover-elevate cursor-pointer">
                <MapPin className="w-3 h-3 mr-1" />
                Ciudad de México
              </Badge>
              <Badge variant="outline" className="bg-card/50 hover-elevate cursor-pointer">
                <MapPin className="w-3 h-3 mr-1" />
                Guadalajara
              </Badge>
              <Badge variant="outline" className="bg-card/50 hover-elevate cursor-pointer">
                <MapPin className="w-3 h-3 mr-1" />
                Querétaro
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-80 shrink-0">
            <PropertyFilters
              filters={filters}
              onFilterChange={setFilters}
              cities={cities}
              propertyTypes={propertyTypes}
            />
          </aside>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold" data-testid="text-results-title">
                  Propiedades Disponibles
                </h2>
                <p className="text-muted-foreground" data-testid="text-results-count">
                  {filteredProperties.length} {filteredProperties.length === 1 ? "propiedad encontrada" : "propiedades encontradas"}
                </p>
              </div>

              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters({})}
                  className="text-muted-foreground"
                  data-testid="button-clear-filters"
                >
                  <X className="w-4 h-4 mr-1" />
                  Limpiar filtros
                </Button>
              )}
            </div>

            <PropertyGrid properties={filteredProperties} isLoading={isLoading} />
          </div>
        </div>
      </main>

      <footer className="border-t bg-card mt-16">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Muros</h3>
              <p className="text-sm text-muted-foreground">
                Desarrollos inmobiliarios de alta calidad en las mejores ubicaciones de México.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Contacto</h4>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>Av. Eugenio Garza Sada 3820 - Piso 8</p>
                <p>Monterrey, N.L., C.P. 64780</p>
                <p>T. 81.2139.1200</p>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Enlaces</h4>
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="hover:text-primary cursor-pointer">Propiedades</p>
                <p className="hover:text-primary cursor-pointer">Desarrollos</p>
                <p className="hover:text-primary cursor-pointer">Nosotros</p>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Legal</h4>
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="hover:text-primary cursor-pointer">Aviso de Privacidad</p>
                <p className="hover:text-primary cursor-pointer">Términos y Condiciones</p>
              </div>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Muros. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
