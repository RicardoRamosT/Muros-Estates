import { useState, useMemo } from "react";
import { Header } from "@/components/header";
import { TypologyGrid } from "@/components/typology-grid";
import { FloatingContactForm } from "@/components/floating-contact-form";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Typology } from "@shared/schema";
import { CITIES, ZONES_MONTERREY, ZONES_CDMX, getZonesByCity } from "@shared/constants";
import { Search, X, Building2, MapPin, Shield, ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { usePublicTypologies } from "@/hooks/use-public-typologies";
import { Badge } from "@/components/ui/badge";
import heroImage1 from "@assets/stock_images/modern_luxury_apartm_2088b0db.jpg";
import heroImage2 from "@assets/stock_images/modern_luxury_apartm_93f36c98.jpg";
import heroImage3 from "@assets/stock_images/modern_luxury_apartm_f001d689.jpg";
import buildingImage1 from "@assets/stock_images/luxury_apartment_bui_f72ea198.jpg";
import buildingImage2 from "@assets/stock_images/luxury_apartment_bui_ef09dbeb.jpg";

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

export default function Home() {
  const { typologies, isLoading } = usePublicTypologies();

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

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.minPrice && filters.minPrice > priceRange.min) count++;
    if (filters.maxPrice && filters.maxPrice < priceRange.max) count++;
    if (filters.minArea && filters.minArea > areaRange.min) count++;
    if (filters.maxArea && filters.maxArea < areaRange.max) count++;
    if (filters.bedrooms && filters.bedrooms.length > 0) count++;
    if (filters.city) count++;
    if (filters.zone) count++;
    return count;
  }, [filters, priceRange, areaRange]);

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
    setFilters({});
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
          style={{ backgroundImage: `url(${heroImage1})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        
        <div className="container mx-auto px-4 relative z-10 py-20">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
              Encuentra tu{" "}
              <span className="text-secondary">departamento ideal</span>
              {" "}en México
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mx-auto">
              Desarrollos verificados en Monterrey y CDMX. 
              Asesoría gratuita y personalizada.
            </p>

            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Link href="/propiedades">
                <Button size="lg" className="h-14 px-8 text-lg gap-2" data-testid="button-hero-explore">
                  Explorar Departamentos
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 max-w-3xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <Building2 className="w-8 h-8 text-secondary mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">+50</p>
                <p className="text-sm text-gray-300">Desarrollos</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <MapPin className="w-8 h-8 text-secondary mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">2</p>
                <p className="text-sm text-gray-300">Ciudades</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <Shield className="w-8 h-8 text-secondary mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">100%</p>
                <p className="text-sm text-gray-300">Verificados</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <CheckCircle className="w-8 h-8 text-secondary mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">+500</p>
                <p className="text-sm text-gray-300">Clientes</p>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex gap-3 mt-12 justify-center">
            <img src={heroImage2} alt="Departamento moderno" className="w-64 h-40 object-cover rounded-lg shadow-xl" />
            <img src={heroImage3} alt="Interior de lujo" className="w-64 h-40 object-cover rounded-lg shadow-xl" />
            <img src={buildingImage1} alt="Edificio residencial" className="w-64 h-40 object-cover rounded-lg shadow-xl" />
          </div>
        </div>
      </section>

      <section className="bg-primary/95 py-4">
        <div className="container mx-auto px-4 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-secondary" />
              <span className="font-semibold text-white">Filtros:</span>
            </div>
            
            <div className="flex items-center gap-2 flex-1 min-w-[280px]">
              <span className="text-sm text-white/80 whitespace-nowrap">Precio:</span>
              <Slider
                min={priceRange.min}
                max={priceRange.max}
                step={PRICE_STEP}
                value={[filters.minPrice || priceRange.min, filters.maxPrice || priceRange.max]}
                onValueChange={handlePriceChange}
                className="flex-1 min-w-[100px] [&_[role=slider]]:bg-secondary [&_[role=slider]]:border-secondary [&_.bg-primary]:bg-secondary"
                data-testid="slider-price"
              />
              <span className="text-sm text-white/80 whitespace-nowrap">
                {formatPrice(filters.minPrice || priceRange.min)} - {formatPrice(filters.maxPrice || priceRange.max)}
              </span>
            </div>

            <div className="flex items-center gap-2 min-w-[200px]">
              <span className="text-sm text-white/80 whitespace-nowrap">Tamaño:</span>
              <Slider
                min={areaRange.min}
                max={areaRange.max}
                step={AREA_STEP}
                value={[filters.minArea || areaRange.min, filters.maxArea || areaRange.max]}
                onValueChange={handleAreaChange}
                className="flex-1 min-w-[80px] [&_[role=slider]]:bg-secondary [&_[role=slider]]:border-secondary [&_.bg-primary]:bg-secondary"
                data-testid="slider-area"
              />
              <span className="text-sm text-white/80 whitespace-nowrap">
                {filters.minArea || areaRange.min} - {filters.maxArea || areaRange.max} m²
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className={`text-white/80 hover:text-white hover:bg-white/10 transition-opacity ${activeFiltersCount > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              data-testid="button-clear-filters"
            >
              <X className="w-4 h-4 mr-1" />
              Limpiar
            </Button>
          </div>

          <div className="bg-white/10 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-white text-sm">Ciudades:</span>
              <div className="flex flex-wrap gap-2">
                {CITIES.map((city) => {
                  const isSelected = filters.city === city;
                  const count = sliderFilteredTypologies.filter(t => t.city === city).length;
                  const isDisabled = count === 0 && !isSelected;
                  return (
                    <Button
                      key={city}
                      size="sm"
                      variant={isSelected ? "secondary" : "outline"}
                      onClick={() => handleCityChange(isSelected ? "" : city)}
                      className={`${isSelected ? '' : 'bg-white/5 border-white/30 text-white hover:bg-white/20'} ${count === 0 && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}`}
                      disabled={isDisabled}
                      data-testid={`btn-city-${city}`}
                    >
                      {city} {count > 0 && <span className="ml-1 text-xs opacity-70">({count})</span>}
                    </Button>
                  );
                })}
              </div>
              {filters.city && (
                <>
                  <span className="font-semibold text-white text-sm ml-4">Zona:</span>
                  <Select
                    value={filters.zone || "all"}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, zone: value === "all" ? undefined : value }))}
                  >
                    <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white" data-testid="select-zone">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {availableZones.map((zone) => (
                        <SelectItem key={zone} value={zone}>
                          {zone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-white text-sm">Recámaras:</span>
              <div className="flex flex-wrap gap-2">
                {bedroomOptions.map((option) => {
                  const isSelected = filters.bedrooms?.includes(option) || false;
                  const count = sliderFilteredTypologies.filter(t => t.bedrooms === option).length;
                  const isDisabled = count === 0 && !isSelected;
                  return (
                    <Button
                      key={option}
                      size="sm"
                      variant={isSelected ? "secondary" : "outline"}
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
                      className={`${isSelected ? '' : 'bg-white/5 border-white/30 text-white hover:bg-white/20'} ${count === 0 && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}`}
                      disabled={isDisabled}
                      data-testid={`btn-bed-${option}`}
                    >
                      {option} Rec. {count > 0 && <span className="ml-1 text-xs opacity-70">({count})</span>}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-primary py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white" data-testid="text-results-title">
                Departamentos Disponibles
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-secondary rounded-xl px-6 py-3 text-center">
                <p className="text-2xl font-bold text-primary">{filteredTypologies.length}</p>
                <p className="text-sm text-primary/80">Departamentos</p>
              </div>
              <div className="bg-secondary rounded-xl px-6 py-3 text-center">
                <p className="text-2xl font-bold text-primary">100%</p>
                <p className="text-sm text-primary/80">Verificados</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12">
        <TypologyGrid typologies={filteredTypologies} isLoading={isLoading} limit={4} />
        
        {filteredTypologies.length > 4 && (
          <div className="flex justify-center mt-8">
            <Link
              href={`/propiedades?${new URLSearchParams(
                Object.entries(filters)
                  .filter(([_, v]) => v !== undefined && v !== null && v !== "")
                  .map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : String(v)])
              ).toString()}`}
            >
              <Button size="lg" className="gap-2" data-testid="button-view-more">
                Ver Más Departamentos
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        )}
      </main>

      <section className="bg-primary py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                ¿Por qué elegir Muros?
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Desarrollos verificados</h3>
                    <p className="text-white/70">Solo trabajamos con desarrolladores de confianza con proyectos de alta calidad.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Asesoría sin costo</h3>
                    <p className="text-white/70">Nuestros expertos te guían en todo el proceso sin ningún cargo adicional.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Las mejores ubicaciones</h3>
                    <p className="text-white/70">Propiedades en zonas de alto potencial de plusvalía en Monterrey y CDMX.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <img
                src={buildingImage2}
                alt="Edificio de departamentos moderno"
                className="rounded-lg shadow-2xl"
              />
              <div className="absolute -bottom-6 -left-6 bg-secondary text-secondary-foreground p-6 rounded-lg shadow-xl">
                <p className="text-3xl font-bold">+500</p>
                <p className="text-sm">Clientes satisfechos</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t bg-card">
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

      <FloatingContactForm />
    </div>
  );
}
