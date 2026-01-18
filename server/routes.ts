import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPropertySchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
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

  app.post("/api/properties", async (req, res) => {
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

  app.put("/api/properties/:id", async (req, res) => {
    try {
      const { id } = req.params;
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

  app.delete("/api/properties/:id", async (req, res) => {
    try {
      const { id } = req.params;
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

  return httpServer;
}
