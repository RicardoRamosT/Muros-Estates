import { db } from "../server/db";
import { developers, developments } from "../shared/schema";
import { eq, isNull } from "drizzle-orm";

const NOMBRES = ["Carlos","María","Juan","Ana","Roberto","Laura","Miguel","Patricia","Fernando","Sofía"];
const APELLIDOS = ["García","Hernández","López","Martínez","González","Rodríguez","Pérez","Sánchez","Ramírez","Torres"];
const UNIT_TYPES = ["A","B","C","D","E","F","Studio","Penthouse","Garden"];
const DELIVERY_DATES = ["Q1 2026","Q2 2026","Q3 2026","Q4 2026","Q1 2027","Q2 2027"];
const CONTRATOS = ["Compraventa","Promesa","Cesión de derechos","Fideicomiso"];

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}
function genPhone(): string { return `81${rand(10000000,99999999)}`; }

async function main() {
  // 1. Fix developers: all missing contratos
  const allDevs = await db.select().from(developers).where(isNull(developers.deletedAt));
  console.log(`Found ${allDevs.length} developers`);

  for (const dev of allDevs) {
    const updates: Record<string, any> = {};
    if (!dev.contratos || dev.contratos.length === 0) {
      updates.contratos = pickN(CONTRATOS, rand(1, 3));
    }
    if (Object.keys(updates).length > 0) {
      await db.update(developers).set(updates).where(eq(developers.id, dev.id));
      console.log(`  Updated developer "${dev.name}": ${JSON.stringify(updates)}`);
    }
  }

  // 2. Fix developments: assign to developers and fill missing fields
  const allDevps = await db.select().from(developments).where(isNull(developments.deletedAt));
  const devList = allDevs.filter(d => d.active);
  console.log(`\nFound ${allDevps.length} developments, ${devList.length} active developers`);

  // Distribute developments across developers (2 each)
  for (let i = 0; i < allDevps.length; i++) {
    const devp = allDevps[i];
    const parentDev = devList[i % devList.length];
    const updates: Record<string, any> = {};

    if (!devp.developerId) {
      updates.developerId = parentDev.id;
    }
    if (!devp.empresaTipo) {
      // Auto-fill from parent developer's tipo
      const actualParent = devp.developerId
        ? devList.find(d => d.id === devp.developerId) || parentDev
        : parentDev;
      updates.empresaTipo = actualParent.tipo || "Desarrollador";
    }
    if (!devp.tipologiasList || devp.tipologiasList.length === 0) {
      updates.tipologiasList = pickN(UNIT_TYPES, rand(2, 4));
    }
    if (!devp.recamaras) {
      const opts = ["1","2","3","4"];
      updates.recamaras = pickN(opts, rand(2, 3)).join(",");
    }
    if (!devp.banos) {
      const opts = ["1","1.5","2","2.5","3"];
      updates.banos = pickN(opts, rand(2, 3)).join(",");
    }
    if (!devp.inicioProyectado) {
      updates.inicioProyectado = pick(["Q1 2025","Q2 2025","Q3 2025","Q4 2025"]);
    }
    if (!devp.entregaProyectada) {
      updates.entregaProyectada = pick(DELIVERY_DATES);
    }
    if (!devp.ventasNombre) {
      updates.ventasNombre = `${pick(NOMBRES)} ${pick(APELLIDOS)}`;
    }
    if (!devp.ventasTelefono) {
      updates.ventasTelefono = genPhone();
    }
    if (!devp.ventasCorreo) {
      updates.ventasCorreo = `ventas.${(devp.name || 'dev').toLowerCase().replace(/\s+/g, '')}@email.com`;
    }
    if (!devp.pagosNombre) {
      updates.pagosNombre = `${pick(NOMBRES)} ${pick(APELLIDOS)}`;
    }
    if (!devp.pagosTelefono) {
      updates.pagosTelefono = genPhone();
    }
    if (!devp.pagosCorreo) {
      updates.pagosCorreo = `pagos.${(devp.name || 'dev').toLowerCase().replace(/\s+/g, '')}@email.com`;
    }
    if (!devp.tipoContrato) {
      updates.tipoContrato = pick(["Contrato de Promesa de Compraventa","Promesa de Compraventa","Contrato de Compraventa"]);
    }
    if (!devp.cesionDerechos) {
      updates.cesionDerechos = pick(["Si","No","Si, con condiciones"]);
    }

    if (Object.keys(updates).length > 0) {
      await db.update(developments).set(updates).where(eq(developments.id, devp.id));
      console.log(`  Updated development "${devp.name}": ${Object.keys(updates).join(', ')}`);
    }
  }

  console.log("\nDone! All fields filled.");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
