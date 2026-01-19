import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Header } from "@/components/header";
import { PropertyGrid } from "@/components/property-grid";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Property, PropertyFilter } from "@shared/schema";
import { BEDROOM_OPTIONS, BATHROOM_OPTIONS } from "@shared/schema";
import { CITIES, getZonesByCity, ZONES_MONTERREY, ZONES_CDMX } from "@shared/constants";
import { X, Home, SlidersHorizontal } from "lucide-react";
import { FloatingContactForm } from "@/components/floating-contact-form";

const DEFAULT_MIN_PRICE = 1000000;
const DEFAULT_MAX_PRICE = 50000000;
const DEFAULT_MIN_AREA = 20;
const DEFAULT_MAX_AREA = 500;
const DEFAULT_MIN_DELIVERY = 0;
const DEFAULT_MAX_DELIVERY = 36;
const DEFAULT_MIN_DOWN_PAYMENT = 5;
const DEFAULT_MAX_DOWN_PAYMENT = 50;
const PRICE_STEP = 100000;
const AREA_STEP = 5;
const DELIVERY_STEP = 3;
const DOWN_PAYMENT_STEP = 5;

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
  
  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const priceRange = useMemo(() => {
    if (properties.length === 0) {
      return { min: DEFAULT_MIN_PRICE, max: DEFAULT_MAX_PRICE };
    }
    const prices = properties.map(p => parseFloat(p.price));
    const minPrice = Math.floor(Math.min(...prices) / PRICE_STEP) * PRICE_STEP;
    const maxPrice = Math.ceil(Math.max(...prices) / PRICE_STEP) * PRICE_STEP;
    return { min: minPrice, max: maxPrice };
  }, [properties]);

  const areaRange = useMemo(() => {
    if (properties.length === 0) {
      return { min: DEFAULT_MIN_AREA, max: DEFAULT_MAX_AREA };
    }
    const areas = properties.map(p => parseFloat(p.area));
    const minArea = Math.floor(Math.min(...areas) / AREA_STEP) * AREA_STEP;
    const maxArea = Math.ceil(Math.max(...areas) / AREA_STEP) * AREA_STEP;
    return { min: minArea, max: maxArea };
  }, [properties]);

  const deliveryRange = useMemo(() => {
    const propsWithDelivery = properties.filter(p => p.deliveryMonths !== null && p.deliveryMonths !== undefined);
    if (propsWithDelivery.length === 0) {
      return { min: DEFAULT_MIN_DELIVERY, max: DEFAULT_MAX_DELIVERY };
    }
    const months = propsWithDelivery.map(p => p.deliveryMonths!);
    const minMonths = Math.floor(Math.min(...months) / DELIVERY_STEP) * DELIVERY_STEP;
    const maxMonths = Math.ceil(Math.max(...months) / DELIVERY_STEP) * DELIVERY_STEP;
    return { min: Math.max(0, minMonths), max: Math.max(maxMonths, DELIVERY_STEP) };
  }, [properties]);

  const downPaymentRange = useMemo(() => {
    const propsWithDP = properties.filter(p => p.downPayment !== null && p.downPayment !== undefined);
    if (propsWithDP.length === 0) {
      return { min: DEFAULT_MIN_DOWN_PAYMENT, max: DEFAULT_MAX_DOWN_PAYMENT };
    }
    const payments = propsWithDP.map(p => p.downPayment!);
    const minDP = Math.floor(Math.min(...payments) / DOWN_PAYMENT_STEP) * DOWN_PAYMENT_STEP;
    const maxDP = Math.ceil(Math.max(...payments) / DOWN_PAYMENT_STEP) * DOWN_PAYMENT_STEP;
    return { min: Math.max(5, minDP), max: Math.max(maxDP, 10) };
  }, [properties]);

  const [filters, setFilters] = useState<PropertyFilter>({});
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      const searchParams = new URLSearchParams(window.location.search);
      const initialFilters: PropertyFilter = {};
      
      if (searchParams.get("city")) initialFilters.city = searchParams.get("city")!;
      if (searchParams.get("zone")) initialFilters.zone = searchParams.get("zone")!;
      if (searchParams.get("minPrice")) initialFilters.minPrice = parseInt(searchParams.get("minPrice")!);
      if (searchParams.get("maxPrice")) initialFilters.maxPrice = parseInt(searchParams.get("maxPrice")!);
      if (searchParams.get("minArea")) initialFilters.minArea = parseInt(searchParams.get("minArea")!);
      if (searchParams.get("maxArea")) initialFilters.maxArea = parseInt(searchParams.get("maxArea")!);
      if (searchParams.get("bedrooms")) initialFilters.bedrooms = searchParams.get("bedrooms")!.split(",");
      if (searchParams.get("bathrooms")) initialFilters.bathrooms = searchParams.get("bathrooms")!.split(",");
      if (searchParams.get("minDeliveryMonths")) initialFilters.minDeliveryMonths = parseInt(searchParams.get("minDeliveryMonths")!);
      if (searchParams.get("maxDeliveryMonths")) initialFilters.maxDeliveryMonths = parseInt(searchParams.get("maxDeliveryMonths")!);
      if (searchParams.get("minDownPayment")) initialFilters.minDownPayment = parseInt(searchParams.get("minDownPayment")!);
      if (searchParams.get("maxDownPayment")) initialFilters.maxDownPayment = parseInt(searchParams.get("maxDownPayment")!);
      
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

  const sliderFilteredProperties = useMemo(() => {
    let result = properties;

    if (filters.minPrice && filters.minPrice > priceRange.min) {
      result = result.filter((p) => parseFloat(p.price) >= filters.minPrice!);
    }
    if (filters.maxPrice && filters.maxPrice < priceRange.max) {
      result = result.filter((p) => parseFloat(p.price) <= filters.maxPrice!);
    }
    if (filters.minArea && filters.minArea > areaRange.min) {
      result = result.filter((p) => parseFloat(p.area) >= filters.minArea!);
    }
    if (filters.maxArea && filters.maxArea < areaRange.max) {
      result = result.filter((p) => parseFloat(p.area) <= filters.maxArea!);
    }
    if (filters.minDeliveryMonths !== undefined && filters.minDeliveryMonths > deliveryRange.min) {
      result = result.filter((p) => p.deliveryMonths !== null && p.deliveryMonths !== undefined && p.deliveryMonths >= filters.minDeliveryMonths!);
    }
    if (filters.maxDeliveryMonths !== undefined && filters.maxDeliveryMonths < deliveryRange.max) {
      result = result.filter((p) => p.deliveryMonths !== null && p.deliveryMonths !== undefined && p.deliveryMonths <= filters.maxDeliveryMonths!);
    }
    if (filters.minDownPayment !== undefined && filters.minDownPayment > downPaymentRange.min) {
      result = result.filter((p) => p.downPayment !== null && p.downPayment !== undefined && p.downPayment >= filters.minDownPayment!);
    }
    if (filters.maxDownPayment !== undefined && filters.maxDownPayment < downPaymentRange.max) {
      result = result.filter((p) => p.downPayment !== null && p.downPayment !== undefined && p.downPayment <= filters.maxDownPayment!);
    }

    return result;
  }, [properties, filters, priceRange, areaRange, deliveryRange, downPaymentRange]);

  const filteredProperties = useMemo(() => {
    let result = sliderFilteredProperties;

    if (filters.bedrooms && filters.bedrooms.length > 0) {
      result = result.filter((p) => filters.bedrooms!.includes(p.bedrooms));
    }
    if (filters.bathrooms && filters.bathrooms.length > 0) {
      result = result.filter((p) => filters.bathrooms!.includes(p.bathrooms));
    }
    if (filters.city) {
      result = result.filter((p) => p.city === filters.city);
    }
    if (filters.zone) {
      result = result.filter((p) => p.zone === filters.zone);
    }

    return result;
  }, [sliderFilteredProperties, filters]);

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
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white" data-testid="text-page-title">
                Todos los Departamentos
              </h1>
              <p className="text-white/70 mt-1" data-testid="text-results-count">
                {filteredProperties.length} {filteredProperties.length === 1 ? "departamento encontrado" : "departamentos encontrados"}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 items-end">
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
              <Label className="text-sm font-medium">
                Entrega: {filters.minDeliveryMonths ?? deliveryRange.min} - {filters.maxDeliveryMonths ?? deliveryRange.max} meses
              </Label>
              <Slider
                value={[filters.minDeliveryMonths ?? deliveryRange.min, filters.maxDeliveryMonths ?? deliveryRange.max]}
                min={deliveryRange.min}
                max={deliveryRange.max}
                step={DELIVERY_STEP}
                onValueChange={([min, max]) => setFilters(prev => ({ ...prev, minDeliveryMonths: min, maxDeliveryMonths: max }))}
                className="py-2"
                data-testid="slider-delivery"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Enganche: {filters.minDownPayment ?? downPaymentRange.min} - {filters.maxDownPayment ?? downPaymentRange.max}%
              </Label>
              <Slider
                value={[filters.minDownPayment ?? downPaymentRange.min, filters.maxDownPayment ?? downPaymentRange.max]}
                min={downPaymentRange.min}
                max={downPaymentRange.max}
                step={DOWN_PAYMENT_STEP}
                onValueChange={([min, max]) => setFilters(prev => ({ ...prev, minDownPayment: min, maxDownPayment: max }))}
                className="py-2"
                data-testid="slider-downpayment"
              />
            </div>

            {hasActiveFilters && (
              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="gap-1"
                data-testid="button-clear-filters"
              >
                <X className="w-4 h-4" />
                Limpiar
              </Button>
            )}
          </div>

          <div className="bg-muted rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-sm">Ciudades:</span>
              <div className="flex flex-wrap gap-2">
                {CITIES.map((city) => {
                  const isSelected = filters.city === city;
                  const count = sliderFilteredProperties.filter(p => p.city === city).length;
                  const isDisabled = count === 0 && !isSelected;
                  return (
                    <Button
                      key={city}
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => setFilters(prev => ({
                        ...prev,
                        city: isSelected ? undefined : city,
                        zone: undefined
                      }))}
                      className={count === 0 && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}
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
                  <span className="font-semibold text-sm ml-4">Zona:</span>
                  <Select
                    value={filters.zone || "all"}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, zone: value === "all" ? undefined : value }))}
                  >
                    <SelectTrigger className="w-40" data-testid="select-zone">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {availableZones.map((zone) => (
                        <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-sm">Recámaras:</span>
              <div className="flex flex-wrap gap-2">
                {BEDROOM_OPTIONS.map((option) => {
                  const isSelected = filters.bedrooms?.includes(option) || false;
                  const count = sliderFilteredProperties.filter(p => p.bedrooms === option).length;
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

            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-sm">Baños:</span>
              <div className="flex flex-wrap gap-2">
                {BATHROOM_OPTIONS.map((option) => {
                  const isSelected = filters.bathrooms?.includes(option) || false;
                  const count = sliderFilteredProperties.filter(p => p.bathrooms === option).length;
                  const isDisabled = count === 0 && !isSelected;
                  return (
                    <Button
                      key={option}
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => {
                        setFilters(prev => {
                          const current = prev.bathrooms || [];
                          if (isSelected) {
                            return { ...prev, bathrooms: current.filter(b => b !== option) };
                          } else {
                            return { ...prev, bathrooms: [...current, option] };
                          }
                        });
                      }}
                      className={count === 0 && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}
                      disabled={isDisabled}
                      data-testid={`btn-bath-${option}`}
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
        <PropertyGrid properties={filteredProperties} isLoading={isLoading} />
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
