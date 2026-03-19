# Spreadsheet System

The core admin UI is built around custom Excel-like spreadsheet components. These handle inline editing, real-time multi-user sync, formula calculations, column filtering, and role-based field permissions.

---

## Components

| Component | File | Entity | Lines |
|-----------|------|--------|-------|
| Typologies | `typology-spreadsheet.tsx` | Typology units | ~800 |
| Prospects/Clients | `prospects-spreadsheet.tsx` | Clients/prospects | ~1500 |
| Developments | `developments-spreadsheet.tsx` | Development projects | ~800 |
| Developers | `developers-spreadsheet.tsx` | Developer companies | ~600 |

### Shared Utilities
- `spreadsheet-shared.tsx` — Headers, section rendering, section search popover
- `spreadsheet-utils.ts` — Formatting, formulas, input filters, cell styling
- `spreadsheet-toolbar.tsx` — Top toolbar (search, add row, toggle sections)
- `column-filter.tsx` — Per-column filter with multi-select + sort
- `formula-tooltip.tsx` — Hover tooltip showing formula definition
- `recycle-bin.tsx` — Drawer for viewing/restoring soft-deleted rows

---

## Column Definition System

Each spreadsheet defines columns grouped into sections:

```typescript
interface ColumnDef {
  key: string;           // Field name matching DB column
  label: string;         // Display header (Spanish)
  type: "text" | "number" | "decimal" | "select" | "multiselect" |
        "boolean" | "date" | "calculated" | "phone-list" | "currency" |
        "percent" | "area";
  format?: "currency" | "percent" | "area";
  width?: number;        // Fixed width in px
  calculated?: boolean;  // Read-only formula field
  linkedSizeField?: string;  // Toggle-dependent field (e.g., hasBalcony → balconySize)
}

interface SectionDef {
  id: string;
  label: string;
  parentLabel?: string;  // For nested grouping
  headerColor: string;   // CSS class for header
  cellColor: string;     // CSS class for cells
  columns: ColumnDef[];
  conditionalFields?: { field: string, dependsOn: string }[];
}
```

---

## Cell Types & Styling

| Type | Appearance | Behavior |
|------|------------|----------|
| `input` | White background | Editable text/number |
| `dropdown` | Gray background | Select menu |
| `checkbox` | Centered toggle | Boolean on/off |
| `calculated` | Light tinted | Read-only, formula result |
| `readonly` | Gray | Non-editable |
| `date` | White | Auto-mask dd/mm/yy |
| `currency` | White | Formatted $X,XXX |
| `percent` | White | Formatted X.XX% |
| `area` | White | Formatted X.XX m² |
| `phone-list` | White | JSON array, comma-separated display |

### Active Cell Styling
- Blue ring (`ring-inset`) on focused cell
- Active row skips alternating background color
- Tab/Enter navigation between cells

---

## Section System

Columns are grouped into collapsible sections with color-coded headers:

```
┌─────────────────────────────────────────────────┐
│ GENERALES (blue)  │ PRECIO (green) │ DISTRIBUCIÓN│
├───────┬───────────┼────────┬───────┼─────────────┤
│ Tipo  │ Nivel     │ Precio │ Final │ Recámaras   │
├───────┼───────────┼────────┼───────┼─────────────┤
│ A     │ 3         │ $2.5M  │ $2.3M │ 2           │
└───────┴───────────┴────────┴───────┴─────────────┘
```

### Section Search
- Popover with text search for section names
- Click navigates to section with smooth scroll
- Target section flashes with `section-flash` CSS animation

### Section Collapse
- Click section header to collapse/expand
- State persisted in localStorage per user

---

## Inline Editing

### Click-to-Edit
1. Click cell → enters edit mode
2. Cell renders appropriate input (text, select, date, etc.)
3. Tab → save and move to next cell
4. Enter → save and move down
5. Escape → cancel edit
6. Click outside → save

### ExclusiveSelect Pattern
Only one dropdown can be open at a time across the entire spreadsheet. This prevents overlap conflicts:
```
1. Open dropdown A → registers as active
2. Click dropdown B → closes A, opens B
3. Tab from dropdown → confirms selection, advances to next cell
```

### Input Validation
| Filter | Allows |
|--------|--------|
| phone | Digits, +, -, (), spaces |
| email | Alphanumeric, @, ., +, -, _ |
| rfc | Uppercase alphanumeric |
| name | Latin chars, ñ, accents, -, spaces, . |

Paste events are filtered through the same rules — invalid characters stripped automatically.

### Date Input Masking
- Display format: `dd/mm/yy`
- Storage format: `YYYY-MM-DD`
- Auto-mask adds `/` separators as user types
- `maskDateInput(raw)` → formatted display
- `parseDateInput(input)` → DB storage format

---

## Formula Fields

19 calculated fields in typologies, defined in `TYPOLOGY_FORMULAS` constant:

### Price Calculations
| Field | Formula |
|-------|---------|
| `finalPrice` | `price - discountAmount` |
| `pricePerM2` | `finalPrice / sizeFinal` |
| `discountAmount` | `price × (discountPercent / 100)` |

### Payment Scheme
| Field | Formula |
|-------|---------|
| `initialAmount` | `finalPrice × (initialPercent / 100)` |
| `duringConstructionAmount` | `finalPrice × (duringConstructionPercent / 100)` |
| `monthlyPayment` | `duringConstructionAmount / paymentMonths` |
| `totalEnganche` | `initialAmount + duringConstructionAmount` |
| `remainingPercent` | `100 - initialPercent - duringConstructionPercent` |
| `remainingAmount` | `finalPrice × (remainingPercent / 100)` |

### Post-Delivery Costs
| Field | Formula |
|-------|---------|
| `isaAmount` | `finalPrice × (isaPercent / 100)` |
| `notaryAmount` | `finalPrice × (notaryPercent / 100)` |
| `totalPostDeliveryCosts` | `isaAmount + notaryAmount + equipmentCost + furnitureCost` |

### Mortgage
| Field | Formula |
|-------|---------|
| `mortgageMonthlyPayment` | Standard amortization: `P × [r(1+r)^n] / [(1+r)^n - 1]` |
| `mortgageTotal` | `mortgageMonthlyPayment × (mortgageYears × 12)` |

### Rent & Investment
| Field | Formula |
|-------|---------|
| `rentTotal` | `rentMonthly × rentMonths` |
| `investmentTotal` | Sum of all costs (enganche + post-delivery + mortgage + maintenance) |
| `investmentNet` | `rentTotal - investmentTotal` |
| `investmentRate` | `(investmentNet / investmentTotal) × 100` |

### Appreciation
| Field | Formula |
|-------|---------|
| `appreciationTotal` | `finalPrice × ((1 + appreciationRate/100) ^ years - 1)` |
| `finalValue` | `finalPrice + appreciationTotal` |

### Formula Tooltips
Hovering a calculated column header shows a tooltip with the formula definition from `TYPOLOGY_FORMULAS`.

---

## Filtering & Sorting

### Column Filters
Each column has a filter dropdown (via `ColumnFilter` component):
- Shows unique values in that column
- Multi-select checkboxes to include/exclude values
- Sort ascending/descending toggle
- Clear filter button

### Filter Persistence
Filters stored in localStorage per user per spreadsheet:
```
Key: muros_prefs_{userId}_{spreadsheet}_filters
Serializer: filterConfigsSerializer (handles Record<string, Set<string>>)
```

### Sort Persistence
```
Key: muros_prefs_{userId}_{spreadsheet}_sort
Value: { column: string, direction: "asc" | "desc" }
```

---

## Real-Time Sync (WebSocket)

Each spreadsheet connects to the WebSocket server for multi-user sync:

### Connection
```typescript
const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
```

### Message Flow
```
User A edits cell → PUT /api/typologies/:id → Server saves
  → Server broadcasts: { type: "typology", action: "update", data: {...} }
  → User B receives message → invalidateQueries(['/api/typologies'])
  → User B's UI re-fetches and updates
```

### Synced Events
| Entity | Create | Update | Delete |
|--------|--------|--------|--------|
| Typologies | Yes | Yes | Yes |
| Developers | Yes | Yes | Yes |
| Developments | Yes | Yes | Yes |
| Clients/Prospects | Yes | Yes | Yes |
| Notifications | Yes | — | — |

### Reconnection
Auto-reconnects on disconnect. `notification-bell.tsx` has a fallback polling interval (30s) if WebSocket is unavailable.

---

## Field Permissions

Each spreadsheet enforces role-based field permissions:

```typescript
const { canView, canEdit } = useFieldPermissions('tipologias');

// In cell rendering:
if (!canView(column.key)) return <EmptyCell />;
if (!canEdit(column.key)) return <ReadOnlyCell value={value} />;
return <EditableCell value={value} onChange={...} />;
```

### Permission Levels
| Level | Behavior |
|-------|----------|
| `none` | Cell hidden |
| `view` | Cell visible, read-only |
| `edit` | Cell visible, editable |

### Permission Sources
1. **Default matrix**: `PAGE_PERMISSIONS` in `shared/schema.ts`
2. **Database overrides**: `rolePermissions` table (admin-configurable)
3. **Section access**: `roleSectionAccess` table (enable/disable entire sections per role)

---

## Conditional Fields

Some fields only appear when a toggle is active:

```typescript
conditionalFields: [
  { field: "balconySize", dependsOn: "hasBalcony" },
  { field: "terraceSize", dependsOn: "hasTerrace" },
  { field: "discountPercent", dependsOn: "hasDiscount" },
  { field: "storageSize", dependsOn: "hasStorage" },
  { field: "parkingOptionalPrice", dependsOn: "hasParkingOptional" },
]
```

When the dependency boolean is `false`, the dependent field is hidden or disabled.

---

## Auto-Save

Edits are saved immediately on blur/tab/enter:
1. Cell value changes → `PUT /api/{entity}/:id` with updated data
2. React Query cache invalidated on success
3. WebSocket broadcasts change to other users
4. No explicit "Save" button — all changes are atomic per cell

---

## Recycle Bin

Each spreadsheet has a recycle bin drawer showing soft-deleted rows:
- Accessible via trash icon in toolbar
- Shows deleted items with deletion timestamp
- "Restore" button calls `POST /api/{entity}/:id/restore`
- Admin-only feature

---

## Performance Considerations

| Technique | Purpose |
|-----------|---------|
| `useMemo` | Memoize filtered/sorted rows |
| `useCallback` | Stable handlers to prevent re-renders |
| `useRef` | DOM refs without triggering renders |
| Conditional section rendering | Collapsed sections skip DOM |
| Column visibility toggles | Hidden columns not rendered |
| Sticky columns | Index/ID columns fixed during horizontal scroll |
| Debounced localStorage writes | 300ms debounce on preference persistence |

### Potential Bottlenecks
- Large datasets (1000+ rows) may benefit from virtual scrolling (@tanstack/react-virtual is available)
- All visible columns render even when off-screen horizontally
- No server-side pagination — all rows fetched at once
