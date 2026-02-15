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
  // Permisos para Desarrolladores - 14 columnas
  // Admin: Todo 2, Updater: Todo 2 excepto ID y Tipo (=1)
  // Profiler: 111110000000000 (1-5 view, 6-14 none)
  // Finanzas: Todo 1 (view), en Legales no puede ver convenios (ver documentosLegalesDesarrollador)
  // Asesor: 111111111100001 (1-10 view, 11-13 none, 14 view)
  // Desarrollador: Todo 1 (view)
  desarrolladores: {
    allowedRoles: ['admin', 'actualizador', 'perfilador', 'finanzas', 'asesor', 'desarrollador'],
    fields: {
      // 1. id - Admin:1, Updater:1, Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      id: { admin: 'view', actualizador: 'view', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 2. tipo - Admin:2, Updater:1, Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      tipo: { admin: 'edit', actualizador: 'view', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 3. active - Admin:2, Updater:2, Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      active: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 4. name - Admin:2, Updater:2, Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      name: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 5. razonSocial - Admin:2, Updater:2, Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      razonSocial: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 6. rfc - Admin:2, Updater:2, Profiler:0, Finanzas:1, Asesor:1, Desarrollador:1
      rfc: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 7. domicilio - Admin:2, Updater:2, Profiler:0, Finanzas:1, Asesor:1, Desarrollador:1
      domicilio: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 8. fechaAntiguedad - Admin:2, Updater:2, Profiler:0, Finanzas:1, Asesor:1, Desarrollador:1
      fechaAntiguedad: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 8b. antiguedadDeclarada - Admin:2, Updater:2, Profiler:0, Finanzas:1, Asesor:1, Desarrollador:1
      antiguedadDeclarada: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 8c. antiguedad (legacy) - Admin:2, Updater:2, Profiler:0, Finanzas:1, Asesor:1, Desarrollador:1
      antiguedad: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 9. tipos - Admin:2, Updater:2, Profiler:0, Finanzas:1, Asesor:1, Desarrollador:1
      tipos: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 9b. contratos - Admin:2, Updater:2, Profiler:0, Finanzas:1, Asesor:1, Desarrollador:1
      contratos: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 10. representante - Admin:2, Updater:2, Profiler:0, Finanzas:1, Asesor:1, Desarrollador:1
      representante: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 11. contactName - Admin:2, Updater:2, Profiler:0, Finanzas:1, Asesor:0, Desarrollador:1
      contactName: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'none', desarrollador: 'view' },
      // 12. contactPhone - Admin:2, Updater:2, Profiler:0, Finanzas:1, Asesor:0, Desarrollador:1
      contactPhone: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'none', desarrollador: 'view' },
      // 13. contactEmail - Admin:2, Updater:2, Profiler:0, Finanzas:1, Asesor:0, Desarrollador:1
      contactEmail: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'none', desarrollador: 'view' },
      // 14. legales - Admin:2, Updater:2, Profiler:0, Finanzas:1, Asesor:1, Desarrollador:1
      legales: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
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
      // Permisos según matriz: Admin=2 todo, Profiler=11211111+resto 2, Asesor=1111111122222221222222
      // 0. active - Admin: 2, Profiler: 1, Asesor: 1
      active: { admin: 'edit', perfilador: 'view', asesor: 'view' },
      // 1. fecha - Profiler: 1, Asesor: 1
      fecha: { admin: 'edit', perfilador: 'view', asesor: 'view' },
      // 2. hora - Profiler: 1, Asesor: 1
      hora: { admin: 'edit', perfilador: 'view', asesor: 'view' },
      // 3. asesorId - Profiler: 2, Asesor: 1
      asesorId: { admin: 'edit', perfilador: 'edit', asesor: 'view' },
      // 4. ciudad - Profiler: 1, Asesor: 1
      ciudad: { admin: 'edit', perfilador: 'view', asesor: 'view' },
      // 5. zona - Profiler: 1, Asesor: 1
      zona: { admin: 'edit', perfilador: 'view', asesor: 'view' },
      // 6. desarrollador - Profiler: 1, Asesor: 1
      desarrollador: { admin: 'edit', perfilador: 'view', asesor: 'view' },
      // 7. desarrollo - Profiler: 1, Asesor: 1
      desarrollo: { admin: 'edit', perfilador: 'view', asesor: 'view' },
      // 8. tipologia - Profiler: 1, Asesor: 1
      tipologia: { admin: 'edit', perfilador: 'view', asesor: 'view' },
      // 9. nombre - Profiler: 2, Asesor: 2
      nombre: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
      // 10. apellido - Profiler: 2, Asesor: 2
      apellido: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
      // 11. telefono - Profiler: 2, Asesor: 2
      telefono: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
      // 12. correo - Profiler: 2, Asesor: 2
      correo: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
      // 13. tipofil - Profiler: 2, Asesor: 2
      tipofil: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
      // 14. perfil - Profiler: 2, Asesor: 2
      perfil: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
      // 15. comoLlega - Profiler: 2, Asesor: 2
      comoLlega: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
      // 16. brokerExterno - Profiler: 2, Asesor: 1
      brokerExterno: { admin: 'edit', perfilador: 'edit', asesor: 'view' },
      // 17. estatus - Profiler: 2, Asesor: 2
      estatus: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
      // 18. embudo - Profiler: 2, Asesor: 2
      embudo: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
      // 19. comoPaga - Profiler: 2, Asesor: 2
      comoPaga: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
      // 20. positivos - Profiler: 2, Asesor: 2
      positivos: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
      // 21. negativos - Profiler: 2, Asesor: 2
      negativos: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
      // 22. comentarios - Profiler: 2, Asesor: 2
      comentarios: { admin: 'edit', perfilador: 'edit', asesor: 'edit' },
    } as Record<string, Record<string, PermissionLevel>>,
  },
  // Permisos para Clientes (convertidos) - 16 campos
  // Admin: Todo 2, Finanzas: 1111100111111111, Asesor: 1112222222222222, Desarrollador: 1111100111111111
  clientes: {
    allowedRoles: ['admin', 'finanzas', 'asesor', 'desarrollador'],
    fields: {
      // 0. active - Admin: 2, Finanzas: 1, Asesor: 1, Desarrollador: 1
      active: { admin: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 1. fecha - Finanzas: 1, Asesor: 1, Desarrollador: 1
      fecha: { admin: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 2. hora - Finanzas: 1, Asesor: 1, Desarrollador: 1
      hora: { admin: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 3. asesor - Finanzas: 1, Asesor: 1, Desarrollador: 1
      asesorId: { admin: 'edit', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 4. nombre - Finanzas: 1, Asesor: 2, Desarrollador: 1
      nombre: { admin: 'edit', finanzas: 'view', asesor: 'edit', desarrollador: 'view' },
      // 5. apellido - Finanzas: 1, Asesor: 2, Desarrollador: 1
      apellido: { admin: 'edit', finanzas: 'view', asesor: 'edit', desarrollador: 'view' },
      // 6. telefono - Finanzas: 0, Asesor: 2, Desarrollador: 0
      telefono: { admin: 'edit', finanzas: 'none', asesor: 'edit', desarrollador: 'none' },
      // 7. correo - Finanzas: 0, Asesor: 2, Desarrollador: 0
      correo: { admin: 'edit', finanzas: 'none', asesor: 'edit', desarrollador: 'none' },
      // 8. embudo (Etapa de Embudo) - Finanzas: 1, Asesor: 2, Desarrollador: 1
      embudo: { admin: 'edit', finanzas: 'view', asesor: 'edit', desarrollador: 'view' },
      // 9. desarrollador - Finanzas: 1, Asesor: 2, Desarrollador: 1
      desarrollador: { admin: 'edit', finanzas: 'view', asesor: 'edit', desarrollador: 'view' },
      // 9. desarrollo - Finanzas: 1, Asesor: 2, Desarrollador: 1
      desarrollo: { admin: 'edit', finanzas: 'view', asesor: 'edit', desarrollador: 'view' },
      // 10. tipologia - Finanzas: 1, Asesor: 2, Desarrollador: 1
      tipologia: { admin: 'edit', finanzas: 'view', asesor: 'edit', desarrollador: 'view' },
      // 11. precioFinal - Finanzas: 1, Asesor: 2, Desarrollador: 1
      precioFinal: { admin: 'edit', finanzas: 'view', asesor: 'edit', desarrollador: 'view' },
      // 12. separacion - Finanzas: 1, Asesor: 2, Desarrollador: 1
      separacion: { admin: 'edit', finanzas: 'view', asesor: 'edit', desarrollador: 'view' },
      // 13. fechaSeparacion - Finanzas: 1, Asesor: 2, Desarrollador: 1
      fechaSeparacion: { admin: 'edit', finanzas: 'view', asesor: 'edit', desarrollador: 'view' },
      // 14. enganche - Finanzas: 1, Asesor: 2, Desarrollador: 1
      enganche: { admin: 'edit', finanzas: 'view', asesor: 'edit', desarrollador: 'view' },
      // 15. fechaEnganche - Finanzas: 1, Asesor: 2, Desarrollador: 1
      fechaEnganche: { admin: 'edit', finanzas: 'view', asesor: 'edit', desarrollador: 'view' },
    } as Record<string, Record<string, PermissionLevel>>,
  },
  // Permisos para Desarrollos - 54 columnas
  // Admin: Todo 2, Updater: Todo 2 (excepto ID=1)
  // Profiler: 1-47=1, 48-54=0
  // Finanzas: 1-5=1, 6-29=0, 30-54=1
  // Asesor: 1-47=1, 48-52=0, 53-54=1
  // Desarrollador: 1-5=1, 6-8=0, 9-54=1
  desarrollos: {
    allowedRoles: ['admin', 'actualizador', 'perfilador', 'finanzas', 'asesor', 'desarrollador'],
    fields: {
      // 1. id - Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      id: { admin: 'view', actualizador: 'view', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 2. active - Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      active: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // empresaTipo - Tipo de empresa (Desarrollador/Comercializadora)
      empresaTipo: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 3. developerId - Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      developerId: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 4. name - Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      name: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 5. city - Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      city: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 6. zone - Profiler:1, Finanzas:0, Asesor:1, Desarrollador:0
      zone: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'none' },
      // 7. zone2 - Profiler:1, Finanzas:0, Asesor:1, Desarrollador:0
      zone2: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'none' },
      // 8. zone3 - Profiler:1, Finanzas:0, Asesor:1, Desarrollador:0
      zone3: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'none' },
      // 9. tipos - Array de tipos de desarrollo (heredados del desarrollador) - Profiler:1, Finanzas:0, Asesor:1, Desarrollador:1
      tipos: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 10. type - Profiler:1, Finanzas:0, Asesor:1, Desarrollador:1 (legacy)
      type: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 11. nivel - Profiler:1, Finanzas:0, Asesor:1, Desarrollador:1
      nivel: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 11. torres - Profiler:1, Finanzas:0, Asesor:1, Desarrollador:1
      torres: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 12. niveles - Profiler:1, Finanzas:0, Asesor:1, Desarrollador:1
      niveles: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 13. amenities - Profiler:1, Finanzas:0, Asesor:1, Desarrollador:1
      amenities: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 14. efficiency - Profiler:1, Finanzas:0, Asesor:1, Desarrollador:1
      efficiency: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 15. otherFeatures - Profiler:1, Finanzas:0, Asesor:1, Desarrollador:1
      otherFeatures: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 16. tamanoDesde - Profiler:1, Finanzas:0, Asesor:1, Desarrollador:1
      tamanoDesde: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 17. tamanoHasta - Profiler:1, Finanzas:0, Asesor:1, Desarrollador:1
      tamanoHasta: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 18. lockOff - Profiler:1, Finanzas:0, Asesor:1, Desarrollador:1
      lockOff: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 19. recDesde - Profiler:1, Finanzas:0, Asesor:1, Desarrollador:1
      recDesde: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 20. recHasta - Profiler:1, Finanzas:0, Asesor:1, Desarrollador:1
      recHasta: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // recamaras - Selector controlado de recámaras
      recamaras: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 21. acabados - Profiler:1, Finanzas:0, Asesor:1, Desarrollador:1
      acabados: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 22. depasM2 - Profiler:1, Finanzas:0, Asesor:1, Desarrollador:1
      depasM2: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 23. localesM2 - Profiler:1, Finanzas:0, Asesor:1, Desarrollador:1
      localesM2: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 24. oficinasM2 - Profiler:1, Finanzas:0, Asesor:1, Desarrollador:1
      oficinasM2: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 25. saludM2 - Profiler:1, Finanzas:0, Asesor:1, Desarrollador:1
      saludM2: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 26. inicioPreventa - Profiler:1, Finanzas:0, Asesor:1, Desarrollador:1
      inicioPreventa: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 27. tiempoTransc - Profiler:1, Finanzas:0, Asesor:1, Desarrollador:1
      tiempoTransc: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 28. depasUnidades - Profiler:1, Finanzas:0, Asesor:1, Desarrollador:1
      depasUnidades: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 29. depasVendidas - Profiler:1, Finanzas:0, Asesor:1, Desarrollador:1
      depasVendidas: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 30. depasPorcentaje - Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      depasPorcentaje: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 31. localesUnidades - Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      localesUnidades: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 32. localesVendidas - Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      localesVendidas: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 33. localesPorcentaje - Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      localesPorcentaje: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 34. oficinasUnidades - Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      oficinasUnidades: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 35. oficinasVendidas - Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      oficinasVendidas: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 36. oficinasPorcentaje - Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      oficinasPorcentaje: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 37. saludUnidades - Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      saludUnidades: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 38. saludVendidas - Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      saludVendidas: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 39. saludPorcentaje - Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      saludPorcentaje: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 40. inicioProyectado - Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      inicioProyectado: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 41. inicioReal - Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      inicioReal: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 42. entregaProyectada - Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      entregaProyectada: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 43. entregaActualizada - Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      entregaActualizada: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 43b. tipoContrato
      tipoContrato: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 43c. cesionDerechos
      cesionDerechos: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 44. ventasNombre - Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      ventasNombre: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 45. ventasTelefono - Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      ventasTelefono: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 46. ventasCorreo - Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      ventasCorreo: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 47. pagosNombre - Profiler:1, Finanzas:1, Asesor:1, Desarrollador:1
      pagosNombre: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 48. pagosTelefono - Profiler:0, Finanzas:1, Asesor:0, Desarrollador:1
      pagosTelefono: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'none', desarrollador: 'view' },
      // 49. pagosCorreo - Profiler:0, Finanzas:1, Asesor:0, Desarrollador:1
      pagosCorreo: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'none', desarrollador: 'view' },
      // 50. comercializacion - Profiler:0, Finanzas:1, Asesor:0, Desarrollador:1
      comercializacion: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'none', desarrollador: 'view' },
      // 51. arquitectura - Profiler:0, Finanzas:1, Asesor:0, Desarrollador:1
      arquitectura: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'none', desarrollador: 'view' },
      // 52. location - Profiler:0, Finanzas:1, Asesor:0, Desarrollador:1
      location: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'none', desarrollador: 'view' },
      // 52b. presentacion - Profiler:0, Finanzas:1, Asesor:0, Desarrollador:1
      presentacion: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'none', desarrollador: 'view' },
      // 53. legalesFolder - Profiler:0, Finanzas:1, Asesor:1, Desarrollador:1
      legalesFolder: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 54. ventaFolder - Profiler:0, Finanzas:1, Asesor:1, Desarrollador:1
      ventaFolder: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
    } as Record<string, Record<string, PermissionLevel>>,
  },
  // Permisos para Tipologías - 86 columnas según matriz Excel
  // 0=none, 1=view, 2=edit
  // Admin: Todo 2 | Updater: Todo 2 (excepto calculados = 1)
  // Profiler: 1-6=1, 7-10=0, 11-34=1, 35-36=1, 37=0, 38=0, 39=1, 40-42=0, 43=0, 44-53=1, 54-86=0
  // Finanzas: 1-6=1, 7-10=0, 11-17=1, 18-21=0, 22-23=1, 24-28=0, 29-30=1, 31-43=0, 44-86=1
  // Asesor: Todo 1
  // Desarrollador: 1-7=1, 8-9=2, 10-11=1, 12-15=2, 16-17=1, 18-21=2, 22-36=1, 37-39=2, 40=1, 41-43=2, 44-53=1, 54-86=0
  tipologias: {
    allowedRoles: ['admin', 'actualizador', 'perfilador', 'finanzas', 'asesor', 'desarrollador'],
    fields: {
      // 1: ID (auto)
      id: { admin: 'view', actualizador: 'view', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 2: Activo
      active: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 3: Ciudad
      city: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 4: Zona
      zone: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 5: Desarrollador
      developer: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 6: Desarrollo
      development: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 7: Tipo (GENERALES) - Profiler=0, Finanzas=0, Desarrollador=1
      type: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 8: Nivel - Desarrollador=2
      level: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'none', asesor: 'view', desarrollador: 'edit' },
      // 9: Vista - Desarrollador=2
      view: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'none', asesor: 'view', desarrollador: 'edit' },
      // 10: Tamaño (PRECIO) - Profiler=0, Finanzas=0, Desarrollador=1
      size: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 11: Final
      sizeFinal: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 12: Precio - Desarrollador=2
      price: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'edit' },
      // 13: Bono (Sí/No) - Desarrollador=2
      hasDiscount: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'edit' },
      // 14: % - Desarrollador=2
      discountPercent: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'edit' },
      // 14: % - Desarrollador=2
      discountPercentValue: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'edit' },
      // 15: Monto - Desarrollador=2
      discountAmount: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'edit' },
      // 16: Precio Final (calculado) - Desarrollador=1
      finalPrice: { admin: 'edit', actualizador: 'view', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 17: Precio/M2 (calculado) - Desarrollador=1
      pricePerM2: { admin: 'edit', actualizador: 'view', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 18: Capital Semilla - Finanzas=0, Desarrollador=2
      hasSeedCapital: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'edit' },
      // 19: Promo - Finanzas=0, Desarrollador=2
      hasPromo: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'edit' },
      // 19b: Descripción Promo - same as Promo
      promoDescription: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'edit' },
      // 20: LockOff (DISTRIBUCIÓN) - Finanzas=0, Desarrollador=2
      lockOff: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'edit' },
      // 21: REC - Finanzas=0, Desarrollador=2
      bedrooms: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'edit' },
      // 22: Baños - Finanzas=1
      bathrooms: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 23: Áreas
      areas: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 24: Balcón Sí/No - Finanzas=0
      hasBalcony: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 25: Balcón Tamaño - Finanzas=0
      balconySize: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 26: Terraza Sí/No - Finanzas=0
      hasTerrace: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 27: Terraza Tamaño - Finanzas=0
      terraceSize: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 28: REC (2) - Finanzas=0
      bedrooms2: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 29: Baños (2) - Finanzas=1
      bathrooms2: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 30: Áreas (2) - Finanzas=1
      areas2: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 31-34: Balcón/Terraza (2) - Finanzas=0
      hasBalcony2: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      balconySize2: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      hasTerrace2: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      terraceSize2: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 35: Cajones Incluidos - Finanzas=0
      parkingIncluded: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 36: Cajones Opcional Sí/No - Finanzas=0
      hasParkingOptional: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 37: Cajones Opcional Precio - Profiler=0, Finanzas=0, Desarrollador=2
      parkingOptionalPrice: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'none', asesor: 'view', desarrollador: 'edit' },
      // 38: Bodega Incluida - Profiler=0, Finanzas=0, Desarrollador=2
      hasStorage: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'none', asesor: 'view', desarrollador: 'edit' },
      // 39: Bodega Tamaño - Finanzas=0, Desarrollador=2
      storageSize: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'none', asesor: 'view', desarrollador: 'edit' },
      // 40: Bodega Opcional - Profiler=0, Finanzas=0
      hasStorageOptional: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'none', asesor: 'view', desarrollador: 'view' },
      // 41: Bodega Tamaño 2 - Profiler=0, Finanzas=0, Desarrollador=2
      storageSize2: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'none', asesor: 'view', desarrollador: 'edit' },
      // 42: Bodega Precio - Profiler=0, Finanzas=0, Desarrollador=2
      storagePrice: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'none', asesor: 'view', desarrollador: 'edit' },
      // 43: Inicial % (ESQUEMA DE PAGO) - Profiler=0, Finanzas=0, Desarrollador=2
      initialPercent: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'none', asesor: 'view', desarrollador: 'edit' },
      // 44-50: Resto de ESQUEMA DE PAGO
      initialAmount: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      duringConstructionPercent: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      duringConstructionAmount: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      paymentMonths: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      monthlyPayment: { admin: 'edit', actualizador: 'view', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      totalEnganche: { admin: 'edit', actualizador: 'view', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      remainingPercent: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 51: Entrega
      deliveryDate: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      // 52-56: Gastos post-entrega
      isaPercent: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      notaryPercent: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      equipmentCost: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      furnitureCost: { admin: 'edit', actualizador: 'edit', perfilador: 'view', finanzas: 'view', asesor: 'view', desarrollador: 'view' },
      totalPostDeliveryCosts: { admin: 'edit', actualizador: 'view', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      // 57-60: Pre-crédito hipotecario
      mortgageAmount: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      mortgageStartDate: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      mortgageInterestPercent: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      mortgageYears: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      // 61-63: CRÉDITO HIPOTECARIO
      mortgageMonthlyPayment: { admin: 'edit', actualizador: 'view', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      mortgageEndDate: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      mortgageTotal: { admin: 'edit', actualizador: 'view', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      // 64-69: MANTENIMIENTO
      maintenanceM2: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      maintenanceInitial: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      maintenanceStartDate: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      maintenanceFinal: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      maintenanceEndDate: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      maintenanceTotal: { admin: 'edit', actualizador: 'view', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      // 70-71: RENTA
      rentInitial: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      rentStartDate: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      // 72: TASA
      rentRatePercent: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      // 73-74: RENTA (2)
      rentFinal: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      rentEndDate: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      // 75-76: Meses y Total
      rentMonths: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      rentTotal: { admin: 'edit', actualizador: 'view', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      // 77-80: INVERSIÓN (calculados)
      investmentTotal: { admin: 'edit', actualizador: 'view', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      investmentNet: { admin: 'edit', actualizador: 'view', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      investmentMonthly: { admin: 'edit', actualizador: 'view', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      investmentRate: { admin: 'edit', actualizador: 'view', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      // 81: Tasa plusvalía
      appreciationRate: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      // 82-86: PLUSVALÍA
      appreciationDays: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      appreciationMonths: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      appreciationYears: { admin: 'edit', actualizador: 'edit', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      appreciationTotal: { admin: 'edit', actualizador: 'view', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
      finalValue: { admin: 'edit', actualizador: 'view', perfilador: 'none', finanzas: 'view', asesor: 'view', desarrollador: 'none' },
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
  rfc: text("rfc"), // RFC (12-13 dígitos, mayúsculas)
  domicilio: text("domicilio"), // Domicilio fiscal/legal
  // Antigüedad - dividido en 2 columnas
  fechaAntiguedad: timestamp("fecha_antiguedad"), // Fecha de antigüedad
  antiguedadDeclarada: text("antiguedad_declarada"), // Antigüedad declarada por el desarrollador
  antiguedad: text("antiguedad"), // Campo legacy - Antigüedad en el mercado
  // Tipos de desarrollos - array de opciones: Residencial, Comercial, Oficina, Salud
  tipos: text("tipos").array(), // Array de tipos de desarrollos que hace
  contratos: text("contratos").array(), // Array de tipos de contratos
  representante: text("representante"), // Representante legal
  // Contacto - Gerente Comercial
  contactName: text("contact_name"), // Gerente Comercial (antes "Nombre")
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
  empresaTipo: text("empresa_tipo"),
  developerId: varchar("developer_id").references(() => developers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  city: text("city"),
  zone: text("zone"),
  zone2: text("zone_2"), // Zona 2
  zone3: text("zone_3"), // Zona 3
  type: text("type"), // Tipo de desarrollo (Residencial, Uso mixto, etc.) - legacy
  tipos: text("tipos").array(), // Array de tipos de desarrollo (heredados del desarrollador)
  nivel: text("nivel"), // Nivel
  torres: integer("torres"), // Número de torres
  niveles: integer("niveles"), // Número de niveles
  vistas: text("vistas").array(), // Vistas disponibles del desarrollo
  amenities: text("amenities").array(), // Lista de amenidades
  efficiency: text("efficiency").array(), // Características de eficiencia
  otherFeatures: text("other_features").array(), // Otras características (Otros)
  
  // Tamaño
  tamanoDesde: decimal("tamano_desde", { precision: 10, scale: 2 }),
  tamanoHasta: decimal("tamano_hasta", { precision: 10, scale: 2 }),
  lockOff: boolean("lock_off"),
  dish: boolean("dish"),
  
  // REC
  recDesde: decimal("rec_desde", { precision: 10, scale: 2 }), // legacy
  recHasta: decimal("rec_hasta", { precision: 10, scale: 2 }), // legacy
  recamaras: text("recamaras"),
  acabados: text("acabados").array(),
  
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
  
  // Tipo de Contrato, Cesión de Derechos, Presentación
  tipoContrato: text("tipo_contrato"),
  cesionDerechos: text("cesion_derechos"),
  presentacion: text("presentacion"),
  
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
  estatus: text("estatus").notNull().default("activo"),
  embudo: text("embudo"),
  comoPaga: text("como_paga"),
  
  // Evaluation (multi-select arrays)
  positivos: text("positivos").array(),
  negativos: text("negativos").array(),
  comentarios: text("comentarios"),
  
  // Client-specific fields (when isClient=true)
  precioFinal: decimal("precio_final", { precision: 12, scale: 2 }),
  separacion: decimal("separacion", { precision: 12, scale: 2 }),
  fechaSeparacion: timestamp("fecha_separacion"),
  enganche: decimal("enganche", { precision: 12, scale: 2 }),
  fechaEnganche: timestamp("fecha_enganche"),
  
  // Active status
  active: boolean("active").default(true),
  
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

// Typologies (Excel-like spreadsheet for property units) - 86 columnas según matriz Excel
export const typologies = pgTable("typologies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id, { onDelete: "cascade" }),
  
  // 1-2: Básicas
  active: boolean("active").default(true), // Activo
  
  // 3-6: Ubicación
  city: text("city"), // Ciudad
  zone: text("zone"), // Zona
  developer: text("developer"), // Desarrollador
  development: text("development"), // Desarrollo
  tipoDesarrollo: text("tipo_desarrollo").array(), // Tipos de desarrollo (multi-select, heredado del desarrollo/desarrollador)
  
  // 7-9: GENERALES
  type: text("type"), // Tipo (e.g., A, B, C)
  level: integer("level"), // Nivel/Piso
  view: text("view"), // Vista (Norte, Sur, Este, Oeste)
  
  // 10-11: PRECIO
  size: decimal("size", { precision: 10, scale: 2 }), // Tamaño m²
  sizeFinal: decimal("size_final", { precision: 10, scale: 2 }), // Final m² (puede diferir del tamaño original)
  
  // 12-17: Precio (sin agrupación)
  price: decimal("price", { precision: 14, scale: 2 }), // Precio
  hasDiscount: boolean("has_discount").default(false), // Bono Sí/No
  discountPercent: decimal("discount_percent", { precision: 10, scale: 2 }), // % del bono
  discountPercentValue: decimal("discount_percent_value", { precision: 10, scale: 2 }), // % (legacy)
  discountAmount: decimal("discount_amount", { precision: 14, scale: 2 }), // Monto
  finalPrice: decimal("final_price", { precision: 14, scale: 2 }), // Precio Final (calculado)
  pricePerM2: decimal("price_per_m2", { precision: 12, scale: 2 }), // Precio/M2 (calculado)
  
  // 18-19: Capital Semilla / Promo
  hasSeedCapital: boolean("has_seed_capital").default(false), // Capital Semilla
  hasPromo: boolean("has_promo").default(false), // Promo
  promoDescription: text("promo_description"), // Descripción de promo
  
  // 20-34: DISTRIBUCIÓN
  lockOff: boolean("lock_off").default(false), // LockOff
  bedrooms: text("bedrooms"), // REC (text to support values like "1 + Flex")
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }), // Baños
  areas: text("areas"), // Áreas (text for area type selection)
  hasBalcony: boolean("has_balcony").default(false), // Balcón Sí/No
  balconySize: decimal("balcony_size", { precision: 5, scale: 2 }), // Balcón Tamaño
  hasTerrace: boolean("has_terrace").default(false), // Terraza Sí/No
  terraceSize: decimal("terrace_size", { precision: 5, scale: 2 }), // Terraza Tamaño
  bedrooms2: text("bedrooms_2"), // REC (2) (text to support values like "1 + Flex")
  bathrooms2: decimal("bathrooms_2", { precision: 3, scale: 1 }), // Baños (2)
  areas2: text("areas_2"), // Áreas (2) (text for area type selection)
  hasBalcony2: boolean("has_balcony_2").default(false), // Balcón (2) Sí/No
  balconySize2: decimal("balcony_size_2", { precision: 5, scale: 2 }), // Balcón (2) Tamaño
  hasTerrace2: boolean("has_terrace_2").default(false), // Terraza (2) Sí/No
  terraceSize2: decimal("terrace_size_2", { precision: 5, scale: 2 }), // Terraza (2) Tamaño
  
  // 35-37: CAJONES
  parkingIncluded: text("parking_included"), // Incluidos (uses catalog values like "2 en Tandem")
  hasParkingOptional: boolean("has_parking_optional").default(false), // Opcional Sí/No
  parkingOptionalPrice: decimal("parking_optional_price", { precision: 12, scale: 2 }), // Opcional Precio
  
  // 38-42: BODEGA
  hasStorage: boolean("has_storage").default(false), // Incluida
  storageSize: decimal("storage_size", { precision: 5, scale: 2 }), // Tamaño
  hasStorageOptional: boolean("has_storage_optional").default(false), // Opcional
  storageSize2: decimal("storage_size_2", { precision: 5, scale: 2 }), // Tamaño (2)
  storagePrice: decimal("storage_price", { precision: 12, scale: 2 }), // Precio
  
  // 43-50: ESQUEMA DE PAGO
  initialPercent: decimal("initial_percent", { precision: 10, scale: 2 }), // Inicial %
  initialAmount: decimal("initial_amount", { precision: 14, scale: 2 }), // Monto
  duringConstructionPercent: decimal("during_construction_percent", { precision: 10, scale: 2 }), // En Plazo %
  duringConstructionAmount: decimal("during_construction_amount", { precision: 14, scale: 2 }), // Monto (2)
  paymentMonths: integer("payment_months"), // Meses
  monthlyPayment: decimal("monthly_payment", { precision: 12, scale: 2 }), // Mens. (calculado)
  totalEnganche: decimal("total_enganche", { precision: 14, scale: 2 }), // Tot. Eng. (calculado)
  remainingPercent: decimal("remaining_percent", { precision: 10, scale: 2 }), // Resto %
  
  // 51: Entrega (sin agrupación)
  deliveryDate: text("delivery_date"), // Entrega
  
  // 52-56: Gastos post-entrega (headers: 3.0%, 2.5%)
  isaPercent: decimal("isa_percent", { precision: 10, scale: 2 }), // ISAI % (default 3.0%)
  isaAmount: decimal("isa_amount", { precision: 14, scale: 2 }), // ISAI monto (calculado: precio × %)
  notaryPercent: decimal("notary_percent", { precision: 10, scale: 2 }), // Notario % (default 2.5%)
  notaryAmount: decimal("notary_amount", { precision: 14, scale: 2 }), // Notario monto (calculado: precio × %)
  equipmentCost: decimal("equipment_cost", { precision: 12, scale: 2 }), // Equipo (monto manual)
  furnitureCost: decimal("furniture_cost", { precision: 12, scale: 2 }), // Muebles (monto manual)
  totalPostDeliveryCosts: decimal("total_post_delivery_costs", { precision: 14, scale: 2 }), // Total (calculado)
  
  // 57-60: Crédito pre-header (headers: 10.5%, 15)
  mortgageAmount: decimal("mortgage_amount", { precision: 14, scale: 2 }), // Monto
  mortgageStartDate: text("mortgage_start_date"), // Inicia
  mortgageInterestPercent: decimal("mortgage_interest_percent", { precision: 10, scale: 2 }), // Tasa (10.5%)
  mortgageYears: integer("mortgage_years"), // Años (15)
  
  // 61-63: CRÉDITO HIPOTECARIO
  mortgageMonthlyPayment: decimal("mortgage_monthly_payment", { precision: 12, scale: 2 }), // Mensualidad (calculado)
  mortgageEndDate: text("mortgage_end_date"), // Termina
  mortgageTotal: decimal("mortgage_total", { precision: 14, scale: 2 }), // Total (calculado)
  
  // 64-69: MANTENIMIENTO
  maintenanceM2: decimal("maintenance_m2", { precision: 10, scale: 2 }), // M²
  maintenanceInitial: decimal("maintenance_initial", { precision: 12, scale: 2 }), // Inicial
  maintenanceStartDate: text("maintenance_start_date"), // Fecha
  maintenanceFinal: decimal("maintenance_final", { precision: 12, scale: 2 }), // Final
  maintenanceEndDate: text("maintenance_end_date"), // Fecha (2)
  maintenanceTotal: decimal("maintenance_total", { precision: 12, scale: 2 }), // Total (calculado)
  
  // 70-71: RENTA
  rentInitial: decimal("rent_initial", { precision: 12, scale: 2 }), // Inicial
  rentStartDate: text("rent_start_date"), // Fecha
  
  // 72: TASA (7.0%)
  rentRatePercent: decimal("rent_rate_percent", { precision: 10, scale: 2 }), // Tasa
  
  // 73-74: RENTA (2)
  rentFinal: decimal("rent_final", { precision: 12, scale: 2 }), // Final
  rentEndDate: text("rent_end_date"), // Fecha
  
  // 75-76: Meses y Total (sin agrupación)
  rentMonths: integer("rent_months"), // Meses (11.0)
  rentTotal: decimal("rent_total", { precision: 14, scale: 2 }), // Total
  
  // 77-80: INVERSIÓN
  investmentTotal: decimal("investment_total", { precision: 14, scale: 2 }), // Total (calculado)
  investmentNet: decimal("investment_net", { precision: 14, scale: 2 }), // Neta (calculado)
  investmentMonthly: decimal("investment_monthly", { precision: 12, scale: 2 }), // Mensual (calculado)
  investmentRate: decimal("investment_rate", { precision: 10, scale: 2 }), // Tasa (calculado)
  
  // 81: 7.0% (pre-header plusvalía)
  appreciationRate: decimal("appreciation_rate", { precision: 10, scale: 2 }), // Tasa
  
  // 82-86: PLUSVALÍA
  appreciationDays: integer("appreciation_days"), // Días
  appreciationMonths: integer("appreciation_months"), // Meses
  appreciationYears: integer("appreciation_years"), // Años
  appreciationTotal: decimal("appreciation_total", { precision: 14, scale: 2 }), // Total (calculado)
  finalValue: decimal("final_value", { precision: 14, scale: 2 }), // Monto Final (calculado)
  
  // Campos legacy para compatibilidad
  flex: integer("flex"),
  livingRoom: boolean("living_room").default(true),
  diningRoom: boolean("dining_room").default(true),
  kitchen: boolean("kitchen").default(true),
  balcony: decimal("balcony", { precision: 5, scale: 2 }),
  terrace: decimal("terrace", { precision: 5, scale: 2 }),
  laundry: boolean("laundry").default(false),
  serviceRoom: boolean("service_room").default(false),
  parkingSpots: integer("parking_spots").default(1),
  storage: boolean("storage").default(false),
  downPaymentPercent: decimal("down_payment_percent", { precision: 10, scale: 2 }),
  remainingAmount: decimal("remaining_amount", { precision: 14, scale: 2 }),
  notaryFees: decimal("notary_fees", { precision: 12, scale: 2 }),
  maintenanceDate: text("maintenance_date"),
  appreciationTotalYears: decimal("appreciation_total_years", { precision: 10, scale: 2 }),
  
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
  name: z.string().optional(),
  nombre: z.string().min(3, "Nombre debe tener al menos 3 caracteres").optional(),
  apellido: z.string().min(3, "Apellido debe tener al menos 3 caracteres").optional(),
  phone: z.string().min(10, "Teléfono debe tener al menos 10 dígitos"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  interest: z.string().optional(),
  typologyId: z.string().optional(),
  developmentId: z.string().optional(),
  desarrollador: z.string().optional(),
  desarrollo: z.string().optional(),
  ciudad: z.string().optional(),
  zona: z.string().optional(),
}).refine(
  (data) => {
    // Must have either (nombre AND apellido) OR name with at least 3 chars
    const hasNombreApellido = data.nombre && data.nombre.length >= 3 && data.apellido && data.apellido.length >= 3;
    const hasName = data.name && data.name.trim().length >= 3;
    return hasNombreApellido || hasName;
  },
  { message: "Nombre y apellido son requeridos (mínimo 3 caracteres cada uno)" }
);

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
  isaiPercent: decimal("isai_percent", { precision: 5, scale: 2 }).default("3.0"),
  notariaPercent: decimal("notaria_percent", { precision: 5, scale: 2 }).default("2.0"),
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

// Acabados catalog (finishes: muros, cielos, pisos, iluminación, etc.)
export const catalogAcabados = pgTable("catalog_acabados", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogAcabadoSchema = createInsertSchema(catalogAcabados).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogAcabado = z.infer<typeof insertCatalogAcabadoSchema>;
export type CatalogAcabado = typeof catalogAcabados.$inferSelect;

// Comercializadoras catalog (marketing/sales companies)
export const catalogComercializadoras = pgTable("catalog_comercializadoras", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogComercializadoraSchema = createInsertSchema(catalogComercializadoras).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogComercializadora = z.infer<typeof insertCatalogComercializadoraSchema>;
export type CatalogComercializadora = typeof catalogComercializadoras.$inferSelect;

// Arquitectura catalog (architecture firms)
export const catalogArquitectura = pgTable("catalog_arquitectura", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogArquitecturaSchema = createInsertSchema(catalogArquitectura).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogArquitectura = z.infer<typeof insertCatalogArquitecturaSchema>;
export type CatalogArquitectura = typeof catalogArquitectura.$inferSelect;

// Vista catalog (orientations/views for typologies)
export const catalogVistas = pgTable("catalog_vistas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogVistaSchema = createInsertSchema(catalogVistas).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogVista = z.infer<typeof insertCatalogVistaSchema>;
export type CatalogVista = typeof catalogVistas.$inferSelect;

// Areas catalog (interior areas like sala, comedor, etc.)
export const catalogAreas = pgTable("catalog_areas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogAreaSchema = createInsertSchema(catalogAreas).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogArea = z.infer<typeof insertCatalogAreaSchema>;
export type CatalogArea = typeof catalogAreas.$inferSelect;

// Tipologias catalog (typology names like A1, B2, etc.)
export const catalogTipologias = pgTable("catalog_tipologias", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  developmentId: varchar("development_id"),
  active: boolean("active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogTipologiaSchema = createInsertSchema(catalogTipologias).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogTipologia = z.infer<typeof insertCatalogTipologiaSchema>;
export type CatalogTipologia = typeof catalogTipologias.$inferSelect;

// Role permissions table - stores custom permission overrides
export const rolePermissions = pgTable("role_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  section: text("section").notNull(), // desarrolladores, prospectos, clientes, etc.
  field: text("field").notNull(), // field name within the section
  role: text("role").notNull(), // admin, actualizador, perfilador, finanzas, asesor, desarrollador
  permissionLevel: text("permission_level").notNull(), // none, view, edit
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  id: true,
  updatedAt: true,
});

export const updateRolePermissionSchema = z.object({
  section: z.string(),
  field: z.string(),
  role: z.string(),
  permissionLevel: z.enum(['none', 'view', 'edit']),
});

export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;

// ============ NEW CATALOGS FOR PROPERTIES ============

// Niveles catalog (floor levels: 1-7, 110)
export const catalogNiveles = pgTable("catalog_niveles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogNivelSchema = createInsertSchema(catalogNiveles).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogNivel = z.infer<typeof insertCatalogNivelSchema>;
export type CatalogNivel = typeof catalogNiveles.$inferSelect;

// Torres catalog (towers: 1-8)
export const catalogTorres = pgTable("catalog_torres", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogTorreSchema = createInsertSchema(catalogTorres).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogTorre = z.infer<typeof insertCatalogTorreSchema>;
export type CatalogTorre = typeof catalogTorres.$inferSelect;

// Recámaras catalog (bedrooms: Loft, 1, 1+Flex, 2, etc.)
export const catalogRecamaras = pgTable("catalog_recamaras", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogRecamaraSchema = createInsertSchema(catalogRecamaras).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogRecamara = z.infer<typeof insertCatalogRecamaraSchema>;
export type CatalogRecamara = typeof catalogRecamaras.$inferSelect;

// Baños catalog (bathrooms: 1, 1.5, 2, 2.5, 3, 3.5)
export const catalogBanos = pgTable("catalog_banos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogBanoSchema = createInsertSchema(catalogBanos).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogBano = z.infer<typeof insertCatalogBanoSchema>;
export type CatalogBano = typeof catalogBanos.$inferSelect;

// Cajones catalog (parking spots: No, 1, 2, 3, 2 en Tandem)
export const catalogCajones = pgTable("catalog_cajones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogCajonSchema = createInsertSchema(catalogCajones).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogCajon = z.infer<typeof insertCatalogCajonSchema>;
export type CatalogCajon = typeof catalogCajones.$inferSelect;

// Nivel de Mantenimiento catalog (AAA→80, A→65, B→45, C→35)
export const catalogNivelMantenimiento = pgTable("catalog_nivel_mantenimiento", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  valor: integer("valor"), // Associated maintenance cost per m²
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogNivelMantenimientoSchema = createInsertSchema(catalogNivelMantenimiento).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogNivelMantenimiento = z.infer<typeof insertCatalogNivelMantenimientoSchema>;
export type CatalogNivelMantenimiento = typeof catalogNivelMantenimiento.$inferSelect;

// ============ NEW CATALOGS FOR PROSPECTS ============

// Tipo de Cliente catalog (Inversionista, Uso Propio, Revender)
export const catalogTipoCliente = pgTable("catalog_tipo_cliente", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  color: text("color"), // Color hex for badge display
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogTipoClienteSchema = createInsertSchema(catalogTipoCliente).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogTipoCliente = z.infer<typeof insertCatalogTipoClienteSchema>;
export type CatalogTipoCliente = typeof catalogTipoCliente.$inferSelect;

// Perfil catalog (Estudiante, Profesionista, Pareja, etc.)
export const catalogPerfil = pgTable("catalog_perfil", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  color: text("color"), // Color hex for badge display
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogPerfilSchema = createInsertSchema(catalogPerfil).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogPerfil = z.infer<typeof insertCatalogPerfilSchema>;
export type CatalogPerfil = typeof catalogPerfil.$inferSelect;

// Fuente catalog (source of leads: Instagram, Facebook, Referido, etc.)
export const catalogFuente = pgTable("catalog_fuente", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  color: text("color"), // Color hex for badge display
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogFuenteSchema = createInsertSchema(catalogFuente).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogFuente = z.infer<typeof insertCatalogFuenteSchema>;
export type CatalogFuente = typeof catalogFuente.$inferSelect;

// Status Prospecto catalog (Activo, En Hold, No Activo)
export const catalogStatusProspecto = pgTable("catalog_status_prospecto", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  color: text("color"), // Color hex for badge display
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogStatusProspectoSchema = createInsertSchema(catalogStatusProspecto).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogStatusProspecto = z.infer<typeof insertCatalogStatusProspectoSchema>;
export type CatalogStatusProspecto = typeof catalogStatusProspecto.$inferSelect;

// Etapa de Embudo catalog (sales funnel stages)
export const catalogEtapaEmbudo = pgTable("catalog_etapa_embudo", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  color: text("color"), // Color hex for badge display
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogEtapaEmbudoSchema = createInsertSchema(catalogEtapaEmbudo).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogEtapaEmbudo = z.infer<typeof insertCatalogEtapaEmbudoSchema>;
export type CatalogEtapaEmbudo = typeof catalogEtapaEmbudo.$inferSelect;

// Como Paga catalog (payment type: Enganche Bajo, Enganche Alto, Capital Semilla)
export const catalogComoPaga = pgTable("catalog_como_paga", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogComoPagaSchema = createInsertSchema(catalogComoPaga).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogComoPaga = z.infer<typeof insertCatalogComoPagaSchema>;
export type CatalogComoPaga = typeof catalogComoPaga.$inferSelect;

// Positivos catalog (positive feedback: Precio, Ubicación, Diseño, etc.)
export const catalogPositivos = pgTable("catalog_positivos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogPositivoSchema = createInsertSchema(catalogPositivos).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogPositivo = z.infer<typeof insertCatalogPositivoSchema>;
export type CatalogPositivo = typeof catalogPositivos.$inferSelect;

// Negativos catalog (negative feedback: Precio, Ubicación, Permisos, etc.)
export const catalogNegativos = pgTable("catalog_negativos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogNegativoSchema = createInsertSchema(catalogNegativos).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogNegativo = z.infer<typeof insertCatalogNegativoSchema>;
export type CatalogNegativo = typeof catalogNegativos.$inferSelect;

// Asesor catalog (Asesor 1, Asesor 2, etc.)
export const catalogAsesor = pgTable("catalog_asesor", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogAsesorSchema = createInsertSchema(catalogAsesor).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogAsesor = z.infer<typeof insertCatalogAsesorSchema>;
export type CatalogAsesor = typeof catalogAsesor.$inferSelect;

// Broker Externo catalog (Externo 1, Externo 2, etc.)
export const catalogBrokerExterno = pgTable("catalog_broker_externo", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogBrokerExternoSchema = createInsertSchema(catalogBrokerExterno).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogBrokerExterno = z.infer<typeof insertCatalogBrokerExternoSchema>;
export type CatalogBrokerExterno = typeof catalogBrokerExterno.$inferSelect;

// Tipo de Contrato catalog
export const catalogTipoContrato = pgTable("catalog_tipo_contrato", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogTipoContratoSchema = createInsertSchema(catalogTipoContrato).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogTipoContrato = z.infer<typeof insertCatalogTipoContratoSchema>;
export type CatalogTipoContrato = typeof catalogTipoContrato.$inferSelect;

// Cesión de Derechos catalog
export const catalogCesionDerechos = pgTable("catalog_cesion_derechos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogCesionDerechosSchema = createInsertSchema(catalogCesionDerechos).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogCesionDerechos = z.infer<typeof insertCatalogCesionDerechosSchema>;
export type CatalogCesionDerechos = typeof catalogCesionDerechos.$inferSelect;

// Presentación catalog
export const catalogPresentacion = pgTable("catalog_presentacion", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCatalogPresentacionSchema = createInsertSchema(catalogPresentacion).omit({
  id: true,
  createdAt: true,
});

export type InsertCatalogPresentacion = z.infer<typeof insertCatalogPresentacionSchema>;
export type CatalogPresentacion = typeof catalogPresentacion.$inferSelect;

// Global settings for typology defaults
export const globalSettings = pgTable("global_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  label: text("label"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGlobalSettingSchema = createInsertSchema(globalSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertGlobalSetting = z.infer<typeof insertGlobalSettingSchema>;
export type GlobalSetting = typeof globalSettings.$inferSelect;
