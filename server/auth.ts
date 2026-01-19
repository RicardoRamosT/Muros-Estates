import bcrypt from "bcrypt";
import { storage } from "./storage";
import type { User, InsertUser } from "@shared/schema";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUserWithHashedPassword(userData: InsertUser): Promise<User> {
  const hashedPassword = await hashPassword(userData.password);
  return storage.createUser({
    ...userData,
    password: hashedPassword,
  });
}

export async function authenticateUser(username: string, password: string): Promise<User | null> {
  const user = await storage.getUserByUsername(username);
  if (!user || !user.active) {
    return null;
  }
  
  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return null;
  }
  
  return user;
}

export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration
  
  const session = await storage.createSession({
    userId,
    expiresAt,
  });
  
  return session.id;
}

export async function validateSession(sessionId: string): Promise<User | null> {
  const session = await storage.getSession(sessionId);
  if (!session) {
    return null;
  }
  
  if (new Date() > session.expiresAt) {
    await storage.deleteSession(sessionId);
    return null;
  }
  
  const user = await storage.getUser(session.userId);
  if (!user || !user.active) {
    await storage.deleteSession(sessionId);
    return null;
  }
  
  return user;
}

export async function seedAdminUser(): Promise<void> {
  const existingAdmin = await storage.getUserByUsername("admin");
  if (!existingAdmin) {
    await createUserWithHashedPassword({
      username: "admin",
      password: "admin123",
      name: "Administrador",
      email: "admin@muros.mx",
      role: "admin",
      active: true,
    });
    console.log("Admin user created: admin / admin123");
  }
}
