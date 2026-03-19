# Database Architecture

PostgreSQL with Drizzle ORM. Schema defined in `shared/schema.ts`, shared between frontend and backend.

---

## Configuration

- **ORM**: Drizzle ORM
- **Dialect**: PostgreSQL
- **Schema**: `shared/schema.ts`
- **Migrations**: `./migrations/`
- **Config**: `drizzle.config.ts`
- **Push command**: `npm run db:push` (drizzle-kit push)
- **Connection**: `DATABASE_URL` env var

---

## Entity Relationship Diagram

```
USERS
  ├─ 1:M → SESSIONS (userId)
  ├─ 1:M → CLIENTS (asesorId)
  ├─ 1:M → DOCUMENTS (uploadedBy)
  ├─ 1:M → DEVELOPMENT_MEDIA (uploadedBy)
  ├─ 1:M → TYPOLOGIES (createdBy, updatedBy)
  ├─ 1:M → NOTIFICATIONS (userId)
  └─ 1:M → SHARED_LINKS (createdBy)

DEVELOPERS
  ├─ 1:M → DEVELOPMENTS (developerId, cascade)
  ├─ 1:M → DOCUMENTS (developerId, cascade)
  └─ 1:M → TYPOLOGIES (developer field, text ref)

DEVELOPMENTS
  ├─ M:1 ← DEVELOPERS (developerId)
  ├─ 1:M → TYPOLOGIES (development field, text ref)
  └─ 1:M → DOCUMENTS (developmentId, cascade)

PROPERTIES
  └─ 1:1 → TYPOLOGIES (propertyId, cascade)

TYPOLOGIES
  ├─ M:1 ← PROPERTIES (propertyId)
  ├─ 1:M → DEVELOPMENT_MEDIA (typologyId, cascade)
  ├─ 1:M → DOCUMENTS (typologyId, cascade)
  └─ 1:M → SHARED_LINKS (typologyId, cascade)

CLIENTS
  ├─ M:1 ← USERS (asesorId)
  ├─ 1:M → CLIENT_FOLLOW_UPS (clientId)
  ├─ 1:M → DOCUMENTS (clientId, cascade)
  └─ 1:M → SHARED_LINKS (clientId, cascade)
```

---

## Core Tables

### users
Authentication and role-based access control.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Auto-generated |
| username | TEXT UNIQUE | Required |
| password | TEXT | bcrypt hashed (10 rounds) |
| name | TEXT | Required |
| email | TEXT | Optional |
| role | TEXT | Default: `asesor`. Values: admin, actualizador, perfilador, finanzas, asesor, desarrollador |
| active | BOOLEAN | Default: true |
| permissions | JSONB | Custom permission overrides |
| createdAt | TIMESTAMP | Auto-generated |

### sessions
Active login sessions (7-day expiration).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Session token stored in cookie |
| userId | VARCHAR FK → users.id | Cascade delete |
| expiresAt | TIMESTAMP | 7 days from creation |
| createdAt | TIMESTAMP | Auto-generated |

---

### developers
Real estate development companies.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| tipo | TEXT | Developer type |
| active | BOOLEAN | Default: true |
| name | TEXT | Company name |
| razonSocial | TEXT | Legal name |
| rfc | TEXT | Tax ID (RFC format) |
| domicilio | TEXT | Legal address |
| fechaAntiguedad | TIMESTAMP | Company vintage date |
| antiguedadDeclarada | TEXT | Declared seniority |
| tipos | TEXT[] | Development types (Residencial, Comercial, Oficina, Salud) |
| contratos | TEXT[] | Contract types |
| representante | TEXT | Legal representative |
| contactName | TEXT | Commercial contact name |
| contactPhone | TEXT | |
| contactEmail | TEXT | |
| legales | TEXT | Legal docs reference |
| logo | TEXT | URL |
| website | TEXT | |
| shortName | TEXT | Abbreviation |
| ciudad | TEXT | Developer city |
| zona | TEXT | Developer zone |
| notes | TEXT | Internal notes |
| order | INTEGER | Sort order (default: 0) |
| deletedAt | TIMESTAMP | Null = active (soft delete) |

---

### developments
Real estate projects/buildings.

| Section | Columns |
|---------|---------|
| **General** | id, empresaTipo, developerId (FK), name, active |
| **Location** | city, zone, zone2, zone3 |
| **Structure** | tipos[], nivel (JSON ranges), nivelMaximo, torres, niveles |
| **Units** | tipologiasList[], tipologiasConfig (JSONB), vistas[], amenities[], efficiency[], otherFeatures[], acabados[] |
| **Size** | tamanoDesde, tamanoHasta, lockOff, dish, recamaras, banos |
| **Square meters** | depasM2, localesM2, oficinasM2, saludM2 |
| **Presales** | inicioPreventa, finPreventa, tiempoTransc |
| **Units sold** | depasUnidades/Vendidas/Porcentaje, locales.., oficinas.., salud.. |
| **Schedule** | inicioProyectado, inicioReal, entregaProyectada, entregaActualizada |
| **Sales contact** | ventasNombre, ventasTelefono, ventasCorreo |
| **Payments contact** | pagosNombre, pagosTelefono, pagosCorreo |
| **Legal** | comercializacion, arquitectura, convenios, tipoContrato, cesionDerechos, presentacion |
| **Meta** | order, deletedAt, createdAt, updatedAt |

---

### typologies
Detailed property unit data — the core spreadsheet rows. 86+ columns organized in sections.

| Section | Key Columns | Notes |
|---------|-------------|-------|
| **Basic** | id, active, city, zone, developer, development, tipoDesarrollo[] | |
| **General** | type, level, view | Unit letter (A, B, C), floor, orientation |
| **Price** | size, sizeFinal, price, hasDiscount, discountPercent, discountAmount, **finalPrice**, **pricePerM2** | Bold = calculated |
| **Promo** | hasSeedCapital, hasPromo, promoDescription | |
| **Distribution** | lockOff, bedrooms, bathrooms, areas, hasBalcony/balconySize, hasTerrace/terraceSize | Duplicated for 2nd option (bedrooms2, etc.) |
| **Parking** | parkingIncluded, hasParkingOptional, parkingOptionalPrice | |
| **Storage** | hasStorage, storageSize, hasStorageOptional, storageSize2, storagePrice, queIncluye | |
| **Payment** | initialPercent, **initialAmount**, duringConstructionPercent, **duringConstructionAmount**, paymentMonths, **monthlyPayment**, **totalEnganche**, **remainingPercent** | |
| **Delivery** | deliveryDate, nivelMantenimiento | |
| **Post-delivery** | isaPercent, **isaAmount**, notaryPercent, **notaryAmount**, equipmentCost, furnitureCost, **totalPostDeliveryCosts** | |
| **Mortgage** | mortgageAmount, mortgageStartDate, mortgageInterestPercent, mortgageYears, **mortgageMonthlyPayment**, **mortgageEndDate**, **mortgageTotal** | |
| **Maintenance** | maintenanceM2, maintenanceInitial, maintenanceStartDate, maintenanceFinal, maintenanceEndDate, **maintenanceTotal** | |
| **Rent** | rentInitial, rentStartDate, rentRatePercent, **rentFinal**, rentEndDate, rentMonths, **rentTotal** | |
| **Investment** | **investmentTotal**, **investmentNet**, **investmentMonthly**, **investmentRate** | All calculated |
| **Appreciation** | appreciationRate, appreciationDays/Months/Years, **appreciationTotal**, **finalValue** | |
| **Meta** | propertyId (FK), createdBy (FK), updatedBy (FK), deletedAt | |

**Bold columns** are calculated (19 formula fields). See [SPREADSHEET_SYSTEM.md](./SPREADSHEET_SYSTEM.md#formula-fields).

---

### clients
Prospects and converted clients (CRM).

| Section | Key Columns | Notes |
|---------|-------------|-------|
| **Identity** | id, nombre, apellido, telefono, correo, asesorId (FK) | |
| **Location** | ciudad, zona | |
| **Interest** | desarrollador, desarrollo, tipologia | Free text references |
| **Profile** | tipofil, perfil, comoLlega, brokerExterno | Catalog references |
| **Funnel** | estatus (default: activo), embudo, comoPaga | |
| **Evaluation** | positivos[], negativos[], comentarios | |
| **Client pricing** | precioFinal, cajon, precioCajon, bodega, precioBodega, precioTotal | Only when isClient=true |
| **Deposit** | separacion, fechaSeparacion, porcentajeSeparacion, papeleriaSeparacion | |
| **Down payment** | enganche, fechaEnganche, porcentajeEnganche | |
| **Installment** | plazoNumero, plazoMensualidades, plazoMonto, plazoFechaInicio/Final, plazoTotal, porcentajePlazo | |
| **Liquidation** | escrituracion, fechaLiquidacion, papeleria | |
| **System** | active, isClient (default: false), convertedAt, deletedAt | |

---

### Supporting Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| **properties** | Public-facing property listings | title, description, price, city, zone, developer, developmentName, bedrooms, bathrooms, area, status, images[], amenities[] |
| **documents** | File attachments for any entity | name, fileUrl, rootCategory, section, developerId/developmentId/typologyId/clientId (FK), shareable |
| **developmentMedia** | Images/videos for typologies | typologyId (FK), type (image/video), url, order, isPrimary |
| **sharedLinks** | Public document sharing tokens | token (unique), targetType, canView, canUpload, isPermanent, expiresAt, accessCount |
| **clientFollowUps** | Client interaction history | clientId (FK), userId (FK), action, notes |
| **developmentAssignments** | Asesor ↔ development mapping | developmentId (FK), asesorId (FK), assignedBy (FK) |
| **notifications** | Duplicate detection alerts | userId (FK), type, title, message, targetIds[], read |
| **globalSettings** | Key-value config | key (unique), value, label |

---

## Catalog Tables

30+ catalog tables for dynamic dropdowns. All follow this base pattern:

```
id: UUID PK
name: TEXT UNIQUE
active: BOOLEAN (default: true)
order: INTEGER (default: 0)
createdAt: TIMESTAMP
```

### General Catalogs
| Table | Extra Fields | Examples |
|-------|-------------|----------|
| catalogCities | isaiPercent (3.0%), notariaPercent (2.0%) | Monterrey, CDMX |
| catalogZones | cityId (FK → catalogCities) | San Pedro, Cumbres |
| catalogDevelopmentTypes | — | 100% Residencial, Uso mixto |
| catalogAmenities | icon | Alberca, Gym |
| catalogEfficiencyFeatures | — | Centros de lavado |
| catalogOtherFeatures | — | Video Vigilancia |
| catalogAcabados | — | Muros, Cielos |
| catalogVistas | — | Norte, Sur, Este, Oeste |
| catalogAreas | — | Sala, Comedor |
| catalogTipologias | developmentId | A1, B2 |
| catalogNiveles | — | 1-7, 110 |
| catalogTorres | — | 1-8 |
| catalogRecamaras | — | Loft, 1, 1+Flex, 2 |
| catalogBanos | — | 1, 1.5, 2, 2.5 |
| catalogCajones | — | No, 1, 2, 2 en Tandem |
| catalogIncluye | — | Cocina, Closets, Climas |

### Prospect & Client Catalogs
| Table | Extra Fields | Examples |
|-------|-------------|----------|
| catalogTipoCliente | color | Inversionista, Uso Propio |
| catalogPerfil | color | Estudiante, Profesionista |
| catalogFuente | color | Instagram, Facebook, Referido |
| catalogStatusProspecto | color | Activo, En Hold, No Activo |
| catalogEtapaEmbudo | color | (Sales funnel stages) |
| catalogEtapaClientes | color | (Client stages) |
| catalogComoPaga | color | Enganche Bajo, Alto, Capital Semilla |
| catalogPositivos | color | Precio, Ubicación, Diseño |
| catalogNegativos | color | Precio, Ubicación, Permisos |
| catalogAsesor | — | (Advisor names) |
| catalogBrokerExterno | — | (External broker names) |

### Contract & Service Catalogs
| Table | Extra Fields |
|-------|-------------|
| catalogTipoContrato | — |
| catalogCesionDerechos | — |
| catalogPresentacion | — |
| catalogTipoProveedor | — |
| catalogSiNo | — |
| catalogAvisos | field, minQuantity |
| catalogNivelMantenimiento | valor, equipo, muebles |

---

## Soft Delete Pattern

Used for: **clients, typologies, developers, developments**.

```
- deletedAt: TIMESTAMP nullable
  - null = active record
  - timestamp = soft-deleted at that time

- Queries filter: WHERE deletedAt IS NULL
- Separate endpoints: GET /deleted, POST /:id/restore
- Cascade behavior: developer deletion clears typology references
```

---

## Data Propagation

Changes cascade down the entity hierarchy:

```
Developer name change → Updates all typologies with that developer
Development name change → Updates all typologies with that development
Development city/zone → Propagates to child typologies
Development entregaProyectada → Propagates deliveryDate to typologies
Developer/development deletion → Clears typology references (not cascade delete)
Property create → Auto-creates corresponding typology
Property update → Syncs to typology (city, zone, developer, development)
Property delete → Cascades delete to typology
```

---

## Zod Validation

All tables export insert schemas and types:

```typescript
export const insertDeveloperSchema = createInsertSchema(developers).omit({
  id: true, createdAt: true, updatedAt: true, deletedAt: true,
});

export type InsertDeveloper = z.infer<typeof insertDeveloperSchema>;
export type Developer = typeof developers.$inferSelect;
```

Additional schemas:
- `loginSchema` — username + password
- `contactFormSchema` — public lead capture (nombre, apellido, phone, email, typologyId)
- `propertyFilterSchema` — public search filters (price range, bedrooms, area, city, zone)

---

## Calculated Fields

19 formula fields computed for typologies (see [SPREADSHEET_SYSTEM.md](./SPREADSHEET_SYSTEM.md#formula-fields) for formulas):

| Field | Formula Summary |
|-------|----------------|
| finalPrice | price - discountAmount |
| pricePerM2 | finalPrice / sizeFinal |
| initialAmount | finalPrice × initialPercent |
| duringConstructionAmount | finalPrice × duringConstructionPercent |
| monthlyPayment | duringConstructionAmount / paymentMonths |
| totalEnganche | initialAmount + duringConstructionAmount |
| remainingPercent | 100 - initialPercent - duringConstructionPercent |
| isaAmount | finalPrice × isaPercent |
| notaryAmount | finalPrice × notaryPercent |
| totalPostDeliveryCosts | isaAmount + notaryAmount + equipmentCost + furnitureCost |
| mortgageMonthlyPayment | Amortization formula |
| mortgageTotal | monthlyPayment × months |
| maintenanceTotal | Calculated from m² and dates |
| rentFinal | rentInitial × (1 + rentRatePercent/100) |
| rentTotal | rentFinal × rentMonths |
| investmentTotal | Aggregated costs |
| investmentNet | Revenue - costs |
| investmentRate | Net / total as percentage |
| appreciationTotal | finalPrice × (1 + rate)^years |
| finalValue | finalPrice + appreciationTotal |
