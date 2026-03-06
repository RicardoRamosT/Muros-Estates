import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPropertySchema, insertClientSchema, loginSchema, contactFormSchema, insertUserSchema, insertTypologySchema, insertDocumentSchema, insertSharedLinkSchema, insertCatalogCitySchema, insertCatalogZoneSchema, insertCatalogDevelopmentTypeSchema, insertCatalogAmenitySchema, insertCatalogEfficiencyFeatureSchema, insertCatalogOtherFeatureSchema, insertCatalogAcabadoSchema, insertCatalogNivelSchema, insertCatalogTorreSchema, insertCatalogRecamaraSchema, insertCatalogBanoSchema, insertCatalogCajonSchema, insertCatalogNivelMantenimientoSchema, insertCatalogTipoClienteSchema, insertCatalogPerfilSchema, insertCatalogFuenteSchema, insertCatalogStatusProspectoSchema, insertCatalogEtapaEmbudoSchema, insertCatalogComoPagaSchema, insertCatalogPositivoSchema, insertCatalogNegativoSchema, insertCatalogTipoContratoSchema, insertCatalogCesionDerechosSchema, insertCatalogPresentacionSchema, insertCatalogTipoProveedorSchema, insertCatalogIncluyeSchema, insertCatalogSiNoSchema, insertCatalogEtapaClientesSchema, insertCatalogAvisoSchema } from "@shared/schema";
import { authenticateUser, createSession, validateSession, createUserWithHashedPassword, hashPassword, seedAdminUser } from "./auth";
import type { User, Typology } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { WebSocketServer, WebSocket } from "ws";
import crypto from "crypto";

// WebSocket clients set for real-time updates
const wsClients = new Set<WebSocket>();

// Broadcast typology update to all connected clients
function broadcastTypologyUpdate(action: "create" | "update" | "delete", typology: Typology | { id: string }) {
  const message = JSON.stringify({ type: "typology", action, data: typology });
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Broadcast developer update to all connected clients
function broadcastDeveloperUpdate(action: "create" | "update" | "delete", developer: Record<string, any> | { id: string }) {
  const message = JSON.stringify({ type: "developer", action, data: developer });
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Broadcast development update to all connected clients
function broadcastDevelopmentUpdate(action: "create" | "update" | "delete", development: Record<string, any> | { id: string }) {
  const message = JSON.stringify({ type: "development", action, data: development });
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Broadcast client update to all connected clients
function broadcastClientUpdate(action: "create" | "update" | "delete", clientData: Record<string, any> | { id: string }) {
  const message = JSON.stringify({ type: "client", action, data: clientData });
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Server-side completeness checks to prevent activating incomplete entities
function isDeveloperComplete(d: Record<string, any>): boolean {
  return !!(d.tipo && d.name && d.tipos?.length && d.contratos?.length);
}

function isDevelopmentComplete(d: Record<string, any>): boolean {
  return !!(d.empresaTipo && d.developerId && d.name && d.city &&
    d.tipos?.length && d.tipologiasList?.length && d.recamaras && d.banos &&
    d.inicioProyectado && d.entregaProyectada &&
    d.ventasNombre && d.ventasTelefono);
}

// Numeric fields in typology that need empty string to null conversion
function cleanTypologyData(data: Record<string, any>): Record<string, any> {
  const cleaned = { ...data };
  for (const key of Object.keys(cleaned)) {
    if (cleaned[key] === '') {
      cleaned[key] = null;
    }
  }
  return cleaned;
}

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storageConfig = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// Allowed file extensions mapped to MIME types
const allowedExtensions: Record<string, string[]> = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".gif": ["image/gif"],
  ".webp": ["image/webp"],
  ".mp4": ["video/mp4"],
  ".webm": ["video/webm"],
  ".mov": ["video/quicktime"],
  ".avi": ["video/x-msvideo"],
};

const upload = multer({
  storage: storageConfig,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for videos
    files: 10, // Max 10 files per request
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimes = allowedExtensions[ext];
    
    if (!allowedMimes) {
      cb(new Error("Extensión de archivo no permitida"));
      return;
    }
    
    if (!allowedMimes.includes(file.mimetype)) {
      cb(new Error("El tipo MIME no coincide con la extensión del archivo"));
      return;
    }
    
    cb(null, true);
  },
});

declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionId?: string;
    }
  }
}

// Auth middleware
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.headers.authorization?.replace("Bearer ", "") || req.cookies?.sessionId;
  
  if (!sessionId) {
    return res.status(401).json({ error: "No autenticado" });
  }
  
  const user = await validateSession(sessionId);
  if (!user) {
    return res.status(401).json({ error: "Sesión inválida o expirada" });
  }
  
  req.user = user;
  req.sessionId = sessionId;
  next();
}

function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Permisos insuficientes" });
    }
    
    next();
  };
}

function hasDocumentPermission(user: User, action: "view" | "edit"): boolean {
  if (user.role === "admin") return true;
  
  const permissions = user.permissions as Record<string, any> | null;
  if (!permissions?.documentos) return false;
  
  const docPerms = permissions.documentos;
  return docPerms[action] === true;
}

function requireDocumentPermission(action: "view" | "edit") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    
    if (!hasDocumentPermission(req.user, action)) {
      return res.status(403).json({ error: "No tienes permiso para esta acción en documentos" });
    }
    
    next();
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Set up WebSocket server for real-time typology updates
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  
  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");
    wsClients.add(ws);
    
    ws.on("close", () => {
      console.log("WebSocket client disconnected");
      wsClients.delete(ws);
    });
    
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      wsClients.delete(ws);
    });
  });
  
  // Seed admin user on startup
  await seedAdminUser();
  
  // Serve uploaded files statically with security headers
  app.use("/uploads", (req, res, next) => {
    // Prevent path traversal
    const safePath = path.normalize(req.path).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(uploadDir, safePath);
    
    // Ensure the file is within uploadDir
    if (!filePath.startsWith(uploadDir)) {
      return res.status(403).json({ error: "Acceso denegado" });
    }
    
    if (fs.existsSync(filePath)) {
      // Set security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: "Archivo no encontrado" });
    }
  });
  
  // ============ FILE UPLOAD ROUTES ============
  
  app.post("/api/upload", requireAuth, requireRole("admin", "actualizador"), upload.array("files", 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No se enviaron archivos" });
      }
      
      const urls = files.map(file => `/uploads/${file.filename}`);
      res.json({ urls });
    } catch (error) {
      console.error("Error uploading files:", error);
      res.status(500).json({ error: "Error al subir archivos" });
    }
  });
  
  // ============ AUTH ROUTES ============
  
  app.post("/api/auth/login", async (req, res) => {
    try {
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Datos inválidos" });
      }
      
      const { username, password } = validationResult.data;
      const user = await authenticateUser(username, password);
      
      if (!user) {
        return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
      }
      
      const sessionId = await createSession(user.id);
      
      res.json({
        sessionId,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Error al iniciar sesión" });
    }
  });
  
  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    try {
      if (req.sessionId) {
        await storage.deleteSession(req.sessionId);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Error al cerrar sesión" });
    }
  });
  
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    res.json({
      id: req.user!.id,
      username: req.user!.username,
      name: req.user!.name,
      email: req.user!.email,
      role: req.user!.role,
      permissions: req.user!.permissions,
    });
  });
  
  // ============ USER ROUTES (Admin only) ============
  
  app.get("/api/users", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map(u => ({
        id: u.id,
        username: u.username,
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active,
        permissions: u.permissions,
        createdAt: u.createdAt,
      })));
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Error al obtener usuarios" });
    }
  });
  
  app.post("/api/users", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const validationResult = insertUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: validationResult.error.errors });
      }
      
      const existingUser = await storage.getUserByUsername(validationResult.data.username);
      if (existingUser) {
        return res.status(400).json({ error: "El usuario ya existe" });
      }
      
      const user = await createUserWithHashedPassword(validationResult.data);
      res.status(201).json({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        permissions: user.permissions,
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Error al crear usuario" });
    }
  });
  
  app.put("/api/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const { password, ...otherData } = req.body;
      
      const updateData: any = { ...otherData };
      if (password) {
        updateData.password = await hashPassword(password);
      }
      
      const user = await storage.updateUser(id, updateData);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      
      res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        permissions: user.permissions,
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Error al actualizar usuario" });
    }
  });
  
  app.delete("/api/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = req.params.id as string;
      
      // Prevent self-deletion
      if (id === req.user!.id) {
        return res.status(400).json({ error: "No puedes eliminar tu propia cuenta" });
      }
      
      // Check if user exists
      const userToDelete = await storage.getUser(id);
      if (!userToDelete) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      
      // Prevent deletion of admin users
      if (userToDelete.role === "admin") {
        return res.status(403).json({ error: "No se puede eliminar un usuario administrador" });
      }
      
      await storage.deleteUser(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Error al eliminar usuario" });
    }
  });
  
  // ============ CLIENT ROUTES ============
  
  // Public endpoint for contact form
  app.post("/api/contact", async (req, res) => {
    try {
      const validationResult = contactFormSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: validationResult.error.errors });
      }
      
      const client = await storage.createClient({
        nombre: validationResult.data.nombre || validationResult.data.name?.split(' ')[0] || "",
        apellido: validationResult.data.apellido || validationResult.data.name?.split(' ').slice(1).join(' ') || "",
        telefono: validationResult.data.phone,
        correo: validationResult.data.email || null,
        developmentInterest: validationResult.data.interest || null,
        comoLlega: "web",
        estatus: "activo",
        embudo: "nuevo",
        tipologia: validationResult.data.typologyId || null,
        desarrollo: validationResult.data.desarrollo || null,
        desarrollador: validationResult.data.desarrollador || null,
        ciudad: validationResult.data.ciudad || null,
        zona: validationResult.data.zona || null,
      });
      
      broadcastClientUpdate("create", client);
      res.status(201).json({ success: true, message: "Gracias por contactarnos. Un asesor te contactará pronto." });
    } catch (error) {
      console.error("Error creating contact:", error);
      res.status(500).json({ error: "Error al enviar el formulario" });
    }
  });
  
  // Protected client routes
  app.get("/api/clients", requireAuth, requireRole("admin", "perfilador", "asesor"), async (req, res) => {
    try {
      let clients;
      if (req.user!.role === "asesor") {
        clients = await storage.getClientsByAsesor(req.user!.id);
      } else {
        clients = await storage.getAllClients();
      }
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: "Error al obtener clientes" });
    }
  });
  
  app.get("/api/clients/deleted", requireAuth, requireRole("admin"), async (_req, res) => {
    const items = await storage.getDeletedClients();
    res.json(items);
  });

  app.post("/api/clients/:id/restore", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.restoreClient(req.params.id as string);
    broadcastClientUpdate("create", { id: req.params.id });
    res.json({ ok: true });
  });

  app.get("/api/clients/:id", requireAuth, requireRole("admin", "perfilador", "asesor"), async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id as string);
      if (!client) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }
      // Asesor can only view their own assigned clients
      if (req.user!.role === "asesor" && client.assignedTo !== req.user!.id) {
        return res.status(403).json({ error: "No tienes acceso a este cliente" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ error: "Error al obtener cliente" });
    }
  });
  
  app.post("/api/clients", requireAuth, requireRole("admin", "perfilador", "asesor"), async (req, res) => {
    try {
      const validationResult = insertClientSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Datos inválidos", details: validationResult.error.errors });
      }
      
      const client = await storage.createClient({
        ...validationResult.data,
        source: "manual",
      });
      broadcastClientUpdate("create", client);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ error: "Error al crear cliente" });
    }
  });
  
  app.put("/api/clients/:id", requireAuth, requireRole("admin", "perfilador", "asesor"), async (req, res) => {
    try {
      // Asesor can only update their own assigned clients
      if (req.user!.role === "asesor") {
        const existing = await storage.getClient(req.params.id as string);
        if (!existing) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
        if (existing.assignedTo !== req.user!.id) {
          return res.status(403).json({ error: "No tienes acceso a este cliente" });
        }
      }

      // Convert date strings to Date objects for timestamp fields
      const data = { ...req.body };
      if (data.convertedAt && typeof data.convertedAt === 'string') {
        data.convertedAt = new Date(data.convertedAt);
      }
      if (data.fechaSeparacion && typeof data.fechaSeparacion === 'string') {
        data.fechaSeparacion = new Date(data.fechaSeparacion);
      }
      if (data.fechaEnganche && typeof data.fechaEnganche === 'string') {
        data.fechaEnganche = new Date(data.fechaEnganche);
      }

      const client = await storage.updateClient(req.params.id as string, data);
      if (!client) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }
      broadcastClientUpdate("update", client);
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ error: "Error al actualizar cliente" });
    }
  });
  
  app.delete("/api/clients/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      await storage.deleteClient(req.params.id as string);
      broadcastClientUpdate("delete", { id: req.params.id as string });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ error: "Error al eliminar cliente" });
    }
  });
  
  // Client follow-ups
  app.post("/api/clients/:id/followup", requireAuth, requireRole("admin", "asesor"), async (req, res) => {
    try {
      const followUp = await storage.createFollowUp({
        clientId: req.params.id as string,
        userId: req.user!.id,
        action: req.body.action,
        notes: req.body.notes,
      });
      res.status(201).json(followUp);
    } catch (error) {
      console.error("Error creating follow-up:", error);
      res.status(500).json({ error: "Error al crear seguimiento" });
    }
  });
  
  app.get("/api/clients/:id/followups", requireAuth, requireRole("admin", "perfilador", "asesor"), async (req, res) => {
    try {
      const followUps = await storage.getFollowUpsByClient(req.params.id as string);
      res.json(followUps);
    } catch (error) {
      console.error("Error fetching follow-ups:", error);
      res.status(500).json({ error: "Error al obtener seguimientos" });
    }
  });
  
  // ============ PUBLIC TYPOLOGIES (for public pages) ============
  
  app.get("/api/public/typologies", async (req, res) => {
    try {
      const activeTypologies = await storage.getActiveTypologies();
      
      // Enrich each typology with its media documents
      const enrichedTypologies = await Promise.all(
        activeTypologies.map(async (typology) => {
          const typologyDocs = await storage.getDocumentsByTypology(typology.id);
          const mediaUrls = typologyDocs
            .filter(doc => doc.mimeType?.startsWith("image/") || doc.mimeType?.startsWith("video/"))
            .map(doc => doc.fileUrl);
          
          return {
            ...typology,
            images: mediaUrls.length > 0 ? mediaUrls : null,
          };
        })
      );
      
      res.json(enrichedTypologies);
    } catch (error) {
      console.error("Error fetching active typologies:", error);
      res.status(500).json({ error: "Error al obtener tipologías" });
    }
  });

  // ============ PROPERTY ROUTES ============
  
  app.get("/api/properties", async (req, res) => {
    try {
      const properties = await storage.getAllProperties();
      
      // Enrich each property with typology media
      const enrichedProperties = await Promise.all(
        properties.map(async (property) => {
          const typology = await storage.getTypologyByPropertyId(property.id);
          let images: string[] = property.images || [];
          
          if (typology) {
            const typologyDocs = await storage.getDocumentsByTypology(typology.id);
            const mediaUrls = typologyDocs
              .filter(doc => doc.mimeType?.startsWith("image/") || doc.mimeType?.startsWith("video/"))
              .map(doc => doc.fileUrl);
            
            if (mediaUrls.length > 0) {
              images = [...mediaUrls, ...images.filter(img => !mediaUrls.includes(img))];
            }
          }
          
          return { ...property, images };
        })
      );
      
      res.json(enrichedProperties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ error: "Error al obtener las propiedades" });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const property = await storage.getProperty(id);
      
      if (!property) {
        return res.status(404).json({ error: "Propiedad no encontrada" });
      }
      
      // Get typology to find associated media documents and additional data
      const typology = await storage.getTypologyByPropertyId(id);
      let images: string[] = property.images || [];
      let enrichedProperty = { ...property };
      
      if (typology) {
        // Get documents from typology (sorted by sortOrder)
        const typologyDocs = await storage.getDocumentsByTypology(typology.id);
        const mediaUrls = typologyDocs
          .filter(doc => doc.mimeType?.startsWith("image/") || doc.mimeType?.startsWith("video/"))
          .map(doc => doc.fileUrl);
        
        // Prepend typology media to any existing property images
        if (mediaUrls.length > 0) {
          images = [...mediaUrls, ...images.filter(img => !mediaUrls.includes(img))];
        }
        
        // Enrich property with typology data (typology is the primary source)
        enrichedProperty = {
          ...property,
          // Basic info from typology
          bedrooms: typology.bedrooms?.toString() || property.bedrooms,
          bathrooms: typology.bathrooms || property.bathrooms,
          area: typology.size || property.area,
          floor: typology.level ? typology.level : property.floor,
          deliveryDate: typology.deliveryDate || property.deliveryDate,
          parking: typology.parkingSpots || property.parking,
          // Price info from typology
          price: typology.price || property.price,
          // Additional typology-specific data
          typologyId: typology.id,
          typologyType: typology.type,
          view: typology.view,
          flex: typology.flex,
          livingRoom: typology.livingRoom,
          diningRoom: typology.diningRoom,
          kitchen: typology.kitchen,
          balcony: typology.balcony,
          terrace: typology.terrace,
          laundry: typology.laundry,
          serviceRoom: typology.serviceRoom,
          storage: typology.storage,
          finalPrice: typology.finalPrice,
          pricePerM2: typology.pricePerM2,
          discountPercent: typology.discountPercent,
          discountAmount: typology.discountAmount,
          downPaymentPercent: typology.downPaymentPercent,
        } as typeof property & Record<string, unknown>;
      }
      
      res.json({ ...enrichedProperty, images });
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ error: "Error al obtener la propiedad" });
    }
  });

  app.post("/api/properties", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    try {
      const validationResult = insertPropertySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Datos inválidos", 
          details: validationResult.error.errors 
        });
      }
      
      const property = await storage.createProperty(validationResult.data);
      
      // Also create a corresponding typology
      const typologyData = {
        propertyId: property.id,
        city: property.city,
        zone: property.zone,
        developer: property.developer,
        development: property.developmentName,
        level: property.floor || null,
        size: property.area,
        price: property.price,
        bedrooms: property.bedrooms ? parseInt(property.bedrooms) : null,
        bathrooms: property.bathrooms || null,
        parkingSpots: property.parking || 1,
        deliveryDate: property.deliveryDate || null,
        downPaymentPercent: property.downPayment ? String(property.downPayment) : null,
        createdBy: req.user?.id,
      };
      
      const typology = await storage.createTypology(typologyData);
      broadcastTypologyUpdate("create", typology);
      
      res.status(201).json(property);
    } catch (error) {
      console.error("Error creating property:", error);
      res.status(500).json({ error: "Error al crear la propiedad" });
    }
  });

  app.put("/api/properties/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const validationResult = insertPropertySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Datos inválidos", 
          details: validationResult.error.errors 
        });
      }
      
      const property = await storage.updateProperty(id, validationResult.data);
      
      if (!property) {
        return res.status(404).json({ error: "Propiedad no encontrada" });
      }
      
      // Also update the corresponding typology
      const existingTypology = await storage.getTypologyByPropertyId(id);
      if (existingTypology) {
        const typologyData = {
          city: property.city,
          zone: property.zone,
          developer: property.developer,
          development: property.developmentName,
          level: property.floor || null,
          size: property.area,
          price: property.price,
          bedrooms: property.bedrooms ? parseInt(property.bedrooms) : null,
          bathrooms: property.bathrooms || null,
          parkingSpots: property.parking || 1,
          deliveryDate: property.deliveryDate || null,
          downPaymentPercent: property.downPayment ? String(property.downPayment) : null,
          updatedBy: req.user?.id,
        };
        
        const updatedTypology = await storage.updateTypology(existingTypology.id, typologyData);
        if (updatedTypology) {
          broadcastTypologyUpdate("update", updatedTypology);
        }
      }
      
      res.json(property);
    } catch (error) {
      console.error("Error updating property:", error);
      res.status(500).json({ error: "Error al actualizar la propiedad" });
    }
  });

  app.delete("/api/properties/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = req.params.id as string;
      
      // Get the typology before deleting (to broadcast the delete)
      const existingTypology = await storage.getTypologyByPropertyId(id);
      
      const deleted = await storage.deleteProperty(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Propiedad no encontrada" });
      }
      
      // Broadcast typology deletion (cascade delete handles the DB side)
      if (existingTypology) {
        broadcastTypologyUpdate("delete", { id: existingTypology.id });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting property:", error);
      res.status(500).json({ error: "Error al eliminar la propiedad" });
    }
  });
  
  // ============ ASSIGNMENT ROUTES (Perfilador) ============
  
  app.get("/api/assignments", requireAuth, requireRole("admin", "perfilador", "asesor"), async (req, res) => {
    try {
      if (req.user!.role === "asesor") {
        const assignments = await storage.getAssignmentsByAsesor(req.user!.id);
        res.json(assignments);
      } else {
        // For admin/perfilador, return all assignments (could be improved with pagination)
        const asesores = await storage.getUsersByRole("asesor");
        const allAssignments = await Promise.all(
          asesores.map(a => storage.getAssignmentsByAsesor(a.id))
        );
        res.json(allAssignments.flat());
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ error: "Error al obtener asignaciones" });
    }
  });
  
  app.post("/api/assignments", requireAuth, requireRole("admin", "perfilador"), async (req, res) => {
    try {
      const assignment = await storage.assignDevelopment({
        developmentId: req.body.developmentId,
        asesorId: req.body.asesorId,
        assignedBy: req.user!.id,
      });
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error creating assignment:", error);
      res.status(500).json({ error: "Error al crear asignación" });
    }
  });
  
  app.delete("/api/assignments/:id", requireAuth, requireRole("admin", "perfilador"), async (req, res) => {
    try {
      await storage.deleteAssignment(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting assignment:", error);
      res.status(500).json({ error: "Error al eliminar asignación" });
    }
  });
  
  // Get asesores for assignment dropdown
  app.get("/api/users/asesores", requireAuth, requireRole("admin", "perfilador"), async (req, res) => {
    try {
      const asesores = await storage.getUsersByRole("asesor");
      res.json(asesores.map(u => ({
        id: u.id,
        name: u.name,
        username: u.username,
      })));
    } catch (error) {
      console.error("Error fetching asesores:", error);
      res.status(500).json({ error: "Error al obtener asesores" });
    }
  });
  
  // ============ TYPOLOGY ROUTES (Admin, Actualizador) ============
  
  app.get("/api/typologies", requireAuth, requireRole("admin", "actualizador", "asesor"), async (req, res) => {
    try {
      const typologies = await storage.getAllTypologies();
      res.json(typologies);
    } catch (error) {
      console.error("Error fetching typologies:", error);
      res.status(500).json({ error: "Error al obtener tipologías" });
    }
  });
  
  app.get("/api/typologies/deleted", requireAuth, requireRole("admin"), async (_req, res) => {
    const items = await storage.getDeletedTypologies();
    res.json(items);
  });

  app.post("/api/typologies/:id/restore", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.restoreTypology(req.params.id as string);
    broadcastTypologyUpdate("create", { id: req.params.id } as any);
    res.json({ ok: true });
  });

  app.get("/api/typologies/:id", requireAuth, requireRole("admin", "actualizador", "asesor"), async (req, res) => {
    try {
      const typology = await storage.getTypology(req.params.id as string);
      if (!typology) {
        return res.status(404).json({ error: "Tipología no encontrada" });
      }
      res.json(typology);
    } catch (error) {
      console.error("Error fetching typology:", error);
      res.status(500).json({ error: "Error al obtener tipología" });
    }
  });
  
  app.post("/api/typologies", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    try {
      const typologyData = cleanTypologyData({
        ...req.body,
        createdBy: req.user!.id,
        updatedBy: req.user!.id,
      });
      
      const typology = await storage.createTypology(typologyData);
      
      // Broadcast to all connected clients
      broadcastTypologyUpdate("create", typology);
      
      res.status(201).json(typology);
    } catch (error) {
      console.error("Error creating typology:", error);
      res.status(500).json({ error: "Error al crear tipología" });
    }
  });
  
  app.put("/api/typologies/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    try {
      const id = req.params.id as string;

      // Prevent activating a typology with inactive parents
      if (req.body.active === true) {
        const existing = await storage.getTypology(id);
        if (!existing) {
          return res.status(404).json({ error: "Tipología no encontrada" });
        }
        const merged = { ...existing, ...req.body };
        // Check developer is active
        if (merged.developer) {
          const devs = await storage.getAllDevelopers();
          const dev = devs.find((d: any) => d.name === merged.developer);
          if (!dev || dev.active !== true) {
            return res.status(400).json({ error: "No se puede activar una tipología cuyo desarrollador no está activo" });
          }
        }
        // Check development is active
        if (merged.development) {
          const desas = await storage.getAllDevelopmentsEntity();
          const desa = desas.find((d: any) => d.name === merged.development);
          if (!desa || desa.active !== true) {
            return res.status(400).json({ error: "No se puede activar una tipología cuyo desarrollo no está activo" });
          }
        }
      }

      const updateData = cleanTypologyData({
        ...req.body,
        updatedBy: req.user!.id,
      });

      const typology = await storage.updateTypology(id, updateData);

      if (!typology) {
        return res.status(404).json({ error: "Tipología no encontrada" });
      }

      // Broadcast to all connected clients
      broadcastTypologyUpdate("update", typology);

      res.json(typology);
    } catch (error) {
      console.error("Error updating typology:", error);
      res.status(500).json({ error: "Error al actualizar tipología" });
    }
  });
  
  app.patch("/api/typologies/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    try {
      const id = req.params.id as string;

      // Prevent activating a typology with inactive parents
      if (req.body.active === true) {
        const existing = await storage.getTypology(id);
        if (!existing) {
          return res.status(404).json({ error: "Tipología no encontrada" });
        }
        const merged = { ...existing, ...req.body };
        if (merged.developer) {
          const devs = await storage.getAllDevelopers();
          const dev = devs.find((d: any) => d.name === merged.developer);
          if (!dev || dev.active !== true) {
            return res.status(400).json({ error: "No se puede activar una tipología cuyo desarrollador no está activo" });
          }
        }
        if (merged.development) {
          const desas = await storage.getAllDevelopmentsEntity();
          const desa = desas.find((d: any) => d.name === merged.development);
          if (!desa || desa.active !== true) {
            return res.status(400).json({ error: "No se puede activar una tipología cuyo desarrollo no está activo" });
          }
        }
      }

      const updateData = cleanTypologyData({
        ...req.body,
        updatedBy: req.user!.id,
      });

      const typology = await storage.updateTypology(id, updateData);

      if (!typology) {
        return res.status(404).json({ error: "Tipología no encontrada" });
      }

      // Broadcast to all connected clients
      broadcastTypologyUpdate("update", typology);
      
      res.json(typology);
    } catch (error) {
      console.error("Error updating typology:", error);
      res.status(500).json({ error: "Error al actualizar tipología" });
    }
  });
  
  app.delete("/api/typologies/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const deleted = await storage.deleteTypology(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Tipología no encontrada" });
      }
      
      // Broadcast to all connected clients
      broadcastTypologyUpdate("delete", { id });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting typology:", error);
      res.status(500).json({ error: "Error al eliminar tipología" });
    }
  });

  // ============ TYPOLOGY MEDIA ROUTES ============
  
  // Get all media (optionally filtered by typologyId)
  app.get("/api/development-media", async (req, res) => {
    try {
      const { typologyId } = req.query;
      const media = await storage.getDevelopmentMedia(typologyId as string | undefined);
      res.json(media);
    } catch (error) {
      console.error("Error getting typology media:", error);
      res.status(500).json({ error: "Error al obtener medios" });
    }
  });
  
  // Upload media for a specific typology
  app.post("/api/development-media", requireAuth, requireRole("admin", "actualizador"), upload.array("files", 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const { typologyId } = req.body;
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No se enviaron archivos" });
      }
      
      if (!typologyId) {
        return res.status(400).json({ error: "Se requiere typologyId" });
      }
      
      const mediaItems = [];
      for (const file of files) {
        const isVideo = file.mimetype.startsWith("video/");
        const mediaItem = await storage.createDevelopmentMedia({
          typologyId,
          type: isVideo ? "video" : "image",
          url: `/uploads/${file.filename}`,
          uploadedBy: req.user!.id,
        });
        mediaItems.push(mediaItem);
      }
      
      res.json(mediaItems);
    } catch (error) {
      console.error("Error uploading typology media:", error);
      res.status(500).json({ error: "Error al subir medios" });
    }
  });
  
  // Update media order/primary
  app.put("/api/development-media/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const { order, isPrimary } = req.body;
      
      const media = await storage.updateDevelopmentMedia(id, { order, isPrimary });
      
      if (!media) {
        return res.status(404).json({ error: "Media no encontrado" });
      }
      
      res.json(media);
    } catch (error) {
      console.error("Error updating development media:", error);
      res.status(500).json({ error: "Error al actualizar media" });
    }
  });
  
  // Delete media
  app.delete("/api/development-media/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const deleted = await storage.deleteDevelopmentMedia(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Media no encontrado" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting development media:", error);
      res.status(500).json({ error: "Error al eliminar media" });
    }
  });

  // ============ DEVELOPERS ROUTES ============
  
  app.get("/api/developers", async (req, res) => {
    try {
      const devs = await storage.getAllDevelopers();
      res.json(devs);
    } catch (error) {
      console.error("Error getting developers:", error);
      res.status(500).json({ error: "Error al obtener desarrolladores" });
    }
  });

  app.get("/api/developers/deleted", requireAuth, requireRole("admin"), async (_req, res) => {
    const items = await storage.getDeletedDevelopers();
    res.json(items);
  });

  app.post("/api/developers/:id/restore", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.restoreDeveloper(req.params.id as string);
    broadcastDeveloperUpdate("create", { id: req.params.id });
    res.json({ ok: true });
  });

  app.get("/api/developers/:id", async (req, res) => {
    try {
      const dev = await storage.getDeveloper(req.params.id);
      if (!dev) {
        return res.status(404).json({ error: "Desarrollador no encontrado" });
      }
      res.json(dev);
    } catch (error) {
      console.error("Error getting developer:", error);
      res.status(500).json({ error: "Error al obtener desarrollador" });
    }
  });

  app.post("/api/developers", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    try {
      const dev = await storage.createDeveloper(req.body);
      broadcastDeveloperUpdate("create", dev);
      res.status(201).json(dev);
    } catch (error) {
      console.error("Error creating developer:", error);
      res.status(500).json({ error: "Error al crear desarrollador" });
    }
  });

  app.put("/api/developers/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    try {
      const id = req.params.id as string;
      // Convert date strings to Date objects for timestamp fields
      const data = { ...req.body };
      if (data.fechaAntiguedad && typeof data.fechaAntiguedad === 'string') {
        data.fechaAntiguedad = new Date(data.fechaAntiguedad);
      }

      // Prevent activating an incomplete developer
      if (data.active === true) {
        const existing = await storage.getDeveloper(id);
        if (!existing) {
          return res.status(404).json({ error: "Desarrollador no encontrado" });
        }
        const merged = { ...existing, ...data };
        if (!isDeveloperComplete(merged)) {
          return res.status(400).json({ error: "No se puede activar un desarrollador con datos incompletos" });
        }
      }

      const dev = await storage.updateDeveloper(id, data);
      if (!dev) {
        return res.status(404).json({ error: "Desarrollador no encontrado" });
      }
      broadcastDeveloperUpdate("update", dev);
      res.json(dev);
    } catch (error) {
      console.error("Error updating developer:", error);
      res.status(500).json({ error: "Error al actualizar desarrollador" });
    }
  });

  app.delete("/api/developers/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const dev = await storage.getDeveloper(id);
      if (!dev) {
        return res.status(404).json({ error: "Desarrollador no encontrado" });
      }
      const deleted = await storage.deleteDeveloper(id);
      if (!deleted) {
        return res.status(404).json({ error: "Desarrollador no encontrado" });
      }
      if (dev.name) {
        await storage.clearTypologyFieldByValue("developer", dev.name);
      }
      broadcastDeveloperUpdate("delete", { id });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting developer:", error);
      res.status(500).json({ error: "Error al eliminar desarrollador" });
    }
  });

  // ============ DEVELOPMENTS ENTITY ROUTES ============
  
  app.get("/api/developments-entity", async (req, res) => {
    try {
      const { developerId } = req.query;
      let devs;
      if (developerId) {
        devs = await storage.getDevelopmentsByDeveloper(developerId as string);
      } else {
        devs = await storage.getAllDevelopmentsEntity();
      }
      res.json(devs);
    } catch (error) {
      console.error("Error getting developments:", error);
      res.status(500).json({ error: "Error al obtener desarrollos" });
    }
  });

  app.get("/api/developments-entity/deleted", requireAuth, requireRole("admin"), async (_req, res) => {
    const items = await storage.getDeletedDevelopments();
    res.json(items);
  });

  app.post("/api/developments-entity/:id/restore", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.restoreDevelopment(req.params.id as string);
    broadcastDevelopmentUpdate("create", { id: req.params.id });
    res.json({ ok: true });
  });

  app.get("/api/developments-entity/:id", async (req, res) => {
    try {
      const dev = await storage.getDevelopmentEntity(req.params.id);
      if (!dev) {
        return res.status(404).json({ error: "Desarrollo no encontrado" });
      }
      res.json(dev);
    } catch (error) {
      console.error("Error getting development:", error);
      res.status(500).json({ error: "Error al obtener desarrollo" });
    }
  });

  app.post("/api/developments-entity", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    try {
      const dev = await storage.createDevelopmentEntity(req.body);
      broadcastDevelopmentUpdate("create", dev);
      res.status(201).json(dev);
    } catch (error) {
      console.error("Error creating development:", error);
      res.status(500).json({ error: "Error al crear desarrollo" });
    }
  });

  app.put("/api/developments-entity/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    try {
      const id = req.params.id as string;

      // Prevent activating an incomplete development or one with inactive parent
      if (req.body.active === true) {
        const existing = await storage.getDevelopmentEntity(id);
        if (!existing) {
          return res.status(404).json({ error: "Desarrollo no encontrado" });
        }
        const merged = { ...existing, ...req.body };
        if (!isDevelopmentComplete(merged)) {
          return res.status(400).json({ error: "No se puede activar un desarrollo con datos incompletos" });
        }
        // Check parent developer is active
        if (merged.developerId) {
          const parent = await storage.getDeveloper(merged.developerId);
          if (!parent || parent.active !== true) {
            return res.status(400).json({ error: "No se puede activar un desarrollo cuyo desarrollador no está activo" });
          }
        }
      }

      const dev = await storage.updateDevelopmentEntity(id, req.body);
      if (!dev) {
        return res.status(404).json({ error: "Desarrollo no encontrado" });
      }
      
      // If entregaProyectada was updated, propagate to typologies
      if ('entregaProyectada' in req.body && dev.name) {
        try {
          // Find typologies by development name and update their deliveryDate
          const typologies = await storage.getAllTypologies();
          const matchingTypologies = typologies.filter((t: { development: string | null }) => t.development === dev.name);
          
          // Use the date value from the update (can be null to clear)
          const deliveryDate = req.body.entregaProyectada || null;
          
          for (const typology of matchingTypologies) {
            await storage.updateTypology(typology.id, { deliveryDate });
          }
          
          if (matchingTypologies.length > 0) {
            console.log(`Propagated entregaProyectada to ${matchingTypologies.length} typologies for development ${dev.name}`);
          }
        } catch (propError) {
          console.error("Error propagating date to typologies:", propError);
        }
      }

      broadcastDevelopmentUpdate("update", dev);
      res.json(dev);
    } catch (error) {
      console.error("Error updating development:", error);
      res.status(500).json({ error: "Error al actualizar desarrollo" });
    }
  });

  app.delete("/api/developments-entity/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const dev = await storage.getDevelopmentEntity(id);
      if (!dev) {
        return res.status(404).json({ error: "Desarrollo no encontrado" });
      }
      const deleted = await storage.deleteDevelopmentEntity(id);
      if (!deleted) {
        return res.status(404).json({ error: "Desarrollo no encontrado" });
      }
      if (dev.name) {
        await storage.clearTypologyFieldByValue("development", dev.name);
      }
      broadcastDevelopmentUpdate("delete", { id });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting development:", error);
      res.status(500).json({ error: "Error al eliminar desarrollo" });
    }
  });

  // ============ DOCUMENT ROUTES ============
  
  // Configure multer for document uploads with more file types
  const documentUploadDir = path.join(process.cwd(), "uploads/documents");
  if (!fs.existsSync(documentUploadDir)) {
    fs.mkdirSync(documentUploadDir, { recursive: true });
  }
  
  const documentStorageConfig = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, documentUploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, "doc-" + uniqueSuffix + ext);
    },
  });
  
  const documentAllowedExtensions: Record<string, string[]> = {
    ".jpg": ["image/jpeg"],
    ".jpeg": ["image/jpeg"],
    ".png": ["image/png"],
    ".gif": ["image/gif"],
    ".webp": ["image/webp"],
    ".pdf": ["application/pdf"],
    ".doc": ["application/msword"],
    ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    ".xls": ["application/vnd.ms-excel"],
    ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ".ppt": ["application/vnd.ms-powerpoint"],
    ".pptx": ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    ".txt": ["text/plain"],
    ".csv": ["text/csv"],
    ".zip": ["application/zip"],
    ".mp4": ["video/mp4"],
    ".webm": ["video/webm"],
    ".mov": ["video/quicktime"],
  };
  
  const documentUpload = multer({
    storage: documentStorageConfig,
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB limit
      files: 10,
    },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const allowedMimes = documentAllowedExtensions[ext];
      
      if (!allowedMimes) {
        cb(new Error("Extensión de archivo no permitida"));
        return;
      }
      
      if (!allowedMimes.includes(file.mimetype)) {
        cb(new Error("El tipo MIME no coincide con la extensión del archivo"));
        return;
      }
      
      cb(null, true);
    },
  });
  
  // Get all documents (with filters)
  app.get("/api/documents", requireAuth, requireDocumentPermission("view"), async (req, res) => {
    try {
      const { category, developer, development, client, asesor, search } = req.query;
      
      let docs;
      if (search && typeof search === "string") {
        docs = await storage.searchDocuments(search);
      } else if (category && typeof category === "string") {
        docs = await storage.getDocumentsByCategory(category);
      } else if (developer && typeof developer === "string") {
        docs = await storage.getDocumentsByDeveloper(developer);
      } else if (development && typeof development === "string") {
        docs = await storage.getDocumentsByDevelopment(development);
      } else if (client && typeof client === "string") {
        docs = await storage.getDocumentsByClient(client);
      } else if (asesor && typeof asesor === "string") {
        docs = await storage.getDocumentsByAsesor(asesor);
      } else {
        docs = await storage.getAllDocuments();
      }
      
      res.json(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Error al obtener documentos" });
    }
  });
  
  // Get single document
  app.get("/api/documents/:id", requireAuth, requireDocumentPermission("view"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const doc = await storage.getDocument(id);
      if (!doc) {
        return res.status(404).json({ error: "Documento no encontrado" });
      }
      res.json(doc);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ error: "Error al obtener documento" });
    }
  });
  
  // Upload document
  app.post("/api/documents", requireAuth, requireDocumentPermission("edit"), documentUpload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No se proporcionó ningún archivo" });
      }
      
      // Validate required rootCategory field
      if (!req.body.rootCategory) {
        return res.status(400).json({ error: "La categoría raíz es requerida" });
      }
      
      const documentData = {
        name: req.body.name || file.originalname,
        originalName: file.originalname,
        fileUrl: `/uploads/documents/${file.filename}`,
        fileSize: file.size,
        mimeType: file.mimetype,
        rootCategory: req.body.rootCategory,
        section: req.body.section || null,
        shareable: req.body.shareable === "true" || req.body.shareable === true,
        developerId: req.body.developerId || null,
        developmentId: req.body.developmentId || null,
        typologyId: req.body.typologyId || null,
        clientId: req.body.clientId || null,
        description: req.body.description || null,
        uploadedBy: req.user!.id,
      };
      
      const validationResult = insertDocumentSchema.safeParse(documentData);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Datos inválidos", 
          details: validationResult.error.errors 
        });
      }
      
      const doc = await storage.createDocument(validationResult.data);
      res.status(201).json(doc);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ error: "Error al subir documento" });
    }
  });
  
  // Update document metadata
  app.put("/api/documents/:id", requireAuth, requireDocumentPermission("edit"), async (req, res) => {
    try {
      const id = req.params.id as string;
      
      const updateData: Record<string, any> = {};
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.rootCategory !== undefined) updateData.rootCategory = req.body.rootCategory;
      if (req.body.section !== undefined) updateData.section = req.body.section;
      if (req.body.shareable !== undefined) updateData.shareable = req.body.shareable === true || req.body.shareable === "true";
      if (req.body.developerId !== undefined) updateData.developerId = req.body.developerId;
      if (req.body.developmentId !== undefined) updateData.developmentId = req.body.developmentId;
      if (req.body.typologyId !== undefined) updateData.typologyId = req.body.typologyId;
      if (req.body.clientId !== undefined) updateData.clientId = req.body.clientId;
      
      const doc = await storage.updateDocument(id, updateData);
      
      if (!doc) {
        return res.status(404).json({ error: "Documento no encontrado" });
      }
      
      res.json(doc);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ error: "Error al actualizar documento" });
    }
  });
  
  // Delete document
  app.delete("/api/documents/:id", requireAuth, requireDocumentPermission("edit"), async (req, res) => {
    try {
      const id = req.params.id as string;
      
      // Get the document to delete the file
      const doc = await storage.getDocument(id);
      if (!doc) {
        return res.status(404).json({ error: "Documento no encontrado" });
      }
      
      // Delete the file from disk
      const filePath = path.join(process.cwd(), doc.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      await storage.deleteDocument(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: "Error al eliminar documento" });
    }
  });
  
  // Reorder documents (update sortOrder)
  app.patch("/api/documents/reorder", requireAuth, requireDocumentPermission("edit"), async (req, res) => {
    try {
      const { documentIds } = req.body as { documentIds: string[] };
      
      if (!Array.isArray(documentIds)) {
        return res.status(400).json({ error: "documentIds debe ser un array" });
      }
      
      // Update each document with its new sort order
      for (let i = 0; i < documentIds.length; i++) {
        await storage.updateDocument(documentIds[i], { sortOrder: i });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering documents:", error);
      res.status(500).json({ error: "Error al reordenar documentos" });
    }
  });
  
  // Download document
  app.get("/api/documents/:id/download", requireAuth, requireDocumentPermission("view"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const doc = await storage.getDocument(id);
      if (!doc) {
        return res.status(404).json({ error: "Documento no encontrado" });
      }
      
      const filePath = path.join(process.cwd(), doc.fileUrl);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Archivo no encontrado en el servidor" });
      }
      
      res.download(filePath, doc.originalName);
    } catch (error) {
      console.error("Error downloading document:", error);
      res.status(500).json({ error: "Error al descargar documento" });
    }
  });
  
  // Get documents by typology
  app.get("/api/documents/typology/:typologyId", requireAuth, requireDocumentPermission("view"), async (req, res) => {
    try {
      const docs = await storage.getDocumentsByTypology(req.params.typologyId as string);
      res.json(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Error al obtener documentos" });
    }
  });

  // ============= SHARED LINKS ROUTES =============
  
  // Generate unique token for shared links
  function generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }
  
  // Get all shared links (admin view)
  app.get("/api/shared-links", requireAuth, requireDocumentPermission("edit"), async (req, res) => {
    try {
      const links = await storage.getAllSharedLinks();
      res.json(links);
    } catch (error) {
      console.error("Error fetching shared links:", error);
      res.status(500).json({ error: "Error al obtener links compartidos" });
    }
  });
  
  // Create shared link
  app.post("/api/shared-links", requireAuth, requireDocumentPermission("edit"), async (req, res) => {
    try {
      const token = generateToken();
      
      // Calculate expiration date if not permanent
      let expiresAt = null;
      if (!req.body.isPermanent) {
        const days = req.body.expirationDays || 7;
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
      }
      
      const linkData = {
        token,
        targetType: req.body.targetType || "folder",
        rootCategory: req.body.rootCategory || null,
        section: req.body.section || null,
        developerId: req.body.developerId || null,
        developmentId: req.body.developmentId || null,
        typologyId: req.body.typologyId || null,
        clientId: req.body.clientId || null,
        documentId: req.body.documentId || null,
        canView: req.body.canView !== false,
        canUpload: req.body.canUpload === true,
        isPermanent: req.body.isPermanent === true,
        expiresAt,
        requestedDocuments: req.body.requestedDocuments || null,
        createdBy: req.user!.id,
      };
      
      const validationResult = insertSharedLinkSchema.safeParse(linkData);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Datos inválidos",
          details: validationResult.error.errors,
        });
      }
      
      const link = await storage.createSharedLink(validationResult.data);
      res.status(201).json(link);
    } catch (error) {
      console.error("Error creating shared link:", error);
      res.status(500).json({ error: "Error al crear link compartido" });
    }
  });
  
  // Get single shared link
  app.get("/api/shared-links/:id", requireAuth, requireDocumentPermission("view"), async (req, res) => {
    try {
      const link = await storage.getSharedLink(req.params.id as string);
      if (!link) {
        return res.status(404).json({ error: "Link no encontrado" });
      }
      res.json(link);
    } catch (error) {
      console.error("Error fetching shared link:", error);
      res.status(500).json({ error: "Error al obtener link compartido" });
    }
  });
  
  // Update shared link
  app.put("/api/shared-links/:id", requireAuth, requireDocumentPermission("edit"), async (req, res) => {
    try {
      const updateData: Record<string, any> = {};
      if (req.body.canView !== undefined) updateData.canView = req.body.canView;
      if (req.body.canUpload !== undefined) updateData.canUpload = req.body.canUpload;
      if (req.body.isPermanent !== undefined) {
        updateData.isPermanent = req.body.isPermanent;
        if (req.body.isPermanent) {
          updateData.expiresAt = null;
        } else if (req.body.expirationDays) {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + req.body.expirationDays);
          updateData.expiresAt = expiresAt;
        }
      }
      
      const link = await storage.updateSharedLink(req.params.id as string, updateData);
      if (!link) {
        return res.status(404).json({ error: "Link no encontrado" });
      }
      res.json(link);
    } catch (error) {
      console.error("Error updating shared link:", error);
      res.status(500).json({ error: "Error al actualizar link compartido" });
    }
  });
  
  // Delete shared link
  app.delete("/api/shared-links/:id", requireAuth, requireDocumentPermission("edit"), async (req, res) => {
    try {
      await storage.deleteSharedLink(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting shared link:", error);
      res.status(500).json({ error: "Error al eliminar link compartido" });
    }
  });
  
  // ============= PUBLIC SHARED LINK ACCESS (NO AUTH) =============
  
  // Access shared content via token (no auth required)
  app.get("/api/public/share/:token", async (req, res) => {
    try {
      const link = await storage.getSharedLinkByToken(req.params.token as string);
      
      if (!link) {
        return res.status(404).json({ error: "Link no encontrado o expirado" });
      }
      
      // Check expiration
      if (!link.isPermanent && link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return res.status(410).json({ error: "Este link ha expirado" });
      }
      
      // Increment access count
      await storage.incrementSharedLinkAccess(link.id);
      
      // Get documents based on the link's target
      let docs: any[] = [];
      
      if (link.targetType === "document" && link.documentId) {
        const doc = await storage.getDocument(link.documentId);
        if (doc) docs = [doc];
      } else if (link.targetType === "folder") {
        if (link.typologyId) {
          docs = await storage.getDocumentsByTypology(link.typologyId);
        } else if (link.developmentId) {
          docs = await storage.getDocumentsByDevelopment(link.developmentId);
        } else if (link.developerId) {
          docs = await storage.getDocumentsByDeveloper(link.developerId);
        } else if (link.clientId) {
          docs = await storage.getDocumentsByClient(link.clientId);
        } else if (link.rootCategory) {
          // Get all documents by root category (trabajo, etc.)
          const allDocs = await storage.getAllDocuments();
          docs = allDocs.filter((d: any) => d.rootCategory === link.rootCategory);
        }
        
        // Filter by section if specified
        if (link.section) {
          docs = docs.filter(d => d.section === link.section);
        }
        
        // Filter only shareable documents
        docs = docs.filter(d => d.shareable);
      }
      
      res.json({
        link: {
          id: link.id,
          canView: link.canView,
          canUpload: link.canUpload,
          targetType: link.targetType,
          section: link.section,
          requestedDocuments: link.requestedDocuments,
        },
        documents: docs.map(d => ({
          id: d.id,
          name: d.name,
          originalName: d.originalName,
          fileSize: d.fileSize,
          mimeType: d.mimeType,
          section: d.section,
          createdAt: d.createdAt,
        })),
      });
    } catch (error) {
      console.error("Error accessing shared link:", error);
      res.status(500).json({ error: "Error al acceder al contenido" });
    }
  });
  
  // Download document via shared link (no auth)
  app.get("/api/public/share/:token/document/:documentId/download", async (req, res) => {
    try {
      const link = await storage.getSharedLinkByToken(req.params.token as string);
      
      if (!link || !link.canView) {
        return res.status(404).json({ error: "Link no encontrado" });
      }
      
      // Check expiration
      if (!link.isPermanent && link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return res.status(410).json({ error: "Este link ha expirado" });
      }
      
      const doc = await storage.getDocument(req.params.documentId as string);
      if (!doc) {
        return res.status(404).json({ error: "Documento no encontrado" });
      }
      
      // Verify document is shareable and matches the link context
      if (!doc.shareable) {
        return res.status(403).json({ error: "Este documento no está disponible para compartir" });
      }
      
      const filePath = path.join(process.cwd(), doc.fileUrl);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Archivo no encontrado" });
      }
      
      res.download(filePath, doc.originalName);
    } catch (error) {
      console.error("Error downloading via shared link:", error);
      res.status(500).json({ error: "Error al descargar" });
    }
  });
  
  // Upload document via shared link (no auth, but canUpload must be true)
  app.post("/api/public/share/:token/upload", documentUpload.single("file"), async (req, res) => {
    try {
      const link = await storage.getSharedLinkByToken(req.params.token as string);
      
      if (!link || !link.canUpload) {
        return res.status(403).json({ error: "No tienes permiso para subir archivos" });
      }
      
      // Check expiration
      if (!link.isPermanent && link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return res.status(410).json({ error: "Este link ha expirado" });
      }
      
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No se proporcionó ningún archivo" });
      }
      
      // Get documentType if provided (for organized uploads)
      const documentType = req.body.documentType || null;
      
      // Build document data from the link's context
      const documentData = {
        name: documentType ? `[${documentType}] ${file.originalname}` : (req.body.name || file.originalname),
        originalName: file.originalname,
        fileUrl: `/uploads/documents/${file.filename}`,
        fileSize: file.size,
        mimeType: file.mimetype,
        rootCategory: link.rootCategory || "clientes",
        section: link.section || null,
        shareable: true, // Client uploads should be visible via shared links
        developerId: link.developerId || null,
        developmentId: link.developmentId || null,
        typologyId: link.typologyId || null,
        clientId: link.clientId || null,
        description: req.body.description || null,
        uploadedBy: null, // No user for public uploads
      };
      
      const validationResult = insertDocumentSchema.safeParse(documentData);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Datos inválidos",
          details: validationResult.error.errors,
        });
      }
      
      const doc = await storage.createDocument(validationResult.data);
      res.status(201).json({
        id: doc.id,
        name: doc.name,
        message: "Archivo subido correctamente",
      });
    } catch (error) {
      console.error("Error uploading via shared link:", error);
      res.status(500).json({ error: "Error al subir archivo" });
    }
  });

  // ============= CATALOG ROUTES =============
  
  // Cities
  app.get("/api/catalog/cities", requireAuth, async (req, res) => {
    const cities = await storage.getCatalogCities();
    res.json(cities);
  });
  
  app.post("/api/catalog/cities", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogCitySchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const city = await storage.createCatalogCity(result.data);
    res.status(201).json(city);
  });
  
  app.put("/api/catalog/cities/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, active, order, isaiPercent, notariaPercent } = req.body;
    const updateData: { name?: string; active?: boolean; order?: number; isaiPercent?: string; notariaPercent?: string } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    if (isaiPercent !== undefined) updateData.isaiPercent = String(isaiPercent);
    if (notariaPercent !== undefined) updateData.notariaPercent = String(notariaPercent);
    const city = await storage.updateCatalogCity(req.params.id as string, updateData);
    if (!city) return res.status(404).json({ error: "Ciudad no encontrada" });
    res.json(city);
  });
  
  app.delete("/api/catalog/cities/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogCity(req.params.id as string);
    res.status(204).send();
  });

  // Global Settings
  const DEFAULT_GLOBAL_SETTINGS = [
    { key: "mortgageInterestPercent", value: "10.5", label: "Tasa C.H." },
    { key: "mortgageYears", value: "15", label: "Años" },
    { key: "rentRatePercent", value: "7.0", label: "Tasa Renta" },
    { key: "rentMonths", value: "11", label: "Meses" },
    { key: "appreciationRate", value: "7.0", label: "Tasa Plusvalía" },
  ];

  app.get("/api/global-settings", requireAuth, async (req, res) => {
    let settings = await storage.getGlobalSettings();
    const existingKeys = new Set(settings.map(s => s.key));
    for (const def of DEFAULT_GLOBAL_SETTINGS) {
      if (!existingKeys.has(def.key)) {
        await storage.upsertGlobalSetting(def.key, def.value, def.label);
      }
    }
    if (settings.length < DEFAULT_GLOBAL_SETTINGS.length) {
      settings = await storage.getGlobalSettings();
    }
    res.json(settings);
  });

  app.put("/api/global-settings/:key", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { value, label } = req.body;
    if (typeof value !== "string") return res.status(400).json({ error: "Value is required" });
    const setting = await storage.upsertGlobalSetting(req.params.key, value, label);
    res.json(setting);
  });
  
  // Zones
  app.get("/api/catalog/zones", requireAuth, async (req, res) => {
    const cityId = req.query.cityId as string | undefined;
    const zones = await storage.getCatalogZones(cityId);
    res.json(zones);
  });
  
  app.post("/api/catalog/zones", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogZoneSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const zone = await storage.createCatalogZone(result.data);
    res.status(201).json(zone);
  });
  
  app.put("/api/catalog/zones/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, active, order, cityId } = req.body;
    const updateData: { name?: string; active?: boolean; order?: number; cityId?: string } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    if (typeof cityId === "string") updateData.cityId = cityId;
    const zone = await storage.updateCatalogZone(req.params.id as string, updateData);
    if (!zone) return res.status(404).json({ error: "Zona no encontrada" });
    res.json(zone);
  });
  
  app.delete("/api/catalog/zones/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogZone(req.params.id as string);
    res.status(204).send();
  });
  
  // Development Types
  app.get("/api/catalog/development-types", requireAuth, async (req, res) => {
    const types = await storage.getCatalogDevelopmentTypes();
    res.json(types);
  });
  
  app.post("/api/catalog/development-types", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogDevelopmentTypeSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const type = await storage.createCatalogDevelopmentType(result.data);
    res.status(201).json(type);
  });
  
  app.put("/api/catalog/development-types/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, active, order } = req.body;
    const updateData: { name?: string; active?: boolean; order?: number } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const type = await storage.updateCatalogDevelopmentType(req.params.id as string, updateData);
    if (!type) return res.status(404).json({ error: "Tipo no encontrado" });
    res.json(type);
  });
  
  app.delete("/api/catalog/development-types/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogDevelopmentType(req.params.id as string);
    res.status(204).send();
  });
  
  // Amenities
  app.get("/api/catalog/amenities", requireAuth, async (req, res) => {
    const amenities = await storage.getCatalogAmenities();
    res.json(amenities);
  });
  
  app.post("/api/catalog/amenities", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogAmenitySchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const amenity = await storage.createCatalogAmenity(result.data);
    res.status(201).json(amenity);
  });
  
  app.put("/api/catalog/amenities/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, icon, active, order } = req.body;
    const updateData: { name?: string; icon?: string; active?: boolean; order?: number } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof icon === "string") updateData.icon = icon;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const amenity = await storage.updateCatalogAmenity(req.params.id as string, updateData);
    if (!amenity) return res.status(404).json({ error: "Amenidad no encontrada" });
    res.json(amenity);
  });
  
  app.delete("/api/catalog/amenities/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogAmenity(req.params.id as string);
    res.status(204).send();
  });
  
  // Efficiency Features
  app.get("/api/catalog/efficiency-features", requireAuth, async (req, res) => {
    const features = await storage.getCatalogEfficiencyFeatures();
    res.json(features);
  });
  
  app.post("/api/catalog/efficiency-features", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogEfficiencyFeatureSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const feature = await storage.createCatalogEfficiencyFeature(result.data);
    res.status(201).json(feature);
  });
  
  app.put("/api/catalog/efficiency-features/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, active, order } = req.body;
    const updateData: { name?: string; active?: boolean; order?: number } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const feature = await storage.updateCatalogEfficiencyFeature(req.params.id as string, updateData);
    if (!feature) return res.status(404).json({ error: "Característica no encontrada" });
    res.json(feature);
  });
  
  app.delete("/api/catalog/efficiency-features/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogEfficiencyFeature(req.params.id as string);
    res.status(204).send();
  });
  
  // Other Features
  app.get("/api/catalog/other-features", requireAuth, async (req, res) => {
    const features = await storage.getCatalogOtherFeatures();
    res.json(features);
  });
  
  app.post("/api/catalog/other-features", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogOtherFeatureSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const feature = await storage.createCatalogOtherFeature(result.data);
    res.status(201).json(feature);
  });
  
  app.put("/api/catalog/other-features/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, active, order } = req.body;
    const updateData: { name?: string; active?: boolean; order?: number } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const feature = await storage.updateCatalogOtherFeature(req.params.id as string, updateData);
    if (!feature) return res.status(404).json({ error: "Característica no encontrada" });
    res.json(feature);
  });
  
  app.delete("/api/catalog/other-features/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogOtherFeature(req.params.id as string);
    res.status(204).send();
  });
  
  // Acabados
  app.get("/api/catalog/acabados", requireAuth, async (req, res) => {
    const items = await storage.getCatalogAcabados();
    res.json(items);
  });
  
  app.post("/api/catalog/acabados", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogAcabadoSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const item = await storage.createCatalogAcabado(result.data);
    res.status(201).json(item);
  });
  
  app.put("/api/catalog/acabados/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, active, order } = req.body;
    const updateData: { name?: string; active?: boolean; order?: number } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const item = await storage.updateCatalogAcabado(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "Acabado no encontrado" });
    res.json(item);
  });
  
  app.delete("/api/catalog/acabados/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogAcabado(req.params.id as string);
    res.status(204).send();
  });
  
  // Vistas catalog
  app.get("/api/catalog/vistas", requireAuth, async (req, res) => {
    const items = await storage.getCatalogVistas();
    res.json(items);
  });

  app.post("/api/catalog/vistas", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: "Nombre requerido" });
    const item = await storage.createCatalogVista({ name, sortOrder });
    res.status(201).json(item);
  });

  app.put("/api/catalog/vistas/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, sortOrder } = req.body;
    const updateData: { name?: string; sortOrder?: number } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof sortOrder === "number") updateData.sortOrder = sortOrder;
    const item = await storage.updateCatalogVista(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "Vista no encontrada" });
    res.json(item);
  });

  app.delete("/api/catalog/vistas/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogVista(req.params.id as string);
    res.status(204).send();
  });

  // Areas catalog
  app.get("/api/catalog/areas", requireAuth, async (req, res) => {
    const items = await storage.getCatalogAreas();
    res.json(items);
  });

  app.post("/api/catalog/areas", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: "Nombre requerido" });
    const item = await storage.createCatalogArea({ name, sortOrder });
    res.status(201).json(item);
  });

  app.put("/api/catalog/areas/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, sortOrder } = req.body;
    const updateData: { name?: string; sortOrder?: number } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof sortOrder === "number") updateData.sortOrder = sortOrder;
    const item = await storage.updateCatalogArea(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "Área no encontrada" });
    res.json(item);
  });

  app.delete("/api/catalog/areas/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogArea(req.params.id as string);
    res.status(204).send();
  });

  // Tipologias catalog
  app.get("/api/catalog/tipologias", requireAuth, async (req, res) => {
    const developmentId = req.query.developmentId as string | undefined;
    const items = await storage.getCatalogTipologias(developmentId);
    res.json(items);
  });

  app.post("/api/catalog/tipologias", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, developmentId, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: "Nombre requerido" });
    const item = await storage.createCatalogTipologia({ name, developmentId, sortOrder });
    res.status(201).json(item);
  });

  app.put("/api/catalog/tipologias/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, developmentId, sortOrder, active } = req.body;
    const updateData: { name?: string; developmentId?: string; sortOrder?: number; active?: boolean } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof developmentId === "string") updateData.developmentId = developmentId;
    if (typeof sortOrder === "number") updateData.sortOrder = sortOrder;
    if (typeof active === "boolean") updateData.active = active;
    const item = await storage.updateCatalogTipologia(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "Tipología no encontrada" });
    res.json(item);
  });

  app.delete("/api/catalog/tipologias/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogTipologia(req.params.id as string);
    res.status(204).send();
  });

  // ============ NEW PROPERTY CATALOGS ============

  // Niveles catalog
  app.get("/api/catalog/niveles", requireAuth, async (req, res) => {
    const items = await storage.getCatalogNiveles();
    res.json(items);
  });
  app.post("/api/catalog/niveles", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogNivelSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const item = await storage.createCatalogNivel(result.data);
    res.status(201).json(item);
  });
  app.put("/api/catalog/niveles/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, active, order } = req.body;
    const updateData: { name?: string; active?: boolean; order?: number } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const item = await storage.updateCatalogNivel(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "Nivel no encontrado" });
    res.json(item);
  });
  app.delete("/api/catalog/niveles/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogNivel(req.params.id as string);
    res.status(204).send();
  });

  // Torres catalog
  app.get("/api/catalog/torres", requireAuth, async (req, res) => {
    const items = await storage.getCatalogTorres();
    res.json(items);
  });
  app.post("/api/catalog/torres", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogTorreSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const item = await storage.createCatalogTorre(result.data);
    res.status(201).json(item);
  });
  app.put("/api/catalog/torres/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, active, order } = req.body;
    const updateData: { name?: string; active?: boolean; order?: number } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const item = await storage.updateCatalogTorre(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "Torre no encontrada" });
    res.json(item);
  });
  app.delete("/api/catalog/torres/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogTorre(req.params.id as string);
    res.status(204).send();
  });

  // Recámaras catalog
  app.get("/api/catalog/recamaras", requireAuth, async (req, res) => {
    const items = await storage.getCatalogRecamaras();
    res.json(items);
  });
  app.post("/api/catalog/recamaras", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogRecamaraSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const item = await storage.createCatalogRecamara(result.data);
    res.status(201).json(item);
  });
  app.put("/api/catalog/recamaras/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, active, order } = req.body;
    const updateData: { name?: string; active?: boolean; order?: number } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const item = await storage.updateCatalogRecamara(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "Recámara no encontrada" });
    res.json(item);
  });
  app.delete("/api/catalog/recamaras/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogRecamara(req.params.id as string);
    res.status(204).send();
  });

  // Baños catalog
  app.get("/api/catalog/banos", requireAuth, async (req, res) => {
    const items = await storage.getCatalogBanos();
    res.json(items);
  });
  app.post("/api/catalog/banos", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogBanoSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const item = await storage.createCatalogBano(result.data);
    res.status(201).json(item);
  });
  app.put("/api/catalog/banos/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, active, order } = req.body;
    const updateData: { name?: string; active?: boolean; order?: number } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const item = await storage.updateCatalogBano(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "Baño no encontrado" });
    res.json(item);
  });
  app.delete("/api/catalog/banos/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogBano(req.params.id as string);
    res.status(204).send();
  });

  // Cajones catalog
  app.get("/api/catalog/cajones", requireAuth, async (req, res) => {
    const items = await storage.getCatalogCajones();
    res.json(items);
  });
  app.post("/api/catalog/cajones", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogCajonSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const item = await storage.createCatalogCajon(result.data);
    res.status(201).json(item);
  });
  app.put("/api/catalog/cajones/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, active, order } = req.body;
    const updateData: { name?: string; active?: boolean; order?: number } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const item = await storage.updateCatalogCajon(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "Cajón no encontrado" });
    res.json(item);
  });
  app.delete("/api/catalog/cajones/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogCajon(req.params.id as string);
    res.status(204).send();
  });

  // Nivel Mantenimiento catalog (with valor field)
  app.get("/api/catalog/nivel-mantenimiento", requireAuth, async (req, res) => {
    const items = await storage.getCatalogNivelMantenimiento();
    res.json(items);
  });
  app.post("/api/catalog/nivel-mantenimiento", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogNivelMantenimientoSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const item = await storage.createCatalogNivelMantenimiento(result.data);
    res.status(201).json(item);
  });
  app.put("/api/catalog/nivel-mantenimiento/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, valor, equipo, muebles, active, order } = req.body;
    const updateData: { name?: string; valor?: number; equipo?: number; muebles?: number; active?: boolean; order?: number } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof valor === "number") updateData.valor = valor;
    if (typeof equipo === "number") updateData.equipo = equipo;
    if (typeof muebles === "number") updateData.muebles = muebles;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const item = await storage.updateCatalogNivelMantenimiento(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "Nivel de mantenimiento no encontrado" });
    res.json(item);
  });
  app.delete("/api/catalog/nivel-mantenimiento/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogNivelMantenimiento(req.params.id as string);
    res.status(204).send();
  });

  // ============ NEW PROSPECT CATALOGS ============

  // Tipo Cliente catalog (with color)
  app.get("/api/catalog/tipo-cliente", requireAuth, async (req, res) => {
    const items = await storage.getCatalogTipoCliente();
    res.json(items);
  });
  app.post("/api/catalog/tipo-cliente", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogTipoClienteSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const item = await storage.createCatalogTipoCliente(result.data);
    res.status(201).json(item);
  });
  app.put("/api/catalog/tipo-cliente/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, color, active, order } = req.body;
    const updateData: { name?: string; color?: string; active?: boolean; order?: number } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof color === "string") updateData.color = color;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const item = await storage.updateCatalogTipoCliente(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "Tipo de cliente no encontrado" });
    res.json(item);
  });
  app.delete("/api/catalog/tipo-cliente/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogTipoCliente(req.params.id as string);
    res.status(204).send();
  });

  // Perfil catalog (with color)
  app.get("/api/catalog/perfil", requireAuth, async (req, res) => {
    const items = await storage.getCatalogPerfil();
    res.json(items);
  });
  app.post("/api/catalog/perfil", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogPerfilSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const item = await storage.createCatalogPerfil(result.data);
    res.status(201).json(item);
  });
  app.put("/api/catalog/perfil/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, color, active, order } = req.body;
    const updateData: { name?: string; color?: string; active?: boolean; order?: number } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof color === "string") updateData.color = color;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const item = await storage.updateCatalogPerfil(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "Perfil no encontrado" });
    res.json(item);
  });
  app.delete("/api/catalog/perfil/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogPerfil(req.params.id as string);
    res.status(204).send();
  });

  // Fuente catalog (with color)
  app.get("/api/catalog/fuente", requireAuth, async (req, res) => {
    const items = await storage.getCatalogFuente();
    res.json(items);
  });
  app.post("/api/catalog/fuente", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogFuenteSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const item = await storage.createCatalogFuente(result.data);
    res.status(201).json(item);
  });
  app.put("/api/catalog/fuente/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, color, active, order } = req.body;
    const updateData: { name?: string; color?: string; active?: boolean; order?: number } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof color === "string") updateData.color = color;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const item = await storage.updateCatalogFuente(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "Fuente no encontrada" });
    res.json(item);
  });
  app.delete("/api/catalog/fuente/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogFuente(req.params.id as string);
    res.status(204).send();
  });

  // Status Prospecto catalog (with color)
  app.get("/api/catalog/status-prospecto", requireAuth, async (req, res) => {
    const items = await storage.getCatalogStatusProspecto();
    res.json(items);
  });
  app.post("/api/catalog/status-prospecto", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogStatusProspectoSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const item = await storage.createCatalogStatusProspecto(result.data);
    res.status(201).json(item);
  });
  app.put("/api/catalog/status-prospecto/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, color, active, order } = req.body;
    const updateData: { name?: string; color?: string; active?: boolean; order?: number } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof color === "string") updateData.color = color;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const item = await storage.updateCatalogStatusProspecto(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "Status no encontrado" });
    res.json(item);
  });
  app.delete("/api/catalog/status-prospecto/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogStatusProspecto(req.params.id as string);
    res.status(204).send();
  });

  // Etapa Embudo catalog (with color)
  app.get("/api/catalog/etapa-embudo", requireAuth, async (req, res) => {
    const items = await storage.getCatalogEtapaEmbudo();
    res.json(items);
  });
  app.post("/api/catalog/etapa-embudo", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogEtapaEmbudoSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const item = await storage.createCatalogEtapaEmbudo(result.data);
    res.status(201).json(item);
  });
  app.put("/api/catalog/etapa-embudo/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, color, active, order } = req.body;
    const updateData: { name?: string; color?: string; active?: boolean; order?: number } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof color === "string") updateData.color = color;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const item = await storage.updateCatalogEtapaEmbudo(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "Etapa no encontrada" });
    res.json(item);
  });
  app.delete("/api/catalog/etapa-embudo/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogEtapaEmbudo(req.params.id as string);
    res.status(204).send();
  });

  // Etapa Clientes catalog
  app.get("/api/catalog/etapa-clientes", requireAuth, async (req, res) => {
    const items = await storage.getCatalogEtapaClientes();
    res.json(items);
  });
  app.post("/api/catalog/etapa-clientes", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogEtapaClientesSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const item = await storage.createCatalogEtapaClientes(result.data);
    res.status(201).json(item);
  });
  app.put("/api/catalog/etapa-clientes/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, color, active, order } = req.body;
    const updateData: { name?: string; color?: string; active?: boolean; order?: number } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof color === "string") updateData.color = color;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const item = await storage.updateCatalogEtapaClientes(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "Etapa no encontrada" });
    res.json(item);
  });
  app.delete("/api/catalog/etapa-clientes/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogEtapaClientes(req.params.id as string);
    res.status(204).send();
  });

  // Como Paga catalog
  app.get("/api/catalog/como-paga", requireAuth, async (req, res) => {
    const items = await storage.getCatalogComoPaga();
    res.json(items);
  });
  app.post("/api/catalog/como-paga", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogComoPagaSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const item = await storage.createCatalogComoPaga(result.data);
    res.status(201).json(item);
  });
  app.put("/api/catalog/como-paga/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, active, order } = req.body;
    const updateData: { name?: string; active?: boolean; order?: number } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const item = await storage.updateCatalogComoPaga(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "Opción de pago no encontrada" });
    res.json(item);
  });
  app.delete("/api/catalog/como-paga/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogComoPaga(req.params.id as string);
    res.status(204).send();
  });

  // Positivos catalog
  app.get("/api/catalog/positivos", requireAuth, async (req, res) => {
    const items = await storage.getCatalogPositivos();
    res.json(items);
  });
  app.post("/api/catalog/positivos", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogPositivoSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const item = await storage.createCatalogPositivo(result.data);
    res.status(201).json(item);
  });
  app.put("/api/catalog/positivos/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, active, order } = req.body;
    const updateData: { name?: string; active?: boolean; order?: number } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const item = await storage.updateCatalogPositivo(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "Positivo no encontrado" });
    res.json(item);
  });
  app.delete("/api/catalog/positivos/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogPositivo(req.params.id as string);
    res.status(204).send();
  });

  // Negativos catalog
  app.get("/api/catalog/negativos", requireAuth, async (req, res) => {
    const items = await storage.getCatalogNegativos();
    res.json(items);
  });
  app.post("/api/catalog/negativos", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogNegativoSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const item = await storage.createCatalogNegativo(result.data);
    res.status(201).json(item);
  });
  app.put("/api/catalog/negativos/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, active, order } = req.body;
    const updateData: { name?: string; active?: boolean; order?: number } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const item = await storage.updateCatalogNegativo(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "Negativo no encontrado" });
    res.json(item);
  });
  app.delete("/api/catalog/negativos/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogNegativo(req.params.id as string);
    res.status(204).send();
  });

  // Asesor catalog
  app.get("/api/catalog/asesor", requireAuth, async (req, res) => {
    const items = await storage.getCatalogAsesor();
    res.json(items);
  });
  app.post("/api/catalog/asesor", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const item = await storage.createCatalogAsesor(req.body);
    res.status(201).json(item);
  });
  app.put("/api/catalog/asesor/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const item = await storage.updateCatalogAsesor(req.params.id as string, req.body);
    if (!item) return res.status(404).json({ error: "No encontrado" });
    res.json(item);
  });
  app.delete("/api/catalog/asesor/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogAsesor(req.params.id as string);
    res.status(204).send();
  });

  // Broker Externo catalog
  app.get("/api/catalog/broker-externo", requireAuth, async (req, res) => {
    const items = await storage.getCatalogBrokerExterno();
    res.json(items);
  });
  app.post("/api/catalog/broker-externo", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const item = await storage.createCatalogBrokerExterno(req.body);
    res.status(201).json(item);
  });
  app.put("/api/catalog/broker-externo/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const item = await storage.updateCatalogBrokerExterno(req.params.id as string, req.body);
    if (!item) return res.status(404).json({ error: "No encontrado" });
    res.json(item);
  });
  app.delete("/api/catalog/broker-externo/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogBrokerExterno(req.params.id as string);
    res.status(204).send();
  });

  // Tipo de Contrato
  app.get("/api/catalog/tipo-contrato", requireAuth, async (req, res) => {
    const items = await storage.getCatalogTipoContrato();
    res.json(items);
  });
  
  app.post("/api/catalog/tipo-contrato", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogTipoContratoSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const item = await storage.createCatalogTipoContrato(result.data);
    res.status(201).json(item);
  });
  
  app.put("/api/catalog/tipo-contrato/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, active, order } = req.body;
    const updateData: { name?: string; active?: boolean; order?: number } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const item = await storage.updateCatalogTipoContrato(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "No encontrado" });
    res.json(item);
  });
  
  app.delete("/api/catalog/tipo-contrato/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogTipoContrato(req.params.id as string);
    res.status(204).send();
  });

  // Cesión de Derechos
  app.get("/api/catalog/cesion-derechos", requireAuth, async (req, res) => {
    const items = await storage.getCatalogCesionDerechos();
    res.json(items);
  });
  
  app.post("/api/catalog/cesion-derechos", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogCesionDerechosSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const item = await storage.createCatalogCesionDerechos(result.data);
    res.status(201).json(item);
  });
  
  app.put("/api/catalog/cesion-derechos/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, active, order } = req.body;
    const updateData: { name?: string; active?: boolean; order?: number } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const item = await storage.updateCatalogCesionDerechos(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "No encontrado" });
    res.json(item);
  });
  
  app.delete("/api/catalog/cesion-derechos/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogCesionDerechos(req.params.id as string);
    res.status(204).send();
  });

  // Presentación
  app.get("/api/catalog/presentacion", requireAuth, async (req, res) => {
    const items = await storage.getCatalogPresentacion();
    res.json(items);
  });
  
  app.post("/api/catalog/presentacion", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogPresentacionSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const item = await storage.createCatalogPresentacion(result.data);
    res.status(201).json(item);
  });
  
  app.put("/api/catalog/presentacion/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, active, order } = req.body;
    const updateData: { name?: string; active?: boolean; order?: number } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const item = await storage.updateCatalogPresentacion(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "No encontrado" });
    res.json(item);
  });
  
  app.delete("/api/catalog/presentacion/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogPresentacion(req.params.id as string);
    res.status(204).send();
  });

  // Tipo de Proveedor
  app.get("/api/catalog/tipo-proveedor", requireAuth, async (req, res) => {
    const items = await storage.getCatalogTipoProveedor();
    res.json(items);
  });
  app.post("/api/catalog/tipo-proveedor", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogTipoProveedorSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const item = await storage.createCatalogTipoProveedor(result.data);
    res.status(201).json(item);
  });
  app.put("/api/catalog/tipo-proveedor/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, active, order } = req.body;
    const updateData: any = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const item = await storage.updateCatalogTipoProveedor(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "No encontrado" });
    res.json(item);
  });
  app.delete("/api/catalog/tipo-proveedor/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogTipoProveedor(req.params.id as string);
    res.json({ success: true });
  });

  // Incluye
  app.get("/api/catalog/incluye", requireAuth, async (req, res) => {
    const items = await storage.getCatalogIncluye();
    res.json(items);
  });
  app.post("/api/catalog/incluye", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogIncluyeSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const item = await storage.createCatalogIncluye(result.data);
    res.status(201).json(item);
  });
  app.put("/api/catalog/incluye/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, active, order } = req.body;
    const updateData: any = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const item = await storage.updateCatalogIncluye(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "No encontrado" });
    res.json(item);
  });
  app.delete("/api/catalog/incluye/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogIncluye(req.params.id as string);
    res.json({ success: true });
  });

  // Si/No
  app.get("/api/catalog/si-no", requireAuth, async (req, res) => {
    const items = await storage.getCatalogSiNo();
    res.json(items);
  });
  app.post("/api/catalog/si-no", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogSiNoSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const item = await storage.createCatalogSiNo(result.data);
    res.status(201).json(item);
  });
  app.put("/api/catalog/si-no/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, active, order } = req.body;
    const updateData: any = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof active === "boolean") updateData.active = active;
    if (typeof order === "number") updateData.order = order;
    const item = await storage.updateCatalogSiNo(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "No encontrado" });
    res.json(item);
  });
  app.delete("/api/catalog/si-no/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogSiNo(req.params.id as string);
    res.json({ success: true });
  });

  // My permissions endpoint — returns DB overrides for current user's role
  app.get("/api/my-permissions", requireAuth, async (req: any, res) => {
    const user = req.user as User;
    const allPerms = await storage.getRolePermissions();
    const myPerms = allPerms.filter(p => p.role === user.role);
    res.json(myPerms);
  });

  // Role Permissions API
  app.get("/api/role-permissions", requireAuth, requireRole("admin"), async (req, res) => {
    const permissions = await storage.getRolePermissions();
    res.json(permissions);
  });

  app.get("/api/role-permissions/:section", requireAuth, requireRole("admin"), async (req, res) => {
    const permissions = await storage.getRolePermissionsBySection(req.params.section as string);
    res.json(permissions);
  });

  app.get("/api/catalog/avisos", requireAuth, async (req, res) => {
    let items = await storage.getCatalogAvisos();
    // Auto-seed the fixed "Medios" aviso if it doesn't exist
    if (!items.some(i => i.field === "media")) {
      const seeded = await storage.createCatalogAviso({ name: "Medios", field: "media", minQuantity: 1 });
      items = [...items, seeded];
    }
    res.json(items);
  });

  app.post("/api/catalog/avisos", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const result = insertCatalogAvisoSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
    const item = await storage.createCatalogAviso(result.data);
    res.status(201).json(item);
  });

  app.put("/api/catalog/avisos/:id", requireAuth, requireRole("admin", "actualizador"), async (req, res) => {
    const { name, field, minQuantity, active } = req.body;
    const updateData: { name?: string; field?: string; minQuantity?: number; active?: boolean } = {};
    if (typeof name === "string") updateData.name = name;
    if (typeof field === "string") updateData.field = field;
    if (typeof minQuantity === "number") updateData.minQuantity = minQuantity;
    if (typeof active === "boolean") updateData.active = active;
    const item = await storage.updateCatalogAviso(req.params.id as string, updateData);
    if (!item) return res.status(404).json({ error: "No encontrado" });
    res.json(item);
  });

  app.delete("/api/catalog/avisos/:id", requireAuth, requireRole("admin"), async (req, res) => {
    await storage.deleteCatalogAviso(req.params.id as string);
    res.status(204).send();
  });

  app.post("/api/role-permissions", requireAuth, requireRole("admin"), async (req, res) => {
    const { section, field, role, permissionLevel } = req.body;
    if (!section || !field || !role || !permissionLevel) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }
    if (!['none', 'view', 'edit'].includes(permissionLevel)) {
      return res.status(400).json({ error: "Nivel de permiso inválido" });
    }
    const permission = await storage.upsertRolePermission(section, field, role, permissionLevel);
    res.json(permission);
  });

  return httpServer;
}
