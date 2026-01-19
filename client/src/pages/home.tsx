import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { PropertyGrid } from "@/components/property-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BEDROOM_OPTIONS, BATHROOM_OPTIONS } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { Property, PropertyFilter, ContactFormInput } from "@shared/schema";
import { CITIES, ZONES_MONTERREY, ZONES_CDMX, getZonesByCity } from "@shared/constants";
import { Search, X, Send, Loader2, Phone, Mail, User, Building2, MapPin, Shield, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import heroImage1 from "@assets/stock_images/modern_luxury_apartm_2088b0db.jpg";
import heroImage2 from "@assets/stock_images/modern_luxury_apartm_93f36c98.jpg";
import heroImage3 from "@assets/stock_images/modern_luxury_apartm_f001d689.jpg";
import buildingImage1 from "@assets/stock_images/luxury_apartment_bui_f72ea198.jpg";
import buildingImage2 from "@assets/stock_images/luxury_apartment_bui_ef09dbeb.jpg";

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
const DELIVERY_STEP = 3; // Quarters (trimestres)
const DOWN_PAYMENT_STEP = 5; // 5% increments

export default function Home() {
  const { toast } = useToast();
  
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

  const [contactForm, setContactForm] = useState<ContactFormInput>({
    name: "",
    phone: "",
    email: "",
    interest: "",
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

    return result.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return 0;
    });
  }, [sliderFilteredProperties, filters]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.minPrice && filters.minPrice > priceRange.min) count++;
    if (filters.maxPrice && filters.maxPrice < priceRange.max) count++;
    if (filters.minArea && filters.minArea > areaRange.min) count++;
    if (filters.maxArea && filters.maxArea < areaRange.max) count++;
    if (filters.minDeliveryMonths !== undefined && filters.minDeliveryMonths > deliveryRange.min) count++;
    if (filters.maxDeliveryMonths !== undefined && filters.maxDeliveryMonths < deliveryRange.max) count++;
    if (filters.minDownPayment !== undefined && filters.minDownPayment > downPaymentRange.min) count++;
    if (filters.maxDownPayment !== undefined && filters.maxDownPayment < downPaymentRange.max) count++;
    if (filters.bedrooms && filters.bedrooms.length > 0) count++;
    if (filters.bathrooms && filters.bathrooms.length > 0) count++;
    if (filters.city) count++;
    if (filters.zone) count++;
    return count;
  }, [filters, priceRange, areaRange, deliveryRange, downPaymentRange]);

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

  const handleDeliveryChange = (values: number[]) => {
    setFilters(prev => ({
      ...prev,
      minDeliveryMonths: values[0],
      maxDeliveryMonths: values[1],
    }));
  };

  const handleDownPaymentChange = (values: number[]) => {
    setFilters(prev => ({
      ...prev,
      minDownPayment: values[0],
      maxDownPayment: values[1],
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <section className="relative min-h-screen py-20 flex items-center">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage1})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                  Tu próximo hogar o inversión en{" "}
                  <span className="text-secondary">México</span>
                </h1>
                <p className="text-xl text-gray-300 max-w-lg">
                  Encuentra los mejores departamentos en desarrollos de primera calidad. 
                  Asesoría personalizada sin costo.
                </p>
              </div>

              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-3 text-white/90">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <p className="font-semibold">+50</p>
                    <p className="text-sm text-gray-400">Desarrollos</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-white/90">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <p className="font-semibold">2 Ciudades</p>
                    <p className="text-sm text-gray-400">MTY y CDMX</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-white/90">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <p className="font-semibold">100%</p>
                    <p className="text-sm text-gray-400">Verificados</p>
                  </div>
                </div>
              </div>

            </div>

            <div className="lg:pl-8">
              <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-foreground">Recibe asesoría gratuita</h2>
                    <p className="text-muted-foreground mt-1">Un experto te contactará en menos de 24 horas</p>
                  </div>
                  
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-foreground">Nombre completo *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="name"
                          placeholder="¿Cómo te llamas?"
                          value={contactForm.name}
                          onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                          className="pl-11 h-12 bg-muted/50"
                          required
                          data-testid="input-contact-name"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-foreground">Teléfono *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="10 dígitos"
                          value={contactForm.phone}
                          onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="pl-11 h-12 bg-muted/50"
                          required
                          data-testid="input-contact-phone"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-foreground">Email (opcional)</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="tu@email.com"
                          value={contactForm.email}
                          onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                          className="pl-11 h-12 bg-muted/50"
                          data-testid="input-contact-email"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="interest" className="text-foreground">¿Cuál es tu objetivo?</Label>
                      <Select
                        value={contactForm.interest}
                        onValueChange={(value) => setContactForm(prev => ({ ...prev, interest: value }))}
                      >
                        <SelectTrigger className="h-12 bg-muted/50" data-testid="select-contact-interest">
                          <SelectValue placeholder="Selecciona una opción" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inversion">Inversión</SelectItem>
                          <SelectItem value="vivienda">Vivienda propia</SelectItem>
                          <SelectItem value="renta">Renta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      type="submit"
                      size="lg" 
                      className="w-full h-14 text-lg font-semibold mt-2"
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
                    
                    <p className="text-xs text-center text-muted-foreground pt-2">
                      Al enviar aceptas nuestro aviso de privacidad. Sin compromiso.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>
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

            <div className="flex items-center gap-2 min-w-[160px]">
              <span className="text-sm text-white/80 whitespace-nowrap">Entrega:</span>
              <Slider
                min={deliveryRange.min}
                max={deliveryRange.max}
                step={DELIVERY_STEP}
                value={[filters.minDeliveryMonths ?? deliveryRange.min, filters.maxDeliveryMonths ?? deliveryRange.max]}
                onValueChange={handleDeliveryChange}
                className="flex-1 min-w-[60px] [&_[role=slider]]:bg-secondary [&_[role=slider]]:border-secondary [&_.bg-primary]:bg-secondary"
                data-testid="slider-delivery"
              />
              <span className="text-sm text-white/80 whitespace-nowrap">
                {filters.minDeliveryMonths ?? deliveryRange.min} - {filters.maxDeliveryMonths ?? deliveryRange.max} meses
              </span>
            </div>

            <div className="flex items-center gap-2 min-w-[160px]">
              <span className="text-sm text-white/80 whitespace-nowrap">Enganche:</span>
              <Slider
                min={downPaymentRange.min}
                max={downPaymentRange.max}
                step={DOWN_PAYMENT_STEP}
                value={[filters.minDownPayment ?? downPaymentRange.min, filters.maxDownPayment ?? downPaymentRange.max]}
                onValueChange={handleDownPaymentChange}
                className="flex-1 min-w-[60px] [&_[role=slider]]:bg-secondary [&_[role=slider]]:border-secondary [&_.bg-primary]:bg-secondary"
                data-testid="slider-downpayment"
              />
              <span className="text-sm text-white/80 whitespace-nowrap">
                {filters.minDownPayment ?? downPaymentRange.min}% - {filters.maxDownPayment ?? downPaymentRange.max}%
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
                  const count = sliderFilteredProperties.filter(p => p.city === city).length;
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
                {BEDROOM_OPTIONS.map((option) => {
                  const isSelected = filters.bedrooms?.includes(option) || false;
                  const count = sliderFilteredProperties.filter(p => p.bedrooms === option).length;
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
                      {option} {count > 0 && <span className="ml-1 text-xs opacity-70">({count})</span>}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-white text-sm">Baños:</span>
              <div className="flex flex-wrap gap-2">
                {BATHROOM_OPTIONS.map((option) => {
                  const isSelected = filters.bathrooms?.includes(option) || false;
                  const count = sliderFilteredProperties.filter(p => p.bathrooms === option).length;
                  const isDisabled = count === 0 && !isSelected;
                  return (
                    <Button
                      key={option}
                      size="sm"
                      variant={isSelected ? "secondary" : "outline"}
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
                      className={`${isSelected ? '' : 'bg-white/5 border-white/30 text-white hover:bg-white/20'} ${count === 0 && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}`}
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
                <p className="text-2xl font-bold text-primary">{filteredProperties.length}</p>
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
        <PropertyGrid properties={filteredProperties} isLoading={isLoading} limit={4} />
        
        {filteredProperties.length > 4 && (
          <div className="flex justify-center mt-8">
            <Link
              href={`/propiedades?${new URLSearchParams(
                Object.entries(filters)
                  .filter(([_, v]) => v !== undefined && v !== null && v !== "")
                  .map(([k, v]) => [k, String(v)])
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
                    <Building2 className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Desarrollos Verificados</h3>
                    <p className="text-white/70">Trabajamos únicamente con desarrolladores certificados y proyectos de primera calidad.</p>
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
    </div>
  );
}
