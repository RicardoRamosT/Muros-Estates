import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Field-level permissions: each field has view and edit boolean
export const fieldPermissionSchema = z.object({
  view: z.boolean(),
  edit: z.boolean(),
});

export const fieldPermissionsSchema = z.record(z.string(), fieldPermissionSchema).optional();

// Permission structure for each section: { view, edit, fields (optional) }
export const sectionPermissionSchema = z.object({
  view: z.boolean(),
  edit: z.boolean(),
  fields: fieldPermissionsSchema,
});

export const permissionsSchema = z.object({
  propiedades: sectionPermissionSchema.optional(),
  desarrollos: sectionPermissionSchema.optional(),
  clientes: sectionPermissionSchema.optional(),
  usuarios: sectionPermissionSchema.optional(),
  documentos: sectionPermissionSchema.optional(),
}).optional();

export type UserPermissions = z.infer<typeof permissionsSchema>;
export type FieldPermissions = z.infer<typeof fieldPermissionsSchema>;

// Permission levels: 'none' = no access, 'view' = read only, 'edit' = read+write
export type PermissionLevel = 'none' | 'view' | 'edit';

// Role-based permissions matrix for each page
// Based on Excel format: black=none, yellow=view, green=edit
export const PAGE_PERMISSIONS = {
  desarrolladores: {
    // Todos los roles tienen acceso a la página
    allowedRoles: ['admin', 'actualizador', 'perfilador', 'finanzas', 'asesor', 'desarrollador'],
    // Permisos por campo según matriz Excel: negro=none, amarillo=view, verde=edit
    fields: {
      // Campos automáticos (ID, Tipo, Activo) - todos ven (amarillo para perfilador)
      id: { admin: 'view', actualizador: 'view', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      tipo: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      active: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // Datos principales (azul en Excel) - perfilador no ve (negro)
      name: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      razonSocial: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      rfc: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      domicilio: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      antiguedad: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      tipos: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      representante: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // Contacto - perfilador ve (amarillo), admin/actualizador editan (verde)
      contactName: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      contactPhone: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      contactEmail: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // Legales - todos pueden acceder (verde para todos)
      legales: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'edit', asesor: 'edit', desarrollador: 'edit' },
    } as Record<string, Record<string, PermissionLevel>>,
  },
  // Permisos para subsecciones de documentos legales del desarrollador
  documentosLegalesDesarrollador: {
    allowedRoles: ['admin', 'actualizador', 'perfilador', 'finanzas', 'asesor', 'desarrollador'],
    sections: {
      identidad: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'edit' },
      corporativo: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'edit' },
      // Finanzas y Asesor no pueden ver convenios (negro)
      convenios: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'none', asesor: 'none', desarrollador: 'edit' },
    } as Record<string, Record<string, PermissionLevel>>,
  },
  // Permisos para Desarrollos - según matriz Excel
  desarrollos: {
    allowedRoles: ['admin', 'actualizador', 'perfilador', 'finanzas', 'asesor', 'desarrollador'],
    fields: {
      // Columnas básicas (ID hasta Otros) - Admin/Updater/Profiler=edit, Finanzas/Asesor=view, Desarrollador=none
      id: { admin: 'view', actualizador: 'view', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      active: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      developerId: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      name: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      city: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      zone: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      zone2: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      zone3: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      type: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      nivel: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      torres: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      niveles: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      amenities: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      efficiency: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      otherFeatures: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      // TAMAÑO (Desde, Hasta) - Admin/Updater/Profiler=edit, Finanzas/Asesor=view, Desarrollador=none
      tamanoDesde: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      tamanoHasta: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      // Lock Off (standalone) - Admin/Updater/Profiler=edit, Finanzas/Asesor=view, Desarrollador=none
      lockOff: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      // REC (Desde, Hasta) - Admin/Updater/Profiler=edit, Finanzas/Asesor=view, Desarrollador=none
      recDesde: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      recHasta: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      // Acabados (standalone) - Admin/Updater/Profiler=edit, Finanzas/Asesor=view, Desarrollador=none
      acabados: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      // UNIDADES Y METROS CUADRADOS - Admin/Updater=edit, Profiler/Finanzas/Asesor=view, Desarrollador=none
      depasM2: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      localesM2: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      oficinasM2: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      saludM2: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      // Inicio Preventa, Tiempo Transc. (standalone) - Admin/Updater=edit, Profiler/Finanzas/Asesor=view, Desarrollador=none
      inicioPreventa: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      tiempoTransc: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      // DEPAS (Unidades, Vendidas, %) - Admin/Updater=edit, Profiler/Finanzas/Asesor=view, Desarrollador=none
      depasUnidades: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      depasVendidas: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      depasPorcentaje: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      // LOCALES (Unidades, Vendidas, %) - Admin/Updater=edit, Profiler/Finanzas/Asesor=view, Desarrollador=none
      localesUnidades: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      localesVendidas: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      localesPorcentaje: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      // OFICINAS (Unidades, Vendidas, %) - Admin/Updater=edit, Profiler/Finanzas/Asesor=view, Desarrollador=none
      oficinasUnidades: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      oficinasVendidas: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      oficinasPorcentaje: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      // SALUD (Unidades, Vendidas, %) - Admin/Updater=edit, Profiler/Finanzas/Asesor=view, Desarrollador=none
      saludUnidades: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      saludVendidas: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      saludPorcentaje: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      // INICIO (Proyectado, Real) - Admin/Updater=edit, Profiler/Finanzas/Asesor=view, Desarrollador=none
      inicioProyectado: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      inicioReal: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      // ENTREGA (Proyectada, Actualizada) - Admin/Updater=edit, Profiler/Finanzas/Asesor=view, Desarrollador=none
      entregaProyectada: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      entregaActualizada: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      // VENTAS (Nombre, Teléfono, Correo) - Admin/Updater=edit, Profiler/Finanzas/Asesor=view, Desarrollador=none
      ventasNombre: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      ventasTelefono: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      ventasCorreo: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      // PAGOS (Nombre, Teléfono, Correo) - Admin/Updater=edit, Profiler/Finanzas/Asesor=view, Desarrollador=none
      pagosNombre: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      pagosTelefono: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      pagosCorreo: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      // Comercializadora (standalone) - Admin/Updater=edit, Profiler/Asesor=view, Finanzas=none, Desarrollador=none
      comercializadora: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'none' },
      // Arquitectura (standalone) - Admin/Updater=edit, Profiler/Asesor=view, Finanzas=none, Desarrollador=none
      arquitectura: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'none' },
      // Location (standalone) - Admin/Updater=edit, Profiler/Asesor=view, Finanzas=none, Desarrollador=none
      location: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'none' },
      // LEGALES folder - Admin/Updater/Profiler=edit, Finanzas=view (solo convenios), Asesor=view (no convenios), Desarrollador=view
      legalesFolder: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // VENTA folder - Admin/Updater=edit, Profiler/Asesor=view, Finanzas=none, Desarrollador=none
      ventaFolder: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'none' },
    } as Record<string, Record<string, PermissionLevel>>,
  },
  // Permisos para subsecciones de documentos legales del desarrollo
  documentosLegalesDesarrollo: {
    allowedRoles: ['admin', 'actualizador', 'perfilador', 'finanzas', 'asesor', 'desarrollador'],
    sections: {
      identidad: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      corporativo: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // Finanzas SOLO puede ver convenios, Asesor NO puede ver convenios (negro)
      convenios: { admin: 'edit', actualizador: 'edit', perfilador: 'edit', finanzas: 'view', asesor: 'none', desarrollador: 'view' },
    } as Record<string, Record<string, PermissionLevel>>,
  },
  // Permisos para Prospectos - solo 3 roles pueden acceder
  prospectos: {
    allowedRoles: ['admin', 'perfilador', 'asesor'],
    fields: {
      // Auto-generated fields (fecha, hora from createdAt) 
      // Admin: edit (puede corregir), Perfilador: view, Asesor: view
      createdAt: { admin: 'edit', perfilador: 'view', asesor: 'view' },
      
      // Asesor - Admin: edit, Perfilador: edit, Asesor: view
      asesorId: { admin: 'edit', perfilador: 'edit', asesor: 'view' },
      
      // Location - Admin: edit, Perfilador: view, Asesor: view
      ciudad: { admin: 'edit', perfilador: 'view', asesor: 'view' },
      zona: { admin: 'edit', perfilador: 'view', asesor: 'view' },
      
      // Development - Admin: edit, Perfilador: view, Asesor: view
      desarrollador: { admin: 'edit', perfilador: 'view', asesor: 'view' },
      desarrollo: { admin: 'edit', perfilador: 'view', asesor: 'view' },
      tipologia: { admin: 'edit', perfilador: 'view', asesor: 'view' },
      
      // Personal info - Admin: edit, Perfilador: edit, Asesor: edit
      nombre: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
      apellido: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
      telefono: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
      correo: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
      
      // Profile - Admin: edit, Perfilador: edit, Asesor: edit
      tipofil: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
      perfil: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
      comoLlega: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
      
      // Broker externo - Admin: edit, Perfilador: edit, Asesor: view
      brokerExterno: { admin: 'edit', perfilador: 'edit', asesor: 'view' },
      
      // Status/funnel - Admin: edit, Perfilador: edit, Asesor: edit
      estatus: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
      embudo: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
      comoPaga: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
      
      // Evaluation - Admin: edit, Perfilador: edit, Asesor: edit
      positivos: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
      negativos: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
      comentarios: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
    } as Record<string, Record<string, PermissionLevel>>,
  },
} as const;

// Helper function to get field permission for a role
export function getFieldPermission(page: keyof typeof PAGE_PERMISSIONS, field: string, role: string): PermissionLevel {
  const pagePerms = PAGE_PERMISSIONS[page];
  if (!pagePerms) return 'none';
  
  // Handle pages with 'fields' property
  if ('fields' in pagePerms) {
    const fieldPerms = pagePerms.fields[field];
    if (!fieldPerms) return 'none';
    return (fieldPerms as Record<string, PermissionLevel>)[role] || 'none';
  }
  
  // Handle pages with 'sections' property (like documentosLegalesDesarrollador)
  if ('sections' in pagePerms) {
    const sectionPerms = pagePerms.sections[field];
    if (!sectionPerms) return 'none';
    return (sectionPerms as Record<string, PermissionLevel>)[role] || 'none';
  }
  
  return 'none';
}

// Check if role can access page
export function canAccessPage(page: keyof typeof PAGE_PERMISSIONS, role: string): boolean {
  const pagePerms = PAGE_PERMISSIONS[page];
  if (!pagePerms) return false;
  return (pagePerms.allowedRoles as readonly string[]).includes(role);
}

// Editable fields per section (for UI and validation)
export const EDITABLE_FIELDS = {
  propiedades: [
    { key: "title", label: "Título" },
    { key: "description", label: "Descripción" },
    { key: "price", label: "Precio" },
    { key: "city", label: "Ciudad" },
    { key: "zone", label: "Zona" },
    { key: "developer", label: "Desarrollador" },
    { key: "developmentName", label: "Nombre del desarrollo" },
    { key: "developmentType", label: "Tipo de desarrollo" },
    { key: "address", label: "Dirección" },
    { key: "bedrooms", label: "Recámaras" },
    { key: "bathrooms", label: "Baños" },
    { key: "area", label: "Área (m²)" },
    { key: "floor", label: "Piso" },
    { key: "parking", label: "Estacionamientos" },
    { key: "deliveryDate", label: "Fecha de entrega" },
    { key: "deliveryMonths", label: "Entrega (meses)" },
    { key: "downPayment", label: "Enganche (%)" },
    { key: "status", label: "Estado" },
    { key: "featured", label: "Destacado" },
    { key: "images", label: "Imágenes" },
    { key: "videos", label: "Videos" },
    { key: "amenities", label: "Amenidades" },
    { key: "efficiency", label: "Eficiencia" },
    { key: "otherFeatures", label: "Otras características" },
    { key: "value", label: "Propuesta de valor" },
  ],
  desarrollos: [
    { key: "developer", label: "Desarrollador" },
    { key: "developmentName", label: "Nombre" },
    { key: "developmentType", label: "Tipo" },
    { key: "city", label: "Ciudad" },
    { key: "zone", label: "Zona" },
  ],
  clientes: [
    { key: "name", label: "Nombre" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Teléfono" },
    { key: "interest", label: "Interés" },
    { key: "notes", label: "Notas" },
    { key: "status", label: "Estado" },
    { key: "source", label: "Origen" },
    { key: "assignedTo", label: "Asignado a" },
    { key: "developmentInterest", label: "Desarrollo de interés" },
  ],
  usuarios: [
    { key: "name", label: "Nombre" },
    { key: "username", label: "Usuario" },
    { key: "email", label: "Email" },
    { key: "password", label: "Contraseña" },
    { key: "role", label: "Rol" },
    { key: "active", label: "Activo" },
    { key: "permissions", label: "Permisos" },
  ],
  documentos: [
    { key: "upload", label: "Subir documentos" },
    { key: "download", label: "Descargar documentos" },
    { key: "delete", label: "Eliminar documentos" },
    { key: "clientes", label: "Contenido de Clientes" },
    { key: "desarrolladores", label: "Contenido de Desarrolladores" },
    { key: "uploadContent", label: "Contenido de Upload" },
  ],
} as const;

// User roles: admin, perfilador, asesor, actualizador
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  role: text("role").notNull().default("asesor"),
  active: boolean("active").default(true),
  permissions: jsonb("permissions").$type<UserPermissions>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Sessions for authentication
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

// Developers (empresas desarrolladoras)
export const developers = pgTable("developers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Campos automáticos
  tipo: text("tipo"), // Tipo de desarrollador
  active: boolean("active").default(true),
  // Datos principales
  name: text("name").notNull().unique(), // DESARROLLADOR
  razonSocial: text("razon_social"), // Razón Social
  rfc: text("rfc"), // RFC
  domicilio: text("domicilio"), // Domicilio fiscal/legal
  antiguedad: text("antiguedad"), // Antigüedad en el mercado
  tipos: text("tipos"), // Tipos de desarrollos que hace
  representante: text("representante"), // Representante legal
  // Contacto
  contactName: text("contact_name"), // Nombre del contacto
  contactPhone: text("contact_phone"), // Teléfono del contacto
  contactEmail: text("contact_email"), // Email del contacto
  // Legales
  legales: text("legales"), // Información legal/documentos
  // Campos adicionales
  logo: text("logo"), // URL del logo
  website: text("website"),
  shortName: text("short_name"), // Nombre corto/abreviación
  address: text("address"),
  description: text("description"),
  notes: text("notes"), // Notas internas
  order: integer("order").default(0), // Para ordenar en listas
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDeveloperSchema = createInsertSchema(developers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDeveloper = z.infer<typeof insertDeveloperSchema>;
export type Developer = typeof developers.$inferSelect;

// Developments (proyectos/edificios)
export const developments = pgTable("developments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  developerId: varchar("developer_id").references(() => developers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  city: text("city"),
  zone: text("zone"),
  zone2: text("zone_2"), // Zona 2
  zone3: text("zone_3"), // Zona 3
  type: text("type"), // Tipo de desarrollo (Residencial, Uso mixto, etc.)
  nivel: text("nivel"), // Nivel
  torres: integer("torres"), // Número de torres
  niveles: integer("niveles"), // Número de niveles
  amenities: text("amenities").array(), // Lista de amenidades
  efficiency: text("efficiency").array(), // Características de eficiencia
  otherFeatures: text("other_features").array(), // Otras características (Otros)
  
  // Tamaño
  tamanoDesde: decimal("tamano_desde", { precision: 10, scale: 2 }),
  tamanoHasta: decimal("tamano_hasta", { precision: 10, scale: 2 }),
  lockOff: boolean("lock_off"),
  dish: boolean("dish"),
  
  // REC
  recDesde: decimal("rec_desde", { precision: 10, scale: 2 }),
  recHasta: decimal("rec_hasta", { precision: 10, scale: 2 }),
  acabados: text("acabados"),
  
  // Unidades y Metros Cuadrados
  depasM2: decimal("depas_m2", { precision: 10, scale: 2 }),
  localesM2: decimal("locales_m2", { precision: 10, scale: 2 }),
  oficinasM2: decimal("oficinas_m2", { precision: 10, scale: 2 }),
  saludM2: decimal("salud_m2", { precision: 10, scale: 2 }),
  inicioPreventa: text("inicio_preventa"),
  tiempoTransc: text("tiempo_transc"),
  
  // Depas
  depasUnidades: integer("depas_unidades"),
  depasVendidas: integer("depas_vendidas"),
  depasPorcentaje: decimal("depas_porcentaje", { precision: 5, scale: 2 }),
  
  // Locales
  localesPorcentaje: decimal("locales_porcentaje", { precision: 5, scale: 2 }),
  localesUnidades: integer("locales_unidades"),
  localesVendidas: integer("locales_vendidas"),
  
  // Oficinas
  oficinasPorcentaje: decimal("oficinas_porcentaje", { precision: 5, scale: 2 }),
  oficinasUnidades: integer("oficinas_unidades"),
  oficinasVendidas: integer("oficinas_vendidas"),
  
  // Salud
  saludUnidades: integer("salud_unidades"),
  saludVendidas: integer("salud_vendidas"),
  saludPorcentaje: decimal("salud_porcentaje", { precision: 5, scale: 2 }),
  
  // Inicio
  inicioProyectado: text("inicio_proyectado"),
  inicioReal: text("inicio_real"),
  
  // Entrega
  entregaProyectada: text("entrega_proyectada"),
  entregaActualizada: text("entrega_actualizada"),
  
  // Ventas (Nombre, Teléfono, Correo)
  ventasNombre: text("ventas_nombre"),
  ventasTelefono: text("ventas_telefono"),
  ventasCorreo: text("ventas_correo"),
  
  // Pagos (contacto de pagos)
  pagosNombre: text("pagos_nombre"),
  pagosTelefono: text("pagos_telefono"),
  pagosCorreo: text("pagos_correo"),
  
  // Legales
  comercializacion: text("comercializacion"),
  arquitectura: text("arquitectura"),
  convenios: text("convenios"),
  
  // Location y Venta
  location: text("location"),
  venta: text("venta"),
  
  // Campos existentes mantenidos
  address: text("address"),
  description: text("description"),
  deliveryDate: text("delivery_date"), // Fecha estimada de entrega
  latitude: text("latitude"), // Coordenada de ubicación
  longitude: text("longitude"), // Coordenada de ubicación
  notes: text("notes"), // Notas internas
  totalUnits: integer("total_units"), // Total de unidades
  availableUnits: integer("available_units"), // Unidades disponibles
  value: text("value"), // Propuesta de valor
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDevelopmentSchema = createInsertSchema(developments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDevelopment = z.infer<typeof insertDevelopmentSchema>;
export type Development = typeof developments.$inferSelect;

// Clients (leads/prospects) from contact form or manually created
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Auto-generated fields (fecha, hora)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  // Asesor assigned
  asesorId: varchar("asesor_id").references(() => users.id),
  
  // Location
  ciudad: text("ciudad"),
  zona: text("zona"),
  
  // Development interest
  desarrollador: text("desarrollador"),
  desarrollo: text("desarrollo"),
  tipologia: text("tipologia"),
  
  // Personal info
  nombre: text("nombre").notNull(),
  apellido: text("apellido"),
  telefono: text("telefono").notNull(),
  correo: text("correo"),
  
  // Profile/filter info
  tipofil: text("tipofil"), // tipo de filtro/perfil
  perfil: text("perfil"),
  comoLlega: text("como_llega").default("web"), // source
  brokerExterno: text("broker_externo"),
  
  // Status and funnel
  estatus: text("estatus").notNull().default("nuevo"),
  embudo: text("embudo"),
  comoPaga: text("como_paga"),
  
  // Evaluation
  positivos: text("positivos"),
  negativos: text("negativos"),
  comentarios: text("comentarios"),
  
  // Legacy/system fields
  isClient: boolean("is_client").notNull().default(false),
  convertedAt: timestamp("converted_at"),
  
  // Keep old fields for backward compatibility (will migrate data)
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  interest: text("interest"),
  notes: text("notes"),
  status: text("status"),
  source: text("source"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  developmentInterest: text("development_interest"),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// Properties (developments)
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  city: text("city").notNull(),
  zone: text("zone").notNull(),
  developer: text("developer").notNull(),
  developmentName: text("development_name").notNull(),
  developmentType: text("development_type").notNull(),
  address: text("address").notNull(),
  bedrooms: text("bedrooms").notNull(),
  bathrooms: text("bathrooms").notNull(),
  area: decimal("area", { precision: 10, scale: 2 }).notNull(),
  floor: integer("floor"),
  parking: integer("parking").default(0),
  deliveryDate: text("delivery_date"),
  deliveryMonths: integer("delivery_months"), // Months until delivery (for filtering)
  downPayment: integer("down_payment"), // Down payment percentage (e.g., 10, 15, 20)
  status: text("status").notNull().default("available"),
  featured: boolean("featured").default(false),
  images: text("images").array().notNull(),
  videos: text("videos").array(),
  amenities: text("amenities").array().notNull(),
  efficiency: text("efficiency").array(),
  otherFeatures: text("other_features").array(),
  value: text("value"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
});

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

// Development assignments (perfilador assigns developments to asesores)
export const developmentAssignments = pgTable("development_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  developmentId: varchar("development_id").notNull().references(() => properties.id),
  asesorId: varchar("asesor_id").notNull().references(() => users.id),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDevelopmentAssignmentSchema = createInsertSchema(developmentAssignments).omit({
  id: true,
  createdAt: true,
});

export type InsertDevelopmentAssignment = z.infer<typeof insertDevelopmentAssignmentSchema>;
export type DevelopmentAssignment = typeof developmentAssignments.$inferSelect;

// Client follow-ups (asesor marks interest/status)
export const clientFollowUps = pgTable("client_follow_ups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClientFollowUpSchema = createInsertSchema(clientFollowUps).omit({
  id: true,
  createdAt: true,
});

export type InsertClientFollowUp = z.infer<typeof insertClientFollowUpSchema>;
export type ClientFollowUp = typeof clientFollowUps.$inferSelect;

// Typologies (Excel-like spreadsheet for property units)
export const typologies = pgTable("typologies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id, { onDelete: "cascade" }),
  
  // GENERALES
  city: text("city").notNull(),
  zone: text("zone").notNull(),
  developer: text("developer").notNull(),
  development: text("development").notNull(),
  type: text("type"), // Tipo (e.g., A, B, C)
  level: integer("level"), // Nivel/Piso
  view: text("view"), // Vista (Norte, Sur, Este, Oeste)
  
  // PRECIO
  size: decimal("size", { precision: 10, scale: 2 }), // Tamaño m²
  price: decimal("price", { precision: 14, scale: 2 }), // Precio base
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }), // Bonc% / Descuento %
  discountAmount: decimal("discount_amount", { precision: 14, scale: 2 }), // Monto descuento
  finalPrice: decimal("final_price", { precision: 14, scale: 2 }), // Precio Final (calculado)
  pricePerM2: decimal("price_per_m2", { precision: 12, scale: 2 }), // Precio/M² (calculado)
  
  // DISTRIBUCIÓN
  bedrooms: integer("bedrooms"),
  flex: integer("flex"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
  livingRoom: boolean("living_room").default(true), // Sala
  diningRoom: boolean("dining_room").default(true), // Comedor
  kitchen: boolean("kitchen").default(true), // Cocina
  balcony: decimal("balcony", { precision: 5, scale: 2 }), // Balcón m²
  terrace: decimal("terrace", { precision: 5, scale: 2 }), // Terraza m²
  laundry: boolean("laundry").default(false), // Lavandería
  serviceRoom: boolean("service_room").default(false), // Cuarto de servicio
  parkingSpots: integer("parking_spots").default(1), // Cajones
  storage: boolean("storage").default(false), // Bodega
  
  // ESQUEMA DE PAGO
  initialPercent: decimal("initial_percent", { precision: 5, scale: 2 }), // Inicial %
  initialAmount: decimal("initial_amount", { precision: 14, scale: 2 }), // Monto Inicial
  duringConstructionPercent: decimal("during_construction_percent", { precision: 5, scale: 2 }), // En Plazo %
  duringConstructionAmount: decimal("during_construction_amount", { precision: 14, scale: 2 }), // Monto Plazo
  paymentMonths: integer("payment_months"), // Meses
  monthlyPayment: decimal("monthly_payment", { precision: 12, scale: 2 }), // Mensualidad
  downPaymentPercent: decimal("down_payment_percent", { precision: 5, scale: 2 }), // Enganche %
  remainingAmount: decimal("remaining_amount", { precision: 14, scale: 2 }), // Resto
  deliveryDate: text("delivery_date"), // Entrega
  
  // GASTOS DESPUÉS DE LA ENTREGA
  isaPercent: decimal("isa_percent", { precision: 5, scale: 2 }), // ISA %
  notaryFees: decimal("notary_fees", { precision: 12, scale: 2 }), // Notaría
  equipmentCost: decimal("equipment_cost", { precision: 12, scale: 2 }), // Equipo
  furnitureCost: decimal("furniture_cost", { precision: 12, scale: 2 }), // Muebles
  totalPostDeliveryCosts: decimal("total_post_delivery_costs", { precision: 14, scale: 2 }), // Total (calculado)
  
  // CRÉDITO HIPOTECARIO
  mortgageAmount: decimal("mortgage_amount", { precision: 14, scale: 2 }), // Monto
  mortgageStartDate: text("mortgage_start_date"), // Inicia
  mortgageYears: integer("mortgage_years"), // Años
  mortgageMonthlyPayment: decimal("mortgage_monthly_payment", { precision: 12, scale: 2 }), // Mensualidad
  mortgageEndDate: text("mortgage_end_date"), // Termina
  mortgageTotal: decimal("mortgage_total", { precision: 14, scale: 2 }), // Total
  mortgageInterestPercent: decimal("mortgage_interest_percent", { precision: 5, scale: 2 }), // Tasa %
  
  // MANTENIMIENTO
  maintenanceM2: decimal("maintenance_m2", { precision: 10, scale: 2 }), // M²
  maintenanceInitial: decimal("maintenance_initial", { precision: 12, scale: 2 }), // Inicial
  maintenanceDate: text("maintenance_date"), // Fecha
  maintenanceTotal: decimal("maintenance_total", { precision: 12, scale: 2 }), // Total
  
  // RENTA
  rentInitial: decimal("rent_initial", { precision: 12, scale: 2 }), // Renta inicial
  rentStartDate: text("rent_start_date"), // Fecha inicio
  rentRatePercent: decimal("rent_rate_percent", { precision: 5, scale: 2 }), // Tasa anual %
  rentFinal: decimal("rent_final", { precision: 12, scale: 2 }), // Renta final
  rentEndDate: text("rent_end_date"), // Fecha fin
  rentMonths: integer("rent_months"), // Meses
  rentTotal: decimal("rent_total", { precision: 14, scale: 2 }), // Total renta
  
  // INVERSIÓN
  investmentTotal: decimal("investment_total", { precision: 14, scale: 2 }), // Total inversión
  investmentNet: decimal("investment_net", { precision: 14, scale: 2 }), // Neta
  investmentMonthly: decimal("investment_monthly", { precision: 12, scale: 2 }), // Mensual
  investmentRate: decimal("investment_rate", { precision: 5, scale: 2 }), // Tasa %
  
  // PLUSVALÍA
  appreciationRate: decimal("appreciation_rate", { precision: 5, scale: 2 }), // Tasa plusvalía %
  appreciationDays: integer("appreciation_days"), // Días
  appreciationYears: integer("appreciation_years"), // Años
  appreciationMonths: integer("appreciation_months"), // Meses adicionales
  appreciationTotalYears: decimal("appreciation_total_years", { precision: 5, scale: 2 }), // Años totales
  appreciationTotal: decimal("appreciation_total", { precision: 14, scale: 2 }), // Total plusvalía
  finalValue: decimal("final_value", { precision: 14, scale: 2 }), // Monto Final
  
  // CAPITAL SEMILLA / PROMO
  hasSeedCapital: boolean("has_seed_capital").default(false), // Capital Semilla
  hasPromo: boolean("has_promo").default(false), // Promo
  
  // ESTADO
  active: boolean("active").default(true), // Si el desarrollo está activo
  
  // Meta
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
});

export const insertTypologySchema = createInsertSchema(typologies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTypology = z.infer<typeof insertTypologySchema>;
export type Typology = typeof typologies.$inferSelect;

// Bedroom options for filter
export const BEDROOM_OPTIONS = [
  "Loft",
  "1",
  "1 +Flex",
  "2",
  "2 +Flex",
  "3",
  "3 +Flex",
  "4",
  "4 +Flex",
] as const;

export type BedroomType = typeof BEDROOM_OPTIONS[number];

// Bathroom options for filter
export const BATHROOM_OPTIONS = [
  "1",
  "1.5",
  "2",
  "2.5",
  "3",
  "3.5",
] as const;

export type BathroomType = typeof BATHROOM_OPTIONS[number];

// Filter schemas
export const propertyFilterSchema = z.object({
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  bedrooms: z.array(z.string()).optional(),
  bathrooms: z.array(z.string()).optional(),
  minArea: z.number().optional(),
  maxArea: z.number().optional(),
  minDeliveryMonths: z.number().optional(),
  maxDeliveryMonths: z.number().optional(),
  minDownPayment: z.number().optional(),
  maxDownPayment: z.number().optional(),
  city: z.string().optional(),
  zone: z.string().optional(),
  developer: z.string().optional(),
  developmentName: z.string().optional(),
  developmentType: z.string().optional(),
  status: z.string().optional(),
});

export type PropertyFilter = z.infer<typeof propertyFilterSchema>;

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Usuario requerido"),
  password: z.string().min(1, "Contraseña requerida"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Contact form schema
export const contactFormSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  phone: z.string().min(10, "Teléfono debe tener al menos 10 dígitos"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  interest: z.string().optional(),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;

// Documents - file storage for employees
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // File name
  originalName: text("original_name").notNull(), // Original uploaded file name
  fileUrl: text("file_url").notNull(), // Storage path/URL
  fileSize: integer("file_size"), // Size in bytes
  mimeType: text("mime_type"), // File MIME type
  
  // Root category: desarrolladores, clientes, trabajo
  rootCategory: text("root_category").notNull(),
  
  // Section: legales, venta, identidad, cotizaciones, etc.
  section: text("section"),
  
  // Whether this document can be shared with clients
  shareable: boolean("shareable").default(false),
  
  // Associations
  developerId: varchar("developer_id").references(() => developers.id, { onDelete: "cascade" }),
  developmentId: varchar("development_id").references(() => developments.id, { onDelete: "cascade" }),
  typologyId: varchar("typology_id").references(() => typologies.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "cascade" }),
  
  // Meta
  description: text("description"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Shared links for external client access
export const sharedLinks = pgTable("shared_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(), // Unique token for the link
  
  // What is being shared - can be a folder path or specific document
  targetType: text("target_type").notNull(), // 'folder' or 'document'
  
  // For folder sharing - the path/section being shared
  rootCategory: text("root_category"), // desarrolladores, clientes, etc.
  section: text("section"), // legales, venta, identidad, etc.
  developerId: varchar("developer_id").references(() => developers.id, { onDelete: "cascade" }),
  developmentId: varchar("development_id").references(() => developments.id, { onDelete: "cascade" }),
  typologyId: varchar("typology_id").references(() => typologies.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "cascade" }),
  
  // For document sharing
  documentId: varchar("document_id").references(() => documents.id, { onDelete: "cascade" }),
  
  // Permissions
  canView: boolean("can_view").default(true),
  canUpload: boolean("can_upload").default(false), // Allow external uploads
  
  // Expiration
  isPermanent: boolean("is_permanent").default(false),
  expiresAt: timestamp("expires_at"), // Null if permanent
  
  // Requested documents - list of document types the client should upload
  requestedDocuments: text("requested_documents").array(),
  
  // Tracking
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  accessCount: integer("access_count").default(0),
  lastAccessedAt: timestamp("last_accessed_at"),
});

export const insertSharedLinkSchema = createInsertSchema(sharedLinks).omit({
  id: true,
  createdAt: true,
  accessCount: true,
  lastAccessedAt: true,
});

export type InsertSharedLink = z.infer<typeof insertSharedLinkSchema>;
export type SharedLink = typeof sharedLinks.$inferSelect;

// Document sections constants for UI
export const DOCUMENT_SECTIONS = {
  // For Developers (Legales level)
  developerLegales: ["identidad", "corporativo", "convenios"],
  
  // For Developments (Legales and Venta)
  developmentLegales: ["identidad", "convenios", "permisos", "fideicomiso", "ofertaContrato"],
  developmentVenta: ["imagenes", "videos", "brochuresFlyers", "promociones", "acabadosEquipamiento", "listasPrecios", "ejercicios"],
  
  // For Typologies
  typologyVenta: ["imagenes", "videos"],
  
  // For Clients
  clientSections: ["documentosIdentidad", "cotizaciones", "ofertaContrato", "ejercicios"],
  
  // For Work (De Trabajo)
  workFolders: ["reciboSeparacion", "cartas", "checklists", "productos"],
} as const;

// Development Media - images and videos for typologies (shown on public pages)
export const developmentMedia = pgTable("development_media", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  typologyId: varchar("typology_id").notNull().references(() => typologies.id, { onDelete: "cascade" }), // Required link to typology
  type: text("type").notNull(), // "image" or "video"
  url: text("url").notNull(), // File path/URL
  order: integer("order").default(0), // Display order
  isPrimary: boolean("is_primary").default(false), // Primary image for cards
  
  // Meta
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDevelopmentMediaSchema = createInsertSchema(developmentMedia).omit({
  id: true,
  createdAt: true,
});

export type InsertDevelopmentMedia = z.infer<typeof insertDevelopmentMediaSchema>;
export type DevelopmentMedia = typeof developmentMedia.$inferSelect;

// Catalog tables for dynamic dropdown values

// Cities catalog
export const catalogCities = pgTable("catalog_cities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogCitySchema = createInsertSchema(catalogCities).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogCity = z.infer<typeof insertCatalogCitySchema>;
export type CatalogCity = typeof catalogCities.$inferSelect;

// Zones catalog (linked to cities)
export const catalogZones = pgTable("catalog_zones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  cityId: varchar("city_id").references(() => catalogCities.id, { onDelete: "cascade" }),
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogZoneSchema = createInsertSchema(catalogZones).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogZone = z.infer<typeof insertCatalogZoneSchema>;
export type CatalogZone = typeof catalogZones.$inferSelect;

// Development types catalog
export const catalogDevelopmentTypes = pgTable("catalog_development_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogDevelopmentTypeSchema = createInsertSchema(catalogDevelopmentTypes).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogDevelopmentType = z.infer<typeof insertCatalogDevelopmentTypeSchema>;
export type CatalogDevelopmentType = typeof catalogDevelopmentTypes.$inferSelect;

// Amenities catalog
export const catalogAmenities = pgTable("catalog_amenities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  icon: text("icon"), // Icon filename or path
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogAmenitySchema = createInsertSchema(catalogAmenities).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogAmenity = z.infer<typeof insertCatalogAmenitySchema>;
export type CatalogAmenity = typeof catalogAmenities.$inferSelect;

// Efficiency features catalog
export const catalogEfficiencyFeatures = pgTable("catalog_efficiency_features", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogEfficiencyFeatureSchema = createInsertSchema(catalogEfficiencyFeatures).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogEfficiencyFeature = z.infer<typeof insertCatalogEfficiencyFeatureSchema>;
export type CatalogEfficiencyFeature = typeof catalogEfficiencyFeatures.$inferSelect;

// Other features catalog (security, etc.)
export const catalogOtherFeatures = pgTable("catalog_other_features", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogOtherFeatureSchema = createInsertSchema(catalogOtherFeatures).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogOtherFeature = z.infer<typeof insertCatalogOtherFeatureSchema>;
export type CatalogOtherFeature = typeof catalogOtherFeatures.$inferSelect;
