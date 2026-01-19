import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, X, Plus, Trash2 } from "lucide-react";
import type { InsertProperty, Property } from "@shared/schema";
import { 
  DEVELOPERS, 
  DEVELOPMENTS, 
  CITIES, 
  DEVELOPMENT_TYPES, 
  AMENITIES, 
  EFFICIENCY_FEATURES, 
  OTHER_FEATURES,
  getZonesByCity 
} from "@shared/constants";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";

const propertyFormSchema = z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  price: z.string().min(1, "El precio es requerido"),
  city: z.string().min(1, "La ciudad es requerida"),
  zone: z.string().min(1, "La zona es requerida"),
  developer: z.string().min(1, "El desarrollador es requerido"),
  developmentName: z.string().min(1, "El nombre del desarrollo es requerido"),
  developmentType: z.string().min(1, "El tipo de desarrollo es requerido"),
  address: z.string().min(5, "La dirección es requerida"),
  bedrooms: z.string().min(1, "Las recámaras son requeridas"),
  bathrooms: z.string().min(1, "Los baños son requeridos"),
  area: z.string().min(1, "El área es requerida"),
  floor: z.string().optional(),
  parking: z.string().optional(),
  deliveryDate: z.string().optional(),
  status: z.string().min(1, "El estado es requerido"),
  featured: z.boolean().default(false),
  value: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertyFormSchema>;

interface PropertyFormProps {
  property?: Property;
  onSubmit: (data: InsertProperty) => void;
  isLoading?: boolean;
  onCancel: () => void;
}

export function PropertyForm({ property, onSubmit, isLoading, onCancel }: PropertyFormProps) {
  const [images, setImages] = useState<string[]>(property?.images || []);
  const [imageUrl, setImageUrl] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(property?.amenities || []);
  const [selectedEfficiency, setSelectedEfficiency] = useState<string[]>(property?.efficiency || []);
  const [selectedOtherFeatures, setSelectedOtherFeatures] = useState<string[]>(property?.otherFeatures || []);
  const [selectedCity, setSelectedCity] = useState<string>(property?.city || "");

  const availableZones = useMemo(() => {
    return getZonesByCity(selectedCity);
  }, [selectedCity]);

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      title: property?.title || "",
      description: property?.description || "",
      price: property?.price?.toString() || "",
      city: property?.city || "",
      zone: property?.zone || "",
      developer: property?.developer || "",
      developmentName: property?.developmentName || "",
      developmentType: property?.developmentType || "",
      address: property?.address || "",
      bedrooms: property?.bedrooms?.toString() || "",
      bathrooms: property?.bathrooms?.toString() || "",
      area: property?.area?.toString() || "",
      floor: property?.floor?.toString() || "",
      parking: property?.parking?.toString() || "",
      deliveryDate: property?.deliveryDate || "",
      status: property?.status || "available",
      featured: property?.featured || false,
      value: property?.value || "",
    },
  });

  const handleSubmit = (data: PropertyFormData) => {
    const propertyData: InsertProperty = {
      title: data.title,
      description: data.description,
      price: data.price,
      city: data.city,
      zone: data.zone,
      developer: data.developer,
      developmentName: data.developmentName,
      developmentType: data.developmentType,
      address: data.address,
      bedrooms: parseInt(data.bedrooms),
      bathrooms: parseInt(data.bathrooms),
      area: data.area,
      floor: data.floor ? parseInt(data.floor) : null,
      parking: data.parking ? parseInt(data.parking) : 0,
      deliveryDate: data.deliveryDate || null,
      status: data.status,
      featured: data.featured,
      images: images,
      amenities: selectedAmenities,
      efficiency: selectedEfficiency.length > 0 ? selectedEfficiency : null,
      otherFeatures: selectedOtherFeatures.length > 0 ? selectedOtherFeatures : null,
      value: data.value || null,
    };
    onSubmit(propertyData);
  };

  const addImage = () => {
    if (imageUrl.trim() && !images.includes(imageUrl.trim())) {
      setImages([...images, imageUrl.trim()]);
      setImageUrl("");
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const toggleAmenity = (amenityId: string) => {
    if (selectedAmenities.includes(amenityId)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== amenityId));
    } else {
      setSelectedAmenities([...selectedAmenities, amenityId]);
    }
  };

  const toggleEfficiency = (feature: string) => {
    if (selectedEfficiency.includes(feature)) {
      setSelectedEfficiency(selectedEfficiency.filter((f) => f !== feature));
    } else {
      setSelectedEfficiency([...selectedEfficiency, feature]);
    }
  };

  const toggleOtherFeature = (feature: string) => {
    if (selectedOtherFeatures.includes(feature)) {
      setSelectedOtherFeatures(selectedOtherFeatures.filter((f) => f !== feature));
    } else {
      setSelectedOtherFeatures([...selectedOtherFeatures, feature]);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Información del Desarrollo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="developer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desarrollador</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-developer">
                          <SelectValue placeholder="Selecciona el desarrollador" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DEVELOPERS.map((dev) => (
                          <SelectItem key={dev} value={dev}>
                            {dev}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="developmentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Desarrollo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-development">
                          <SelectValue placeholder="Selecciona el desarrollo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DEVELOPMENTS.map((dev) => (
                          <SelectItem key={dev} value={dev}>
                            {dev}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="developmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Desarrollo</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-development-type">
                        <SelectValue placeholder="Selecciona el tipo de desarrollo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DEVELOPMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información del Departamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="ej. Departamento Premium en Kyo Constella" {...field} data-testid="input-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe las características principales del departamento..." 
                      className="min-h-[120px]"
                      {...field} 
                      data-testid="input-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Propuesta de Valor (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="ej. Espectaculares vistas, Pet Friendly, Estilo Neoyorkino" {...field} data-testid="input-value" />
                  </FormControl>
                  <FormDescription>
                    Característica única que destaca esta propiedad
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Precio y Estado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio (MXN)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="ej. 5000000" {...field} data-testid="input-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Selecciona el estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="available">Disponible</SelectItem>
                        <SelectItem value="reserved">Reservado</SelectItem>
                        <SelectItem value="sold">Vendido</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deliveryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Entrega</FormLabel>
                    <FormControl>
                      <Input placeholder="ej. Diciembre 2025" {...field} data-testid="input-delivery-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="featured"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Propiedad Destacada</FormLabel>
                    <FormDescription>
                      Las propiedades destacadas aparecen primero en las búsquedas
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-featured"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ubicación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="ej. Av. Constitución 1500" {...field} data-testid="input-address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedCity(value);
                        form.setValue("zone", "");
                      }} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-city">
                          <SelectValue placeholder="Selecciona la ciudad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CITIES.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zona</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-zone">
                          <SelectValue placeholder="Selecciona la zona" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableZones.map((zone) => (
                          <SelectItem key={zone} value={zone}>
                            {zone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Características del Departamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="bedrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recámaras</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="3" {...field} data-testid="input-bedrooms" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bathrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Baños</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="2" {...field} data-testid="input-bathrooms" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Superficie (m²)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="120" {...field} data-testid="input-area" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parking"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estacionamientos</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="2" {...field} data-testid="input-parking" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="floor"
              render={({ field }) => (
                <FormItem className="max-w-[200px]">
                  <FormLabel>Piso (opcional)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="5" {...field} data-testid="input-floor" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Amenidades del Desarrollo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {AMENITIES.map((amenity) => (
                <div
                  key={amenity.id}
                  onClick={() => toggleAmenity(amenity.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedAmenities.includes(amenity.id)
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-muted-foreground/50"
                  }`}
                  data-testid={`amenity-${amenity.id}`}
                >
                  <img 
                    src={amenity.icon} 
                    alt={amenity.name}
                    className="w-8 h-8 object-contain"
                  />
                  <span className="text-xs text-center font-medium">{amenity.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eficiencia del Desarrollo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {EFFICIENCY_FEATURES.map((feature) => (
                <Badge
                  key={feature}
                  variant={selectedEfficiency.includes(feature) ? "default" : "outline"}
                  className="cursor-pointer toggle-elevate"
                  onClick={() => toggleEfficiency(feature)}
                  data-testid={`efficiency-${feature.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  {feature}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seguridad y Otras Características</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {OTHER_FEATURES.map((feature) => (
                <Badge
                  key={feature}
                  variant={selectedOtherFeatures.includes(feature) ? "default" : "outline"}
                  className="cursor-pointer toggle-elevate"
                  onClick={() => toggleOtherFeature(feature)}
                  data-testid={`other-feature-${feature.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  {feature}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Imágenes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="URL de la imagen"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                data-testid="input-image-url"
              />
              <Button type="button" variant="secondary" onClick={addImage} data-testid="button-add-image">
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((img, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={img}
                      alt={`Imagen ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                      data-testid={`button-remove-image-${index}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} data-testid="button-cancel">
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading} data-testid="button-submit">
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {property ? "Actualizar" : "Crear"} Propiedad
          </Button>
        </div>
      </form>
    </Form>
  );
}
