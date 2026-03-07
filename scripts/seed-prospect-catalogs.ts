import { db } from "../server/db";
import { pool } from "../server/db";
import {
  catalogTipoCliente, catalogPerfil, catalogFuente, catalogStatusProspecto,
  catalogEtapaEmbudo, catalogComoPaga, catalogPositivos, catalogNegativos,
  catalogBrokerExterno, catalogEtapaClientes,
} from "../shared/schema";
import { sql } from "drizzle-orm";

interface CatalogEntry {
  name: string;
  color?: string;
  order: number;
}

async function upsertCatalog(table: any, entries: CatalogEntry[]) {
  for (const entry of entries) {
    const existing = await db.select().from(table).where(sql`${table.name} = ${entry.name}`);
    if (existing.length > 0) {
      await db.update(table).set({ color: entry.color || null, order: entry.order, active: true }).where(sql`${table.name} = ${entry.name}`);
    } else {
      await db.insert(table).values({ name: entry.name, color: entry.color || null, order: entry.order, active: true });
    }
  }
}

async function main() {
  console.log("Seeding prospect catalogs...");

  // TIPO (catalog_tipo_cliente)
  await upsertCatalog(catalogTipoCliente, [
    { name: "Inversionista", color: "#FF0000", order: 1 },
    { name: "Uso Propio", color: "#008000", order: 2 },
    { name: "Revender", color: "#0000FF", order: 3 },
  ]);
  console.log("  ✓ Tipo Cliente");

  // PERFIL (catalog_perfil)
  await upsertCatalog(catalogPerfil, [
    { name: "Estudiante", order: 1 },
    { name: "Profesionista", order: 2 },
    { name: "Pareja", order: 3 },
    { name: "Familia Joven", order: 4 },
    { name: "Familia Grande", order: 5 },
    { name: "Tercera Edad", order: 6 },
  ]);
  console.log("  ✓ Perfil");

  // FUENTE (catalog_fuente)
  await upsertCatalog(catalogFuente, [
    { name: "Facebook Ads", color: "#0000FF", order: 1 },
    { name: "Facebook Fan", color: "#0000CD", order: 2 },
    { name: "Grupo Facebook", color: "#00008B", order: 3 },
    { name: "FB Marketplace", color: "#0000FF", order: 4 },
    { name: "Instagram Ads", color: "#800080", order: 5 },
    { name: "Instagram Follower", color: "#800080", order: 6 },
    { name: "Landing Page", color: "#008000", order: 7 },
    { name: "Broker Externo", color: "#FFD700", order: 8 },
    { name: "Referido", order: 9 },
    { name: "Lead Pasado", order: 10 },
    { name: "Conocido de Asesor", order: 11 },
    { name: "Base de Datos", order: 12 },
    { name: "Periódico", order: 13 },
    { name: "Flyer", order: 14 },
    { name: "Rótulo", order: 15 },
    { name: "Google Ads", color: "#008000", order: 16 },
    { name: "LinkedIn", order: 17 },
    { name: "TikTok", order: 18 },
    { name: "Twitter", order: 19 },
    { name: "YouTube", color: "#FF0000", order: 20 },
  ]);
  console.log("  ✓ Fuente");

  // ASESOR EXTERNO (catalog_broker_externo)
  await upsertCatalog(catalogBrokerExterno, [
    { name: "Externo 1", order: 1 },
    { name: "Externo 2", order: 2 },
    { name: "Externo 3", order: 3 },
    { name: "Externo 4", order: 4 },
    { name: "Externo 5", order: 5 },
    { name: "Externo 6", order: 6 },
    { name: "Externo 7", order: 7 },
    { name: "Externo 8", order: 8 },
    { name: "Externo 9", order: 9 },
    { name: "Externo 10", order: 10 },
  ]);
  console.log("  ✓ Broker Externo");

  // ESTATUS (catalog_status_prospecto)
  await upsertCatalog(catalogStatusProspecto, [
    { name: "Activo", color: "#00FF00", order: 1 },
    { name: "En Hold", color: "#FFFF00", order: 2 },
    { name: "Inactivo", color: "#FF0000", order: 3 },
  ]);
  console.log("  ✓ Status Prospecto");

  // ETAPA (catalog_etapa_embudo)
  await upsertCatalog(catalogEtapaEmbudo, [
    { name: "Nuevo", color: "#87CEEB", order: 1 },
    { name: "No Contesta", color: "#FFD700", order: 2 },
    { name: "Validado", color: "#32CD32", order: 3 },
    { name: "Asignado", color: "#90EE90", order: 4 },
    { name: "No le Interesó", color: "#FF0000", order: 5 },
    { name: "Muestra Interés", color: "#FF00FF", order: 6 },
    { name: "Presentación", color: "#800080", order: 7 },
    { name: "Showroom", color: "#1A1A1A", order: 8 },
    { name: "Evaluando", color: "#555555", order: 9 },
    { name: "Negociación", color: "#333333", order: 10 },
    { name: "Cierre Ganado", color: "#00FF00", order: 11 },
    { name: "Cierre Perdido", color: "#8B0000", order: 12 },
  ]);
  console.log("  ✓ Etapa Embudo");

  // CÓMO PAGA (catalog_como_paga)
  await upsertCatalog(catalogComoPaga, [
    { name: "Enganche Bajo", order: 1 },
    { name: "Enganche Alto", order: 2 },
    { name: "Enganche a la Medida", order: 3 },
    { name: "Capital Semilla", order: 4 },
  ]);
  console.log("  ✓ Cómo Paga");

  // POSITIVOS (catalog_positivos)
  await upsertCatalog(catalogPositivos, [
    { name: "Precio", order: 1 },
    { name: "Ubicación", order: 2 },
    { name: "Diseño", order: 3 },
    { name: "Tamaño", order: 4 },
    { name: "Amenidades", order: 5 },
    { name: "Esquema de Pagos", order: 6 },
    { name: "Permisos", order: 7 },
    { name: "Desarrollador", order: 8 },
    { name: "Tiempo de Entrega", order: 9 },
  ]);
  console.log("  ✓ Positivos");

  // NEGATIVOS (catalog_negativos)
  await upsertCatalog(catalogNegativos, [
    { name: "Precio", order: 1 },
    { name: "Ubicación", order: 2 },
    { name: "Diseño", order: 3 },
    { name: "Tamaño", order: 4 },
    { name: "Amenidades", order: 5 },
    { name: "Esquema de Pagos", order: 6 },
    { name: "Permisos", order: 7 },
    { name: "Desarrollador", order: 8 },
    { name: "Tiempo de Entrega", order: 9 },
  ]);
  console.log("  ✓ Negativos");

  // ETAPA CLIENTES (catalog_etapa_clientes)
  await upsertCatalog(catalogEtapaClientes, [
    { name: "Por Separar", order: 1 },
    { name: "Separado", color: "#00FF00", order: 2 },
    { name: "Papelería", color: "#FF69B4", order: 3 },
    { name: "Enganche", color: "#FFFF00", order: 4 },
    { name: "Firma", color: "#FFA500", order: 5 },
    { name: "Postventa", color: "#FF00FF", order: 6 },
  ]);
  console.log("  ✓ Etapa Clientes");

  console.log("Done seeding prospect catalogs.");
  await pool.end();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
