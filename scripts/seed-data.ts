import { db } from "../server/db";
import { developers, developments, typologies, clients, properties, users, catalogCities, catalogZones } from "../shared/schema";
import { sql, eq } from "drizzle-orm";

const CITIES_ZONES: Record<string, string[]> = {
  "Monterrey": ["San Pedro Garza García", "Carretera Nacional"],
  "CDMX": ["Polanco", "Santa Fe"],
};

const DEV_TYPES = ["Residencial","Comercial","Oficinas","Salud"];

const AMENITIES = ["Acceso controlado","Alberca","Bodega","Business center","Cafetería","Cancha de basketball","Cancha de paddle","Cancha de tennis","Cinema","Concierge","Coworking","Estacionamiento visitas","Gimnasio","Jacuzzi","Jogging track","Kids room","Lavandería","Lobby","Lounge","Pet park","Restaurante","Roof garden","Sala de juntas","Salón de eventos","Sauna","Seguridad 24/7","Sky bar","Spa","Terraza","Área de asadores","Área de juegos","Área de yoga"];

const EFFICIENCY = ["Calentador solar","Elevadores","Iluminación inteligente","Paneles solares","Pet friendly","Recolección de agua","Shoot de basura"];

const OTHER_FEATURES = ["Accesos independientes","En operación","Servicios de hotel","Video Vigilancia"];

const DEVELOPER_NAMES = [
  "Grupo Inmobiliario Alfa",
  "Desarrollos Capital",
  "Vertice Construcciones",
  "Terra Proyectos",
];

const DEVELOPMENT_PREFIXES = [
  "Torre","Residencial","Parque","Vista","Jardines","Alto","Bosque","Cielo",
  "Loft","Luna","Sol","Punta","Cima","Arco","Mirador","Horizonte","Encanto",
  "Oasis","Puerta","Cenit","Aura","Nova","Vive","Avante","Aqua","Brisa",
];

const DEVELOPMENT_SUFFIXES = [
  "","Norte","Sur","Premium","Grand","One","Living","Park","Green","City",
  "Plus","Elite","Lux","Prime","Central","Heights","Place","Tower",
];

const VIEWS = ["Norte","Sur","Este","Oeste","Panorámica"];
const DELIVERY_DATES = ["Inmediata","Q1 2026","Q2 2026","Q3 2026","Q4 2026","Q1 2027","Q2 2027","Q3 2027"];
const UNIT_TYPES = ["A","B","C","D","E","F","Studio","Penthouse","Garden"];

const NOMBRES = ["Carlos","María","Juan","Ana","Roberto","Laura","Miguel","Patricia","Fernando","Sofía","Diego","Valentina","Alejandro","Gabriela","Ricardo","Daniela","José","Camila","Luis","Andrea","Pedro","Lucía","Jorge","Fernanda","Eduardo","Isabel","Héctor","Mónica","Raúl","Carmen"];
const APELLIDOS = ["García","Hernández","López","Martínez","González","Rodríguez","Pérez","Sánchez","Ramírez","Torres","Flores","Rivera","Gómez","Díaz","Cruz","Morales","Reyes","Gutiérrez","Ortiz","Ramos"];

const TIPO_FIL = ["inversionista","uso_propio","revender"];
const PERFILES = ["estudiante","profesionista","pareja","familia_joven","familia_grande","tercera_edad"];
const FUENTES = ["instagram_ads","instagram_follower","facebook_ads","facebook_fan","landing_page","grupo_facebook","fb_marketplace","broker_externo","referido","lead_pasado","conocido_asesor","base_datos","periodico","flyer","rotulo","google_ads","linkedin","tiktok","twitter"];
const ESTATUS = ["activo","en_hold","no_activo"];
const EMBUDOS = ["nuevo","asignado","no_contesta","no_le_intereso","validado","envio_info","muestra_interes","presentacion","showroom","evaluando","negociacion","cierre_ganado","cierre_perdido","separado","enganche_firma"];
const COMO_PAGA = ["enganche_bajo","enganche_alto","capital_semilla"];
const POSITIVOS_OPTS = ["precio","ubicacion","diseno","tamano","amenidades","esquema_pagos"];
const NEGATIVOS_OPTS = ["precio","ubicacion","diseno","tamano","amenidades","esquema_pagos","permisos","desarrollador","tiempo_entrega"];

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function roundTo1000(val: number): number {
  return Math.round(val / 1000) * 1000;
}

function genPhone(): string {
  return `81${rand(10000000,99999999)}`;
}

function genEmail(nombre: string, apellido: string): string {
  const domains = ["gmail.com","hotmail.com","outlook.com","yahoo.com","icloud.com"];
  return `${nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}.${apellido.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}${rand(1,99)}@${pick(domains)}`;
}

async function seed() {
  console.log("Clearing existing data...");
  await db.delete(typologies);
  await db.delete(properties);
  await db.delete(developments);
  await db.delete(developers);
  await db.delete(clients);
  await db.delete(catalogZones);
  await db.delete(catalogCities);
  console.log("Cleared.");

  // Seed catalog cities & zones
  console.log("Inserting catalog cities & zones...");
  const cityMap: Record<string, string> = {};
  for (const cityName of Object.keys(CITIES_ZONES)) {
    const [city] = await db.insert(catalogCities).values({ name: cityName }).returning({ id: catalogCities.id });
    cityMap[cityName] = city.id;
  }
  for (const [cityName, zones] of Object.entries(CITIES_ZONES)) {
    for (const zoneName of zones) {
      await db.insert(catalogZones).values({ name: zoneName, cityId: cityMap[cityName] });
    }
  }
  console.log("Inserted catalog cities & zones.");

  // Fetch real user IDs for asesorId FK
  let asesorIds: string[];
  const existingUsers = await db.select({ id: users.id }).from(users).where(eq(users.active, true));
  if (existingUsers.length > 0) {
    asesorIds = existingUsers.map(u => u.id);
  } else {
    console.log("No users found — prospects will have null asesorId.");
    asesorIds = [];
  }

  const allCities = Object.keys(CITIES_ZONES);
  const insertedDevs: { id: string; name: string }[] = [];
  const insertedDevps: { id: string; name: string; city: string; zone: string; developerName: string }[] = [];

  console.log("Inserting 4 developers...");
  for (const devName of DEVELOPER_NAMES) {
    const tipos = pickN(DEV_TYPES, rand(1, 3));
    const [inserted] = await db.insert(developers).values({
      name: devName,
      active: true,
      tipo: pick(["Desarrollador","Comercializadora","Constructora"]),
      contratos: pickN(["Compraventa","Promesa","Cesión de derechos","Fideicomiso"], rand(1, 3)),
      tipos,
      razonSocial: `${devName} S.A. de C.V.`,
      rfc: `${devName.substring(0,3).toUpperCase()}${rand(100000,999999)}${String.fromCharCode(65+rand(0,25))}${rand(10,99)}`,
      contactName: `${pick(NOMBRES)} ${pick(APELLIDOS)}`,
      contactPhone: genPhone(),
      contactEmail: genEmail(devName.split(" ")[0], "corp"),
      website: `https://www.${devName.toLowerCase().replace(/\s+/g, "")}.com.mx`,
      antiguedadDeclarada: `${rand(3, 25)} años`,
    }).returning({ id: developers.id });

    insertedDevs.push({ id: inserted.id, name: devName });
  }
  console.log(`Inserted ${insertedDevs.length} developers.`);

  console.log("Inserting developments...");
  const usedDevpNames = new Set<string>();

  for (const dev of insertedDevs) {
    const numDevps = 2;
    for (let i = 0; i < numDevps; i++) {
      let devpName: string;
      do {
        devpName = `${pick(DEVELOPMENT_PREFIXES)} ${pick(DEVELOPMENT_SUFFIXES)}`.trim();
      } while (usedDevpNames.has(devpName));
      usedDevpNames.add(devpName);

      const city = pick(allCities);
      const zonesForCity = CITIES_ZONES[city];
      const zone = pick(zonesForCity);
      const tipos = pickN(DEV_TYPES, rand(1, 2));
      const amenitiesList = pickN(AMENITIES, rand(4, 12));
      const efficiencyList = pickN(EFFICIENCY, rand(1, 4));
      const otherList = pickN(OTHER_FEATURES, rand(0, 3));

      const torres = rand(1, 4);
      const niveles = rand(5, 30);
      const totalUnits = rand(20, 200);
      const vendidas = rand(0, totalUnits);
      const typoLabels = pickN(UNIT_TYPES, 2);
      const bedroomOptions = [1, 2, 3, 4].slice(0, rand(2, 4));
      const bathroomOptions = [1, 1.5, 2, 2.5, 3].slice(0, rand(2, 4));

      const [inserted] = await db.insert(developments).values({
        developerId: dev.id,
        name: devpName,
        city,
        zone,
        tipos,
        nivel: pick(["Premium","Medio","Económico","Lujo"]),
        torres,
        niveles,
        amenities: amenitiesList,
        efficiency: efficiencyList,
        otherFeatures: otherList,
        tamanoDesde: String(roundTo1000(rand(30, 60) * 1000) / 1000),
        tamanoHasta: String(roundTo1000(rand(80, 200) * 1000) / 1000),
        lockOff: Math.random() > 0.7,
        depasUnidades: totalUnits,
        depasVendidas: vendidas,
        depasPorcentaje: String(Math.round((vendidas / totalUnits) * 100)),
        active: true,
        deliveryDate: pick(DELIVERY_DATES),
        totalUnits,
        availableUnits: totalUnits - vendidas,
        empresaTipo: pick(["Desarrollador","Comercializadora","Constructora"]),
        tipologiasList: typoLabels,
        recamaras: bedroomOptions.join(","),
        banos: bathroomOptions.join(","),
        inicioProyectado: pick(["Q1 2025","Q2 2025","Q3 2025","Q4 2025"]),
        entregaProyectada: pick(DELIVERY_DATES),
        ventasNombre: `${pick(NOMBRES)} ${pick(APELLIDOS)}`,
        ventasTelefono: genPhone(),
      }).returning({ id: developments.id });

      insertedDevps.push({ id: inserted.id, name: devpName, city, zone, developerName: dev.name });
    }
  }
  console.log(`Inserted ${insertedDevps.length} developments.`);

  console.log("Inserting typologies...");
  let typoCount = 0;

  for (const devp of insertedDevps) {
    const numTypos = 2;
    for (let i = 0; i < numTypos; i++) {
      const size = rand(35, 200);
      const pricePerM2 = roundTo1000(rand(25, 120) * 1000);
      const price = roundTo1000(size * pricePerM2);
      const hasDiscount = Math.random() > 0.7;
      const discountPercent = hasDiscount ? rand(3, 15) : null;
      const discountAmount = hasDiscount && discountPercent ? roundTo1000(price * discountPercent / 100) : null;
      const finalPrice = hasDiscount && discountAmount ? price - discountAmount : price;
      const bedrooms = rand(1, 4);
      const bathrooms = bedrooms <= 2 ? rand(1, 2) : rand(2, 4);
      const level = rand(1, 25);
      const hasBalcony = Math.random() > 0.4;
      const hasTerrace = Math.random() > 0.6;
      const initialPercent = rand(5, 30);
      const initialAmount = roundTo1000(finalPrice * initialPercent / 100);
      const duringConstPercent = rand(5, 20);
      const duringConstAmount = roundTo1000(finalPrice * duringConstPercent / 100);
      const paymentMonths = rand(12, 36);
      const monthlyPayment = roundTo1000(duringConstAmount / paymentMonths);
      const totalEnganche = initialAmount + duringConstAmount;
      const remainingPercent = 100 - initialPercent - duringConstPercent;

      const [prop] = await db.insert(properties).values({
        title: `${devp.name} - Tipo ${UNIT_TYPES[i % UNIT_TYPES.length]}`,
        description: `Departamento en ${devp.name}, ${devp.zone}, ${devp.city}`,
        price: String(price),
        city: devp.city,
        zone: devp.zone,
        developer: devp.developerName,
        developmentName: devp.name,
        developmentType: "Residencial",
        address: `${devp.zone}, ${devp.city}`,
        bedrooms: String(bedrooms),
        bathrooms: String(bathrooms),
        area: String(size),
        floor: level,
        parking: rand(1, 3),
        deliveryDate: pick(DELIVERY_DATES),
        status: "available",
        images: [],
        amenities: [],
      }).returning({ id: properties.id });

      await db.insert(typologies).values({
        propertyId: prop.id,
        active: true,
        city: devp.city,
        zone: devp.zone,
        developer: devp.developerName,
        development: devp.name,
        type: UNIT_TYPES[i % UNIT_TYPES.length],
        level,
        view: pick(VIEWS),
        size: String(size),
        price: String(price),
        hasDiscount,
        discountPercent: discountPercent ? String(discountPercent) : null,
        discountAmount: discountAmount ? String(discountAmount) : null,
        finalPrice: String(finalPrice),
        pricePerM2: String(pricePerM2),
        hasSeedCapital: Math.random() > 0.8,
        hasPromo: Math.random() > 0.8,
        lockOff: Math.random() > 0.85,
        bedrooms: String(bedrooms),
        bathrooms: String(bathrooms) + ".0",
        hasBalcony,
        balconySize: hasBalcony ? String(rand(3, 12)) : null,
        hasTerrace,
        terraceSize: hasTerrace ? String(rand(5, 25)) : null,
        parkingIncluded: String(rand(1, 3)),
        hasStorage: Math.random() > 0.5,
        storageSize: Math.random() > 0.5 ? String(rand(3, 15)) : null,
        initialPercent: String(initialPercent),
        initialAmount: String(initialAmount),
        duringConstructionPercent: String(duringConstPercent),
        duringConstructionAmount: String(duringConstAmount),
        paymentMonths,
        monthlyPayment: String(monthlyPayment),
        totalEnganche: String(totalEnganche),
        remainingPercent: String(remainingPercent),
        deliveryDate: pick(DELIVERY_DATES),
        livingRoom: true,
        diningRoom: true,
        kitchen: true,
        parkingSpots: rand(1, 3),
        downPaymentPercent: String(initialPercent),
      });

      typoCount++;
    }
  }
  console.log(`Inserted ${typoCount} typologies.`);

  console.log("Inserting 20 prospects...");
  for (let i = 0; i < 20; i++) {
    const nombre = pick(NOMBRES);
    const apellido = pick(APELLIDOS);
    const devp = pick(insertedDevps);
    const randomDate = new Date(2025, rand(0, 11), rand(1, 28), rand(7, 22), rand(0, 59));

    const numPositivos = rand(0, 3);
    const numNegativos = rand(0, 3);

    await db.insert(clients).values({
      nombre,
      apellido,
      telefono: genPhone(),
      correo: genEmail(nombre, apellido),
      asesorId: asesorIds.length > 0 ? pick(asesorIds) : null,
      ciudad: devp.city,
      zona: devp.zone,
      desarrollador: devp.developerName,
      desarrollo: devp.name,
      tipofil: pick(TIPO_FIL),
      perfil: pick(PERFILES),
      comoLlega: pick(FUENTES),
      brokerExterno: Math.random() > 0.7 ? "si" : "no",
      estatus: pick(ESTATUS),
      embudo: pick(EMBUDOS),
      comoPaga: pick(COMO_PAGA),
      positivos: pickN(POSITIVOS_OPTS, numPositivos),
      negativos: pickN(NEGATIVOS_OPTS, numNegativos),
      isClient: false,
      createdAt: randomDate,
      updatedAt: randomDate,
    });
  }
  console.log("Inserted 20 prospects.");

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed error:", err);
  process.exit(1);
});
