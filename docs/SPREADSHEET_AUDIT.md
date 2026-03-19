# Spreadsheet Deep Audit — March 19, 2026

Cross-analysis of all 4 spreadsheet components covering UI consistency, code duplication, and interaction logic.

---

## Root Cause

The **typology spreadsheet was built first** with its own implementation. The other 3 (developers, developments, prospects) were built later using shared patterns (`SpreadsheetHeader`, `getCellStyle`, `CELL_INPUT_CLASS`). Typology was **never migrated** to use these shared utilities, causing systematic divergence.

---

## 1. CRITICAL ISSUES

### 1.1 ~~Active toggle save behavior differs across all 4 spreadsheets~~ **FIXED** (1d06279)
- **Before**: Developers/Developments used `handleFieldChange` + immediate `saveRowById`, Prospects used direct `updateMutation.mutate`, Typology used batched `handleFieldChange`
- **After**: All 4 standardized to `handleFieldChange` + immediate `saveRowById` pattern

### 1.2 Typology uses completely different header component
- Builds its own 3-row header inline instead of shared `SpreadsheetHeader`
- Different sticky behavior, bg-background, missing features
- **Fix**: Migrate typology to use `SpreadsheetHeader`

### 1.3 ~~Calculated cell colors differ~~ **FIXED** (f507df3)
- **Before**: Typology used golden `rgb(255,241,220)`, others used teal `bg-teal-50`
- **After**: All 4 standardized to golden calculated cell colors

---

## 2. UI INCONSISTENCIES (16 found)

| # | What | Typology | Developers/Developments/Prospects |
|---|------|----------|-----------------------------------|
| 1 | ~~Calculated cell bg~~ | ~~`rgb(255,241,220)` golden~~ | ~~`bg-teal-50` teal~~ **FIXED** (f507df3) — all golden |
| 2 | ~~Editable cell hover~~ | ~~`hover:bg-blue-50`~~ | ~~`hover:bg-gray-50`~~ **FIXED** (f507df3) — all blue |
| 3 | ~~Active ring on selects~~ | ~~`rounded-sm` (no ring-inset)~~ | ~~`ring-inset`~~ **FIXED** (f507df3) — all match |
| 4 | Cell horizontal padding | `px-1` / `px-2` | `px-1.5` |
| 5 | Row `group` class | Missing | Present |
| 6 | Row cursor | Explicit `cursor-pointer` | None (cell-level) |
| 7 | Header component | Custom inline | Shared `SpreadsheetHeader` |
| 8 | Sticky header bg | Has `bg-background` | Missing |
| 9 | Input control mode | Controlled (`value`) | Uncontrolled (`defaultValue`) |
| 10 | ~~SelectTrigger classes~~ | ~~Extra SVG overrides~~ | ~~Minimal~~ **FIXED** (f507df3) — all match Typology |
| 11 | Zoom container | Missing `text-xs` | Has `text-xs` |
| 12 | Toolbar classes | `gap-2 bg-background sticky` | None of these |
| 13 | ~~Zoom popup design~~ | ~~Dark translucent, 10px, animated~~ | ~~Theme bg, 12px, no animation~~ **FIXED** (f507df3) — all dark translucent |
| 14 | Collapsed group cell bg | `rgba(0,0,0,0.01/0.03)` | Group color at 13% opacity |
| 15 | Collapsed column cell bg | Per-section logic | White or transparent |
| 16 | Filter system | Custom toolbar filter | Inline header `ColumnFilter` |

---

## 3. INTERACTION INCONSISTENCIES (10 found)

| # | What | Severity |
|---|------|----------|
| 1 | ~~Active toggle save timing (see Critical 1.1)~~ **FIXED** (1d06279) | ~~Critical~~ |
| 2 | ExclusiveSelect duplicated 4x (separate ActiveDropdownRef) | Medium |
| 3 | Typology EditableCell has own `isEditing` state vs parent `editingCell` | Medium |
| 4 | Typology filter system completely different (toolbar vs inline) | High |
| 5 | ~~Prospects handleCellBlur doesn't check value equality~~ **FIXED** (c9b51db) | ~~Low~~ |
| 6 | Phone input: Dev/Devt have multi-phone popover, Prospects is plain text | Medium |
| 7 | Multiselect values: Typology comma-string, others JSON array | Low |
| 8 | Boolean types have inconsistent Tab-skip in navigateToNextCell | Medium |
| 9 | Delete dialog: Typology uses AlertDialog, others use Dialog | Low |
| 10 | Click handler: mixed onClick vs onPointerDown | Low |

---

## 4. CODE DUPLICATION — 2,635 lines (23% of total)

### HIGH priority extractions (~1,550 lines)

| Item | Files | Lines/copy | Total | Suggested extraction |
|------|-------|-----------|-------|---------------------|
| `ExclusiveSelect` + `ActiveDropdownRef` | 4/4 | 58 | 232 | `ui/exclusive-select.tsx` |
| `flushPendingChanges` | 4/4 | 30 | 120 | `useSpreadsheetCore` hook |
| WebSocket connection | 4/4 | 35 | 140 | `useWebSocketSync(type, key)` hook |
| `collapsedGroups/Columns` + toggles | 3/4 | 40 | 120 | `useCollapsibleColumns` hook |
| Sort/filter persistence | 3/4 | 36 | 108 | `usePersistedSortFilter` hook |
| `scrollToBottomPhase` (3 useEffects) | 4/4 | 25 | 100 | `useScrollToBottom` hook |
| `visibleCount` / lazy loading | 4/4 | 22 | 88 | `useLazyRows` hook |
| Zoom state + controls + UI | 4/4 | 32 | 128 | `useZoom` hook + `<ZoomControls>` |
| `visibleColumnGroups`/`sectionGroupsForSearch` | 3/4 | 40 | 120 | `useColumnGroupLayout` hook |
| `saveRowById` | 4/4 | 17 | 68 | `useSpreadsheetCore` hook |
| `handleClickOutside` | 4/4 | 13 | 52 | `useClickOutsideSave` hook |
| `editingCell`/`editValue` ref+state | 4/4 | 8 | 32 | `useRefSyncedState` hook |
| `pendingChangesRef` + state declarations | 4/4 | 12 | 48 | `useSpreadsheetCore` hook |
| Small utilities (parsePhoneList, calcAntiguedad, stableRowMap, etc.) | 2-3/4 | 5-11 | 80 | `spreadsheet-utils.ts` |

### MEDIUM priority extractions (~1,085 lines)

| Item | Files | Total | Suggested extraction |
|------|-------|-------|---------------------|
| Toolbar (save btn, expand, filters) | 3/4 | 180 | `<SpreadsheetToolbar>` shared |
| `navigateToNextCell`/`advanceFromSelect` | 3/4 | 150 | Utility with config |
| Phone list cell rendering | 2/4 | 134 | `<PhoneListCell>` component |
| CRUD mutations pattern | 3/4 | 75 | `useSpreadsheetCRUD` hook |
| Loading/access-denied screens | 4/4 | 48 | `<SpreadsheetStates>` component |
| `handleFieldChange` | 4/4 | 48 | `useSpreadsheetCore` hook |
| Typology inline ColumnFilter | 1/4 | 450 | Extend shared `ColumnFilter` |

---

## 5. RECOMMENDED EXTRACTION PLAN

### Phase 1: Core hook (eliminates ~1,000 lines)
Create `useSpreadsheetCore<T>(config)` hook consolidating:
- `pendingChangesRef` + `localEdits` + `pendingChangesVersion`
- `editingCell` / `editValue` ref+state sync
- `saveRowById`, `saveAllPending`, `flushPendingChanges`
- `handleFieldChange`, `handleRowClick`, `handleCellClick`
- `handleClickOutside`
- `clearEditingIfCurrent`

Config interface:
```typescript
interface SpreadsheetCoreConfig<T> {
  apiPath: string;        // "/api/developers"
  queryKey: string;       // "/api/developers"
  wsMessageType: string;  // "developer"
  entityIdField?: string; // default "id"
}
```

### Phase 2: Shared components (eliminates ~500 lines)
- Extract `ExclusiveSelect` to `ui/exclusive-select.tsx`
- Extract `<ZoomControls>` to `ui/zoom-controls.tsx`
- Extract `<PhoneListCell>` to `ui/phone-list-cell.tsx`
- Move `parsePhoneList`, `calcElapsedTime`, `buildStableRowMap` to `spreadsheet-utils.ts`

### Phase 3: Shared hooks (eliminates ~500 lines)
- `useWebSocketSync(messageType, queryKey)`
- `useCollapsibleColumns(uid, sheetName, allColumns)`
- `usePersistedSortFilter(uid, sheetName)`
- `useLazyRows(dataLength, scrollRef)`
- `useScrollToBottom(isLoading, data, scrollRef)`
- `useColumnGroupLayout(columns, groupDefinitions)`

### Phase 4: Typology migration
- Migrate typology to use `getCellStyle()` from `spreadsheet-utils.ts`
- Migrate typology to use shared `SpreadsheetHeader`
- Extend shared `ColumnFilter` to support range filters
- Standardize all visual properties to match other 3 spreadsheets
