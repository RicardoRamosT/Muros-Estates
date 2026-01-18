import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RotateCcw, Search } from "lucide-react";
import type { PropertyFilter } from "@shared/schema";

interface PropertyFiltersProps {
  filters: PropertyFilter;
  onFilterChange: (filters: PropertyFilter) => void;
  cities: string[];
  propertyTypes: string[];
}

const MIN_PRICE = 0;
const MAX_PRICE = 50000000;
const MIN_AREA = 0;
const MAX_AREA = 500;

export function PropertyFilters({ filters, onFilterChange, cities, propertyTypes }: PropertyFiltersProps) {
  const formatPrice = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const handlePriceChange = (values: number[]) => {
    onFilterChange({
      ...filters,
      minPrice: values[0],
      maxPrice: values[1],
    });
  };

  const handleAreaChange = (values: number[]) => {
    onFilterChange({
      ...filters,
      minArea: values[0],
      maxArea: values[1],
    });
  };

  const handleReset = () => {
    onFilterChange({});
  };

  return (
    <Card className="sticky top-20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Filtros
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleReset} data-testid="button-reset-filters">
            <RotateCcw className="w-4 h-4 mr-1" />
            Limpiar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Rango de Precio</Label>
          <Slider
            min={MIN_PRICE}
            max={MAX_PRICE}
            step={100000}
            value={[filters.minPrice || MIN_PRICE, filters.maxPrice || MAX_PRICE]}
            onValueChange={handlePriceChange}
            className="mt-2"
            data-testid="slider-price"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span data-testid="text-min-price">{formatPrice(filters.minPrice || MIN_PRICE)}</span>
            <span data-testid="text-max-price">{formatPrice(filters.maxPrice || MAX_PRICE)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Superficie (m²)</Label>
          <Slider
            min={MIN_AREA}
            max={MAX_AREA}
            step={10}
            value={[filters.minArea || MIN_AREA, filters.maxArea || MAX_AREA]}
            onValueChange={handleAreaChange}
            className="mt-2"
            data-testid="slider-area"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span data-testid="text-min-area">{filters.minArea || MIN_AREA} m²</span>
            <span data-testid="text-max-area">{filters.maxArea || MAX_AREA} m²</span>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Ciudad</Label>
          <Select
            value={filters.city || "all"}
            onValueChange={(value) => onFilterChange({ ...filters, city: value === "all" ? undefined : value })}
          >
            <SelectTrigger data-testid="select-city">
              <SelectValue placeholder="Todas las ciudades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las ciudades</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Tipo de Propiedad</Label>
          <Select
            value={filters.propertyType || "all"}
            onValueChange={(value) => onFilterChange({ ...filters, propertyType: value === "all" ? undefined : value })}
          >
            <SelectTrigger data-testid="select-property-type">
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {propertyTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Recámaras</Label>
            <Select
              value={filters.minBedrooms?.toString() || "any"}
              onValueChange={(value) => onFilterChange({ ...filters, minBedrooms: value === "any" ? undefined : parseInt(value) })}
            >
              <SelectTrigger data-testid="select-bedrooms">
                <SelectValue placeholder="Cualquiera" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Cualquiera</SelectItem>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="2">2+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
                <SelectItem value="4">4+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Baños</Label>
            <Select
              value={filters.minBathrooms?.toString() || "any"}
              onValueChange={(value) => onFilterChange({ ...filters, minBathrooms: value === "any" ? undefined : parseInt(value) })}
            >
              <SelectTrigger data-testid="select-bathrooms">
                <SelectValue placeholder="Cualquiera" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Cualquiera</SelectItem>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="2">2+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Estado</Label>
          <Select
            value={filters.status || "all"}
            onValueChange={(value) => onFilterChange({ ...filters, status: value === "all" ? undefined : value })}
          >
            <SelectTrigger data-testid="select-status">
              <SelectValue placeholder="Cualquier estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Cualquier estado</SelectItem>
              <SelectItem value="available">Disponible</SelectItem>
              <SelectItem value="reserved">Reservado</SelectItem>
              <SelectItem value="sold">Vendido</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
