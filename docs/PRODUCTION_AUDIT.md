# Production Readiness Audit — March 19, 2026

Full audit across all 6 system areas. Issues organized by severity.

---

## CRITICAL (6 issues)

### 1. ~~[SPREADSHEET] `flushPendingChanges` missing `credentials: "include"` — silent data loss on page close~~ **FIXED** (73c7f78)
- **Files**: All 4 spreadsheets (`flushPendingChanges` function)
- **Problem**: Uses `localStorage.getItem("muros_session")` in Authorization header, but session is an httpOnly cookie not readable from JS. Missing `credentials: "include"` means the cookie isn't sent either. Pending edits on page close are silently dropped.
- **Fix**: Added `credentials: "include"` to all `fetch()` calls in `flushPendingChanges`.

### 2. ~~[SPREADSHEET] `flushPendingChanges` clears pending changes before server confirms~~ **FIXED** (73c7f78)
- **Files**: All 4 spreadsheets — `pending.clear()` runs synchronously before `Promise.all` resolves
- **Problem**: If any PUT request fails (network error, 401, 500), the data is already gone from client memory. No `.catch()`, no retry, no notification. Permanent silent data loss.
- **Fix**: Moved `pending.clear()` into `.then()`. Added `.catch()` with error handling.

### 3. [PERMISSIONS] No backend enforcement of field-level permissions on writes
- **File**: `server/routes.ts` — all PUT endpoints
- **Problem**: `PAGE_PERMISSIONS` is consumed only by the frontend hook. The server passes `req.body` directly to `storage.update*()` without stripping restricted fields. Any user with Chrome DevTools can bypass all field permissions.
- **Fix**: Create server-side middleware that strips fields the user's role cannot `edit` per `PAGE_PERMISSIONS`.

### 4. ~~[DATABASE] Zero database indexes defined~~ **FIXED** (8d9c47b)
- **File**: `shared/schema.ts`
- **Problem**: Not a single index exists. Full table scans on every FK join, every WHERE clause. Session validation (every auth request) scans `sessions` table.
- **Fix**: Added indexes on 12 tables: sessions, clients, typologies, developers, developments, documents, notifications, developmentMedia, catalogZones, developmentAssignments, rolePermissions, roleSectionAccess.

### 5. ~~[DATABASE] `developmentAssignments.developmentId` FK points to `properties` instead of `developments`~~ **FIXED** (8d9c47b)
- **File**: `shared/schema.ts`, line ~1076
- **Problem**: The assignment table intended to link developments<>asesores actually references the wrong table. Data integrity is broken.
- **Fix**: Changed reference from `properties.id` to `developments.id`.

### 6. [SPREADSHEET] Race condition — WebSocket invalidation can overwrite unsaved pending changes
- **Files**: All 4 spreadsheets
- **Problem**: When another user edits any row, WS triggers `invalidateQueries()` which re-fetches. No conflict detection. Last-write-wins with no warning.
- **Fix**: Implement optimistic locking (compare `updatedAt` timestamps) or skip invalidation for rows with pending changes.

---

## HIGH (19 issues)

### Spreadsheet
7. ~~**Typology spreadsheet ignores field-level permissions**~~ **FIXED** (2586cd7) — Now uses `useFieldPermissions('tipologias')` instead of hardcoded role check.
8. ~~**Division by zero / NaN propagation in formulas**~~ **FIXED** (9b02327) — All 19 formula fields now use `safeNum()` and `safeFin()` guards against NaN/Infinity.
9. **No virtualization** — All rows render to DOM after initial load. 500+ typology rows with 80+ columns = 40,000+ DOM nodes.

### Frontend
10. ~~**`finanzas`/`desarrollador` roles cause infinite redirect loop**~~ **FIXED** (802d2a4) — Added `finanzas`/`desarrollador` to all route `allowedRoles` arrays. `AdminRedirect` now handles both roles (redirects to `/admin/tipologias`).
11. ~~**Hard 401 redirect conflicts with auth context**~~ **FIXED** (7d1a676) — 401 now throws an error instead of hard-redirecting. Auth context handles the redirect.
12. **No SEO metadata on public pages** — No `document.title`, no meta descriptions, no OpenGraph tags on any page.

### Backend
13. ~~**No input validation on developer/development creation**~~ **FIXED** (08d62a6) — Developer and development create/update routes now validate with Zod schemas.
14. ~~**~130 catalog routes have no try-catch**~~ **FIXED** (08d62a6) — All catalog routes now wrapped in try-catch.
15. ~~**Admin password logged to console**~~ **FIXED** (6f07c69) — Generated password no longer logged to console.
16. ~~**User update allows role escalation**~~ **FIXED** (7d1a676) — Role validated against built-in roles + custom roles on create/update.
17. ~~**N+1 query on `GET /api/properties`**~~ **FIXED** (5353e16) — Now uses batch methods (`getTypologiesByPropertyIds`, `getDocumentsByTypologyIds`). 1+2N queries reduced to 3.
18. ~~**N+1 query on `GET /api/public/typologies`**~~ **FIXED** (5353e16) — Batch query loads all media in one query. 1+N reduced to 2.

### Database
19. **No migration files** — Schema managed via `db:push` only. No rollback capability, no audit trail.
20. ~~**`getClient()`/`getDeveloper()`/`getTypology()` return soft-deleted records**~~ **FIXED** (5353e16) — Single-record getters now filter by `isNull(deletedAt)`.
21. **`users.email` nullable and not unique** — Cannot use for account recovery, duplicates possible.
22. **Typology developer/development stored as text, not FK** — String matching for relationships, no referential integrity.

### Permissions
23. ~~**Unauthenticated access to developers/developments**~~ **FIXED** (7d1a676) — `GET /api/developers`, `/api/developers/:id`, `/api/developments-entity`, `/api/developments-entity/:id`, `/api/development-media` now require `requireAuth`.
24. **Uploaded files served without auth** — `/uploads/*` is public. Predictable filenames (timestamp+random).
25. **Section access (`roleSectionAccess`) not enforced on backend** — Admin can disable a section for a role, but API still serves data.

### WebSocket
(covered by Critical #2 and #6 above)

---

## MEDIUM (30+ issues)

### Spreadsheet
26. ~~`parseDateInput` two-digit year always assumes 2000s (entering `99` → 2099)~~ **FIXED** (7d1a676) — Year heuristic: two-digit years > currentYear+10 → 1900s
27. Filter popover search text persists after close
28. `handleCellBlur` stale closure risk on `editValue`
29. `allColumns` recreated every render (missing `useMemo`)
30. ~~Developments spreadsheet missing WebSocket listener~~ **NOT A BUG** — Developments already had WebSocket support; audit was incorrect
31. Typology auto-fix silently deactivates incomplete rows on load (may fire before data is loaded)

### Frontend
32. No session refresh/expiry warning — `checkAuth()` runs only on mount
33. `staleTime: Infinity` prevents data freshness on public pages
34. ~~Footer "Aviso de Privacidad" link is non-functional~~ **FIXED** (7d1a676) — Footer links now functional (Departamentos/Desarrollos → /propiedades, Aviso de Privacidad as working link)
35. ~~Contact form has no phone validation~~ **FIXED** (7d1a676) — Phone validated as 10 digits, email format validated
36. ~~User form allows creating users without password~~ **FIXED** (7d1a676) — Password required on create
37. ~~User form missing `finanzas`/`desarrollador` in built-in roles~~ **FIXED** (7d1a676) — All 6 roles available in user form
38. Typology detail fetches ALL typologies for a single page view
39. NotificationBell — no WebSocket reconnection logic
40. Minimal ARIA labeling across the app
41. ~~Notification delete button permanently invisible (missing `group` class)~~ **FIXED** (7d1a676) — Added `group` class to parent element

### Backend
42. ~~Notification ownership not enforced~~ **FIXED** (7d1a676) — Notification endpoints now check `notification.userId === req.user.id`
43. Path traversal risk in document download endpoints
44. ~~Session not invalidated on password change~~ **FIXED** (7d1a676) — `deleteSessionsByUserId` called on password change
45. ~~Session not invalidated on user deactivation~~ **FIXED** (7d1a676) — `deleteSessionsByUserId` called on user deactivation
46. Public upload endpoint has no rate limiting
47. Missing database indexes on commonly filtered columns
48. Unbounded queries with no pagination on all list endpoints
49. `deleteUser` hard-deletes without cleaning sessions/FKs (will fail)

### Database
50. `updatedAt` uses `defaultNow()` but never auto-updates on UPDATE
51. `users.role` has no check constraint (any string accepted)
52. `clients` has duplicate columns: `asesorId` vs `assignedTo`, `nombre` vs `name`, etc.
53. ~~Missing `onDelete` on multiple FK references~~ **FIXED** (8226fb9) — Added `onDelete: "cascade"` on sessions.userId, clientFollowUps.clientId, notifications.userId. Added `onDelete: "set null"` on clients.asesorId, clients.assignedTo, clientFollowUps.userId, typologies.createdBy/updatedBy, documents.uploadedBy, developmentMedia.uploadedBy, sharedLinks.createdBy.
54. ~~`rolePermissions` missing unique constraint~~ **FIXED** (8226fb9) — Unique constraint on `(section, field, role)`
55. ~~`roleSectionAccess` missing unique constraint~~ **FIXED** (8226fb9) — Unique constraint on `(section, role)`
56. `clients.desarrollador/desarrollo/tipologia` stored as text, not FKs
57. No audit trail / activity log table
58. `contactFormSchema` field names don't match client table columns

### Permissions
59. `finanzas`/`desarrollador` locked out of client APIs despite having `PAGE_PERMISSIONS` entries
60. Typology routes exclude `perfilador`/`finanzas`/`desarrollador` despite them having view permissions
61. WebSocket broadcasts all entity data to all users regardless of role
62. Document permission check uses legacy `user.permissions` JSONB, not `PAGE_PERMISSIONS`
63. ~~Custom role keys can collide with built-in role names~~ **FIXED** (7d1a676) — Collision prevention checks against built-in role names
64. ~~Asesor not forced to own newly created clients~~ **FIXED** (7d1a676) — Asesor forced to `asesorId = req.user.id` on client creation

### WebSocket
65. Multiple concurrent WS connections per user (NotificationBell + spreadsheet)
66. Session expiry not enforced on active WS connections
67. No user identity stored on WS connections — can't filter broadcasts
68. Propagated typology changes (developer/development rename) not broadcast
69. Messages lost during WS disconnect window (no invalidation on reconnect)
70. No server-side ping/pong heartbeat for dead connection cleanup

---

## LOW (20+ issues)

71. `ExclusiveSelect` duplicated across 4 files (~60 lines each)
72. Inconsistent sort icon direction between typology filter and shared filter
73. RFC validation only accepts 12-char (companies), not 13-char (individuals)
74. `calcAntiguedad` ignores day component
75. `formatDateShort` accepts `any` type parameter
76. CSS `zoom` property not supported in Firefox
77. Phone list doesn't validate existing malformed data from DB
78. `pendingChangesVersion` counter can overflow (theoretical)
79. Dashboard page exists but has no route
80. ~~404 page has no navigation back~~ **FIXED** (7d1a676) — Added "Volver al inicio" button
81. Property-detail "Share"/"Favorite" buttons are non-functional
82. Property-detail missing footer
83. Login page shows form briefly before redirect when already authenticated
84. No exponential backoff on WS reconnection (fixed 3s)
85. Full entity payloads broadcast to all WS clients (only type+id needed)
86. Contact form skips duplicate check (no `checkDuplicatesAndNotify`)
87. Catalog tables `catalogVistas/Areas/Tipologias` inconsistent patterns
88. Calculated fields stored physically (consistency risk vs computed columns)
89. ~~Various catalog routes leak validation error details in production~~ **FIXED** (6f07c69) — Global error handler returns generic message for 5xx in production

---

## Priority Fix Order for Demo

### Must-fix before demo (Critical + demo-blocking High) — ALL FIXED
1. ~~`flushPendingChanges` auth + error handling (Critical #1, #2)~~ **FIXED** (73c7f78)
2. ~~Add `finanzas`/`desarrollador` to route `allowedRoles` (High #10)~~ **FIXED** (802d2a4)
3. ~~Add database indexes on session/FK columns (Critical #4)~~ **FIXED** (8d9c47b)
4. ~~Fix `developmentAssignments` FK (Critical #5)~~ **FIXED** (8d9c47b)
5. ~~Add try-catch to catalog routes (High #14)~~ **FIXED** (08d62a6)
6. ~~Add input validation on developer/development creation (High #13)~~ **FIXED** (08d62a6)

### Should-fix before production — MOSTLY FIXED
7. Backend field-level permission enforcement (Critical #3) — STILL OPEN
8. ~~Typology spreadsheet field permissions (High #7)~~ **FIXED** (2586cd7)
9. ~~Auth for developer/development API endpoints (High #23)~~ **FIXED** (7d1a676)
10. Auth for uploaded files (High #24) — STILL OPEN
11. ~~N+1 query fixes (High #17, #18)~~ **FIXED** (5353e16)
12. Migration files setup (High #19) — STILL OPEN
13. ~~Soft-delete filter on single-record getters (High #20)~~ **FIXED** (5353e16)
14. ~~NaN guards on formulas (High #8)~~ **FIXED** (9b02327)
15. SEO metadata on public pages (High #12) — STILL OPEN
