import { db } from "../server/db";
import { developers, developments, catalogTorres, catalogNiveles, catalogVistas } from "../shared/schema";
import { eq, isNull } from "drizzle-orm";

const NOMBRES = ["Carlos","María","Juan","Ana","Roberto","Laura","Miguel","Patricia","Fernando","Sofía"];
const APELLIDOS = ["García","Hernández","López","Martínez","González","Rodríguez","Pérez","Sánchez","Ramírez","Torres"];
const VIEWS = ["Norte","Sur","Este","Oeste","Panorámica"];
const DELIVERY_DATES = ["Q1 2026","Q2 2026","Q3 2026","Q4 2026","Q1 2027","Q2 2027"];
const CONTRATOS_LIST = ["Compraventa","Promesa","Cesión de derechos","Fideicomiso"];
const EMPRESA_TIPOS = ["Desarrollador","Comercializadora","Constructora"];
const UNIT_TYPES = ["A","B","C","D","E","F","Studio","Penthouse","Garden"];
const ACABADOS = [
  "Muros Interiores en Yeso.",
  "Cielo de Plafond.",
  "Piso Porcelanato.",
  "Pintura.",
  "Ventanería de Aluminio.",
  "Puerta Principal con Chapa.",
  "Puertas interiores con Chapa.",
  "Iluminación, Contactos y Apagadores",
  "Sanitarios.",
  "Manerales y Cebolletas para Regaderas.",
];
const ADDRESSES_MTY = [
  "Av. Vasconcelos 1400, Del Valle, San Pedro Garza García, N.L.",
  "Calzada del Valle 400, Del Valle, San Pedro Garza García, N.L.",
  "Av. Lázaro Cárdenas 2400, Residencial San Agustín, San Pedro Garza García, N.L.",
  "Blvd. Antonio L. Rodríguez 3000, Santa María, Monterrey, N.L.",
];
const ADDRESSES_CDMX = [
  "Av. Presidente Masaryk 340, Polanco V Sección, Miguel Hidalgo, CDMX",
  "Av. Santa Fe 440, Santa Fe, Cuajimalpa, CDMX",
  "Paseo de la Reforma 222, Juárez, Cuauhtémoc, CDMX",
  "Av. Insurgentes Sur 1602, Crédito Constructor, Benito Juárez, CDMX",
];

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}
function genPhone(): string { return `81${rand(10000000,99999999)}`; }

async function main() {
  // ========== SEED MISSING CATALOGS ==========

  // Torres catalog (1-10)
  const existingTorres = await db.select().from(catalogTorres);
  if (existingTorres.length === 0) {
    console.log("Seeding catalog_torres...");
    for (let i = 1; i <= 10; i++) {
      await db.insert(catalogTorres).values({ name: String(i), order: i });
    }
    console.log("  Inserted 10 torre values (1-10)");
  }

  // Niveles catalog (1-50)
  const existingNiveles = await db.select().from(catalogNiveles);
  if (existingNiveles.length === 0) {
    console.log("Seeding catalog_niveles...");
    for (let i = 1; i <= 50; i++) {
      await db.insert(catalogNiveles).values({ name: String(i), order: i });
    }
    console.log("  Inserted 50 nivel values (1-50)");
  }

  // Vistas catalog
  const existingVistas = await db.select().from(catalogVistas);
  if (existingVistas.length === 0) {
    console.log("Seeding catalog_vistas...");
    for (let i = 0; i < VIEWS.length; i++) {
      await db.insert(catalogVistas).values({ name: VIEWS[i], sortOrder: i });
    }
    console.log(`  Inserted ${VIEWS.length} vista values`);
  }

  // ========== FIX DEVELOPERS ==========
  const allDevs = await db.select().from(developers).where(isNull(developers.deletedAt));
  console.log(`\nFixing ${allDevs.length} developers...`);

  const devCities = ["Monterrey", "CDMX", "Monterrey", "CDMX"];
  const devZones = ["San Pedro Garza García", "Polanco", "Carretera Nacional", "Santa Fe"];

  for (let i = 0; i < allDevs.length; i++) {
    const dev = allDevs[i];
    const updates: Record<string, any> = {};

    // Fix tipo: must be one of EMPRESA_TIPOS, not "Nacional"/"Internacional"
    if (!dev.tipo || !EMPRESA_TIPOS.includes(dev.tipo)) {
      updates.tipo = pick(EMPRESA_TIPOS);
    }
    if (!dev.contratos || dev.contratos.length === 0) {
      updates.contratos = pickN(CONTRATOS_LIST, rand(1, 3));
    }
    if (!dev.domicilio) {
      updates.domicilio = i < 2 ? pick(ADDRESSES_MTY) : pick(ADDRESSES_CDMX);
    }
    if (!dev.fechaAntiguedad) {
      // Random date 3-20 years ago
      const yearsAgo = rand(3, 20);
      const d = new Date();
      d.setFullYear(d.getFullYear() - yearsAgo);
      d.setMonth(rand(0, 11));
      d.setDate(rand(1, 28));
      updates.fechaAntiguedad = d;
    }
    if (!dev.representante) {
      updates.representante = `${pick(NOMBRES)} ${pick(APELLIDOS)}`;
    }
    if (!dev.ciudad) {
      updates.ciudad = devCities[i % devCities.length];
    }
    if (!dev.zona) {
      updates.zona = devZones[i % devZones.length];
    }

    if (Object.keys(updates).length > 0) {
      await db.update(developers).set(updates).where(eq(developers.id, dev.id));
      console.log(`  Updated "${dev.name}": ${Object.keys(updates).join(', ')}`);
    } else {
      console.log(`  "${dev.name}": OK`);
    }
  }

  // ========== FIX DEVELOPMENTS ==========
  const allDevps = await db.select().from(developments).where(isNull(developments.deletedAt));
  const devList = allDevs.filter(d => d.active);
  console.log(`\nFixing ${allDevps.length} developments...`);

  for (let i = 0; i < allDevps.length; i++) {
    const devp = allDevps[i];
    const updates: Record<string, any> = {};

    // Assign developer if missing
    if (!devp.developerId) {
      updates.developerId = devList[i % devList.length].id;
    }

    // Fix empresaTipo: must be one of EMPRESA_TIPOS
    if (!devp.empresaTipo || !EMPRESA_TIPOS.includes(devp.empresaTipo)) {
      // Match parent developer's tipo (after fix)
      const parentId = devp.developerId || updates.developerId;
      const parent = allDevs.find(d => d.id === parentId);
      const parentTipo = parent?.tipo;
      updates.empresaTipo = (parentTipo && EMPRESA_TIPOS.includes(parentTipo)) ? parentTipo : pick(EMPRESA_TIPOS);
    }

    if (!devp.tipologiasList || devp.tipologiasList.length === 0) {
      updates.tipologiasList = pickN(UNIT_TYPES, rand(2, 4));
    }
    if (!devp.recamaras) {
      updates.recamaras = pickN(["1","2","3","4"], rand(2, 3)).join(",");
    }
    if (!devp.banos) {
      updates.banos = pickN(["1","1.5","2","2.5","3"], rand(2, 3)).join(",");
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

    // Fill remaining visible fields that are null
    if (!devp.vistas) {
      updates.vistas = pickN(VIEWS, rand(2, 4));
    }
    if (!devp.acabados) {
      updates.acabados = pickN(ACABADOS, rand(3, 6));
    }
    if (!devp.inicioPreventa) {
      updates.inicioPreventa = pick(["Ene 2025","Mar 2025","Jun 2025","Sep 2025","Dic 2024"]);
    }
    if (!devp.depasM2) {
      const desde = parseFloat(devp.tamanoDesde || "50");
      const hasta = parseFloat(devp.tamanoHasta || "120");
      updates.depasM2 = String(Math.round((desde + hasta) / 2));
    }
    if (!devp.redaccionValor) {
      const desde = devp.tamanoDesde || "50";
      const hasta = devp.tamanoHasta || "120";
      updates.redaccionValor = `${desde} - ${hasta} m²`;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(developments).set(updates).where(eq(developments.id, devp.id));
      console.log(`  Updated "${devp.name}": ${Object.keys(updates).join(', ')}`);
    } else {
      console.log(`  "${devp.name}": OK`);
    }
  }

  console.log("\nDone! All fields filled.");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
