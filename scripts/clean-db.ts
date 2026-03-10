import { db } from "../server/db";
import { pool } from "../server/db";
import { sql } from "drizzle-orm";

const tables = [
  "sessions", "client_follow_ups", "documents", "shared_links", "development_media",
  "development_assignments", "typologies", "properties", "clients", "developments", "developers",
  "role_permissions", "global_settings",
  "catalog_cities", "catalog_zones", "catalog_development_types", "catalog_amenities",
  "catalog_efficiency_features", "catalog_other_features", "catalog_acabados", "catalog_vistas",
  "catalog_areas", "catalog_tipologias", "catalog_niveles", "catalog_torres", "catalog_recamaras",
  "catalog_banos", "catalog_cajones", "catalog_nivel_mantenimiento", "catalog_tipo_cliente",
  "catalog_perfil", "catalog_fuente", "catalog_status_prospecto", "catalog_etapa_embudo",
  "catalog_como_paga", "catalog_positivos", "catalog_negativos", "catalog_asesor",
  "catalog_broker_externo", "catalog_tipo_contrato", "catalog_cesion_derechos",
  "catalog_presentacion", "catalog_tipo_proveedor", "catalog_incluye", "catalog_si_no",
  "catalog_etapa_clientes", "catalog_avisos",
  "users",
];

async function main() {
  console.log("Truncating all tables...");
  const tableList = tables.map((t) => `"${t}"`).join(", ");
  await db.execute(sql.raw(`TRUNCATE TABLE ${tableList} CASCADE`));
  console.log("All tables truncated successfully.");
  console.log("Admin user will be re-created on next server start (seedAdminUser).");
  await pool.end();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
