// Script to update catalog colors from exact Excel RGB values
const BASE_URL = 'http://localhost:5000';

async function getSession() {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  if (!res.ok) throw new Error('Login failed');
  const data = await res.json();
  return data.sessionId;
}

async function apiGet(token, endpoint) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return res.json();
}

async function apiPut(token, endpoint, body) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.error(`  FAIL PUT ${endpoint}:`, await res.text());
  return res.ok;
}

async function updateColors(token, endpoint, colorMap, label) {
  const items = await apiGet(token, endpoint);
  let updated = 0;
  for (const item of items) {
    const color = colorMap[item.name];
    if (color !== undefined) {
      const ok = await apiPut(token, `${endpoint}/${item.id}`, { color });
      if (ok) updated++;
    }
  }
  console.log(`${label}: ${updated} updated out of ${items.length}`);
}

async function main() {
  const token = await getSession();
  console.log('Authenticated. Updating colors with exact Excel values...\n');

  // TIPO CLIENTE
  await updateColors(token, '/api/catalog/tipo-cliente', {
    'Inversionista': '#66FF33',
    'Uso Propio': '#00FFFF',
    'Revender': '#FFFF00',
  }, 'Tipo Cliente');

  // PERFIL
  await updateColors(token, '/api/catalog/perfil', {
    'Estudiante': '#1408FC',
    'Profesionista': '#F846E7',
    'Pareja': '#00FFFF',
    'Familia Joven': '#FFFF00',
    'Familia Grande': '#66FF33',
    'Tercera Edad': '#FFC000',
  }, 'Perfil');

  // FUENTE
  await updateColors(token, '/api/catalog/fuente', {
    'FACEBOOK ADS': '#0000A8',
    'FACEBOOK FAN': '#0000E6',
    'GRUPO FACEBOOK': '#9797FF',
    'FB MARKETPLACE': '#C5C5FF',
    'INSTAGRAM ADS': '#CC00CC',
    'INSTAGRAM FOLLOWER': '#FCC8F7',
    'LANDING PAGE': '#FFFF00',
    'BROKER EXTERNO': '#FFC000',
    'REFERIDO': '#FFF2CC',
    'LEAD PASADO': '#FFF2CC',
    'CONOCIDO DE ASESOR': '#FFF2CC',
    'BASE DE DATOS': '#D0CECE',
    'PERIÓDICO': '#767171',
    'FLYER': '#767171',
    'RÓTULO': '#767171',
    'GOOGLE ADS': '#00B050',
    'LINKEDIN': '#E7E6E6',
    'TIKTOK': '#000000',
    'TWITTER': '#00FFFF',
    'YOUTUBE': '#FF5D5D',
  }, 'Fuente');

  // ESTATUS PROSPECTO
  await updateColors(token, '/api/catalog/status-prospecto', {
    'ACTIVO': '#66FF33',
    'EN HOLD': '#FFC000',
    'INACTIVO': '#FF0000',
  }, 'Estatus Prospecto');

  // ETAPA EMBUDO
  await updateColors(token, '/api/catalog/etapa-embudo', {
    'NUEVO': null,
    'NO CONTESTA': '#8A8A8A',
    'VALIDADO': '#00FFFF',
    'ASIGNADO': '#FFFF00',
    'NO LE INTERESÓ': '#4D4D4D',
    'MUESTRA INTERÉS': '#FCC8F7',
    'PRESENTACIÓN': '#FCAAF4',
    'SHOWROOM': '#E664DA',
    'EVALUANDO': '#C907B7',
    'NEGOCIACIÓN': '#89057C',
    'CIERRE GANADO': '#66FF66',
    'CIERRE PERDIDO': '#FF0000',
  }, 'Etapa Embudo');

  // ETAPA CLIENTES
  await updateColors(token, '/api/catalog/etapa-clientes', {
    'POR SEPARAR': null,
    'SEPARADO': '#FFFF00',
    'PAPELERÍA': '#FFC000',
    'ENGANCHE': '#30C800',
    'FIRMA': '#66FF66',
    'POSTVENTA': '#E664DA',
  }, 'Etapa Clientes');

  console.log('\n✓ Done!');
}

main().catch(e => { console.error(e); process.exit(1); });
