# Backend Architecture

Express 5 server in `server/`. Serves both the API and the Vite-built frontend as static files in production.

---

## Tech Stack

| Layer | Library |
|-------|---------|
| Framework | Express 5 |
| ORM | Drizzle ORM (PostgreSQL) |
| Auth | Custom session-based (bcrypt + httpOnly cookies) |
| Validation | Zod (shared schemas from `shared/schema.ts`) |
| WebSocket | ws (native) |
| File uploads | multer (local storage) |
| Security | helmet, cors, express-rate-limit, cookie-parser |
| Dev server | Vite middleware (HMR in development) |

---

## Directory Structure

```
server/
├── index.ts             # Express app setup, middleware, scheduled tasks
├── auth.ts              # Password hashing, session management, admin seeding
├── routes.ts            # All 225+ API routes
├── storage.ts           # IStorage interface + DatabaseStorage implementation
├── db.ts                # Drizzle ORM connection setup
├── vite.ts              # Vite dev server middleware
├── static.ts            # Static file serving (production)
└── replit_integrations/
    └── object_storage/  # Presigned URL example (not actively used)
```

---

## Middleware Stack (in order)

```
1. express.json()              — Body parsing with rawBody capture
2. express.urlencoded()        — URL-encoded form support
3. helmet()                    — Security headers (CSP in production)
4. cors()                      — CORS with credentials (CORS_ORIGIN env var)
5. cookieParser()              — Parse httpOnly cookies
6. Rate limiters               — Per-route rate limiting
7. Request logger              — Logs /api requests with response times
8. Route handlers              — API routes
9. Static/Vite middleware      — Frontend serving
10. Global error handler       — Catches unhandled errors
```

---

## Authentication System (`auth.ts`)

### Password Handling
- **Hash**: bcrypt with 10 salt rounds
- **Verify**: `verifyPassword(password, hash)` → boolean

### Session Management
- **Storage**: PostgreSQL `sessions` table
- **Duration**: 7 days
- **Cookie**: `muros_session` (httpOnly, secure in prod, sameSite: strict)
- **Cleanup**: Hourly cron deletes expired sessions

### Flow
```
POST /api/auth/login
  → authenticateUser(username, password)
  → createSession(userId) → session ID
  → Set-Cookie: muros_session={sessionId}; httpOnly; secure; sameSite=strict

GET /api/auth/me
  → Read cookie → validateSession(sessionId) → return user

POST /api/auth/logout
  → deleteSession(sessionId) → clear cookie
```

### Admin Seeding
On startup, if no admin exists: creates one with `ADMIN_INITIAL_PASSWORD` env var or a random password. The generated password is **not** logged to console in production for security.

---

## Auth Middleware

### `requireAuth`
```
1. Read sessionId from cookie or Authorization header
2. validateSession(sessionId) → user
3. Attach user to req.user
4. Return 401 if missing/invalid
5. Entire middleware wrapped in try-catch (returns 401 on unexpected errors)
```

### `requireRole(...roles)`
```
1. Check req.user exists (401 if not)
2. Check req.user.role is in allowed roles array
3. Return 403 if role not permitted
```

---

## API Routes (225+ endpoints)

### Health
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| GET | `/readiness` | No | Database readiness |

### Authentication (3)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Login (rate limited: 5/15min) |
| POST | `/api/auth/logout` | Yes | Logout |
| GET | `/api/auth/me` | Yes | Current user info |

### Users (4)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users` | admin | List all users |
| POST | `/api/users` | admin | Create user |
| PUT | `/api/users/:id` | admin | Update user |
| DELETE | `/api/users/:id` | admin | Delete user (prevents self/admin deletion) |

### Developers (7)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/developers` | Yes | List developers (auth required) |
| GET | `/api/developers/:id` | Yes | Get developer |
| POST | `/api/developers` | Yes | Create developer |
| PUT | `/api/developers/:id` | Yes | Update (propagates name to typologies) |
| DELETE | `/api/developers/:id` | Yes | Soft delete (clears typology refs) |
| GET | `/api/developers/deleted` | admin | List deleted |
| POST | `/api/developers/:id/restore` | admin | Restore |

### Developments (7)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/developments-entity` | Yes | List (optional `developerId` filter) |
| GET | `/api/developments-entity/:id` | Yes | Get development |
| POST | `/api/developments-entity` | Yes | Create |
| PUT | `/api/developments-entity/:id` | Yes | Update (propagates to typologies) |
| DELETE | `/api/developments-entity/:id` | Yes | Soft delete |
| GET | `/api/developments-entity/deleted` | Yes | List deleted |
| POST | `/api/developments-entity/:id/restore` | Yes | Restore |

### Typologies (9)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/typologies` | Yes | List all |
| GET | `/api/typologies/:id` | Yes | Get single |
| POST | `/api/typologies` | Yes | Create |
| PUT | `/api/typologies/:id` | Yes | Update (validates parent active status) |
| PATCH | `/api/typologies/:id` | Yes | Partial update |
| DELETE | `/api/typologies/:id` | Yes | Soft delete |
| GET | `/api/typologies/deleted` | Yes | List deleted |
| POST | `/api/typologies/:id/restore` | Yes | Restore |
| GET | `/api/public/typologies` | No | Public active typologies with media |

### Properties (5)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/properties` | Yes | List (enriched with typology data) |
| GET | `/api/properties/:id` | Yes | Get single (enriched) |
| POST | `/api/properties` | Yes | Create (auto-creates typology) |
| PUT | `/api/properties/:id` | Yes | Update (syncs to typology) |
| DELETE | `/api/properties/:id` | Yes | Delete (cascades to typology) |

### Clients / Prospects (10)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/clients` | Yes | List (asesor sees only assigned) |
| GET | `/api/clients/:id` | Yes | Get (role-based access) |
| POST | `/api/clients` | Yes | Create (duplicate phone/email detection) |
| PUT | `/api/clients/:id` | Yes | Update (embudo→isClient conversion) |
| DELETE | `/api/clients/:id` | Yes | Soft delete |
| GET | `/api/clients/deleted` | admin | List deleted |
| POST | `/api/clients/:id/restore` | admin | Restore |
| POST | `/api/clients/:id/followup` | Yes | Create follow-up |
| GET | `/api/clients/:id/followups` | Yes | Get follow-ups |
| POST | `/api/contact` | No | Public contact form (rate limited: 5/60s) |

### Documents (8)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/documents` | Yes | List (filter: category, developer, development, client, search) |
| GET | `/api/documents/:id` | Yes | Get single |
| POST | `/api/documents` | Yes | Upload (multer, 100MB, requires rootCategory) |
| PUT | `/api/documents/:id` | Yes | Update metadata |
| DELETE | `/api/documents/:id` | Yes | Delete (removes file) |
| PATCH | `/api/documents/reorder` | Yes | Update sort order |
| GET | `/api/documents/:id/download` | Yes | Download file |
| GET | `/api/documents/counts` | Yes | Counts by entity type |

### Shared Links (7)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/shared-links` | Yes | List all |
| POST | `/api/shared-links` | Yes | Create (with expiration) |
| PUT | `/api/shared-links/:id` | Yes | Update |
| DELETE | `/api/shared-links/:id` | Yes | Delete |
| GET | `/api/public/share/:token` | No | Access shared content (checks expiration) |
| GET | `/api/public/share/:token/document/:id/download` | No | Download via link |
| POST | `/api/public/share/:token/upload` | No | Upload via link (if canUpload) |

### Media (3)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/development-media` | Yes | Get media (filter by typologyId, auth required) |
| POST | `/api/development-media` | Yes | Upload (multer, 10 files, 100MB each) |
| DELETE | `/api/development-media/:id` | Yes | Delete media |

### Permissions & Roles (10)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/my-permissions` | Yes | Current user's permission overrides |
| GET | `/api/role-permissions` | admin | All role permissions |
| GET | `/api/role-permissions/:section` | admin | Permissions by section |
| POST | `/api/role-permissions` | admin | Upsert permission |
| GET | `/api/custom-roles` | Yes | List custom roles |
| POST | `/api/custom-roles` | admin | Create custom role |
| PUT | `/api/custom-roles/:id` | admin | Update custom role |
| DELETE | `/api/custom-roles/:id` | admin | Delete custom role |
| GET | `/api/role-section-access` | Yes | Section access controls |
| POST | `/api/role-section-access` | admin | Upsert section access |

### Assignments (3)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/assignments` | Yes | List (role-filtered) |
| POST | `/api/assignments` | perfilador/admin | Create |
| DELETE | `/api/assignments/:id` | Yes | Delete |

### Notifications (3)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notifications` | Yes | User's notifications |
| PUT | `/api/notifications/:id/read` | Yes | Mark as read (ownership check: notification.userId === req.user.id) |
| DELETE | `/api/notifications/:id` | Yes | Delete (ownership check: notification.userId === req.user.id) |

### Catalogs (45+ CRUD groups)
Each catalog has standard CRUD: `GET`, `POST`, `PUT/:id`, `DELETE/:id`. See [DATABASE.md](./DATABASE.md#catalog-tables) for the full list.

### Global Settings (2)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/global-settings` | Yes | Get all (auto-seeds defaults) |
| PUT | `/api/global-settings/:key` | Yes | Update setting |

---

## Storage Layer (`storage.ts`)

All database access goes through the `IStorage` interface, never direct Drizzle calls in routes.

```typescript
interface IStorage {
  // Users
  getUser(id), getUserByUsername(username), createUser(data), updateUser(id, data), deleteUser(id), getAllUsers()

  // Sessions
  createSession(userId), getSession(id), deleteSession(id), deleteExpiredSessions(), deleteSessionsByUserId(userId)

  // Developers
  getDeveloper(id), getAllDevelopers(), createDeveloper(data), updateDeveloper(id, data), softDeleteDeveloper(id), ...

  // Developments
  getDevelopment(id), getAllDevelopments(), createDevelopment(data), updateDevelopment(id, data), ...

  // Typologies
  getTypology(id), getAllTypologies(), createTypology(data), updateTypology(id, data), ...

  // Clients
  getClient(id), getAllClients(), createClient(data), updateClient(id, data), findDuplicateClients(phone, email), ...

  // Notifications
  getNotification(id), ...

  // Batch methods (N+1 query fixes)
  getDocumentsByTypologyIds(ids), getTypologiesByPropertyIds(ids), ...

  // Documents, Media, SharedLinks, Catalogs, Permissions...
}

class DatabaseStorage implements IStorage { ... }
```

### Key Behaviors
- **Soft deletes**: Sets `deletedAt` timestamp instead of removing rows. Separate `/deleted` + `/restore` endpoints.
- **Soft-delete filtering**: `getClient(id)`, `getDeveloper(id)`, `getTypology(id)` now filter by `isNull(deletedAt)` — soft-deleted records are not returned by single-record getters.
- **Data propagation**: Developer/development name changes cascade to child typologies.
- **Duplicate detection**: `findDuplicateClients()` checks phone/email, creates notifications for admins.
- **Completeness validation**: Prevents activation of incomplete developers/developments.
- **Session invalidation**: Sessions are deleted on password change AND user deactivation via `deleteSessionsByUserId`.
- **Asesor ownership**: Asesor role is forced to own newly created clients (`asesorId = req.user.id`).

---

## File Upload

### Configuration
| Endpoint | Destination | Max Size | Max Files | Types |
|----------|-------------|----------|-----------|-------|
| `/api/upload` | `./uploads` | 100MB | 10 | jpg, png, gif, webp, mp4, webm, mov, avi |
| `/api/documents` | `./uploads/documents` | 100MB | 10 | Above + pdf, doc(x), xls(x), ppt(x), txt, csv, zip |
| `/api/development-media` | `./uploads` | 100MB | 10 | Images + videos |

### Security
- Extension whitelist with MIME type validation
- Path traversal prevention on `/uploads` endpoint
- Filenames sanitized: `{fieldname}-{timestamp}-{random}.{ext}`

---

## Security

### Rate Limiting
| Scope | Limit |
|-------|-------|
| Login | 5 attempts / 15 minutes |
| Contact form | 5 requests / 60 seconds |
| General API | 100 requests / 60 seconds |

### Headers (Helmet)
Production CSP restricts scripts to self, allows fonts from googleapis/gstatic, images from data/blob/https, WebSocket connections.

### Cookies
`httpOnly` + `secure` (prod) + `sameSite: strict` prevents XSS and CSRF.

### Access Control
- Asesor can only see/edit their own assigned clients
- Asesor is forced to own newly created clients (`asesorId = req.user.id`)
- Admin cannot delete themselves or other admins
- Entities with inactive parents cannot be activated
- Empty strings converted to null for numeric fields
- Notification ownership enforced — users can only read/delete their own notifications

### Role Validation
- User create/update validates `role` against built-in roles + custom roles from DB
- Custom role key collision prevention — cannot create a custom role named "admin", "actualizador", etc.
- Sessions invalidated on password change and user deactivation

### Validation
- All POST/PUT bodies validated with Zod. Errors return 400 with details in development mode only.
- Input validation (Zod) on developer create and update routes (`insertDeveloperSchema`)
- Input validation (Zod) on development create and update routes (`insertDevelopmentSchema`)
- All ~130 catalog routes wrapped in try-catch (database errors don't leak table/column names)

### Global Error Handler
- 5xx errors return a generic message (`"Error interno del servidor"`) in production
- Error details are only included in development mode

---

## Scheduled Tasks

| Task | Interval | Action |
|------|----------|--------|
| Session cleanup | 60 minutes | Deletes expired sessions from DB |

---

## Error Handling

### Response Codes
| Code | Meaning |
|------|---------|
| 400 | Bad request / validation failure |
| 401 | Unauthorized / invalid session |
| 403 | Forbidden / insufficient permissions |
| 404 | Resource not found |
| 410 | Gone (expired shared link) |
| 500 | Internal server error |

### Pattern
```typescript
try {
  // route logic
} catch (error) {
  console.error("Error:", error);
  res.status(500).json({ message: "Error interno del servidor" });
}
```

Validation errors use a helper:
```typescript
function validationError(res, error) {
  return res.status(400).json({
    error: "Datos inválidos",
    ...(process.env.NODE_ENV !== "production" && { details: error.errors })
  });
}
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `PORT` | No | 5000 | Server port |
| `NODE_ENV` | No | development | Environment mode |
| `CORS_ORIGIN` | No | — | Allowed CORS origin |
| `ADMIN_INITIAL_PASSWORD` | No | random | Initial admin password |

---

## Performance

### N+1 Query Fixes
| Endpoint | Before | After | Method |
|----------|--------|-------|--------|
| `GET /api/properties` | 1+2N queries (typology + documents per property) | 3 queries total | Batch methods: `getTypologiesByPropertyIds`, `getDocumentsByTypologyIds` |
| `GET /api/public/typologies` | 1+N queries (media per typology) | 2 queries total | Batch method loads all media in one query |

### New Batch Storage Methods
| Method | Purpose |
|--------|---------|
| `getDocumentsByTypologyIds(ids)` | Fetch documents for multiple typologies in one query |
| `getTypologiesByPropertyIds(ids)` | Fetch typologies for multiple properties in one query |
| `deleteSessionsByUserId(userId)` | Delete all sessions for a user (password change / deactivation) |
| `getNotification(id)` | Fetch single notification (for ownership check) |
