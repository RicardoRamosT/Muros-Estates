import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: integer("bathrooms").notNull(),
  area: decimal("area", { precision: 10, scale: 2 }).notNull(),
  floor: integer("floor"),
  parking: integer("parking").default(0),
  deliveryDate: text("delivery_date"),
  status: text("status").notNull().default("available"),
  featured: boolean("featured").default(false),
  images: text("images").array().notNull(),
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

export const propertyFilterSchema = z.object({
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  minBedrooms: z.number().optional(),
  maxBedrooms: z.number().optional(),
  minBathrooms: z.number().optional(),
  maxBathrooms: z.number().optional(),
  minArea: z.number().optional(),
  maxArea: z.number().optional(),
  city: z.string().optional(),
  zone: z.string().optional(),
  developer: z.string().optional(),
  developmentName: z.string().optional(),
  developmentType: z.string().optional(),
  status: z.string().optional(),
});

export type PropertyFilter = z.infer<typeof propertyFilterSchema>;
