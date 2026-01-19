import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPropertySchema, insertClientSchema, loginSchema, contactFormSchema, insertUserSchema } from "@shared/schema";
import { authenticateUser, createSession, validateSession, createUserWithHashedPassword, hashPassword, seedAdminUser } from "./auth";
import type { User } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

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

const upload = multer({
  storage: storageConfig,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const allowedVideoTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de archivo no permitido"));
    }
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Seed admin user on startup
  await seedAdminUser();
  
  // Serve uploaded files statically
  app.use("/uploads", (req, res, next) => {
    const filePath = path.join(uploadDir, req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: "Archivo no encontrado" });
    }
  });
  
  // ============ FILE UPLOAD ROUTES ============
  
  app.post("/api/upload", requireAuth, requireRole("admin", "actualizador"), upload.array("files", 20), async (req, res) => {
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
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Error al actualizar usuario" });
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
        name: validationResult.data.name,
        phone: validationResult.data.phone,
        email: validationResult.data.email || null,
        interest: validationResult.data.interest || null,
        source: "web",
        status: "nuevo",
      });
      
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
  
  app.get("/api/clients/:id", requireAuth, requireRole("admin", "perfilador", "asesor"), async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id as string);
      if (!client) {
        return res.status(404).json({ error: "Cliente no encontrado" });
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
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ error: "Error al crear cliente" });
    }
  });
  
  app.put("/api/clients/:id", requireAuth, requireRole("admin", "perfilador", "asesor"), async (req, res) => {
    try {
      const client = await storage.updateClient(req.params.id as string, req.body);
      if (!client) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ error: "Error al actualizar cliente" });
    }
  });
  
  app.delete("/api/clients/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      await storage.deleteClient(req.params.id as string);
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
  
  // ============ PROPERTY ROUTES ============
  
  app.get("/api/properties", async (req, res) => {
    try {
      const properties = await storage.getAllProperties();
      res.json(properties);
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
      
      res.json(property);
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
      
      res.json(property);
    } catch (error) {
      console.error("Error updating property:", error);
      res.status(500).json({ error: "Error al actualizar la propiedad" });
    }
  });

  app.delete("/api/properties/:id", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const deleted = await storage.deleteProperty(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Propiedad no encontrada" });
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

  return httpServer;
}
