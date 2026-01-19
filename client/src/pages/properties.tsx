import { useState, useMemo, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Header } from "@/components/header";
import { TypologyGrid } from "@/components/typology-grid";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Typology } from "@shared/schema";
import { CITIES, getZonesByCity, ZONES_MONTERREY, ZONES_CDMX } from "@shared/constants";
import { X, Home, SlidersHorizontal, Wifi } from "lucide-react";
import { FloatingContactForm } from "@/components/floating-contact-form";
import { usePublicTypologies } from "@/hooks/use-public-typologies";
import { Badge } from "@/components/ui/badge";

const DEFAULT_MIN_PRICE = 1000000;
const DEFAULT_MAX_PRICE = 50000000;
const DEFAULT_MIN_AREA = 20;
const DEFAULT_MAX_AREA = 500;
const PRICE_STEP = 100000;
const AREA_STEP = 5;

interface TypologyFilter {
  city?: string;
  zone?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  bedrooms?: number[];
}

function formatPrice(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  return `$${(value / 1000).toFixed(0)}K`;
}

export default function Properties() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  const { typologies, isLoading, isConnected } = usePublicTypologies();

  const priceRange = useMemo(() => {
    if (typologies.length === 0) {
      return { min: DEFAULT_MIN_PRICE, max: DEFAULT_MAX_PRICE };
    }
    const prices = typologies
      .filter(t => t.finalPrice || t.price)
      .map(t => parseFloat(t.finalPrice || t.price || "0"));
    if (prices.length === 0) return { min: DEFAULT_MIN_PRICE, max: DEFAULT_MAX_PRICE };
    const minPrice = Math.floor(Math.min(...prices) / PRICE_STEP) * PRICE_STEP;
    const maxPrice = Math.ceil(Math.max(...prices) / PRICE_STEP) * PRICE_STEP;
    return { min: minPrice || DEFAULT_MIN_PRICE, max: maxPrice || DEFAULT_MAX_PRICE };
  }, [typologies]);

  const areaRange = useMemo(() => {
    if (typologies.length === 0) {
      return { min: DEFAULT_MIN_AREA, max: DEFAULT_MAX_AREA };
    }
    const areas = typologies
      .filter(t => t.size)
      .map(t => parseFloat(t.size || "0"));
    if (areas.length === 0) return { min: DEFAULT_MIN_AREA, max: DEFAULT_MAX_AREA };
    const minArea = Math.floor(Math.min(...areas) / AREA_STEP) * AREA_STEP;
    const maxArea = Math.ceil(Math.max(...areas) / AREA_STEP) * AREA_STEP;
    return { min: minArea || DEFAULT_MIN_AREA, max: maxArea || DEFAULT_MAX_AREA };
  }, [typologies]);

  const [filters, setFilters] = useState<TypologyFilter>({});
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      const searchParams = new URLSearchParams(window.location.search);
      const initialFilters: TypologyFilter = {};
      
      if (searchParams.get("city")) initialFilters.city = searchParams.get("city")!;
      if (searchParams.get("zone")) initialFilters.zone = searchParams.get("zone")!;
      if (searchParams.get("minPrice")) initialFilters.minPrice = parseInt(searchParams.get("minPrice")!);
      if (searchParams.get("maxPrice")) initialFilters.maxPrice = parseInt(searchParams.get("maxPrice")!);
      if (searchParams.get("minArea")) initialFilters.minArea = parseInt(searchParams.get("minArea")!);
      if (searchParams.get("maxArea")) initialFilters.maxArea = parseInt(searchParams.get("maxArea")!);
      if (searchParams.get("bedrooms")) {
        initialFilters.bedrooms = searchParams.get("bedrooms")!.split(",").map(Number);
      }
      
      setFilters(initialFilters);
      setInitialized(true);
    }
  }, [initialized]);

  const availableZones = useMemo(() => {
    if (filters.city) {
      return getZonesByCity(filters.city);
    }
    return [...ZONES_MONTERREY, ...ZONES_CDMX];
  }, [filters.city]);

  const sliderFilteredTypologies = useMemo(() => {
    let result = typologies;

    if (filters.minPrice && filters.minPrice > priceRange.min) {
      result = result.filter((t) => {
        const price = parseFloat(t.finalPrice || t.price || "0");
        return price >= filters.minPrice!;
      });
    }
    if (filters.maxPrice && filters.maxPrice < priceRange.max) {
      result = result.filter((t) => {
        const price = parseFloat(t.finalPrice || t.price || "0");
        return price <= filters.maxPrice!;
      });
    }
    if (filters.minArea && filters.minArea > areaRange.min) {
      result = result.filter((t) => {
        const area = parseFloat(t.size || "0");
        return area >= filters.minArea!;
      });
    }
    if (filters.maxArea && filters.maxArea < areaRange.max) {
      result = result.filter((t) => {
        const area = parseFloat(t.size || "0");
        return area <= filters.maxArea!;
      });
    }

    return result;
  }, [typologies, filters, priceRange, areaRange]);

  const filteredTypologies = useMemo(() => {
    let result = sliderFilteredTypologies;

    if (filters.bedrooms && filters.bedrooms.length > 0) {
      result = result.filter((t) => t.bedrooms !== null && filters.bedrooms!.includes(t.bedrooms));
    }
    if (filters.city) {
      result = result.filter((t) => t.city === filters.city);
    }
    if (filters.zone) {
      result = result.filter((t) => t.zone === filters.zone);
    }

    return result;
  }, [sliderFilteredTypologies, filters]);

  const bedroomOptions = useMemo(() => {
    const beds = new Set<number>();
    typologies.forEach(t => {
      if (t.bedrooms !== null && t.bedrooms !== undefined) {
        beds.add(t.bedrooms);
      }
    });
    return Array.from(beds).sort((a, b) => a - b);
  }, [typologies]);

  const clearFilters = () => {
    setFilters({});
    window.history.replaceState({}, "", "/propiedades");
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== null && v !== "");

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="bg-primary py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link href="/">
                  <Button variant="ghost" size="sm" className="text-white/70 hover:text-white gap-2" data-testid="button-back-home">
                    <Home className="w-4 h-4" />
                    Inicio
                  </Button>
                </Link>
                {isConnected && (
                  <Badge variant="outline" className="text-white/70 border-white/30 gap-1">
                    <Wifi className="w-3 h-3" />
                    En vivo
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white" data-testid="text-page-title">
                Todos los Departamentos
              </h1>
              <p className="text-white/70 mt-1" data-testid="text-results-count">
                {filteredTypologies.length} {filteredTypologies.length === 1 ? "departamento encontrado" : "departamentos encontrados"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-white/70" />
              <span className="text-white/70">Filtros activos</span>
            </div>
          </div>
        </div>
      </section>

      <section className="sticky top-0 z-40 bg-card border-b shadow-sm py-4">
        <div className="container mx-auto px-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Precio: {formatPrice(filters.minPrice || priceRange.min)} - {formatPrice(filters.maxPrice || priceRange.max)}
              </Label>
              <Slider
                value={[filters.minPrice || priceRange.min, filters.maxPrice || priceRange.max]}
                min={priceRange.min}
                max={priceRange.max}
                step={PRICE_STEP}
                onValueChange={([min, max]) => setFilters(prev => ({ ...prev, minPrice: min, maxPrice: max }))}
                className="py-2"
                data-testid="slider-price"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Área: {filters.minArea || areaRange.min} - {filters.maxArea || areaRange.max} m²
              </Label>
              <Slider
                value={[filters.minArea || areaRange.min, filters.maxArea || areaRange.max]}
                min={areaRange.min}
                max={areaRange.max}
                step={AREA_STEP}
                onValueChange={([min, max]) => setFilters(prev => ({ ...prev, minArea: min, maxArea: max }))}
                className="py-2"
                data-testid="slider-area"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Ciudad</Label>
              <Select 
                value={filters.city || ""} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, city: value || undefined, zone: undefined }))}
              >
                <SelectTrigger data-testid="select-city">
                  <SelectValue placeholder="Todas las ciudades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las ciudades</SelectItem>
                  {CITIES.map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Zona</Label>
              <Select 
                value={filters.zone || ""} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, zone: value || undefined }))}
              >
                <SelectTrigger data-testid="select-zone">
                  <SelectValue placeholder="Todas las zonas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las zonas</SelectItem>
                  {availableZones.map((zone) => (
                    <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <div>
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="w-full gap-2"
                  data-testid="button-clear-filters"
                >
                  <X className="w-4 h-4" />
                  Limpiar filtros
                </Button>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-sm">Recámaras:</span>
              <div className="flex flex-wrap gap-2">
                {bedroomOptions.map((option) => {
                  const isSelected = filters.bedrooms?.includes(option) || false;
                  const count = sliderFilteredTypologies.filter(t => t.bedrooms === option).length;
                  const isDisabled = count === 0 && !isSelected;
                  return (
                    <Button
                      key={option}
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => {
                        setFilters(prev => {
                          const current = prev.bedrooms || [];
                          if (isSelected) {
                            return { ...prev, bedrooms: current.filter(b => b !== option) };
                          } else {
                            return { ...prev, bedrooms: [...current, option] };
                          }
                        });
                      }}
                      className={count === 0 && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}
                      disabled={isDisabled}
                      data-testid={`btn-bed-${option}`}
                    >
                      {option} {count > 0 && <span className="ml-1 text-xs opacity-70">({count})</span>}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12">
        <TypologyGrid typologies={filteredTypologies} isLoading={isLoading} />
      </main>

      <footer className="border-t bg-card">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Muros. Todos los derechos reservados.</p>
        </div>
      </footer>

      <FloatingContactForm />
    </div>
  );
}
