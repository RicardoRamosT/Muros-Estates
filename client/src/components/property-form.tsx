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
import { Loader2, Save, X, Plus, Trash2 } from "lucide-react";
import type { InsertProperty, Property } from "@shared/schema";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

const propertyFormSchema = z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  price: z.string().min(1, "El precio es requerido"),
  location: z.string().min(2, "La ubicación es requerida"),
  city: z.string().min(2, "La ciudad es requerida"),
  state: z.string().min(2, "El estado es requerido"),
  address: z.string().min(5, "La dirección es requerida"),
  bedrooms: z.string().min(1, "Las recámaras son requeridas"),
  bathrooms: z.string().min(1, "Los baños son requeridos"),
  area: z.string().min(1, "El área es requerida"),
  yearBuilt: z.string().optional(),
  propertyType: z.string().min(1, "El tipo de propiedad es requerido"),
  status: z.string().min(1, "El estado es requerido"),
  featured: z.boolean().default(false),
  developmentName: z.string().optional(),
  floor: z.string().optional(),
  parking: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertyFormSchema>;

interface PropertyFormProps {
  property?: Property;
  onSubmit: (data: InsertProperty) => void;
  isLoading?: boolean;
  onCancel: () => void;
}

const propertyTypes = [
  "Departamento",
  "Casa",
  "Penthouse",
  "Loft",
  "Studio",
  "Duplex",
];

const amenitiesList = [
  "Estacionamiento",
  "Alberca",
  "Gimnasio",
  "Seguridad 24/7",
  "Elevador",
  "Terraza",
  "Balcón",
  "Área de lavado",
  "Bodega",
  "Roof Garden",
  "Pet Friendly",
  "Smart Home",
  "Aire Acondicionado",
  "Calefacción",
  "Cuarto de servicio",
];

export function PropertyForm({ property, onSubmit, isLoading, onCancel }: PropertyFormProps) {
  const [images, setImages] = useState<string[]>(property?.images || []);
  const [imageUrl, setImageUrl] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(property?.amenities || []);

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      title: property?.title || "",
      description: property?.description || "",
      price: property?.price?.toString() || "",
      location: property?.location || "",
      city: property?.city || "",
      state: property?.state || "",
      address: property?.address || "",
      bedrooms: property?.bedrooms?.toString() || "",
      bathrooms: property?.bathrooms?.toString() || "",
      area: property?.area?.toString() || "",
      yearBuilt: property?.yearBuilt?.toString() || "",
      propertyType: property?.propertyType || "",
      status: property?.status || "available",
      featured: property?.featured || false,
      developmentName: property?.developmentName || "",
      floor: property?.floor?.toString() || "",
      parking: property?.parking?.toString() || "",
    },
  });

  const handleSubmit = (data: PropertyFormData) => {
    const propertyData: InsertProperty = {
      title: data.title,
      description: data.description,
      price: data.price,
      location: data.location,
      city: data.city,
      state: data.state,
      address: data.address,
      bedrooms: parseInt(data.bedrooms),
      bathrooms: parseInt(data.bathrooms),
      area: data.area,
      yearBuilt: data.yearBuilt ? parseInt(data.yearBuilt) : null,
      propertyType: data.propertyType,
      status: data.status,
      featured: data.featured,
      images: images,
      amenities: selectedAmenities,
      developmentName: data.developmentName || null,
      floor: data.floor ? parseInt(data.floor) : null,
      parking: data.parking ? parseInt(data.parking) : 0,
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

  const toggleAmenity = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="ej. Departamento de lujo en zona exclusiva" {...field} data-testid="input-title" />
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
                      placeholder="Describe las características principales de la propiedad..." 
                      className="min-h-[120px]"
                      {...field} 
                      data-testid="input-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="propertyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Propiedad</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-property-type">
                          <SelectValue placeholder="Selecciona el tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {propertyTypes.map((type) => (
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

              <FormField
                control={form.control}
                name="developmentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Desarrollo (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="ej. Torres del Valle" {...field} data-testid="input-development" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Precio y Estado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Colonia/Zona</FormLabel>
                    <FormControl>
                      <Input placeholder="ej. Polanco" {...field} data-testid="input-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad</FormLabel>
                    <FormControl>
                      <Input placeholder="ej. Monterrey" {...field} data-testid="input-city" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <Input placeholder="ej. Nuevo León" {...field} data-testid="input-state" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Características</CardTitle>
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="floor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Piso (opcional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="5" {...field} data-testid="input-floor" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="yearBuilt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Año de Construcción</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="2023" {...field} data-testid="input-year" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Amenidades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {amenitiesList.map((amenity) => (
                <Badge
                  key={amenity}
                  variant={selectedAmenities.includes(amenity) ? "default" : "outline"}
                  className="cursor-pointer toggle-elevate"
                  onClick={() => toggleAmenity(amenity)}
                  data-testid={`badge-amenity-${amenity.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  {amenity}
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
