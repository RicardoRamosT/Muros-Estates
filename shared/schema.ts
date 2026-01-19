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
}).optional();

export type UserPermissions = z.infer<typeof permissionsSchema>;
export type FieldPermissions = z.infer<typeof fieldPermissionsSchema>;

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

// Clients (leads) from contact form or manually created
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  interest: text("interest"),
  notes: text("notes"),
  status: text("status").notNull().default("nuevo"),
  source: text("source").notNull().default("web"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  developmentInterest: text("development_interest"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
