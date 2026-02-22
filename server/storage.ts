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
  catalogOtherFeatures, type CatalogOtherFeature, type InsertCatalogOtherFeature,
  catalogAcabados, type CatalogAcabado, type InsertCatalogAcabado,
  catalogVistas, type CatalogVista, type InsertCatalogVista,
  catalogAreas, type CatalogArea, type InsertCatalogArea,
  catalogTipologias, type CatalogTipologia, type InsertCatalogTipologia,
  sharedLinks, type SharedLink, type InsertSharedLink,
  rolePermissions, type RolePermission,
  // New property catalogs
  catalogNiveles, type CatalogNivel, type InsertCatalogNivel,
  catalogTorres, type CatalogTorre, type InsertCatalogTorre,
  catalogRecamaras, type CatalogRecamara, type InsertCatalogRecamara,
  catalogBanos, type CatalogBano, type InsertCatalogBano,
  catalogCajones, type CatalogCajon, type InsertCatalogCajon,
  catalogNivelMantenimiento, type CatalogNivelMantenimiento, type InsertCatalogNivelMantenimiento,
  // New prospect catalogs
  catalogTipoCliente, type CatalogTipoCliente, type InsertCatalogTipoCliente,
  catalogPerfil, type CatalogPerfil, type InsertCatalogPerfil,
  catalogFuente, type CatalogFuente, type InsertCatalogFuente,
  catalogStatusProspecto, type CatalogStatusProspecto, type InsertCatalogStatusProspecto,
  catalogEtapaEmbudo, type CatalogEtapaEmbudo, type InsertCatalogEtapaEmbudo,
  catalogEtapaClientes, type CatalogEtapaClientes, type InsertCatalogEtapaClientes,
  catalogComoPaga, type CatalogComoPaga, type InsertCatalogComoPaga,
  catalogPositivos, type CatalogPositivo, type InsertCatalogPositivo,
  catalogNegativos, type CatalogNegativo, type InsertCatalogNegativo,
  catalogAsesor, type CatalogAsesor, type InsertCatalogAsesor,
  catalogBrokerExterno, type CatalogBrokerExterno, type InsertCatalogBrokerExterno,
  catalogTipoContrato, type CatalogTipoContrato, type InsertCatalogTipoContrato,
  catalogCesionDerechos, type CatalogCesionDerechos, type InsertCatalogCesionDerechos,
  catalogPresentacion, type CatalogPresentacion, type InsertCatalogPresentacion,
  catalogTipoProveedor, type CatalogTipoProveedor, type InsertCatalogTipoProveedor,
  catalogIncluye, type CatalogIncluye, type InsertCatalogIncluye,
  catalogSiNo, type CatalogSiNo, type InsertCatalogSiNo,
  globalSettings, type GlobalSetting,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, ilike } from "drizzle-orm";

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
  clearTypologyFieldByValue(field: "developer" | "development", value: string): Promise<void>;
  
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
  
  getCatalogAcabados(): Promise<CatalogAcabado[]>;
  createCatalogAcabado(acabado: InsertCatalogAcabado): Promise<CatalogAcabado>;
  updateCatalogAcabado(id: string, acabado: Partial<InsertCatalogAcabado>): Promise<CatalogAcabado | undefined>;
  deleteCatalogAcabado(id: string): Promise<boolean>;
  
  getCatalogVistas(): Promise<CatalogVista[]>;
  createCatalogVista(vista: InsertCatalogVista): Promise<CatalogVista>;
  updateCatalogVista(id: string, vista: Partial<InsertCatalogVista>): Promise<CatalogVista | undefined>;
  deleteCatalogVista(id: string): Promise<boolean>;
  
  getCatalogAreas(): Promise<CatalogArea[]>;
  createCatalogArea(area: InsertCatalogArea): Promise<CatalogArea>;
  updateCatalogArea(id: string, area: Partial<InsertCatalogArea>): Promise<CatalogArea | undefined>;
  deleteCatalogArea(id: string): Promise<boolean>;
  
  getCatalogTipologias(developmentId?: string): Promise<CatalogTipologia[]>;
  createCatalogTipologia(tipologia: InsertCatalogTipologia): Promise<CatalogTipologia>;
  updateCatalogTipologia(id: string, tipologia: Partial<InsertCatalogTipologia>): Promise<CatalogTipologia | undefined>;
  deleteCatalogTipologia(id: string): Promise<boolean>;
  
  // Shared Links
  getSharedLink(id: string): Promise<SharedLink | undefined>;
  getSharedLinkByToken(token: string): Promise<SharedLink | undefined>;
  getAllSharedLinks(): Promise<SharedLink[]>;
  createSharedLink(link: InsertSharedLink): Promise<SharedLink>;
  updateSharedLink(id: string, link: Partial<InsertSharedLink>): Promise<SharedLink | undefined>;
  deleteSharedLink(id: string): Promise<boolean>;
  incrementSharedLinkAccess(id: string): Promise<SharedLink | undefined>;
  
  // Additional document queries
  getDocumentsByTypology(typologyId: string): Promise<Document[]>;
  getDocumentsBySection(rootCategory: string, section: string): Promise<Document[]>;
  
  // Role Permissions
  getRolePermissions(): Promise<RolePermission[]>;
  getRolePermissionsBySection(section: string): Promise<RolePermission[]>;
  upsertRolePermission(section: string, field: string, role: string, permissionLevel: string): Promise<RolePermission>;
  deleteRolePermission(id: string): Promise<boolean>;
  
  getCatalogTipoContrato(): Promise<CatalogTipoContrato[]>;
  createCatalogTipoContrato(item: InsertCatalogTipoContrato): Promise<CatalogTipoContrato>;
  updateCatalogTipoContrato(id: string, item: Partial<InsertCatalogTipoContrato>): Promise<CatalogTipoContrato | undefined>;
  deleteCatalogTipoContrato(id: string): Promise<boolean>;
  
  getCatalogCesionDerechos(): Promise<CatalogCesionDerechos[]>;
  createCatalogCesionDerechos(item: InsertCatalogCesionDerechos): Promise<CatalogCesionDerechos>;
  updateCatalogCesionDerechos(id: string, item: Partial<InsertCatalogCesionDerechos>): Promise<CatalogCesionDerechos | undefined>;
  deleteCatalogCesionDerechos(id: string): Promise<boolean>;
  
  getCatalogPresentacion(): Promise<CatalogPresentacion[]>;
  createCatalogPresentacion(item: InsertCatalogPresentacion): Promise<CatalogPresentacion>;
  updateCatalogPresentacion(id: string, item: Partial<InsertCatalogPresentacion>): Promise<CatalogPresentacion | undefined>;
  deleteCatalogPresentacion(id: string): Promise<boolean>;

  getCatalogTipoProveedor(): Promise<CatalogTipoProveedor[]>;
  createCatalogTipoProveedor(item: InsertCatalogTipoProveedor): Promise<CatalogTipoProveedor>;
  updateCatalogTipoProveedor(id: string, item: Partial<InsertCatalogTipoProveedor>): Promise<CatalogTipoProveedor | undefined>;
  deleteCatalogTipoProveedor(id: string): Promise<boolean>;

  getCatalogIncluye(): Promise<CatalogIncluye[]>;
  createCatalogIncluye(item: InsertCatalogIncluye): Promise<CatalogIncluye>;
  updateCatalogIncluye(id: string, item: Partial<InsertCatalogIncluye>): Promise<CatalogIncluye | undefined>;
  deleteCatalogIncluye(id: string): Promise<boolean>;

  getCatalogSiNo(): Promise<CatalogSiNo[]>;
  createCatalogSiNo(item: InsertCatalogSiNo): Promise<CatalogSiNo>;
  updateCatalogSiNo(id: string, item: Partial<InsertCatalogSiNo>): Promise<CatalogSiNo | undefined>;
  deleteCatalogSiNo(id: string): Promise<boolean>;

  getGlobalSettings(): Promise<GlobalSetting[]>;
  getGlobalSetting(key: string): Promise<GlobalSetting | undefined>;
  upsertGlobalSetting(key: string, value: string, label?: string): Promise<GlobalSetting>;
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
    const updateData: any = {
      ...clientData,
      updatedAt: new Date(),
    };
    
    // When embudo changes to "Separado", convert prospect to client
    if (clientData.embudo === "Separado") {
      updateData.isClient = true;
      updateData.convertedAt = new Date();
    }
    
    const [client] = await db.update(clients).set(updateData).where(eq(clients.id, id)).returning();
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
      
      // Property-derived fields that should be synced from properties
      const propertyDerivedData = {
        propertyId: property.id,
        city: property.city,
        zone: property.zone,
        developer: property.developer,
        development: property.developmentName,
        level: property.floor || null,
        size: property.area,
        price: property.price,
        bedrooms: property.bedrooms ? parseInt(property.bedrooms) : null,
        bathrooms: property.bathrooms ? property.bathrooms : null,
        parkingSpots: property.parking || 1,
        deliveryDate: property.deliveryDate || null,
        downPaymentPercent: property.downPayment ? String(property.downPayment) : null,
      };
      
      if (existingTypology) {
        // Update property-derived fields but preserve user-edited fields (type, view, areas, areas2)
        // These user-editable fields are NOT included in propertyDerivedData, so they won't be overwritten
        await this.updateTypology(existingTypology.id, propertyDerivedData);
      } else {
        // For new typologies, set defaults for user-editable fields
        await this.createTypology({ ...propertyDerivedData, type: null, view: null, areas: null, areas2: null });
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
    return db.select().from(documents).where(eq(documents.rootCategory, category)).orderBy(desc(documents.createdAt));
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
    return db.select().from(documents).where(eq(documents.uploadedBy, asesorId)).orderBy(desc(documents.createdAt));
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

  async clearTypologyFieldByValue(field: "developer" | "development", value: string): Promise<void> {
    await db.update(typologies)
      .set({ [field]: null } as any)
      .where(eq(typologies[field], value));
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
  
  // Catalog Acabados
  async getCatalogAcabados(): Promise<CatalogAcabado[]> {
    return db.select().from(catalogAcabados).orderBy(catalogAcabados.order, catalogAcabados.name);
  }

  async createCatalogAcabado(acabado: InsertCatalogAcabado): Promise<CatalogAcabado> {
    const [item] = await db.insert(catalogAcabados).values(acabado as any).returning();
    return item;
  }

  async updateCatalogAcabado(id: string, acabado: Partial<InsertCatalogAcabado>): Promise<CatalogAcabado | undefined> {
    const [item] = await db.update(catalogAcabados).set(acabado as any).where(eq(catalogAcabados.id, id)).returning();
    return item || undefined;
  }

  async deleteCatalogAcabado(id: string): Promise<boolean> {
    await db.delete(catalogAcabados).where(eq(catalogAcabados.id, id));
    return true;
  }
  
  // Vistas catalog
  async getCatalogVistas(): Promise<CatalogVista[]> {
    return db.select().from(catalogVistas).orderBy(catalogVistas.sortOrder, catalogVistas.name);
  }

  async createCatalogVista(vista: InsertCatalogVista): Promise<CatalogVista> {
    const [item] = await db.insert(catalogVistas).values(vista as any).returning();
    return item;
  }

  async updateCatalogVista(id: string, vista: Partial<InsertCatalogVista>): Promise<CatalogVista | undefined> {
    const [item] = await db.update(catalogVistas).set(vista as any).where(eq(catalogVistas.id, id)).returning();
    return item || undefined;
  }

  async deleteCatalogVista(id: string): Promise<boolean> {
    await db.delete(catalogVistas).where(eq(catalogVistas.id, id));
    return true;
  }

  // Areas catalog
  async getCatalogAreas(): Promise<CatalogArea[]> {
    return db.select().from(catalogAreas).orderBy(catalogAreas.sortOrder, catalogAreas.name);
  }

  async createCatalogArea(area: InsertCatalogArea): Promise<CatalogArea> {
    const [item] = await db.insert(catalogAreas).values(area as any).returning();
    return item;
  }

  async updateCatalogArea(id: string, area: Partial<InsertCatalogArea>): Promise<CatalogArea | undefined> {
    const [item] = await db.update(catalogAreas).set(area as any).where(eq(catalogAreas.id, id)).returning();
    return item || undefined;
  }

  async deleteCatalogArea(id: string): Promise<boolean> {
    await db.delete(catalogAreas).where(eq(catalogAreas.id, id));
    return true;
  }

  // Tipologias catalog
  async getCatalogTipologias(developmentId?: string): Promise<CatalogTipologia[]> {
    if (developmentId) {
      return db.select().from(catalogTipologias).where(eq(catalogTipologias.developmentId, developmentId)).orderBy(catalogTipologias.sortOrder, catalogTipologias.name);
    }
    return db.select().from(catalogTipologias).orderBy(catalogTipologias.sortOrder, catalogTipologias.name);
  }

  async createCatalogTipologia(tipologia: InsertCatalogTipologia): Promise<CatalogTipologia> {
    const [item] = await db.insert(catalogTipologias).values(tipologia as any).returning();
    return item;
  }

  async updateCatalogTipologia(id: string, tipologia: Partial<InsertCatalogTipologia>): Promise<CatalogTipologia | undefined> {
    const [item] = await db.update(catalogTipologias).set(tipologia as any).where(eq(catalogTipologias.id, id)).returning();
    return item || undefined;
  }

  async deleteCatalogTipologia(id: string): Promise<boolean> {
    await db.delete(catalogTipologias).where(eq(catalogTipologias.id, id));
    return true;
  }
  
  // Shared Links
  async getSharedLink(id: string): Promise<SharedLink | undefined> {
    const [link] = await db.select().from(sharedLinks).where(eq(sharedLinks.id, id));
    return link || undefined;
  }
  
  async getSharedLinkByToken(token: string): Promise<SharedLink | undefined> {
    const [link] = await db.select().from(sharedLinks).where(eq(sharedLinks.token, token));
    return link || undefined;
  }
  
  async getAllSharedLinks(): Promise<SharedLink[]> {
    return db.select().from(sharedLinks).orderBy(desc(sharedLinks.createdAt));
  }
  
  async createSharedLink(link: InsertSharedLink): Promise<SharedLink> {
    const [newLink] = await db.insert(sharedLinks).values(link as any).returning();
    return newLink;
  }
  
  async updateSharedLink(id: string, link: Partial<InsertSharedLink>): Promise<SharedLink | undefined> {
    const [updated] = await db.update(sharedLinks).set(link as any).where(eq(sharedLinks.id, id)).returning();
    return updated || undefined;
  }
  
  async deleteSharedLink(id: string): Promise<boolean> {
    await db.delete(sharedLinks).where(eq(sharedLinks.id, id));
    return true;
  }
  
  async incrementSharedLinkAccess(id: string): Promise<SharedLink | undefined> {
    const link = await this.getSharedLink(id);
    if (!link) return undefined;
    
    const [updated] = await db.update(sharedLinks).set({
      accessCount: (link.accessCount || 0) + 1,
      lastAccessedAt: new Date(),
    }).where(eq(sharedLinks.id, id)).returning();
    return updated || undefined;
  }
  
  // Additional document queries
  async getDocumentsByTypology(typologyId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.typologyId, typologyId)).orderBy(asc(documents.sortOrder), desc(documents.createdAt));
  }
  
  async getDocumentsBySection(rootCategory: string, section: string): Promise<Document[]> {
    return db.select().from(documents).where(
      and(
        eq(documents.rootCategory, rootCategory),
        eq(documents.section, section)
      )
    ).orderBy(desc(documents.createdAt));
  }
  
  // Role Permissions
  async getRolePermissions(): Promise<RolePermission[]> {
    return db.select().from(rolePermissions);
  }
  
  async getRolePermissionsBySection(section: string): Promise<RolePermission[]> {
    return db.select().from(rolePermissions).where(eq(rolePermissions.section, section));
  }
  
  async upsertRolePermission(section: string, field: string, role: string, permissionLevel: string): Promise<RolePermission> {
    const existing = await db.select().from(rolePermissions).where(
      and(
        eq(rolePermissions.section, section),
        eq(rolePermissions.field, field),
        eq(rolePermissions.role, role)
      )
    );
    
    if (existing.length > 0) {
      const [updated] = await db.update(rolePermissions).set({
        permissionLevel,
        updatedAt: new Date(),
      }).where(eq(rolePermissions.id, existing[0].id)).returning();
      return updated;
    } else {
      const [created] = await db.insert(rolePermissions).values({
        section,
        field,
        role,
        permissionLevel,
      }).returning();
      return created;
    }
  }
  
  async deleteRolePermission(id: string): Promise<boolean> {
    const result = await db.delete(rolePermissions).where(eq(rolePermissions.id, id));
    return true;
  }
  
  // ============ NEW PROPERTY CATALOGS ============
  
  // Catalog Niveles (floor levels)
  async getCatalogNiveles(): Promise<CatalogNivel[]> {
    return db.select().from(catalogNiveles).orderBy(catalogNiveles.order, catalogNiveles.name);
  }
  async createCatalogNivel(item: InsertCatalogNivel): Promise<CatalogNivel> {
    const [created] = await db.insert(catalogNiveles).values(item as any).returning();
    return created;
  }
  async updateCatalogNivel(id: string, item: Partial<InsertCatalogNivel>): Promise<CatalogNivel | undefined> {
    const [updated] = await db.update(catalogNiveles).set(item as any).where(eq(catalogNiveles.id, id)).returning();
    return updated || undefined;
  }
  async deleteCatalogNivel(id: string): Promise<boolean> {
    await db.delete(catalogNiveles).where(eq(catalogNiveles.id, id));
    return true;
  }
  
  // Catalog Torres (towers)
  async getCatalogTorres(): Promise<CatalogTorre[]> {
    return db.select().from(catalogTorres).orderBy(catalogTorres.order, catalogTorres.name);
  }
  async createCatalogTorre(item: InsertCatalogTorre): Promise<CatalogTorre> {
    const [created] = await db.insert(catalogTorres).values(item as any).returning();
    return created;
  }
  async updateCatalogTorre(id: string, item: Partial<InsertCatalogTorre>): Promise<CatalogTorre | undefined> {
    const [updated] = await db.update(catalogTorres).set(item as any).where(eq(catalogTorres.id, id)).returning();
    return updated || undefined;
  }
  async deleteCatalogTorre(id: string): Promise<boolean> {
    await db.delete(catalogTorres).where(eq(catalogTorres.id, id));
    return true;
  }
  
  // Catalog Recámaras (bedrooms)
  async getCatalogRecamaras(): Promise<CatalogRecamara[]> {
    return db.select().from(catalogRecamaras).orderBy(catalogRecamaras.order, catalogRecamaras.name);
  }
  async createCatalogRecamara(item: InsertCatalogRecamara): Promise<CatalogRecamara> {
    const [created] = await db.insert(catalogRecamaras).values(item as any).returning();
    return created;
  }
  async updateCatalogRecamara(id: string, item: Partial<InsertCatalogRecamara>): Promise<CatalogRecamara | undefined> {
    const [updated] = await db.update(catalogRecamaras).set(item as any).where(eq(catalogRecamaras.id, id)).returning();
    return updated || undefined;
  }
  async deleteCatalogRecamara(id: string): Promise<boolean> {
    await db.delete(catalogRecamaras).where(eq(catalogRecamaras.id, id));
    return true;
  }
  
  // Catalog Baños (bathrooms)
  async getCatalogBanos(): Promise<CatalogBano[]> {
    return db.select().from(catalogBanos).orderBy(catalogBanos.order, catalogBanos.name);
  }
  async createCatalogBano(item: InsertCatalogBano): Promise<CatalogBano> {
    const [created] = await db.insert(catalogBanos).values(item as any).returning();
    return created;
  }
  async updateCatalogBano(id: string, item: Partial<InsertCatalogBano>): Promise<CatalogBano | undefined> {
    const [updated] = await db.update(catalogBanos).set(item as any).where(eq(catalogBanos.id, id)).returning();
    return updated || undefined;
  }
  async deleteCatalogBano(id: string): Promise<boolean> {
    await db.delete(catalogBanos).where(eq(catalogBanos.id, id));
    return true;
  }
  
  // Catalog Cajones (parking)
  async getCatalogCajones(): Promise<CatalogCajon[]> {
    return db.select().from(catalogCajones).orderBy(catalogCajones.order, catalogCajones.name);
  }
  async createCatalogCajon(item: InsertCatalogCajon): Promise<CatalogCajon> {
    const [created] = await db.insert(catalogCajones).values(item as any).returning();
    return created;
  }
  async updateCatalogCajon(id: string, item: Partial<InsertCatalogCajon>): Promise<CatalogCajon | undefined> {
    const [updated] = await db.update(catalogCajones).set(item as any).where(eq(catalogCajones.id, id)).returning();
    return updated || undefined;
  }
  async deleteCatalogCajon(id: string): Promise<boolean> {
    await db.delete(catalogCajones).where(eq(catalogCajones.id, id));
    return true;
  }
  
  // Catalog Nivel Mantenimiento
  async getCatalogNivelMantenimiento(): Promise<CatalogNivelMantenimiento[]> {
    return db.select().from(catalogNivelMantenimiento).orderBy(catalogNivelMantenimiento.order, catalogNivelMantenimiento.name);
  }
  async createCatalogNivelMantenimiento(item: InsertCatalogNivelMantenimiento): Promise<CatalogNivelMantenimiento> {
    const [created] = await db.insert(catalogNivelMantenimiento).values(item as any).returning();
    return created;
  }
  async updateCatalogNivelMantenimiento(id: string, item: Partial<InsertCatalogNivelMantenimiento>): Promise<CatalogNivelMantenimiento | undefined> {
    const [updated] = await db.update(catalogNivelMantenimiento).set(item as any).where(eq(catalogNivelMantenimiento.id, id)).returning();
    return updated || undefined;
  }
  async deleteCatalogNivelMantenimiento(id: string): Promise<boolean> {
    await db.delete(catalogNivelMantenimiento).where(eq(catalogNivelMantenimiento.id, id));
    return true;
  }
  
  // ============ NEW PROSPECT CATALOGS ============
  
  // Catalog Tipo Cliente
  async getCatalogTipoCliente(): Promise<CatalogTipoCliente[]> {
    return db.select().from(catalogTipoCliente).orderBy(catalogTipoCliente.order, catalogTipoCliente.name);
  }
  async createCatalogTipoCliente(item: InsertCatalogTipoCliente): Promise<CatalogTipoCliente> {
    const [created] = await db.insert(catalogTipoCliente).values(item as any).returning();
    return created;
  }
  async updateCatalogTipoCliente(id: string, item: Partial<InsertCatalogTipoCliente>): Promise<CatalogTipoCliente | undefined> {
    const [updated] = await db.update(catalogTipoCliente).set(item as any).where(eq(catalogTipoCliente.id, id)).returning();
    return updated || undefined;
  }
  async deleteCatalogTipoCliente(id: string): Promise<boolean> {
    await db.delete(catalogTipoCliente).where(eq(catalogTipoCliente.id, id));
    return true;
  }
  
  // Catalog Perfil
  async getCatalogPerfil(): Promise<CatalogPerfil[]> {
    return db.select().from(catalogPerfil).orderBy(catalogPerfil.order, catalogPerfil.name);
  }
  async createCatalogPerfil(item: InsertCatalogPerfil): Promise<CatalogPerfil> {
    const [created] = await db.insert(catalogPerfil).values(item as any).returning();
    return created;
  }
  async updateCatalogPerfil(id: string, item: Partial<InsertCatalogPerfil>): Promise<CatalogPerfil | undefined> {
    const [updated] = await db.update(catalogPerfil).set(item as any).where(eq(catalogPerfil.id, id)).returning();
    return updated || undefined;
  }
  async deleteCatalogPerfil(id: string): Promise<boolean> {
    await db.delete(catalogPerfil).where(eq(catalogPerfil.id, id));
    return true;
  }
  
  // Catalog Fuente
  async getCatalogFuente(): Promise<CatalogFuente[]> {
    return db.select().from(catalogFuente).orderBy(catalogFuente.order, catalogFuente.name);
  }
  async createCatalogFuente(item: InsertCatalogFuente): Promise<CatalogFuente> {
    const [created] = await db.insert(catalogFuente).values(item as any).returning();
    return created;
  }
  async updateCatalogFuente(id: string, item: Partial<InsertCatalogFuente>): Promise<CatalogFuente | undefined> {
    const [updated] = await db.update(catalogFuente).set(item as any).where(eq(catalogFuente.id, id)).returning();
    return updated || undefined;
  }
  async deleteCatalogFuente(id: string): Promise<boolean> {
    await db.delete(catalogFuente).where(eq(catalogFuente.id, id));
    return true;
  }
  
  // Catalog Status Prospecto
  async getCatalogStatusProspecto(): Promise<CatalogStatusProspecto[]> {
    return db.select().from(catalogStatusProspecto).orderBy(catalogStatusProspecto.order, catalogStatusProspecto.name);
  }
  async createCatalogStatusProspecto(item: InsertCatalogStatusProspecto): Promise<CatalogStatusProspecto> {
    const [created] = await db.insert(catalogStatusProspecto).values(item as any).returning();
    return created;
  }
  async updateCatalogStatusProspecto(id: string, item: Partial<InsertCatalogStatusProspecto>): Promise<CatalogStatusProspecto | undefined> {
    const [updated] = await db.update(catalogStatusProspecto).set(item as any).where(eq(catalogStatusProspecto.id, id)).returning();
    return updated || undefined;
  }
  async deleteCatalogStatusProspecto(id: string): Promise<boolean> {
    await db.delete(catalogStatusProspecto).where(eq(catalogStatusProspecto.id, id));
    return true;
  }
  
  // Catalog Etapa Embudo
  async getCatalogEtapaEmbudo(): Promise<CatalogEtapaEmbudo[]> {
    return db.select().from(catalogEtapaEmbudo).orderBy(catalogEtapaEmbudo.order, catalogEtapaEmbudo.name);
  }
  async createCatalogEtapaEmbudo(item: InsertCatalogEtapaEmbudo): Promise<CatalogEtapaEmbudo> {
    const [created] = await db.insert(catalogEtapaEmbudo).values(item as any).returning();
    return created;
  }
  async updateCatalogEtapaEmbudo(id: string, item: Partial<InsertCatalogEtapaEmbudo>): Promise<CatalogEtapaEmbudo | undefined> {
    const [updated] = await db.update(catalogEtapaEmbudo).set(item as any).where(eq(catalogEtapaEmbudo.id, id)).returning();
    return updated || undefined;
  }
  async deleteCatalogEtapaEmbudo(id: string): Promise<boolean> {
    await db.delete(catalogEtapaEmbudo).where(eq(catalogEtapaEmbudo.id, id));
    return true;
  }

  // Catalog Etapa Clientes
  async getCatalogEtapaClientes(): Promise<CatalogEtapaClientes[]> {
    return db.select().from(catalogEtapaClientes).orderBy(catalogEtapaClientes.order, catalogEtapaClientes.name);
  }
  async createCatalogEtapaClientes(item: InsertCatalogEtapaClientes): Promise<CatalogEtapaClientes> {
    const [created] = await db.insert(catalogEtapaClientes).values(item as any).returning();
    return created;
  }
  async updateCatalogEtapaClientes(id: string, item: Partial<InsertCatalogEtapaClientes>): Promise<CatalogEtapaClientes | undefined> {
    const [updated] = await db.update(catalogEtapaClientes).set(item as any).where(eq(catalogEtapaClientes.id, id)).returning();
    return updated;
  }
  async deleteCatalogEtapaClientes(id: string): Promise<boolean> {
    await db.delete(catalogEtapaClientes).where(eq(catalogEtapaClientes.id, id));
    return true;
  }
  
  // Catalog Como Paga
  async getCatalogComoPaga(): Promise<CatalogComoPaga[]> {
    return db.select().from(catalogComoPaga).orderBy(catalogComoPaga.order, catalogComoPaga.name);
  }
  async createCatalogComoPaga(item: InsertCatalogComoPaga): Promise<CatalogComoPaga> {
    const [created] = await db.insert(catalogComoPaga).values(item as any).returning();
    return created;
  }
  async updateCatalogComoPaga(id: string, item: Partial<InsertCatalogComoPaga>): Promise<CatalogComoPaga | undefined> {
    const [updated] = await db.update(catalogComoPaga).set(item as any).where(eq(catalogComoPaga.id, id)).returning();
    return updated || undefined;
  }
  async deleteCatalogComoPaga(id: string): Promise<boolean> {
    await db.delete(catalogComoPaga).where(eq(catalogComoPaga.id, id));
    return true;
  }
  
  // Catalog Positivos
  async getCatalogPositivos(): Promise<CatalogPositivo[]> {
    return db.select().from(catalogPositivos).orderBy(catalogPositivos.order, catalogPositivos.name);
  }
  async createCatalogPositivo(item: InsertCatalogPositivo): Promise<CatalogPositivo> {
    const [created] = await db.insert(catalogPositivos).values(item as any).returning();
    return created;
  }
  async updateCatalogPositivo(id: string, item: Partial<InsertCatalogPositivo>): Promise<CatalogPositivo | undefined> {
    const [updated] = await db.update(catalogPositivos).set(item as any).where(eq(catalogPositivos.id, id)).returning();
    return updated || undefined;
  }
  async deleteCatalogPositivo(id: string): Promise<boolean> {
    await db.delete(catalogPositivos).where(eq(catalogPositivos.id, id));
    return true;
  }
  
  // Catalog Negativos
  async getCatalogNegativos(): Promise<CatalogNegativo[]> {
    return db.select().from(catalogNegativos).orderBy(catalogNegativos.order, catalogNegativos.name);
  }
  async createCatalogNegativo(item: InsertCatalogNegativo): Promise<CatalogNegativo> {
    const [created] = await db.insert(catalogNegativos).values(item as any).returning();
    return created;
  }
  async updateCatalogNegativo(id: string, item: Partial<InsertCatalogNegativo>): Promise<CatalogNegativo | undefined> {
    const [updated] = await db.update(catalogNegativos).set(item as any).where(eq(catalogNegativos.id, id)).returning();
    return updated || undefined;
  }
  async deleteCatalogNegativo(id: string): Promise<boolean> {
    await db.delete(catalogNegativos).where(eq(catalogNegativos.id, id));
    return true;
  }

  // Asesor catalog
  async getCatalogAsesor(): Promise<CatalogAsesor[]> {
    return db.select().from(catalogAsesor).orderBy(catalogAsesor.order, catalogAsesor.name);
  }
  async createCatalogAsesor(item: InsertCatalogAsesor): Promise<CatalogAsesor> {
    const [created] = await db.insert(catalogAsesor).values(item as any).returning();
    return created;
  }
  async updateCatalogAsesor(id: string, item: Partial<InsertCatalogAsesor>): Promise<CatalogAsesor | undefined> {
    const [updated] = await db.update(catalogAsesor).set(item as any).where(eq(catalogAsesor.id, id)).returning();
    return updated || undefined;
  }
  async deleteCatalogAsesor(id: string): Promise<boolean> {
    await db.delete(catalogAsesor).where(eq(catalogAsesor.id, id));
    return true;
  }

  // Broker Externo catalog
  async getCatalogBrokerExterno(): Promise<CatalogBrokerExterno[]> {
    return db.select().from(catalogBrokerExterno).orderBy(catalogBrokerExterno.order, catalogBrokerExterno.name);
  }
  async createCatalogBrokerExterno(item: InsertCatalogBrokerExterno): Promise<CatalogBrokerExterno> {
    const [created] = await db.insert(catalogBrokerExterno).values(item as any).returning();
    return created;
  }
  async updateCatalogBrokerExterno(id: string, item: Partial<InsertCatalogBrokerExterno>): Promise<CatalogBrokerExterno | undefined> {
    const [updated] = await db.update(catalogBrokerExterno).set(item as any).where(eq(catalogBrokerExterno.id, id)).returning();
    return updated || undefined;
  }
  async deleteCatalogBrokerExterno(id: string): Promise<boolean> {
    await db.delete(catalogBrokerExterno).where(eq(catalogBrokerExterno.id, id));
    return true;
  }

  // Tipo de Contrato catalog
  async getCatalogTipoContrato(): Promise<CatalogTipoContrato[]> {
    return db.select().from(catalogTipoContrato).orderBy(catalogTipoContrato.order, catalogTipoContrato.name);
  }
  async createCatalogTipoContrato(item: InsertCatalogTipoContrato): Promise<CatalogTipoContrato> {
    const [created] = await db.insert(catalogTipoContrato).values(item as any).returning();
    return created;
  }
  async updateCatalogTipoContrato(id: string, item: Partial<InsertCatalogTipoContrato>): Promise<CatalogTipoContrato | undefined> {
    const [updated] = await db.update(catalogTipoContrato).set(item as any).where(eq(catalogTipoContrato.id, id)).returning();
    return updated || undefined;
  }
  async deleteCatalogTipoContrato(id: string): Promise<boolean> {
    await db.delete(catalogTipoContrato).where(eq(catalogTipoContrato.id, id));
    return true;
  }

  // Cesión de Derechos catalog
  async getCatalogCesionDerechos(): Promise<CatalogCesionDerechos[]> {
    return db.select().from(catalogCesionDerechos).orderBy(catalogCesionDerechos.order, catalogCesionDerechos.name);
  }
  async createCatalogCesionDerechos(item: InsertCatalogCesionDerechos): Promise<CatalogCesionDerechos> {
    const [created] = await db.insert(catalogCesionDerechos).values(item as any).returning();
    return created;
  }
  async updateCatalogCesionDerechos(id: string, item: Partial<InsertCatalogCesionDerechos>): Promise<CatalogCesionDerechos | undefined> {
    const [updated] = await db.update(catalogCesionDerechos).set(item as any).where(eq(catalogCesionDerechos.id, id)).returning();
    return updated || undefined;
  }
  async deleteCatalogCesionDerechos(id: string): Promise<boolean> {
    await db.delete(catalogCesionDerechos).where(eq(catalogCesionDerechos.id, id));
    return true;
  }

  // Presentación catalog
  async getCatalogPresentacion(): Promise<CatalogPresentacion[]> {
    return db.select().from(catalogPresentacion).orderBy(catalogPresentacion.order, catalogPresentacion.name);
  }
  async createCatalogPresentacion(item: InsertCatalogPresentacion): Promise<CatalogPresentacion> {
    const [created] = await db.insert(catalogPresentacion).values(item as any).returning();
    return created;
  }
  async updateCatalogPresentacion(id: string, item: Partial<InsertCatalogPresentacion>): Promise<CatalogPresentacion | undefined> {
    const [updated] = await db.update(catalogPresentacion).set(item as any).where(eq(catalogPresentacion.id, id)).returning();
    return updated || undefined;
  }
  async deleteCatalogPresentacion(id: string): Promise<boolean> {
    await db.delete(catalogPresentacion).where(eq(catalogPresentacion.id, id));
    return true;
  }

  async getCatalogTipoProveedor(): Promise<CatalogTipoProveedor[]> {
    return db.select().from(catalogTipoProveedor).orderBy(catalogTipoProveedor.order, catalogTipoProveedor.name);
  }
  async createCatalogTipoProveedor(item: InsertCatalogTipoProveedor): Promise<CatalogTipoProveedor> {
    const [created] = await db.insert(catalogTipoProveedor).values(item as any).returning();
    return created;
  }
  async updateCatalogTipoProveedor(id: string, item: Partial<InsertCatalogTipoProveedor>): Promise<CatalogTipoProveedor | undefined> {
    const [updated] = await db.update(catalogTipoProveedor).set(item as any).where(eq(catalogTipoProveedor.id, id)).returning();
    return updated || undefined;
  }
  async deleteCatalogTipoProveedor(id: string): Promise<boolean> {
    await db.delete(catalogTipoProveedor).where(eq(catalogTipoProveedor.id, id));
    return true;
  }

  async getCatalogIncluye(): Promise<CatalogIncluye[]> {
    return db.select().from(catalogIncluye).orderBy(catalogIncluye.order, catalogIncluye.name);
  }
  async createCatalogIncluye(item: InsertCatalogIncluye): Promise<CatalogIncluye> {
    const [created] = await db.insert(catalogIncluye).values(item as any).returning();
    return created;
  }
  async updateCatalogIncluye(id: string, item: Partial<InsertCatalogIncluye>): Promise<CatalogIncluye | undefined> {
    const [updated] = await db.update(catalogIncluye).set(item as any).where(eq(catalogIncluye.id, id)).returning();
    return updated || undefined;
  }
  async deleteCatalogIncluye(id: string): Promise<boolean> {
    await db.delete(catalogIncluye).where(eq(catalogIncluye.id, id));
    return true;
  }

  async getCatalogSiNo(): Promise<CatalogSiNo[]> {
    return db.select().from(catalogSiNo).orderBy(catalogSiNo.order, catalogSiNo.name);
  }
  async createCatalogSiNo(item: InsertCatalogSiNo): Promise<CatalogSiNo> {
    const [created] = await db.insert(catalogSiNo).values(item as any).returning();
    return created;
  }
  async updateCatalogSiNo(id: string, item: Partial<InsertCatalogSiNo>): Promise<CatalogSiNo | undefined> {
    const [updated] = await db.update(catalogSiNo).set(item as any).where(eq(catalogSiNo.id, id)).returning();
    return updated || undefined;
  }
  async deleteCatalogSiNo(id: string): Promise<boolean> {
    await db.delete(catalogSiNo).where(eq(catalogSiNo.id, id));
    return true;
  }

  async getGlobalSettings(): Promise<GlobalSetting[]> {
    return db.select().from(globalSettings);
  }

  async getGlobalSetting(key: string): Promise<GlobalSetting | undefined> {
    const [setting] = await db.select().from(globalSettings).where(eq(globalSettings.key, key));
    return setting;
  }

  async upsertGlobalSetting(key: string, value: string, label?: string): Promise<GlobalSetting> {
    const existing = await this.getGlobalSetting(key);
    if (existing) {
      const [updated] = await db.update(globalSettings).set({ value, label, updatedAt: new Date() }).where(eq(globalSettings.key, key)).returning();
      return updated;
    }
    const [created] = await db.insert(globalSettings).values({ key, value, label }).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
