import { 
  users, type User, type InsertUser,
  properties, type Property, type InsertProperty,
  clients, type Client, type InsertClient,
  sessions, type Session, type InsertSession,
  developmentAssignments, type DevelopmentAssignment, type InsertDevelopmentAssignment,
  clientFollowUps, type ClientFollowUp, type InsertClientFollowUp,
  typologies, type Typology, type InsertTypology,
  documents, type Document, type InsertDocument
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
}

export const storage = new DatabaseStorage();
