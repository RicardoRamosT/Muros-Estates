# Role-Based Permissions System

Fine-grained, field-level access control across all entities. Permissions are defined in a static matrix, overridable at runtime via the admin UI.

---

## Roles

| Role | Spanish | Description |
|------|---------|-------------|
| `admin` | Administrador | Full access to everything |
| `actualizador` | Actualizador | Edits typologies, properties, developers, developments, catalogs |
| `perfilador` | Perfilador | Client profiling, limited view access |
| `asesor` | Asesor | Client management (own clients only) |
| `finanzas` | Finanzas | Financial data viewing, limited access to sensitive fields |
| `desarrollador` | Desarrollador | Developer-specific data access |

---

## Permission Levels

| Level | UI Behavior | API Behavior |
|-------|-------------|-------------|
| `none` | Cell/field hidden | Field stripped from response |
| `view` | Visible, read-only | Included in response |
| `edit` | Visible, editable | Included + accepts updates |

---

## Permission Architecture

```
┌──────────────────────────────────┐
│   PAGE_PERMISSIONS (static)      │  ← shared/schema.ts
│   Default matrix per role/field  │
└──────────────┬───────────────────┘
               │ overridden by
┌──────────────▼───────────────────┐
│   rolePermissions (DB table)     │  ← Admin configurable
│   Per-role, per-section, per-field│
└──────────────┬───────────────────┘
               │ combined with
┌──────────────▼───────────────────┐
│   roleSectionAccess (DB table)   │  ← Admin configurable
│   Enable/disable entire sections │
└──────────────────────────────────┘
```

### Frontend Enforcement
```typescript
const { canView, canEdit, isAdmin } = useFieldPermissions('tipologias');

// Fetches:
// GET /api/my-permissions → user's permission overrides
// GET /api/role-section-access → section visibility toggles
```

### Backend Enforcement
- `requireRole(...roles)` middleware on routes
- Asesor-specific filtering: only sees their own clients
- **Asesor client ownership**: Asesor is forced to own newly created clients (`asesorId = req.user.id`)
- Document operations check `hasDocumentPermission(user, action)`
- **Notification ownership**: Notification read/delete checks `notification.userId === req.user.id`
- **Role validation on user create/update**: Validates role against built-in roles + custom roles from DB
- **Custom role key collision prevention**: Cannot create a custom role with a name matching built-in roles ("admin", "actualizador", "perfilador", "asesor", "finanzas", "desarrollador")
- **Session invalidation**: All user sessions are deleted on password change AND user deactivation via `deleteSessionsByUserId(userId)`

---

## Permission Matrix by Section

### Desarrolladores (Developers) — 14 fields

| Field | admin | actualizador | perfilador | asesor | finanzas | desarrollador |
|-------|-------|-------------|-----------|--------|---------|--------------|
| id | view | view | view | view | view | view |
| tipo | edit | edit | view | view | view | view |
| active | edit | edit | view | view | view | view |
| name | edit | edit | view | view | view | view |
| razonSocial | edit | edit | view | view | view | view |
| rfc | edit | edit | none | view | view | view |
| domicilio | edit | edit | none | view | view | view |
| fechaAntiguedad | edit | edit | none | view | view | view |
| representante | edit | edit | none | view | view | view |
| contactName | edit | edit | view | none | view | view |
| contactPhone | edit | edit | view | none | view | view |
| contactEmail | edit | edit | view | none | view | view |
| legales | edit | view | view | view | view | view |

### Desarrollos (Developments) — 54+ fields

| Field Group | admin | actualizador | perfilador | asesor | finanzas | desarrollador |
|------------|-------|-------------|-----------|--------|---------|--------------|
| id, active, company | edit | edit | view | view | view | view |
| name, city | edit | edit | view | view | view | view |
| zones (2, 3) | edit | edit | view | view | none | view |
| tipos, nivel, torres | edit | edit | view | view | none | view |
| amenities, efficiency | edit | edit | view | view | none | view |
| size range | edit | edit | view | view | none | view |
| units/m² | edit | edit | view | view | view | view |
| presale dates | edit | edit | view | view | view | view |
| units sold | edit | view | view | view | view | view |
| schedule | edit | edit | view | view | view | view |
| sales contact | edit | edit | none | none | view | view |
| payments contact | edit | edit | none | none | view | view |
| legal/contracts | edit | edit | view | view | view | view |

### Prospectos (Prospects) — 23+ fields

| Field Group | admin | actualizador | perfilador | asesor | finanzas | desarrollador |
|------------|-------|-------------|-----------|--------|---------|--------------|
| active | edit | none | view | view | none | none |
| fecha, asesorId | edit | none | edit | view | none | none |
| nombre, apellido | edit | none | edit | edit | none | none |
| telefono, correo | edit | none | edit | edit | none | none |
| city, zona | edit | none | edit | view | none | none |
| desarrollador, desarrollo | edit | none | edit | view | none | none |
| perfil, tipofil | edit | none | edit | view | none | none |
| embudo, estatus | edit | none | edit | edit | none | none |
| comoPaga | edit | none | edit | edit | none | none |
| positivos, negativos | edit | none | edit | edit | none | none |
| comentarios | edit | none | edit | edit | none | none |

### Clientes (Converted Clients) — 30+ fields

| Field Group | admin | actualizador | perfilador | asesor | finanzas | desarrollador |
|------------|-------|-------------|-----------|--------|---------|--------------|
| active | edit | none | view | view | view | view |
| nombre, apellido | edit | none | view | edit | view | view |
| telefono, correo | edit | none | view | edit | none | none |
| desarrollador, desarrollo | edit | none | view | edit | view | view |
| precio fields | edit | none | view | edit | view | view |
| separación fields | edit | none | view | edit | view | view |
| enganche fields | edit | none | view | edit | view | view |
| plazo fields | edit | none | view | edit | view | view |
| liquidation fields | edit | none | view | edit | view | view |

### Tipologías (Typologies) — 86 fields

| Section | admin | actualizador | perfilador | asesor | finanzas | desarrollador |
|---------|-------|-------------|-----------|--------|---------|--------------|
| Generales (type, level, view) | edit | edit | none | view | view | edit |
| Precio (price, discount) | edit | edit | view | view | view | edit |
| Distribución (beds, baths) | edit | edit | view | view | view | edit |
| Parking & Storage | edit | edit | view | view | view | edit |
| Payment scheme | edit | edit | view | view | view | view |
| Delivery & maintenance level | edit | edit | view | view | view | view |
| Post-delivery costs | edit | edit | view | view | view | view |
| Mortgage | edit | edit | none | view | view | view |
| Maintenance | edit | edit | none | view | view | view |
| Rent | edit | edit | none | view | view | view |
| Investment | edit | edit | none | view | view | view |
| Appreciation | edit | edit | none | view | view | view |

### Documentos — subsections

| Section | admin | actualizador | perfilador | asesor | finanzas | desarrollador |
|---------|-------|-------------|-----------|--------|---------|--------------|
| identidad | edit | edit | edit | view | view | edit |
| corporativo | edit | edit | edit | view | view | edit |
| convenios | edit | edit | edit | none | none | edit |

### Catálogos

| Action | admin | Others |
|--------|-------|--------|
| All catalog CRUD | edit | view |

### Usuarios (Users)

| Action | admin | Others |
|--------|-------|--------|
| All user management | edit | none |

---

## Custom Overrides

### rolePermissions Table
Admins can override any field permission at runtime:

```sql
-- Example: Give asesor edit access to the price field on typologies
INSERT INTO role_permissions (section, field, role, permissionLevel)
VALUES ('tipologias', 'price', 'asesor', 'edit');
```

### roleSectionAccess Table
Admins can enable/disable entire sections per role:

```sql
-- Example: Hide the mortgage section from asesores
INSERT INTO role_section_access (section, role, active)
VALUES ('tipologias_mortgage', 'asesor', false);
```

---

## Special Access Rules

| Rule | Description |
|------|-------------|
| Asesor client isolation | Asesores can only view/edit clients assigned to them via `asesorId` |
| Asesor client ownership | Asesor is forced to own newly created clients (`asesorId = req.user.id`) |
| Admin self-protection | Admins cannot delete themselves |
| Admin deletion protection | No user can delete another admin |
| Parent activation check | Cannot activate entity if parent (developer/development) is inactive |
| Completeness validation | Cannot activate developer/development if required fields are missing |
| Notification ownership | Users can only mark as read / delete their own notifications |
| Role validation | User create/update validates role against built-in + custom roles |
| Role collision prevention | Custom roles cannot use built-in role names |
| Session invalidation on password change | All sessions deleted when password is changed |
| Session invalidation on deactivation | All sessions deleted when user is deactivated |

### Developer Completeness Requirements
- tipo, name, tipos array, contratos array

### Development Completeness Requirements
- empresaTipo, developerId, name, city, tipos, tipologiasList, recamaras, banos, inicioProyectado, entregaProyectada, ventasNombre, ventasTelefono

---

## Admin UI for Permissions

The `roles-permissions-view.tsx` component provides:
- Matrix grid showing all roles × fields
- Toggle between none/view/edit per cell
- Section-level enable/disable toggles
- Changes saved via `POST /api/role-permissions` and `POST /api/role-section-access`
