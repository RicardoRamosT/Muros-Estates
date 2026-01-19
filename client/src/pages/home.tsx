import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { PropertyGrid } from "@/components/property-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { Property, PropertyFilter, ContactFormInput } from "@shared/schema";
import { CITIES, ZONES_MONTERREY, ZONES_CDMX, getZonesByCity } from "@shared/constants";
import { Search, X, Send, Loader2, Phone, Mail, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const MIN_PRICE = 1000000;
const MAX_PRICE = 50000000;
const MIN_AREA = 20;
const MAX_AREA = 500;

export default function Home() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<PropertyFilter>({
    minPrice: MIN_PRICE,
    maxPrice: MAX_PRICE,
    minArea: MIN_AREA,
    maxArea: MAX_AREA,
  });

  const [contactForm, setContactForm] = useState<ContactFormInput>({
    name: "",
    phone: "",
    email: "",
    interest: "",
  });

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const contactMutation = useMutation({
    mutationFn: async (data: ContactFormInput) => {
      const res = await apiRequest("POST", "/api/contact", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Gracias por contactarnos",
        description: "Un asesor te contactará pronto.",
      });
      setContactForm({ name: "", phone: "", email: "", interest: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al enviar el formulario",
        variant: "destructive",
      });
    },
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

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.phone) {
      toast({
        title: "Error",
        description: "Por favor completa los campos requeridos",
        variant: "destructive",
      });
      return;
    }
    contactMutation.mutate(contactForm);
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
                <p className="mt-4 text-lg text-muted-foreground">
                  Déjanos tus datos y un asesor especializado te contactará
                </p>
              </div>

              <Card className="border-primary/20">
                <CardContent className="pt-6">
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="name"
                          placeholder="Tu nombre completo"
                          value={contactForm.name}
                          onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                          className="pl-10 h-12"
                          required
                          data-testid="input-contact-name"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="Tu número de teléfono"
                          value={contactForm.phone}
                          onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="pl-10 h-12"
                          required
                          data-testid="input-contact-phone"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email (opcional)</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="tu@email.com"
                          value={contactForm.email}
                          onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                          className="pl-10 h-12"
                          data-testid="input-contact-email"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="interest">Interés</Label>
                      <Select
                        value={contactForm.interest}
                        onValueChange={(value) => setContactForm(prev => ({ ...prev, interest: value }))}
                      >
                        <SelectTrigger className="h-12" data-testid="select-contact-interest">
                          <SelectValue placeholder="¿Cuál es tu objetivo?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inversion">Inversión</SelectItem>
                          <SelectItem value="vivienda">Vivienda</SelectItem>
                          <SelectItem value="renta">Renta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      type="submit"
                      size="lg" 
                      className="w-full h-12"
                      disabled={contactMutation.isPending}
                      data-testid="button-contact-submit"
                    >
                      {contactMutation.isPending ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5 mr-2" />
                      )}
                      Quiero que me contacten
                    </Button>
                  </form>
                </CardContent>
              </Card>
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

      <section className="bg-muted/50 py-8 border-y">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              <span className="font-semibold">Filtros:</span>
            </div>
            
            <Select
              value={filters.city || "all"}
              onValueChange={(value) => handleCityChange(value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-40 bg-card" data-testid="select-city">
                <SelectValue placeholder="Ciudad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {CITIES.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filters.city && (
              <Select
                value={filters.zone || "all"}
                onValueChange={(value) => setFilters(prev => ({ ...prev, zone: value === "all" ? undefined : value }))}
              >
                <SelectTrigger className="w-40 bg-card" data-testid="select-zone">
                  <SelectValue placeholder="Zona" />
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
            )}

            <Select
              value={filters.minBedrooms?.toString() || "all"}
              onValueChange={(value) => setFilters(prev => ({ ...prev, minBedrooms: value === "all" ? undefined : parseInt(value) }))}
            >
              <SelectTrigger className="w-40 bg-card" data-testid="select-bedrooms">
                <SelectValue placeholder="Recámaras" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="1">1+ Recámara</SelectItem>
                <SelectItem value="2">2+ Recámaras</SelectItem>
                <SelectItem value="3">3+ Recámaras</SelectItem>
                <SelectItem value="4">4+ Recámaras</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Precio:</span>
              <Slider
                min={MIN_PRICE}
                max={MAX_PRICE}
                step={100000}
                value={[filters.minPrice || MIN_PRICE, filters.maxPrice || MAX_PRICE]}
                onValueChange={handlePriceChange}
                className="flex-1"
                data-testid="slider-price"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {formatPrice(filters.minPrice || MIN_PRICE)} - {formatPrice(filters.maxPrice || MAX_PRICE)}
              </span>
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
                Limpiar
              </Button>
            )}
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
