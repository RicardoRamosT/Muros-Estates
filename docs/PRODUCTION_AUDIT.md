# Production Readiness Audit — March 19, 2026

Full audit across all 6 system areas. Issues organized by severity.

---

## CRITICAL (6 issues)

### 1. [SPREADSHEET] `flushPendingChanges` missing `credentials: "include"` — silent data loss on page close
- **Files**: All 4 spreadsheets (`flushPendingChanges` function)
- **Problem**: Uses `localStorage.getItem("muros_session")` in Authorization header, but session is an httpOnly cookie not readable from JS. Missing `credentials: "include"` means the cookie isn't sent either. Pending edits on page close are silently dropped.
- **Fix**: Add `credentials: "include"` to all `fetch()` calls in `flushPendingChanges`.

### 2. [SPREADSHEET] `flushPendingChanges` clears pending changes before server confirms
- **Files**: All 4 spreadsheets — `pending.clear()` runs synchronously before `Promise.all` resolves
- **Problem**: If any PUT request fails (network error, 401, 500), the data is already gone from client memory. No `.catch()`, no retry, no notification. Permanent silent data loss.
- **Fix**: Move `pending.clear()` into `.then()`. Only clear entries that succeeded. Add `.catch()` with error toast.

### 3. [PERMISSIONS] No backend enforcement of field-level permissions on writes
- **File**: `server/routes.ts` — all PUT endpoints
- **Problem**: `PAGE_PERMISSIONS` is consumed only by the frontend hook. The server passes `req.body` directly to `storage.update*()` without stripping restricted fields. Any user with Chrome DevTools can bypass all field permissions.
- **Fix**: Create server-side middleware that strips fields the user's role cannot `edit` per `PAGE_PERMISSIONS`.

### 4. [DATABASE] Zero database indexes defined
- **File**: `shared/schema.ts`
- **Problem**: Not a single index exists. Full table scans on every FK join, every WHERE clause. Session validation (every auth request) scans `sessions` table.
- **Fix**: Add indexes on: `sessions.userId/expiresAt`, `clients.asesorId/deletedAt`, `typologies.propertyId/deletedAt`, `documents.*Id`, `notifications.userId`, `rolePermissions(section,field,role)`.

### 5. [DATABASE] `developmentAssignments.developmentId` FK points to `properties` instead of `developments`
- **File**: `shared/schema.ts`, line ~1076
- **Problem**: The assignment table intended to link developments↔asesores actually references the wrong table. Data integrity is broken.
- **Fix**: Change reference from `properties.id` to `developments.id`.

### 6. [SPREADSHEET] Race condition — WebSocket invalidation can overwrite unsaved pending changes
- **Files**: All 4 spreadsheets
- **Problem**: When another user edits any row, WS triggers `invalidateQueries()` which re-fetches. No conflict detection. Last-write-wins with no warning.
- **Fix**: Implement optimistic locking (compare `updatedAt` timestamps) or skip invalidation for rows with pending changes.

---

## HIGH (19 issues)

### Spreadsheet
7. **Typology spreadsheet ignores field-level permissions** — Uses simple role check instead of `useFieldPermissions('tipologias')`. All roles can edit all fields.
8. **Division by zero / NaN propagation in formulas** — `maintenanceFinal` can produce NaN when `mortgageYears=0`, cascading through investment/appreciation fields.
9. **No virtualization** — All rows render to DOM after initial load. 500+ typology rows with 80+ columns = 40,000+ DOM nodes.

### Frontend
10. **`finanzas`/`desarrollador` roles cause infinite redirect loop** — No routes include these roles in `allowedRoles`. `AdminRedirect` sends them to a page they can't access → loop.
11. **Hard 401 redirect conflicts with auth context** — `apiRequest()` does `window.location.href = "/login"` on 401, losing all in-flight form data.
12. **No SEO metadata on public pages** — No `document.title`, no meta descriptions, no OpenGraph tags on any page.

### Backend
13. **No input validation on developer/development creation** — `req.body` passed directly to `storage.create*()`. Can inject `deletedAt`, `createdAt`, arbitrary fields.
14. **~130 catalog routes have no try-catch** — Database errors bubble to global handler, potentially leaking table/column names.
15. **Admin password logged to console** — When `ADMIN_INITIAL_PASSWORD` is unset, generated password goes to `console.log`, which persists in log aggregation.
16. **User update allows role escalation** — `PUT /api/users/:id` accepts any `role` string with no validation against known roles.
17. **N+1 query on `GET /api/properties`** — Each property triggers 2 additional queries (typology + documents). N properties = 1+2N queries.
18. **N+1 query on `GET /api/public/typologies`** — Same pattern on a public endpoint.

### Database
19. **No migration files** — Schema managed via `db:push` only. No rollback capability, no audit trail.
20. **`getClient()`/`getDeveloper()`/`getTypology()` return soft-deleted records** — Single-record getters don't filter by `deletedAt`.
21. **`users.email` nullable and not unique** — Cannot use for account recovery, duplicates possible.
22. **Typology developer/development stored as text, not FK** — String matching for relationships, no referential integrity.

### Permissions
23. **Unauthenticated access to developers/developments** — `GET /api/developers` exposes RFC, legal rep, contact info, domicilio without auth.
24. **Uploaded files served without auth** — `/uploads/*` is public. Predictable filenames (timestamp+random).
25. **Section access (`roleSectionAccess`) not enforced on backend** — Admin can disable a section for a role, but API still serves data.

### WebSocket
(covered by Critical #2 and #6 above)

---

## MEDIUM (30+ issues)

### Spreadsheet
26. `parseDateInput` two-digit year always assumes 2000s (entering `99` → 2099)
27. Filter popover search text persists after close
28. `handleCellBlur` stale closure risk on `editValue`
29. `allColumns` recreated every render (missing `useMemo`)
30. Developments spreadsheet missing WebSocket listener
31. Typology auto-fix silently deactivates incomplete rows on load (may fire before data is loaded)

### Frontend
32. No session refresh/expiry warning — `checkAuth()` runs only on mount
33. `staleTime: Infinity` prevents data freshness on public pages
34. Footer "Aviso de Privacidad" link is non-functional (LFPDPPP legal risk in Mexico)
35. Contact form has no phone validation (accepts "abc")
36. User form allows creating users without password
37. User form missing `finanzas`/`desarrollador` in built-in roles
38. Typology detail fetches ALL typologies for a single page view
39. NotificationBell — no WebSocket reconnection logic
40. Minimal ARIA labeling across the app
41. Notification delete button permanently invisible (missing `group` class)

### Backend
42. Notification ownership not enforced — any user can mark/delete others' notifications
43. Path traversal risk in document download endpoints
44. Session not invalidated on password change
45. Session not invalidated on user deactivation
46. Public upload endpoint has no rate limiting
47. Missing database indexes on commonly filtered columns
48. Unbounded queries with no pagination on all list endpoints
49. `deleteUser` hard-deletes without cleaning sessions/FKs (will fail)

### Database
50. `updatedAt` uses `defaultNow()` but never auto-updates on UPDATE
51. `users.role` has no check constraint (any string accepted)
52. `clients` has duplicate columns: `asesorId` vs `assignedTo`, `nombre` vs `name`, etc.
53. Missing `onDelete` on multiple FK references (sessions, clients, follow-ups, documents)
54. `rolePermissions` missing unique constraint on `(section, field, role)`
55. `roleSectionAccess` missing unique constraint on `(section, role)`
56. `clients.desarrollador/desarrollo/tipologia` stored as text, not FKs
57. No audit trail / activity log table
58. `contactFormSchema` field names don't match client table columns

### Permissions
59. `finanzas`/`desarrollador` locked out of client APIs despite having `PAGE_PERMISSIONS` entries
60. Typology routes exclude `perfilador`/`finanzas`/`desarrollador` despite them having view permissions
61. WebSocket broadcasts all entity data to all users regardless of role
62. Document permission check uses legacy `user.permissions` JSONB, not `PAGE_PERMISSIONS`
63. Custom role keys can collide with built-in role names
64. Asesor not forced to own newly created clients

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
80. 404 page has no navigation back
81. Property-detail "Share"/"Favorite" buttons are non-functional
82. Property-detail missing footer
83. Login page shows form briefly before redirect when already authenticated
84. No exponential backoff on WS reconnection (fixed 3s)
85. Full entity payloads broadcast to all WS clients (only type+id needed)
86. Contact form skips duplicate check (no `checkDuplicatesAndNotify`)
87. Catalog tables `catalogVistas/Areas/Tipologias` inconsistent patterns
88. Calculated fields stored physically (consistency risk vs computed columns)
89. Various catalog routes leak validation error details in production

---

## Priority Fix Order for Demo

### Must-fix before demo (Critical + demo-blocking High)
1. `flushPendingChanges` auth + error handling (Critical #1, #2)
2. Add `finanzas`/`desarrollador` to route `allowedRoles` (High #10)
3. Add database indexes on session/FK columns (Critical #4)
4. Fix `developmentAssignments` FK (Critical #5)
5. Add try-catch to catalog routes (High #14)
6. Add input validation on developer/development creation (High #13)

### Should-fix before production
7. Backend field-level permission enforcement (Critical #3)
8. Typology spreadsheet field permissions (High #7)
9. Auth for developer/development API endpoints (High #23)
10. Auth for uploaded files (High #24)
11. N+1 query fixes (High #17, #18)
12. Migration files setup (High #19)
13. Soft-delete filter on single-record getters (High #20)
14. NaN guards on formulas (High #8)
15. SEO metadata on public pages (High #12)
