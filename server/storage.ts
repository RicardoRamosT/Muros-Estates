import { 
  users, type User, type InsertUser,
  properties, type Property, type InsertProperty,
  clients, type Client, type InsertClient,
  sessions, type Session, type InsertSession,
  developmentAssignments, type DevelopmentAssignment, type InsertDevelopmentAssignment,
  clientFollowUps, type ClientFollowUp, type InsertClientFollowUp,
  typologies, type Typology, type InsertTypology,
  documents, type Document, type InsertDocument,
  developmentMedia, type DevelopmentMedia, type InsertDevelopmentMedia,
  developers, type Developer, type InsertDeveloper,
  developments, type Development, type InsertDevelopment,
  catalogCities, type CatalogCity, type InsertCatalogCity,
  catalogZones, type CatalogZone, type InsertCatalogZone,
  catalogDevelopmentTypes, type CatalogDevelopmentType, type InsertCatalogDevelopmentType,
  catalogAmenities, type CatalogAmenity, type InsertCatalogAmenity,
  catalogEfficiencyFeatures, type CatalogEfficiencyFeature, type InsertCatalogEfficiencyFeature,
  catalogOtherFeatures, type CatalogOtherFeature, type InsertCatalogOtherFeature
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ilike } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  
  // Sessions
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  deleteSession(id: string): Promise<boolean>;
  deleteExpiredSessions(): Promise<void>;
  
  // Properties
  getAllProperties(): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, property: InsertProperty): Promise<Property | undefined>;
  deleteProperty(id: string): Promise<boolean>;
  
  // Clients
  getAllClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;
  getClientsByAsesor(asesorId: string): Promise<Client[]>;
  
  // Development Assignments
  assignDevelopment(assignment: InsertDevelopmentAssignment): Promise<DevelopmentAssignment>;
  getAssignmentsByAsesor(asesorId: string): Promise<DevelopmentAssignment[]>;
  getAssignmentsByDevelopment(developmentId: string): Promise<DevelopmentAssignment[]>;
  deleteAssignment(id: string): Promise<boolean>;
  
  // Client Follow-ups
  createFollowUp(followUp: InsertClientFollowUp): Promise<ClientFollowUp>;
  getFollowUpsByClient(clientId: string): Promise<ClientFollowUp[]>;
  
  // Typologies
  getAllTypologies(): Promise<Typology[]>;
  getActiveTypologies(): Promise<Typology[]>;
  getTypology(id: string): Promise<Typology | undefined>;
  getTypologyByPropertyId(propertyId: string): Promise<Typology | undefined>;
  createTypology(typology: InsertTypology): Promise<Typology>;
  updateTypology(id: string, typology: Partial<InsertTypology>): Promise<Typology | undefined>;
  deleteTypology(id: string): Promise<boolean>;
  deleteTypologyByPropertyId(propertyId: string): Promise<boolean>;
  syncPropertiesToTypologies(): Promise<void>;
  
  // Documents
  getAllDocuments(): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsByCategory(category: string): Promise<Document[]>;
  getDocumentsByDeveloper(developerId: string): Promise<Document[]>;
  getDocumentsByDevelopment(developmentId: string): Promise<Document[]>;
  getDocumentsByClient(clientId: string): Promise<Document[]>;
  getDocumentsByAsesor(asesorId: string): Promise<Document[]>;
  searchDocuments(query: string): Promise<Document[]>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocument(id: string, doc: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: string): Promise<boolean>;
  
  // Development Media (Typology Media)
  getDevelopmentMedia(typologyId?: string): Promise<DevelopmentMedia[]>;
  createDevelopmentMedia(media: InsertDevelopmentMedia): Promise<DevelopmentMedia>;
  updateDevelopmentMedia(id: string, data: Partial<InsertDevelopmentMedia>): Promise<DevelopmentMedia | undefined>;
  deleteDevelopmentMedia(id: string): Promise<boolean>;
  
  // Developers (empresas desarrolladoras)
  getAllDevelopers(): Promise<Developer[]>;
  getDeveloper(id: string): Promise<Developer | undefined>;
  createDeveloper(developer: InsertDeveloper): Promise<Developer>;
  updateDeveloper(id: string, developer: Partial<InsertDeveloper>): Promise<Developer | undefined>;
  deleteDeveloper(id: string): Promise<boolean>;
  
  // Developments (proyectos/edificios)
  getAllDevelopmentsEntity(): Promise<Development[]>;
  getDevelopmentEntity(id: string): Promise<Development | undefined>;
  getDevelopmentsByDeveloper(developerId: string): Promise<Development[]>;
  createDevelopmentEntity(development: InsertDevelopment): Promise<Development>;
  updateDevelopmentEntity(id: string, development: Partial<InsertDevelopment>): Promise<Development | undefined>;
  deleteDevelopmentEntity(id: string): Promise<boolean>;
  
  // Catalogs
  getCatalogCities(): Promise<CatalogCity[]>;
  createCatalogCity(city: InsertCatalogCity): Promise<CatalogCity>;
  updateCatalogCity(id: string, city: Partial<InsertCatalogCity>): Promise<CatalogCity | undefined>;
  deleteCatalogCity(id: string): Promise<boolean>;
  
  getCatalogZones(cityId?: string): Promise<CatalogZone[]>;
  createCatalogZone(zone: InsertCatalogZone): Promise<CatalogZone>;
  updateCatalogZone(id: string, zone: Partial<InsertCatalogZone>): Promise<CatalogZone | undefined>;
  deleteCatalogZone(id: string): Promise<boolean>;
  
  getCatalogDevelopmentTypes(): Promise<CatalogDevelopmentType[]>;
  createCatalogDevelopmentType(type: InsertCatalogDevelopmentType): Promise<CatalogDevelopmentType>;
  updateCatalogDevelopmentType(id: string, type: Partial<InsertCatalogDevelopmentType>): Promise<CatalogDevelopmentType | undefined>;
  deleteCatalogDevelopmentType(id: string): Promise<boolean>;
  
  getCatalogAmenities(): Promise<CatalogAmenity[]>;
  createCatalogAmenity(amenity: InsertCatalogAmenity): Promise<CatalogAmenity>;
  updateCatalogAmenity(id: string, amenity: Partial<InsertCatalogAmenity>): Promise<CatalogAmenity | undefined>;
  deleteCatalogAmenity(id: string): Promise<boolean>;
  
  getCatalogEfficiencyFeatures(): Promise<CatalogEfficiencyFeature[]>;
  createCatalogEfficiencyFeature(feature: InsertCatalogEfficiencyFeature): Promise<CatalogEfficiencyFeature>;
  updateCatalogEfficiencyFeature(id: string, feature: Partial<InsertCatalogEfficiencyFeature>): Promise<CatalogEfficiencyFeature | undefined>;
  deleteCatalogEfficiencyFeature(id: string): Promise<boolean>;
  
  getCatalogOtherFeatures(): Promise<CatalogOtherFeature[]>;
  createCatalogOtherFeature(feature: InsertCatalogOtherFeature): Promise<CatalogOtherFeature>;
  updateCatalogOtherFeature(id: string, feature: Partial<InsertCatalogOtherFeature>): Promise<CatalogOtherFeature | undefined>;
  deleteCatalogOtherFeature(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser as any).returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(userData as any).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    await db.delete(users).where(eq(users.id, id));
    return true;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role));
  }

  // Sessions
  async createSession(session: InsertSession): Promise<Session> {
    const [newSession] = await db.insert(sessions).values(session).returning();
    return newSession;
  }

  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session || undefined;
  }

  async deleteSession(id: string): Promise<boolean> {
    const result = await db.delete(sessions).where(eq(sessions.id, id));
    return true;
  }

  async deleteExpiredSessions(): Promise<void> {
    await db.delete(sessions).where(eq(sessions.expiresAt, new Date()));
  }

  // Properties
  async getAllProperties(): Promise<Property[]> {
    return db.select().from(properties).orderBy(desc(properties.featured), desc(properties.createdAt));
  }

  async getProperty(id: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property || undefined;
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const [property] = await db.insert(properties).values({
      ...insertProperty,
      status: insertProperty.status ?? "available",
      featured: insertProperty.featured ?? false,
      parking: insertProperty.parking ?? 0,
      floor: insertProperty.floor ?? null,
      deliveryDate: insertProperty.deliveryDate ?? null,
      efficiency: insertProperty.efficiency ?? null,
      otherFeatures: insertProperty.otherFeatures ?? null,
      value: insertProperty.value ?? null,
    }).returning();
    return property;
  }

  async updateProperty(id: string, insertProperty: InsertProperty): Promise<Property | undefined> {
    const [property] = await db.update(properties).set({
      ...insertProperty,
      status: insertProperty.status ?? "available",
      featured: insertProperty.featured ?? false,
      parking: insertProperty.parking ?? 0,
      floor: insertProperty.floor ?? null,
      deliveryDate: insertProperty.deliveryDate ?? null,
      efficiency: insertProperty.efficiency ?? null,
      otherFeatures: insertProperty.otherFeatures ?? null,
      value: insertProperty.value ?? null,
    }).where(eq(properties.id, id)).returning();
    return property || undefined;
  }

  async deleteProperty(id: string): Promise<boolean> {
    await db.delete(properties).where(eq(properties.id, id));
    return true;
  }

  // Clients
  async getAllClients(): Promise<Client[]> {
    return db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: string, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const [client] = await db.update(clients).set({
      ...clientData,
      updatedAt: new Date(),
    }).where(eq(clients.id, id)).returning();
    return client || undefined;
  }

  async deleteClient(id: string): Promise<boolean> {
    await db.delete(clients).where(eq(clients.id, id));
    return true;
  }

  async getClientsByAsesor(asesorId: string): Promise<Client[]> {
    return db.select().from(clients).where(eq(clients.assignedTo, asesorId)).orderBy(desc(clients.createdAt));
  }

  // Development Assignments
  async assignDevelopment(assignment: InsertDevelopmentAssignment): Promise<DevelopmentAssignment> {
    const [newAssignment] = await db.insert(developmentAssignments).values(assignment).returning();
    return newAssignment;
  }

  async getAssignmentsByAsesor(asesorId: string): Promise<DevelopmentAssignment[]> {
    return db.select().from(developmentAssignments).where(eq(developmentAssignments.asesorId, asesorId));
  }

  async getAssignmentsByDevelopment(developmentId: string): Promise<DevelopmentAssignment[]> {
    return db.select().from(developmentAssignments).where(eq(developmentAssignments.developmentId, developmentId));
  }

  async deleteAssignment(id: string): Promise<boolean> {
    await db.delete(developmentAssignments).where(eq(developmentAssignments.id, id));
    return true;
  }

  // Client Follow-ups
  async createFollowUp(followUp: InsertClientFollowUp): Promise<ClientFollowUp> {
    const [newFollowUp] = await db.insert(clientFollowUps).values(followUp).returning();
    return newFollowUp;
  }

  async getFollowUpsByClient(clientId: string): Promise<ClientFollowUp[]> {
    return db.select().from(clientFollowUps).where(eq(clientFollowUps.clientId, clientId)).orderBy(desc(clientFollowUps.createdAt));
  }

  // Typologies
  async getAllTypologies(): Promise<Typology[]> {
    return db.select().from(typologies).orderBy(desc(typologies.createdAt));
  }

  async getActiveTypologies(): Promise<Typology[]> {
    return db.select().from(typologies).where(eq(typologies.active, true)).orderBy(desc(typologies.createdAt));
  }

  async getTypology(id: string): Promise<Typology | undefined> {
    const [typology] = await db.select().from(typologies).where(eq(typologies.id, id));
    return typology || undefined;
  }

  async createTypology(insertTypology: InsertTypology): Promise<Typology> {
    const [typology] = await db.insert(typologies).values(insertTypology as any).returning();
    return typology;
  }

  async updateTypology(id: string, typologyData: Partial<InsertTypology>): Promise<Typology | undefined> {
    const [typology] = await db.update(typologies).set({
      ...typologyData,
      updatedAt: new Date(),
    } as any).where(eq(typologies.id, id)).returning();
    return typology || undefined;
  }

  async deleteTypology(id: string): Promise<boolean> {
    await db.delete(typologies).where(eq(typologies.id, id));
    return true;
  }

  async getTypologyByPropertyId(propertyId: string): Promise<Typology | undefined> {
    const [typology] = await db.select().from(typologies).where(eq(typologies.propertyId, propertyId));
    return typology || undefined;
  }

  async deleteTypologyByPropertyId(propertyId: string): Promise<boolean> {
    await db.delete(typologies).where(eq(typologies.propertyId, propertyId));
    return true;
  }

  async syncPropertiesToTypologies(): Promise<void> {
    const allProperties = await this.getAllProperties();
    
    for (const property of allProperties) {
      const existingTypology = await this.getTypologyByPropertyId(property.id);
      
      const typologyData: InsertTypology = {
        propertyId: property.id,
        city: property.city,
        zone: property.zone,
        developer: property.developer,
        development: property.developmentName,
        type: null,
        level: property.floor || null,
        view: null,
        size: property.area,
        price: property.price,
        bedrooms: property.bedrooms ? parseInt(property.bedrooms) : null,
        bathrooms: property.bathrooms ? property.bathrooms : null,
        parkingSpots: property.parking || 1,
        deliveryDate: property.deliveryDate || null,
        downPaymentPercent: property.downPayment ? String(property.downPayment) : null,
      };
      
      if (existingTypology) {
        await this.updateTypology(existingTypology.id, typologyData);
      } else {
        await this.createTypology(typologyData);
      }
    }
    
    console.log(`Synced ${allProperties.length} properties to typologies`);
  }
  
  // Documents
  async getAllDocuments(): Promise<Document[]> {
    return db.select().from(documents).orderBy(desc(documents.createdAt));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc || undefined;
  }

  async getDocumentsByCategory(category: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.category, category)).orderBy(desc(documents.createdAt));
  }

  async getDocumentsByDeveloper(developerId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.developerId, developerId)).orderBy(desc(documents.createdAt));
  }

  async getDocumentsByDevelopment(developmentId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.developmentId, developmentId)).orderBy(desc(documents.createdAt));
  }

  async getDocumentsByClient(clientId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.clientId, clientId)).orderBy(desc(documents.createdAt));
  }

  async getDocumentsByAsesor(asesorId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.asesorId, asesorId)).orderBy(desc(documents.createdAt));
  }

  async searchDocuments(query: string): Promise<Document[]> {
    const searchTerm = `%${query}%`;
    return db.select().from(documents).where(
      or(
        ilike(documents.name, searchTerm),
        ilike(documents.originalName, searchTerm),
        ilike(documents.description, searchTerm)
      )
    ).orderBy(desc(documents.createdAt));
  }

  async createDocument(insertDoc: InsertDocument): Promise<Document> {
    const [doc] = await db.insert(documents).values(insertDoc as any).returning();
    return doc;
  }

  async updateDocument(id: string, docData: Partial<InsertDocument>): Promise<Document | undefined> {
    const [doc] = await db.update(documents).set({
      ...docData,
      updatedAt: new Date(),
    } as any).where(eq(documents.id, id)).returning();
    return doc || undefined;
  }

  async deleteDocument(id: string): Promise<boolean> {
    await db.delete(documents).where(eq(documents.id, id));
    return true;
  }

  // Development Media (Typology Media)
  async getDevelopmentMedia(typologyId?: string): Promise<DevelopmentMedia[]> {
    if (typologyId) {
      return db.select().from(developmentMedia)
        .where(eq(developmentMedia.typologyId, typologyId))
        .orderBy(developmentMedia.order);
    }
    return db.select().from(developmentMedia).orderBy(developmentMedia.order);
  }

  async createDevelopmentMedia(media: InsertDevelopmentMedia): Promise<DevelopmentMedia> {
    const [item] = await db.insert(developmentMedia).values(media as any).returning();
    return item;
  }

  async updateDevelopmentMedia(id: string, data: Partial<InsertDevelopmentMedia>): Promise<DevelopmentMedia | undefined> {
    const [item] = await db.update(developmentMedia).set(data as any).where(eq(developmentMedia.id, id)).returning();
    return item || undefined;
  }

  async deleteDevelopmentMedia(id: string): Promise<boolean> {
    await db.delete(developmentMedia).where(eq(developmentMedia.id, id));
    return true;
  }
  
  // Developers (empresas desarrolladoras)
  async getAllDevelopers(): Promise<Developer[]> {
    return db.select().from(developers).orderBy(developers.order, developers.name);
  }

  async getDeveloper(id: string): Promise<Developer | undefined> {
    const [dev] = await db.select().from(developers).where(eq(developers.id, id));
    return dev || undefined;
  }

  async createDeveloper(developer: InsertDeveloper): Promise<Developer> {
    const [dev] = await db.insert(developers).values(developer as any).returning();
    return dev;
  }

  async updateDeveloper(id: string, developer: Partial<InsertDeveloper>): Promise<Developer | undefined> {
    const [dev] = await db.update(developers).set({
      ...developer,
      updatedAt: new Date(),
    } as any).where(eq(developers.id, id)).returning();
    return dev || undefined;
  }

  async deleteDeveloper(id: string): Promise<boolean> {
    await db.delete(developers).where(eq(developers.id, id));
    return true;
  }
  
  // Developments (proyectos/edificios)
  async getAllDevelopmentsEntity(): Promise<Development[]> {
    return db.select().from(developments).orderBy(developments.order, developments.name);
  }

  async getDevelopmentEntity(id: string): Promise<Development | undefined> {
    const [dev] = await db.select().from(developments).where(eq(developments.id, id));
    return dev || undefined;
  }

  async getDevelopmentsByDeveloper(developerId: string): Promise<Development[]> {
    return db.select().from(developments).where(eq(developments.developerId, developerId)).orderBy(developments.order, developments.name);
  }

  async createDevelopmentEntity(development: InsertDevelopment): Promise<Development> {
    const [dev] = await db.insert(developments).values(development as any).returning();
    return dev;
  }

  async updateDevelopmentEntity(id: string, development: Partial<InsertDevelopment>): Promise<Development | undefined> {
    const [dev] = await db.update(developments).set({
      ...development,
      updatedAt: new Date(),
    } as any).where(eq(developments.id, id)).returning();
    return dev || undefined;
  }

  async deleteDevelopmentEntity(id: string): Promise<boolean> {
    await db.delete(developments).where(eq(developments.id, id));
    return true;
  }
  
  // Catalog Cities
  async getCatalogCities(): Promise<CatalogCity[]> {
    return db.select().from(catalogCities).orderBy(catalogCities.order, catalogCities.name);
  }

  async createCatalogCity(city: InsertCatalogCity): Promise<CatalogCity> {
    const [item] = await db.insert(catalogCities).values(city as any).returning();
    return item;
  }

  async updateCatalogCity(id: string, city: Partial<InsertCatalogCity>): Promise<CatalogCity | undefined> {
    const [item] = await db.update(catalogCities).set(city as any).where(eq(catalogCities.id, id)).returning();
    return item || undefined;
  }

  async deleteCatalogCity(id: string): Promise<boolean> {
    await db.delete(catalogCities).where(eq(catalogCities.id, id));
    return true;
  }
  
  // Catalog Zones
  async getCatalogZones(cityId?: string): Promise<CatalogZone[]> {
    if (cityId) {
      return db.select().from(catalogZones).where(eq(catalogZones.cityId, cityId)).orderBy(catalogZones.order, catalogZones.name);
    }
    return db.select().from(catalogZones).orderBy(catalogZones.order, catalogZones.name);
  }

  async createCatalogZone(zone: InsertCatalogZone): Promise<CatalogZone> {
    const [item] = await db.insert(catalogZones).values(zone as any).returning();
    return item;
  }

  async updateCatalogZone(id: string, zone: Partial<InsertCatalogZone>): Promise<CatalogZone | undefined> {
    const [item] = await db.update(catalogZones).set(zone as any).where(eq(catalogZones.id, id)).returning();
    return item || undefined;
  }

  async deleteCatalogZone(id: string): Promise<boolean> {
    await db.delete(catalogZones).where(eq(catalogZones.id, id));
    return true;
  }
  
  // Catalog Development Types
  async getCatalogDevelopmentTypes(): Promise<CatalogDevelopmentType[]> {
    return db.select().from(catalogDevelopmentTypes).orderBy(catalogDevelopmentTypes.order, catalogDevelopmentTypes.name);
  }

  async createCatalogDevelopmentType(type: InsertCatalogDevelopmentType): Promise<CatalogDevelopmentType> {
    const [item] = await db.insert(catalogDevelopmentTypes).values(type as any).returning();
    return item;
  }

  async updateCatalogDevelopmentType(id: string, type: Partial<InsertCatalogDevelopmentType>): Promise<CatalogDevelopmentType | undefined> {
    const [item] = await db.update(catalogDevelopmentTypes).set(type as any).where(eq(catalogDevelopmentTypes.id, id)).returning();
    return item || undefined;
  }

  async deleteCatalogDevelopmentType(id: string): Promise<boolean> {
    await db.delete(catalogDevelopmentTypes).where(eq(catalogDevelopmentTypes.id, id));
    return true;
  }
  
  // Catalog Amenities
  async getCatalogAmenities(): Promise<CatalogAmenity[]> {
    return db.select().from(catalogAmenities).orderBy(catalogAmenities.order, catalogAmenities.name);
  }

  async createCatalogAmenity(amenity: InsertCatalogAmenity): Promise<CatalogAmenity> {
    const [item] = await db.insert(catalogAmenities).values(amenity as any).returning();
    return item;
  }

  async updateCatalogAmenity(id: string, amenity: Partial<InsertCatalogAmenity>): Promise<CatalogAmenity | undefined> {
    const [item] = await db.update(catalogAmenities).set(amenity as any).where(eq(catalogAmenities.id, id)).returning();
    return item || undefined;
  }

  async deleteCatalogAmenity(id: string): Promise<boolean> {
    await db.delete(catalogAmenities).where(eq(catalogAmenities.id, id));
    return true;
  }
  
  // Catalog Efficiency Features
  async getCatalogEfficiencyFeatures(): Promise<CatalogEfficiencyFeature[]> {
    return db.select().from(catalogEfficiencyFeatures).orderBy(catalogEfficiencyFeatures.order, catalogEfficiencyFeatures.name);
  }

  async createCatalogEfficiencyFeature(feature: InsertCatalogEfficiencyFeature): Promise<CatalogEfficiencyFeature> {
    const [item] = await db.insert(catalogEfficiencyFeatures).values(feature as any).returning();
    return item;
  }

  async updateCatalogEfficiencyFeature(id: string, feature: Partial<InsertCatalogEfficiencyFeature>): Promise<CatalogEfficiencyFeature | undefined> {
    const [item] = await db.update(catalogEfficiencyFeatures).set(feature as any).where(eq(catalogEfficiencyFeatures.id, id)).returning();
    return item || undefined;
  }

  async deleteCatalogEfficiencyFeature(id: string): Promise<boolean> {
    await db.delete(catalogEfficiencyFeatures).where(eq(catalogEfficiencyFeatures.id, id));
    return true;
  }
  
  // Catalog Other Features
  async getCatalogOtherFeatures(): Promise<CatalogOtherFeature[]> {
    return db.select().from(catalogOtherFeatures).orderBy(catalogOtherFeatures.order, catalogOtherFeatures.name);
  }

  async createCatalogOtherFeature(feature: InsertCatalogOtherFeature): Promise<CatalogOtherFeature> {
    const [item] = await db.insert(catalogOtherFeatures).values(feature as any).returning();
    return item;
  }

  async updateCatalogOtherFeature(id: string, feature: Partial<InsertCatalogOtherFeature>): Promise<CatalogOtherFeature | undefined> {
    const [item] = await db.update(catalogOtherFeatures).set(feature as any).where(eq(catalogOtherFeatures.id, id)).returning();
    return item || undefined;
  }

  async deleteCatalogOtherFeature(id: string): Promise<boolean> {
    await db.delete(catalogOtherFeatures).where(eq(catalogOtherFeatures.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();
