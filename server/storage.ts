import { type User, type InsertUser, type Property, type InsertProperty } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllProperties(): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, property: InsertProperty): Promise<Property | undefined>;
  deleteProperty(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private properties: Map<string, Property>;

  constructor() {
    this.users = new Map();
    this.properties = new Map();
    this.seedProperties();
  }

  private seedProperties() {
    const sampleProperties: InsertProperty[] = [
      {
        title: "Departamento Premium en Kyo Constella",
        description: "Espectacular departamento de lujo con acabados premium en el exclusivo desarrollo Kyo Constella. Cuenta con amplios espacios, iluminación natural excepcional y una vista panorámica de la ciudad. Cocina integral equipada con electrodomésticos de alta gama, pisos de mármol importado y sistemas domóticos de última generación.",
        price: "8500000",
        city: "Monterrey",
        zone: "Valle Oriente",
        developer: "IDEI",
        developmentName: "Kyo Constella",
        developmentType: "100% Residencial",
        address: "Av. Lázaro Cárdenas 2400",
        bedrooms: 3,
        bathrooms: 3,
        area: "185",
        floor: 15,
        parking: 2,
        deliveryDate: "Diciembre 2025",
        status: "available",
        featured: true,
        images: [
          "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
          "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
          "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800"
        ],
        amenities: ["alberca", "gym", "sky_lounge", "coworking", "terraza", "salon_eventos"],
        efficiency: ["Elevadores", "Centros de lavado", "Rack de Bicicletas"],
        otherFeatures: ["Personal de Seguridad", "Video Vigilancia / CCTV", "Control de acceso vehicular"],
        value: "Espectaculares vistas"
      },
      {
        title: "Penthouse en Arena Fundidora",
        description: "Extraordinario penthouse con doble altura y terraza privada con jacuzzi. Ubicado en el corazón de Monterrey con vistas espectaculares al Parque Fundidora y el Cerro de la Silla. Arquitectura contemporánea con materiales de primera calidad.",
        price: "15000000",
        city: "Monterrey",
        zone: "Fundidora",
        developer: "PLATE",
        developmentName: "Arena Fundidora",
        developmentType: "Uso mixto",
        address: "Av. Constitución 1500",
        bedrooms: 4,
        bathrooms: 4,
        area: "320",
        floor: 25,
        parking: 3,
        deliveryDate: "Marzo 2025",
        status: "available",
        featured: true,
        images: [
          "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
          "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
          "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800"
        ],
        amenities: ["alberca", "gym", "sky_lounge", "sala_cine", "sports_bar", "jardin_zen", "yoga_room"],
        efficiency: ["Elevadores", "Suite de invitados", "Shoot de basura"],
        otherFeatures: ["Personal de Seguridad", "Video Vigilancia / CCTV"],
        value: "Ubicación privilegiada"
      },
      {
        title: "Departamento en Novus Santa Fe",
        description: "Moderno departamento en la zona más exclusiva de la Ciudad de México. Santa Fe ofrece la mejor calidad de vida con centros comerciales, restaurantes y oficinas corporativas a pasos de distancia.",
        price: "6200000",
        city: "CDMX",
        zone: "Santa Fe",
        developer: "IDEI",
        developmentName: "Novus",
        developmentType: "Residencial y Comercial",
        address: "Av. Santa Fe 440",
        bedrooms: 2,
        bathrooms: 2,
        area: "95",
        floor: 8,
        parking: 1,
        deliveryDate: "Junio 2024",
        status: "available",
        featured: false,
        images: [
          "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800",
          "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800"
        ],
        amenities: ["gym", "coworking", "terraza", "salon_reuniones"],
        efficiency: ["Elevadores", "Centros de lavado"],
        otherFeatures: ["Video Vigilancia / CCTV", "Control de acceso vehicular"],
        value: "Pet Friendly"
      },
      {
        title: "Departamento Familiar en ALTO",
        description: "Amplio departamento familiar en el desarrollo ALTO. Diseño moderno con excelente distribución de espacios, ideal para familias que buscan confort y amenidades de primer nivel.",
        price: "4800000",
        city: "Monterrey",
        zone: "Valle Poniente",
        developer: "Create",
        developmentName: "ALTO",
        developmentType: "100% Residencial",
        address: "Blvd. Valle Poniente 800",
        bedrooms: 3,
        bathrooms: 2,
        area: "140",
        floor: 10,
        parking: 2,
        deliveryDate: "Septiembre 2025",
        status: "available",
        featured: false,
        images: [
          "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=800",
          "https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800"
        ],
        amenities: ["alberca", "gym", "juegos_infantiles", "ludoteca", "parque_canino", "asadores"],
        efficiency: ["Elevadores", "Rack de Bicicletas"],
        otherFeatures: ["Personal de Seguridad", "Accesos independientes"],
        value: "Puntos de interés cercanos"
      },
      {
        title: "Studio en Moca Azul",
        description: "Studio moderno y funcional en el desarrollo Moca Azul. Perfecto para jóvenes profesionales que buscan un espacio único cerca del Tec de Monterrey.",
        price: "2200000",
        city: "Monterrey",
        zone: "San José Tec",
        developer: "Proyectos 9",
        developmentName: "Moca Azul",
        developmentType: "Uso mixto",
        address: "Av. Eugenio Garza Sada 2501",
        bedrooms: 1,
        bathrooms: 1,
        area: "55",
        floor: 5,
        parking: 1,
        deliveryDate: "Agosto 2024",
        status: "available",
        featured: false,
        images: [
          "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800"
        ],
        amenities: ["gym", "coworking", "terraza", "reading_room"],
        efficiency: ["Elevadores", "Centros de lavado", "Shoot de basura"],
        otherFeatures: ["Video Vigilancia / CCTV"],
        value: "Estilo Neoyorkino"
      },
      {
        title: "Departamento de Lujo en Avalon",
        description: "Exclusivo departamento en Avalon con acabados de la más alta calidad. Vistas espectaculares y amenidades de clase mundial para un estilo de vida premium.",
        price: "9800000",
        city: "Monterrey",
        zone: "Valle Oriente",
        developer: "IDEI",
        developmentName: "Avalon",
        developmentType: "100% Residencial",
        address: "Av. Lázaro Cárdenas 3500",
        bedrooms: 3,
        bathrooms: 3,
        area: "200",
        floor: 18,
        parking: 2,
        deliveryDate: "Febrero 2026",
        status: "reserved",
        featured: true,
        images: [
          "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800",
          "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800"
        ],
        amenities: ["alberca", "gym", "sky_lounge", "spa", "salon_eventos", "sports_bar", "vitapista"],
        efficiency: ["Elevadores", "Suite de invitados", "Community Closet"],
        otherFeatures: ["Personal de Seguridad", "Video Vigilancia / CCTV", "Control de acceso vehicular"],
        value: "Lobby exclusivo para cada torre"
      },
      {
        title: "Departamento en Colonia Polanco",
        description: "Elegante departamento en la exclusiva zona de Polanco. Cerca de restaurantes, boutiques de lujo y el Bosque de Chapultepec.",
        price: "12500000",
        city: "CDMX",
        zone: "Polanco",
        developer: "PLATE",
        developmentName: "Colonia",
        developmentType: "Residencial y Comercial",
        address: "Av. Presidente Masaryk 350",
        bedrooms: 4,
        bathrooms: 3,
        area: "220",
        floor: 12,
        parking: 2,
        deliveryDate: "Diciembre 2024",
        status: "available",
        featured: false,
        images: [
          "https://images.unsplash.com/photo-1600047509358-9dc75507daeb?w=800",
          "https://images.unsplash.com/photo-1600566752229-250ed79470f8?w=800"
        ],
        amenities: ["alberca", "gym", "salon_culinario", "sala_visitas", "jardin_zen", "terraza"],
        efficiency: ["Elevadores", "Centros de lavado"],
        otherFeatures: ["Personal de Seguridad", "Video Vigilancia / CCTV", "Accesos independientes"],
        value: "Ubicación premium"
      },
      {
        title: "Departamento Compacto en Moca Verde",
        description: "Departamento ideal para inversión en el desarrollo Moca Verde. Excelente ubicación cerca de universidades y zonas comerciales.",
        price: "1950000",
        city: "Monterrey",
        zone: "San José Tec",
        developer: "Proyectos 9",
        developmentName: "Moca Verde",
        developmentType: "Uso mixto",
        address: "Av. Revolución 1500",
        bedrooms: 1,
        bathrooms: 1,
        area: "48",
        floor: 3,
        parking: 1,
        deliveryDate: "Julio 2024",
        status: "sold",
        featured: false,
        images: [
          "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800"
        ],
        amenities: ["gym", "coworking", "terraza", "asadores"],
        efficiency: ["Elevadores", "Shoot de basura"],
        otherFeatures: ["Video Vigilancia / CCTV"],
        value: null
      }
    ];

    sampleProperties.forEach((prop) => {
      const id = randomUUID();
      const property: Property = {
        ...prop,
        id,
        status: prop.status ?? "available",
        featured: prop.featured ?? false,
        parking: prop.parking ?? 0,
        floor: prop.floor ?? null,
        deliveryDate: prop.deliveryDate ?? null,
        efficiency: prop.efficiency ?? null,
        otherFeatures: prop.otherFeatures ?? null,
        value: prop.value ?? null,
        createdAt: new Date()
      };
      this.properties.set(id, property);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllProperties(): Promise<Property[]> {
    return Array.from(this.properties.values()).sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
    });
  }

  async getProperty(id: string): Promise<Property | undefined> {
    return this.properties.get(id);
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const id = randomUUID();
    const property: Property = {
      ...insertProperty,
      id,
      status: insertProperty.status ?? "available",
      featured: insertProperty.featured ?? false,
      parking: insertProperty.parking ?? 0,
      floor: insertProperty.floor ?? null,
      deliveryDate: insertProperty.deliveryDate ?? null,
      efficiency: insertProperty.efficiency ?? null,
      otherFeatures: insertProperty.otherFeatures ?? null,
      value: insertProperty.value ?? null,
      createdAt: new Date()
    };
    this.properties.set(id, property);
    return property;
  }

  async updateProperty(id: string, insertProperty: InsertProperty): Promise<Property | undefined> {
    const existing = this.properties.get(id);
    if (!existing) return undefined;

    const updated: Property = {
      ...insertProperty,
      id,
      status: insertProperty.status ?? "available",
      featured: insertProperty.featured ?? false,
      parking: insertProperty.parking ?? 0,
      floor: insertProperty.floor ?? null,
      deliveryDate: insertProperty.deliveryDate ?? null,
      efficiency: insertProperty.efficiency ?? null,
      otherFeatures: insertProperty.otherFeatures ?? null,
      value: insertProperty.value ?? null,
      createdAt: existing.createdAt
    };
    this.properties.set(id, updated);
    return updated;
  }

  async deleteProperty(id: string): Promise<boolean> {
    return this.properties.delete(id);
  }
}

export const storage = new MemStorage();
