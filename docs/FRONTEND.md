# Frontend Architecture

React 18 + Vite SPA served from `client/src/`. All UI text is in Spanish (es-MX).

---

## Tech Stack

| Layer | Library |
|-------|---------|
| Framework | React 18.3 |
| Bundler | Vite |
| Routing | Wouter 3.3 (lightweight, not React Router) |
| Data fetching | TanStack React Query v5 |
| UI components | Shadcn/UI (Radix primitives + Tailwind CSS v3) |
| Theming | CSS custom properties + next-themes (class strategy) |
| Forms | react-hook-form + @hookform/resolvers + Zod |
| Icons | lucide-react |
| Drag & Drop | @dnd-kit (core + sortable) |
| File uploads | Uppy (core + AWS S3 + dashboard) |
| Charts | Recharts |
| PDF | jspdf + html2canvas |
| Dates | date-fns |

---

## Directory Structure

```
client/src/
├── components/          # Feature components
│   ├── ui/              # Shadcn/UI primitives (50+ components)
│   ├── typology-spreadsheet.tsx
│   ├── prospects-spreadsheet.tsx
│   ├── developments-spreadsheet.tsx
│   ├── developers-spreadsheet.tsx
│   ├── header.tsx
│   ├── footer.tsx
│   ├── property-card.tsx
│   ├── typology-card.tsx
│   ├── property-grid.tsx
│   ├── typology-grid.tsx
│   ├── property-filters.tsx
│   ├── property-form.tsx
│   ├── user-form.tsx
│   ├── admin-user-table.tsx
│   ├── roles-permissions-view.tsx
│   ├── notification-bell.tsx
│   ├── floating-contact-form.tsx
│   └── development-media-uploader.tsx
├── hooks/               # Custom hooks
│   ├── use-field-permissions.ts
│   ├── use-persisted-state.ts
│   ├── use-toast.ts
│   └── use-upload.ts
├── lib/                 # Utilities
│   ├── auth.tsx         # AuthProvider + useAuth
│   ├── queryClient.ts   # React Query config + apiRequest
│   ├── spreadsheet-utils.ts
│   └── utils.ts         # cn() helper
├── pages/               # Route pages
│   ├── home.tsx
│   ├── login.tsx
│   ├── properties.tsx
│   ├── property-detail.tsx
│   ├── typology-detail.tsx
│   ├── public-share.tsx
│   ├── admin-documents.tsx
│   └── admin/
│       ├── dashboard.tsx
│       ├── catalogos.tsx
│       └── users.tsx
├── App.tsx              # Root component + routes
├── main.tsx             # Entry point
└── index.css            # Theme + custom properties
```

---

## Routing

**Framework**: Wouter (path-based, no history API wrapper needed).

### Public Routes
| Path | Page | Description |
|------|------|-------------|
| `/` | home.tsx | Landing with hero, filters, typology grid |
| `/propiedades` | properties.tsx | Property listing with filters |
| `/tipologia/:id` | typology-detail.tsx | Single typology view |
| `/property/:id` | property-detail.tsx | Single property view |
| `/login` | login.tsx | Auth form |
| `/s/:token` | public-share.tsx | Shared link access (token-based) |

### Admin Routes (lazy-loaded, role-protected)
| Path | Component | Allowed Roles |
|------|-----------|---------------|
| `/admin` | AdminRedirect | All authenticated |
| `/admin/users` | users.tsx | admin |
| `/admin/desarrolladores` | developers-spreadsheet | admin, actualizador |
| `/admin/desarrollos` | developments-spreadsheet | admin, actualizador |
| `/admin/tipologias` | typology-spreadsheet | admin, actualizador |
| `/admin/prospectos` | prospects-spreadsheet | admin, perfilador, asesor |
| `/admin/clientes` | prospects-spreadsheet | admin, perfilador, asesor |
| `/admin/documentos` | admin-documents | admin, actualizador, asesor, perfilador |
| `/admin/catalogos` | catalogos.tsx | admin, actualizador |

### Route Protection
```tsx
<ProtectedRoute allowedRoles={["admin", "actualizador"]}>
  <Suspense fallback={<LoadingSpinner />}>
    <LazyComponent />
  </Suspense>
</ProtectedRoute>
```
- Redirects to `/login` if unauthenticated
- Redirects to `/admin` if role not permitted
- Components are `React.lazy()` loaded

---

## Authentication

**Provider**: `client/src/lib/auth.tsx` — React Context wrapping the entire app.

### Flow
1. `AuthProvider` mounts → calls `GET /api/auth/me`
2. If valid session cookie exists → sets user state
3. Login: `POST /api/auth/login` → server sets `httpOnly` cookie (`muros_session`)
4. All requests include `credentials: "include"` → cookie sent automatically
5. 401 response → redirect to `/login`

### Hook
```tsx
const { user, isLoading, isAuthenticated, login, logout } = useAuth();
// user: { id, username, name, email, role, permissions }
```

---

## Data Fetching

**Library**: TanStack React Query v5 with aggressive caching.

### Configuration (`queryClient.ts`)
```tsx
staleTime: Infinity        // Data never goes stale automatically
refetchOnWindowFocus: false // No background refetch
refetchInterval: false      // No polling
retry: false                // No auto-retry
```

### API Helper
```tsx
apiRequest(method, url, data?)
// - Wraps fetch with credentials: "include"
// - Auto-adds Content-Type: application/json
// - Throws on non-OK responses
// - Redirects to /login on 401
```

### Pattern
```tsx
// Fetch
const { data } = useQuery({ queryKey: ['/api/typologies'], queryFn: ... });

// Mutate
const mutation = useMutation({
  mutationFn: (data) => apiRequest('PUT', `/api/typologies/${id}`, data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/typologies'] })
});
```

Real-time updates arrive via WebSocket and trigger `queryClient.invalidateQueries()`.

---

## Theming

### Colors (CSS custom properties in `index.css`)
| Token | Light | Dark |
|-------|-------|------|
| Primary | `hsl(202 89% 41%)` — Blue | Same |
| Secondary | `hsl(43 76% 53%)` — Gold | Same |
| Destructive | `hsl(0 84% 60%)` — Red | Same |
| Background | White | Dark gray |

### Fonts
- **Headings**: Montserrat (Google Fonts)
- **Body**: Open Sans (Google Fonts)

### Dark Mode
- Strategy: `class` (next-themes)
- Toggle adds/removes `.dark` on `<html>`
- CSS variables swap via `.dark {}` selector

### Component Radius
- Default: `0.5rem` (8px) via `--radius` variable

---

## Component Architecture

### App Component Tree
```
<QueryClientProvider>
  <AuthProvider>
    <TooltipProvider>
      <Toaster />
      <Router />
    </TooltipProvider>
  </AuthProvider>
</QueryClientProvider>
```

### Shadcn/UI Components (`components/ui/`)
50+ Radix-based primitives: Button, Input, Select, Dialog, Sheet, Tabs, Accordion, Card, Badge, Tooltip, Pagination, Progress, Toast, etc.

### Custom Components
| Component | Purpose |
|-----------|---------|
| `spreadsheet-shared.tsx` | Shared headers, filters, section search for all spreadsheets |
| `column-filter.tsx` | Per-column filter with multi-select + sort |
| `formula-tooltip.tsx` | Hover tooltip showing formula definition |
| `recycle-bin.tsx` | Drawer showing soft-deleted items for restore |
| `spreadsheet-toolbar.tsx` | Top toolbar (search, add row, toggle sections) |
| `text-detail-modal.tsx` | Modal for viewing/editing long text fields |
| `notification-bell.tsx` | Real-time notification dropdown |
| `floating-contact-form.tsx` | Public contact form popup |
| `development-media-uploader.tsx` | Multi-file media upload modal |
| `ObjectUploader.tsx` | Uppy-based file uploader |

---

## Custom Hooks

### `useFieldPermissions(pageName)`
Enforces role-based field access in the UI.
```tsx
const { canView, canEdit, isAdmin, hasFullAccess } = useFieldPermissions('tipologias');
// canView('price') → boolean
// canEdit('price') → boolean
```
Fetches from `/api/my-permissions` and `/api/role-section-access`.

### `usePersistedState(key, defaultValue, serializer?)`
localStorage-backed state with 300ms debounced writes.
```tsx
const [filters, setFilters] = usePersistedState(
  `muros_prefs_${userId}_typologies_filters`,
  defaultFilters,
  filterConfigsSerializer
);
```

### `useToast()`
Toast notification system (max 1 visible, 5s auto-dismiss).

### `useUpload()`
Two-step file upload: request presigned URL → upload to storage. Supports progress tracking.

---

## Data Formatting (`spreadsheet-utils.ts`)

| Function | Output |
|----------|--------|
| `formatCurrency(value)` | `$1,234,567 (MXN)` |
| `formatNumber(value, decimals)` | `1,234.56` |
| `formatPercent(value)` | `12.50%` |
| `formatArea(value)` | `85.00 m²` |
| `formatDate(date)` | `19/03/26` |
| `formatDateShort(str)` | `dd/mm/yy` from `YYYY-MM-DD` |
| `maskDateInput(raw)` | Auto-formats as user types `dd/mm/yy` |
| `parseDateInput(input)` | Converts `dd/mm/yy` → `YYYY-MM-DD` for storage |

### Input Filters (paste/type protection)
- **phone**: digits, `+`, `-`, `()`, spaces
- **email**: alphanumeric, `@`, `.`, `+`, `-`, `_`
- **rfc**: uppercase alphanumeric only
- **name**: Latin chars, ñ, accents, `-`, spaces, `.`

---

## State Persistence

Spreadsheet preferences stored in localStorage per user:
```
Key pattern: muros_prefs_{userId}_{spreadsheet}_{field}

Persisted state:
- Column filters (multi-select values per column)
- Sort order (column + direction)
- Collapsed sections
- Column visibility toggles
```

Custom serializers handle `Set<string>` and `Record<string, Set<string>>` types.

---

## Performance

| Technique | Where |
|-----------|-------|
| `React.lazy()` + `Suspense` | All admin routes |
| `staleTime: Infinity` | All queries (no refetch unless invalidated) |
| `useMemo` | Filtered/sorted row computation |
| `useCallback` | Event handlers in spreadsheets |
| `useRef` | DOM refs to avoid re-renders |
| Conditional rendering | Collapsed sections not rendered |
| WebSocket invalidation | Surgical cache updates vs polling |
