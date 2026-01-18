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
        title: "Departamento de Lujo en Valle Oriente",
        description: "Espectacular departamento de lujo con acabados premium en la exclusiva zona de Valle Oriente. Cuenta con amplios espacios, iluminación natural excepcional y una vista panorámica de la ciudad. Cocina integral equipada con electrodomésticos de alta gama, pisos de mármol importado y sistemas domóticos de última generación. El desarrollo cuenta con amenidades de primer nivel incluyendo alberca infinity, gimnasio equipado y área de coworking.",
        price: "8500000",
        location: "Valle Oriente",
        city: "San Pedro Garza García",
        state: "Nuevo León",
        address: "Av. Lázaro Cárdenas 2400",
        bedrooms: 3,
        bathrooms: 3,
        area: "185",
        yearBuilt: 2023,
        propertyType: "Departamento",
        status: "available",
        featured: true,
        images: [
          "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
          "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
          "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800"
        ],
        amenities: ["Estacionamiento", "Alberca", "Gimnasio", "Seguridad 24/7", "Elevador", "Terraza", "Smart Home"],
        developmentName: "Torres Valle Oriente",
        floor: 15,
        parking: 2
      },
      {
        title: "Penthouse con Vista al Parque Fundidora",
        description: "Extraordinario penthouse con doble altura y terraza privada con jacuzzi. Ubicado en el corazón de Monterrey con vistas espectaculares al Parque Fundidora y el Cerro de la Silla. Arquitectura contemporánea con materiales de primera calidad, cocina italiana y baños de diseño. Ideal para familias que buscan exclusividad y confort en el mejor punto de la ciudad.",
        price: "15000000",
        location: "Centro",
        city: "Monterrey",
        state: "Nuevo León",
        address: "Av. Constitución 1500",
        bedrooms: 4,
        bathrooms: 4,
        area: "320",
        yearBuilt: 2022,
        propertyType: "Penthouse",
        status: "available",
        featured: true,
        images: [
          "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
          "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
          "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800"
        ],
        amenities: ["Estacionamiento", "Alberca", "Gimnasio", "Seguridad 24/7", "Terraza", "Roof Garden", "Smart Home", "Cuarto de servicio"],
        developmentName: "Residencial Fundidora",
        floor: 25,
        parking: 3
      },
      {
        title: "Departamento Moderno en Santa Fe",
        description: "Moderno departamento en la zona más exclusiva de la Ciudad de México. Santa Fe ofrece la mejor calidad de vida con centros comerciales, restaurantes y oficinas corporativas a pasos de distancia. El departamento cuenta con diseño minimalista, acabados de lujo y excelente distribución de espacios.",
        price: "6200000",
        location: "Santa Fe",
        city: "Ciudad de México",
        state: "Ciudad de México",
        address: "Av. Santa Fe 440",
        bedrooms: 2,
        bathrooms: 2,
        area: "95",
        yearBuilt: 2024,
        propertyType: "Departamento",
        status: "available",
        featured: false,
        images: [
          "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800",
          "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800"
        ],
        amenities: ["Estacionamiento", "Gimnasio", "Seguridad 24/7", "Elevador", "Área de lavado"],
        developmentName: "Torres Santa Fe",
        floor: 8,
        parking: 1
      },
      {
        title: "Loft Industrial en Providencia",
        description: "Espectacular loft con diseño industrial en la zona más trendy de Guadalajara. Techos altos, ventanales de piso a techo y acabados en concreto aparente. Perfecto para profesionales creativos que buscan un espacio único y lleno de personalidad.",
        price: "3800000",
        location: "Providencia",
        city: "Guadalajara",
        state: "Jalisco",
        address: "Av. Providencia 2500",
        bedrooms: 1,
        bathrooms: 1,
        area: "75",
        yearBuilt: 2023,
        propertyType: "Loft",
        status: "available",
        featured: false,
        images: [
          "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=800",
          "https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800"
        ],
        amenities: ["Estacionamiento", "Seguridad 24/7", "Pet Friendly", "Terraza"],
        developmentName: "Lofts Providencia",
        floor: 3,
        parking: 1
      },
      {
        title: "Casa en Fraccionamiento Privado",
        description: "Hermosa casa en fraccionamiento privado con seguridad 24/7. Amplios jardines, alberca privada y áreas de entretenimiento. Ideal para familias grandes que buscan privacidad y seguridad en un ambiente residencial de primer nivel.",
        price: "12500000",
        location: "Contry",
        city: "Monterrey",
        state: "Nuevo León",
        address: "Calle del Valle 150",
        bedrooms: 5,
        bathrooms: 4,
        area: "450",
        yearBuilt: 2021,
        propertyType: "Casa",
        status: "reserved",
        featured: true,
        images: [
          "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800",
          "https://images.unsplash.com/photo-1600047508788-786f3865b4d9?w=800"
        ],
        amenities: ["Estacionamiento", "Alberca", "Seguridad 24/7", "Terraza", "Roof Garden", "Cuarto de servicio", "Bodega"],
        developmentName: null,
        floor: null,
        parking: 4
      },
      {
        title: "Studio en Zona Tec",
        description: "Studio moderno y funcional cerca del Tecnológico de Monterrey. Perfecto para estudiantes o jóvenes profesionales. Cuenta con cocina integrada, baño completo y espacio optimizado para máximo confort.",
        price: "1800000",
        location: "Tecnológico",
        city: "Monterrey",
        state: "Nuevo León",
        address: "Av. Eugenio Garza Sada 2501",
        bedrooms: 1,
        bathrooms: 1,
        area: "45",
        yearBuilt: 2023,
        propertyType: "Studio",
        status: "available",
        featured: false,
        images: [
          "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800"
        ],
        amenities: ["Estacionamiento", "Gimnasio", "Seguridad 24/7", "Área de lavado"],
        developmentName: "Residencial TEC",
        floor: 5,
        parking: 1
      },
      {
        title: "Departamento Familiar en Polanco",
        description: "Amplio departamento familiar en la exclusiva zona de Polanco. Cerca de restaurantes, boutiques y parques. Acabados de lujo, amplia iluminación natural y distribución ideal para familias.",
        price: "9800000",
        location: "Polanco",
        city: "Ciudad de México",
        state: "Ciudad de México",
        address: "Av. Presidente Masaryk 350",
        bedrooms: 3,
        bathrooms: 2,
        area: "160",
        yearBuilt: 2022,
        propertyType: "Departamento",
        status: "available",
        featured: false,
        images: [
          "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800",
          "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800"
        ],
        amenities: ["Estacionamiento", "Gimnasio", "Seguridad 24/7", "Elevador", "Balcón", "Área de lavado"],
        developmentName: "Torres Polanco",
        floor: 12,
        parking: 2
      },
      {
        title: "Duplex en Juriquilla",
        description: "Moderno duplex en el desarrollo más exclusivo de Querétaro. Amplios espacios, jardín privado y acceso a amenidades de clase mundial. Excelente opción de inversión en una de las zonas de mayor plusvalía del país.",
        price: "5500000",
        location: "Juriquilla",
        city: "Querétaro",
        state: "Querétaro",
        address: "Blvd. Juriquilla 1200",
        bedrooms: 3,
        bathrooms: 3,
        area: "180",
        yearBuilt: 2024,
        propertyType: "Duplex",
        status: "available",
        featured: false,
        images: [
          "https://images.unsplash.com/photo-1600047509358-9dc75507daeb?w=800",
          "https://images.unsplash.com/photo-1600566752229-250ed79470f8?w=800"
        ],
        amenities: ["Estacionamiento", "Alberca", "Gimnasio", "Seguridad 24/7", "Pet Friendly", "Área de lavado", "Bodega"],
        developmentName: "Residencial Juriquilla",
        floor: null,
        parking: 2
      }
    ];

    sampleProperties.forEach((prop) => {
      const id = randomUUID();
      const property: Property = {
        ...prop,
        id,
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
