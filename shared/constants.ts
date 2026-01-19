export const DEVELOPERS = [
  "IDEI",
  "Quantium",
  "AISEN",
  "Create",
  "PLATE",
  "Koinox",
  "Afio",
  "CIGO",
  "Cuadro",
  "CARZA",
  "Landwork",
  "NEST",
  "Proyectos 9"
] as const;

export const DEVELOPMENTS = [
  "Kyo Constella",
  "Novus",
  "Avalon",
  "ALTO",
  "Arena Fundidora",
  "Arena Calzada",
  "Lalo",
  "Lola",
  "Moca Azul",
  "Moca Verde",
  "Moca Rojo",
  "Colonia",
  "CUADRO",
  "LANDWORK",
  "NEST",
  "QUANTIUM",
  "Akira",
  "Rise",
  "Mun"
] as const;

export const CITIES = [
  "Monterrey",
  "CDMX"
] as const;

export const ZONES_MONTERREY = [
  "Centro",
  "Poniente",
  "Valle Poniente",
  "Valle",
  "Sur",
  "San Nicolás",
  "Valle Oriente",
  "María Luisa",
  "San José Tec",
  "Fundidora",
  "Galerías",
  "Morrones",
  "Constitución",
  "Carretera",
  "Guadalupe",
  "Obispado",
  "Contry",
  "Cumbres"
] as const;

export const ZONES_CDMX = [
  "Santa Fe",
  "Polanco",
  "Condesa",
  "Roma",
  "Del Valle",
  "Nápoles",
  "Coyoacán",
  "San Ángel"
] as const;

export const ALL_ZONES = [...ZONES_MONTERREY, ...ZONES_CDMX] as const;

export const DEVELOPMENT_TYPES = [
  "100% Residencial",
  "Uso mixto",
  "Residencial y Comercial",
  "Residencial, Comercial y Oficinas",
  "Residencial, Comercial, Oficinas y Salud"
] as const;

export interface AmenityInfo {
  id: string;
  name: string;
  icon: string;
}

export const AMENITIES: AmenityInfo[] = [
  { id: "alberca", name: "Alberca", icon: "/attached_assets/Alberca_1768780136093.png" },
  { id: "arenero", name: "Arenero", icon: "/attached_assets/Arenero_1768780141419.png" },
  { id: "asadores", name: "Asadores", icon: "/attached_assets/Asadores_1768780144493.png" },
  { id: "bungalow_culinario", name: "Bungalow Culinario", icon: "/attached_assets/Bungalow_Culinario_1768780147063.png" },
  { id: "cancha_futbol", name: "Cancha de Futbol", icon: "/attached_assets/Cancha_de_Futbol_1768780158394.png" },
  { id: "cancha_polivalente", name: "Cancha Polivalente", icon: "/attached_assets/Cancha_Polivalente_1768780161479.png" },
  { id: "cine_aire_libre", name: "Cine al Aire Libre", icon: "/attached_assets/Cine_al_aire_libre_1768780164008.png" },
  { id: "coworking", name: "Coworking", icon: "/attached_assets/Coworking_1768780167601.png" },
  { id: "fogateros", name: "Fogateros", icon: "/attached_assets/Fogateros_1768780170460.png" },
  { id: "grill_patio", name: "Grill Patio", icon: "/attached_assets/Grill_Patio_1768780173777.png" },
  { id: "gym", name: "Gimnasio", icon: "/attached_assets/Gym_1768780176792.png" },
  { id: "jardin_hamacas", name: "Jardín de Hamacas", icon: "/attached_assets/Jardin_de_hamacas_1768780179462.png" },
  { id: "jardin_zen", name: "Jardín Zen", icon: "/attached_assets/Jardin_Zen_1768780182495.png" },
  { id: "juegos_infantiles", name: "Juegos Infantiles", icon: "/attached_assets/Juegos_Infantiles_1768780185653.png" },
  { id: "ludoteca", name: "Ludoteca", icon: "/attached_assets/Ludoteca_1768780188502.png" },
  { id: "mini_golf", name: "Mini Golf", icon: "/attached_assets/Mini_Golf_1768780192470.png" },
  { id: "palapa_techada", name: "Palapa Techada", icon: "/attached_assets/Palapa_Techada_1768780195135.png" },
  { id: "parque_canino", name: "Parque Canino", icon: "/attached_assets/Parque_Canino_1768780207378.png" },
  { id: "reading_room", name: "Reading Room", icon: "/attached_assets/Reading_Room_1768780210259.png" },
  { id: "sala_cine", name: "Sala de Cine", icon: "/attached_assets/Sala_de_Cine_1768780213335.png" },
  { id: "sala_juegos", name: "Sala de Juegos", icon: "/attached_assets/Sala_de_Juegos_1768780269407.png" },
  { id: "sala_karaoke", name: "Sala de Karaoke", icon: "/attached_assets/Sala_de_Karaoke_1768780277112.png" },
  { id: "sala_visitas", name: "Sala de Visitas", icon: "/attached_assets/Sala_de_Visitas_1768780282571.png" },
  { id: "salon_culinario", name: "Salón Culinario", icon: "/attached_assets/Salon_Culnario_1768780296718.png" },
  { id: "salon_eventos", name: "Salón de Eventos", icon: "/attached_assets/Salon_de_Eventos_1768780304818.png" },
  { id: "salon_reuniones", name: "Salón de Reuniones", icon: "/attached_assets/Salon_de_Reuniones_1768780308960.png" },
  { id: "sky_lounge", name: "Sky Lounge", icon: "/attached_assets/Sky_Lounge_1768780311860.png" },
  { id: "social_gym", name: "Social Gym", icon: "/attached_assets/Social_Gym_1768780314565.png" },
  { id: "sports_bar", name: "Sports Bar", icon: "/attached_assets/Sports_Bar_1768780323761.png" },
  { id: "terraza", name: "Terraza", icon: "/attached_assets/Terraza_1768780326366.png" },
  { id: "vitapista", name: "Vitapista", icon: "/attached_assets/Vitapista_1768780329069.png" },
  { id: "yoga_room", name: "Yoga Room", icon: "/attached_assets/Yoga_Room_1768780331704.png" }
];

export const EFFICIENCY_FEATURES = [
  "Centros de lavado",
  "Community Closet",
  "Cuarto de herramientas",
  "Rack de Bicicletas",
  "Suite de invitados",
  "Shoot de basura",
  "Elevadores"
] as const;

export const OTHER_FEATURES = [
  "Personal de Seguridad",
  "Video Vigilancia / CCTV",
  "Control de acceso vehicular",
  "Accesos independientes"
] as const;

export const PROPERTY_STATUS = [
  { value: "available", label: "Disponible" },
  { value: "reserved", label: "Reservado" },
  { value: "sold", label: "Vendido" }
] as const;

export function getAmenityById(id: string): AmenityInfo | undefined {
  return AMENITIES.find(a => a.id === id);
}

export function getAmenityByName(name: string): AmenityInfo | undefined {
  return AMENITIES.find(a => a.name.toLowerCase() === name.toLowerCase());
}

export function getZonesByCity(city: string): readonly string[] {
  if (city === "Monterrey") return ZONES_MONTERREY;
  if (city === "CDMX") return ZONES_CDMX;
  return ALL_ZONES;
}
