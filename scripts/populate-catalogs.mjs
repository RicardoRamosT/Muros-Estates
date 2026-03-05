// Script to populate catalog tables from Excel data
// Usage: node scripts/populate-catalogs.mjs

const BASE_URL = 'http://localhost:5000';

// Get session token - we need to login first
async function getSession() {
  const token = process.env.MUROS_SESSION;
  if (token) return token;
  // Try to login as admin
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  if (!res.ok) throw new Error('Login failed: ' + await res.text());
  const data = await res.json();
  return data.sessionId;
}

async function apiPost(token, endpoint, body) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    // Skip duplicates
    if (text.includes('duplicate') || text.includes('already exists') || res.status === 409) {
      return null;
    }
    console.error(`  FAIL ${endpoint}:`, text);
    return null;
  }
  return res.json();
}

async function apiGet(token, endpoint) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

async function populateSimple(token, endpoint, items, label) {
  const existing = await apiGet(token, endpoint);
  const existingNames = new Set(existing.map(e => e.name));
  let added = 0;
  for (let i = 0; i < items.length; i++) {
    const name = items[i];
    if (existingNames.has(name)) continue;
    const result = await apiPost(token, endpoint, { name, order: i + 1 });
    if (result) added++;
  }
  console.log(`${label}: ${added} added (${existing.length} existed)`);
}

async function main() {
  const token = await getSession();
  console.log('Authenticated. Populating catalogs...\n');

  // === CAT General ===
  console.log('--- CAT General ---');

  // Development types
  await populateSimple(token, '/api/catalog/development-types',
    ['Residencial', 'Comercial', 'Oficinas', 'Salud'], 'Tipos de Desarrollos');

  // Cities (with ISAI and Notario)
  const cities = [
    { name: 'Monterrey', isaiPercent: '0.03', notariaPercent: '0.025' },
    { name: 'Saltillo', isaiPercent: '0.03', notariaPercent: '0.025' },
    { name: 'Guadalajara', isaiPercent: '0.03', notariaPercent: '0.025' },
    { name: 'CDMX', isaiPercent: '0.03', notariaPercent: '0.025' },
    { name: 'Tulum', isaiPercent: '0.03', notariaPercent: '0.025' },
  ];
  const existingCities = await apiGet(token, '/api/catalog/cities');
  const existingCityNames = new Set(existingCities.map(c => c.name));
  let citiesAdded = 0;
  for (let i = 0; i < cities.length; i++) {
    if (existingCityNames.has(cities[i].name)) continue;
    const result = await apiPost(token, '/api/catalog/cities', { ...cities[i], order: i + 1 });
    if (result) citiesAdded++;
  }
  console.log(`Ciudades: ${citiesAdded} added (${existingCities.length} existed)`);

  // Zones (need cityId)
  const allCities = await apiGet(token, '/api/catalog/cities');
  const cityMap = Object.fromEntries(allCities.map(c => [c.name, c.id]));
  const zonas = [
    { city: 'Monterrey', zones: ['Centro', 'Poniente', 'Valle Poniente', 'Valle', 'Sur', 'San Nicolás', 'Valle Oriente', 'Maria Luisa', 'San José Tec', 'Fundidora', 'Galerías', 'Morones', 'Constitución', 'Carretera', 'Guadalupe', 'Obispado', 'Contry', 'Cumbres'] },
  ];
  const existingZones = await apiGet(token, '/api/catalog/zones');
  const existingZoneNames = new Set(existingZones.map(z => z.name));
  let zonesAdded = 0;
  for (const { city, zones } of zonas) {
    const cityId = cityMap[city];
    if (!cityId) { console.log(`  City "${city}" not found, skipping zones`); continue; }
    for (let i = 0; i < zones.length; i++) {
      if (existingZoneNames.has(zones[i])) continue;
      const result = await apiPost(token, '/api/catalog/zones', { name: zones[i], cityId, order: i + 1 });
      if (result) zonesAdded++;
    }
  }
  console.log(`Zonas: ${zonesAdded} added (${existingZones.length} existed)`);

  // Tipo de Contrato
  await populateSimple(token, '/api/catalog/tipo-contrato',
    ['Oferta de Compra sin aceptación', 'Oferta de Compra con aceptación', 'Contrato de Promesa de Compraventa', 'Promesa de Compraventa', 'Contrato de Compraventa', 'Contrato de Inversión'], 'Tipo de Contrato');

  // Presentación
  await populateSimple(token, '/api/catalog/presentacion',
    ['Showroom', 'Maqueta', 'Presentación'], 'Presentación');

  // Tipo de Proveedor
  await populateSimple(token, '/api/catalog/tipo-proveedor',
    ['Desarrollador', 'Comercializadora', 'Constructora', 'Arquitectura'], 'Tipo de Proveedor');

  // Si/No
  await populateSimple(token, '/api/catalog/si-no',
    ['Si', 'No', 'Tal Vez'], 'Si/No');

  // === CAT Desarrollos ===
  console.log('\n--- CAT Desarrollos ---');

  // Recámaras
  await populateSimple(token, '/api/catalog/recamaras',
    ['Loft', '1', '1 + Flex', '2', '2 + Flex', '3', '3 + Flex', '4', '4 + Flex'], 'Recámaras');

  // Baños
  await populateSimple(token, '/api/catalog/banos',
    ['1', '1.5', '2', '2.5', '3', '3.5'], 'Baños');

  // Areas
  await populateSimple(token, '/api/catalog/areas',
    ['Sala', 'Comedor', 'Cocina', 'Lavandería', 'Servicio'], 'Áreas');

  // Cajones
  await populateSimple(token, '/api/catalog/cajones',
    ['No', '1', '2', '3', '2 en Tandem'], 'Cajones');

  // Incluye
  await populateSimple(token, '/api/catalog/incluye',
    ['Cocina', 'Closets', 'Canceles', 'Climas'], 'Incluye');

  // Acabados
  await populateSimple(token, '/api/catalog/acabados',
    ['Muros Interiores en Yeso.', 'Muros Interiores en Concreto Aparente.', 'Muros Interiores con Acabado Ladrillo', 'Cielo de Plafond.', 'Piso Cerámico.', 'Piso Porcelanato.', 'Piso Porcelanico.', 'Piso  en Concreto Pulido.', 'Zoclo.', 'Pintura.', 'Ventanería de Aluminio.', 'Ventanería de Aluminio Duo Vent.', 'Puerta Principal con Chapa.', 'Puertas interiores con Chapa.', 'Iluminación, Contactos y Apagadores', 'Lavanetas con Grifería.', 'Sanitarios.', 'Manerales y Cebolletas para Regaderas.', 'Preparaciones listas para Mini Split.'], 'Acabados');

  // Amenidades
  await populateSimple(token, '/api/catalog/amenities',
    ['Alberca', 'Gimnasio', 'Social Gym', 'Yoga Room', 'Vitapista', 'Asadores', 'Grill Patio', 'Bungalows Culinarios', 'fogateros', 'Sports Bar', 'Juegos Infantiles', 'Terraza', 'Ludoteca', 'Co-work', 'Reading Room', 'Cancha Polivalente', 'Cancha de Futbol', 'Golfito', 'Salon de Reuniones', 'Salon Culnario', 'Salon de Eventos', 'Sala de Visitas', 'Sala de Juegos', 'Sky Lounge', 'Palapa Techada', 'Sala de Cine', 'Cine al Aire Libre', 'Jardín de Hamacas', 'Jardin Zen', 'Sala de Karaoke', 'Parque Canino', 'Arenero'], 'Amenidades');

  // Eficiencia
  await populateSimple(token, '/api/catalog/efficiency-features',
    ['Lobby de Recepción', 'Elevadores', 'Cajones de Visita', 'Lavanderia', 'shoot de basura', 'Suite de invitados', 'Rack de Bicicletas', 'Community Closet', 'Buzones', 'Cuarto de herramientas'], 'Eficiencia');

  // Seguridad (other-features)
  await populateSimple(token, '/api/catalog/other-features',
    ['Personal de Seguridad 24/7', 'Video Vigilancia / CCTV', 'Control de acceso vehicular', 'Accesos independientes a la Torre'], 'Seguridad');

  // Nivel Mantenimiento
  const nivelItems = [
    { name: 'AAA', valor: 80, equipo: 6000, muebles: 6000 },
    { name: 'A', valor: 65, equipo: 4500, muebles: 4500 },
    { name: 'B', valor: 45, equipo: 3000, muebles: 3000 },
    { name: 'C', valor: 35, equipo: 2000, muebles: 2000 },
  ];
  const existingNiveles = await apiGet(token, '/api/catalog/nivel-mantenimiento');
  const existingNivelNames = new Set(existingNiveles.map(n => n.name));
  let nivelesAdded = 0;
  for (let i = 0; i < nivelItems.length; i++) {
    if (existingNivelNames.has(nivelItems[i].name)) continue;
    const result = await apiPost(token, '/api/catalog/nivel-mantenimiento', { ...nivelItems[i], order: i + 1 });
    if (result) nivelesAdded++;
  }
  console.log(`Nivel Mantenimiento: ${nivelesAdded} added (${existingNiveles.length} existed)`);

  // === CAT Prospectos ===
  console.log('\n--- CAT Prospectos ---');

  // Tipo Cliente
  await populateSimple(token, '/api/catalog/tipo-cliente',
    ['Inversionista', 'Uso Propio', 'Revender'], 'Tipo Cliente');

  // Perfil
  await populateSimple(token, '/api/catalog/perfil',
    ['Estudiante', 'Profesionista', 'Pareja', 'Familia Joven', 'Familia Grande', 'Tercera Edad'], 'Perfil');

  // Fuente
  await populateSimple(token, '/api/catalog/fuente',
    ['FACEBOOK ADS', 'FACEBOOK FAN', 'GRUPO FACEBOOK', 'FB MARKETPLACE', 'INSTAGRAM ADS', 'INSTAGRAM FOLLOWER', 'LANDING PAGE', 'BROKER EXTERNO', 'REFERIDO', 'LEAD PASADO', 'CONOCIDO DE ASESOR', 'BASE DE DATOS', 'PERIÓDICO', 'FLYER', 'RÓTULO', 'GOOGLE ADS', 'LINKEDIN', 'TIKTOK', 'TWITTER', 'YOUTUBE'], 'Fuente');

  // Broker Externo
  await populateSimple(token, '/api/catalog/broker-externo',
    ['Externo 1', 'Externo 2', 'Externo 3', 'Externo 4', 'Externo 5', 'Externo 6', 'Externo 7', 'Externo 8', 'Externo 9', 'Externo 10'], 'Broker Externo');

  // Estatus Prospecto
  await populateSimple(token, '/api/catalog/status-prospecto',
    ['ACTIVO', 'EN HOLD', 'INACTIVO'], 'Estatus Prospecto');

  // Etapa Embudo
  await populateSimple(token, '/api/catalog/etapa-embudo',
    ['NUEVO', 'NO CONTESTA', 'VALIDADO', 'ASIGNADO', 'NO LE INTERESÓ', 'MUESTRA INTERÉS', 'PRESENTACIÓN', 'SHOWROOM', 'EVALUANDO', 'NEGOCIACIÓN', 'CIERRE GANADO', 'CIERRE PERDIDO'], 'Etapa Embudo');

  // Cómo Paga
  await populateSimple(token, '/api/catalog/como-paga',
    ['ENGANCHE BAJO', 'ENGANCHE ALTO', 'ENGANCHE A LA MEDIDA', 'CAPITAL SEMILLA'], 'Cómo Paga');

  // Positivos
  await populateSimple(token, '/api/catalog/positivos',
    ['PRECIO', 'UBICACIÓN', 'DISEÑO', 'TAMAÑO', 'AMENIDADES', 'ESQUEMA DE PAGOS', 'PERMISOS', 'DESARROLLADOR', 'TIEMPO DE ENTREGA'], 'Positivos');

  // Negativos
  await populateSimple(token, '/api/catalog/negativos',
    ['PRECIO', 'UBICACIÓN', 'DISEÑO', 'TAMAÑO', 'AMENIDADES', 'ESQUEMA DE PAGOS', 'PERMISOS', 'DESARROLLADOR', 'TIEMPO DE ENTREGA'], 'Negativos');

  // Etapa Clientes
  await populateSimple(token, '/api/catalog/etapa-clientes',
    ['POR SEPARAR', 'SEPARADO', 'PAPELERÍA', 'ENGANCHE', 'FIRMA', 'POSTVENTA'], 'Etapa Clientes');

  // Cesión de Derechos
  await populateSimple(token, '/api/catalog/cesion-derechos',
    ['Si', 'No', 'Si, con condiciones'], 'Cesión de Derechos');

  console.log('\n✓ Done!');
}

main().catch(e => { console.error(e); process.exit(1); });
