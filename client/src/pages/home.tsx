import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { PropertyGrid } from "@/components/property-grid";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Property, PropertyFilter } from "@shared/schema";
import { CITIES, ZONES_MONTERREY, ZONES_CDMX, getZonesByCity } from "@shared/constants";
import { Search, X } from "lucide-react";

const MIN_PRICE = 1000000;
const MAX_PRICE = 50000000;
const MIN_AREA = 20;
const MAX_AREA = 500;

export default function Home() {
  const [filters, setFilters] = useState<PropertyFilter>({
    minPrice: MIN_PRICE,
    maxPrice: MAX_PRICE,
    minArea: MIN_AREA,
    maxArea: MAX_AREA,
  });

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const availableZones = useMemo(() => {
    if (filters.city) {
      return getZonesByCity(filters.city);
    }
    return [...ZONES_MONTERREY, ...ZONES_CDMX];
  }, [filters.city]);

  const filteredProperties = useMemo(() => {
    let result = properties;

    if (filters.minPrice && filters.minPrice > MIN_PRICE) {
      result = result.filter((p) => parseFloat(p.price) >= filters.minPrice!);
    }
    if (filters.maxPrice && filters.maxPrice < MAX_PRICE) {
      result = result.filter((p) => parseFloat(p.price) <= filters.maxPrice!);
    }
    if (filters.minBedrooms) {
      result = result.filter((p) => p.bedrooms >= filters.minBedrooms!);
    }
    if (filters.minArea && filters.minArea > MIN_AREA) {
      result = result.filter((p) => parseFloat(p.area) >= filters.minArea!);
    }
    if (filters.maxArea && filters.maxArea < MAX_AREA) {
      result = result.filter((p) => parseFloat(p.area) <= filters.maxArea!);
    }
    if (filters.city) {
      result = result.filter((p) => p.city === filters.city);
    }
    if (filters.zone) {
      result = result.filter((p) => p.zone === filters.zone);
    }

    return result.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return 0;
    });
  }, [properties, filters]);

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'minPrice' && value === MIN_PRICE) return false;
    if (key === 'maxPrice' && value === MAX_PRICE) return false;
    if (key === 'minArea' && value === MIN_AREA) return false;
    if (key === 'maxArea' && value === MAX_AREA) return false;
    return Boolean(value);
  }).length;

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handlePriceChange = (values: number[]) => {
    setFilters(prev => ({
      ...prev,
      minPrice: values[0],
      maxPrice: values[1],
    }));
  };

  const handleAreaChange = (values: number[]) => {
    setFilters(prev => ({
      ...prev,
      minArea: values[0],
      maxArea: values[1],
    }));
  };

  const handleCityChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      city: value || undefined,
      zone: undefined,
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      minPrice: MIN_PRICE,
      maxPrice: MAX_PRICE,
      minArea: MIN_AREA,
      maxArea: MAX_AREA,
    });
  };

  const featuredImages = properties.slice(0, 3).map(p => p.images[0]).filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <section className="bg-background py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                  Analicemos mejores opciones de inversión en{" "}
                  <span className="text-primary">México</span>...
                </h1>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Select
                    value={filters.status || ""}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value || undefined }))}
                  >
                    <SelectTrigger className="w-full h-12 bg-card border-border" data-testid="select-objetivo">
                      <SelectValue placeholder="¿Cuál es tu Objetivo?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inversion">Inversión</SelectItem>
                      <SelectItem value="vivienda">Vivienda</SelectItem>
                      <SelectItem value="renta">Renta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Select
                    value={filters.city || ""}
                    onValueChange={handleCityChange}
                  >
                    <SelectTrigger className="w-full h-12 bg-card border-border" data-testid="select-city">
                      <SelectValue placeholder="Ciudad" />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Select
                    value={filters.zone || ""}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, zone: value || undefined }))}
                  >
                    <SelectTrigger className="w-full h-12 bg-card border-border" data-testid="select-zona">
                      <SelectValue placeholder="Zona" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableZones.map((zone) => (
                        <SelectItem key={zone} value={zone}>
                          {zone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm text-muted-foreground">Precio</Label>
                  <Slider
                    min={MIN_PRICE}
                    max={MAX_PRICE}
                    step={100000}
                    value={[filters.minPrice || MIN_PRICE, filters.maxPrice || MAX_PRICE]}
                    onValueChange={handlePriceChange}
                    className="mt-2"
                    data-testid="slider-price"
                  />
                  <div className="text-sm text-muted-foreground">
                    {formatPrice(filters.minPrice || MIN_PRICE)} a {formatPrice(filters.maxPrice || MAX_PRICE)}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm text-muted-foreground">Tamaño</Label>
                  <Slider
                    min={MIN_AREA}
                    max={MAX_AREA}
                    step={5}
                    value={[filters.minArea || MIN_AREA, filters.maxArea || MAX_AREA]}
                    onValueChange={handleAreaChange}
                    className="mt-2"
                    data-testid="slider-area"
                  />
                  <div className="text-sm text-muted-foreground">
                    {filters.minArea || MIN_AREA} a {filters.maxArea || MAX_AREA} m²
                  </div>
                </div>

                <div className="space-y-2">
                  <Select
                    value={filters.minBedrooms?.toString() || ""}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, minBedrooms: value ? parseInt(value) : undefined }))}
                  >
                    <SelectTrigger className="w-full h-12 bg-card border-border" data-testid="select-recamaras">
                      <SelectValue placeholder="Recámaras" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1+ Recámara</SelectItem>
                      <SelectItem value="2">2+ Recámaras</SelectItem>
                      <SelectItem value="3">3+ Recámaras</SelectItem>
                      <SelectItem value="4">4+ Recámaras</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  size="lg" 
                  className="w-full h-12 mt-4"
                  data-testid="button-search"
                >
                  <Search className="w-5 h-5 mr-2" />
                  Buscar
                </Button>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-3">
                  {featuredImages[0] && (
                    <div className="relative aspect-[4/5] rounded-md overflow-hidden">
                      <img
                        src={featuredImages[0]}
                        alt="Propiedad destacada"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 right-3 bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs font-medium">
                        290+ Votos Positivos
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-3 pt-8">
                  {featuredImages[1] && (
                    <div className="relative aspect-square rounded-md overflow-hidden">
                      <img
                        src={featuredImages[1]}
                        alt="Propiedad destacada"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  {featuredImages[2] && (
                    <div className="relative aspect-square rounded-md overflow-hidden">
                      <img
                        src={featuredImages[2]}
                        alt="Propiedad destacada"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold" data-testid="text-results-title">
              Departamentos Disponibles
            </h2>
            <p className="text-muted-foreground" data-testid="text-results-count">
              {filteredProperties.length} {filteredProperties.length === 1 ? "departamento encontrado" : "departamentos encontrados"}
            </p>
          </div>

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-muted-foreground"
              data-testid="button-clear-filters"
            >
              <X className="w-4 h-4 mr-1" />
              Limpiar filtros
            </Button>
          )}
        </div>

        <PropertyGrid properties={filteredProperties} isLoading={isLoading} />
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
                <p className="hover:text-primary cursor-pointer">Departamentos</p>
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
