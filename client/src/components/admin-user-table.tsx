import { useMemo, useRef } from "react";
import { Loader2, MoreHorizontal, Edit, Trash2, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ColumnFilter, useColumnFilters, type FilterState, type SortDirection } from "@/components/ui/column-filter";
import { SpreadsheetSectionSearch } from "@/components/ui/spreadsheet-shared";
import {
  getCellStyle,
  formatDate,
  formatTime,
  SHEET_COLOR_DARK,
  SHEET_COLOR_LIGHT,
  type SpreadsheetColumnDef,
  type SpreadsheetColumnGroup,
  type SpreadsheetColumnGroupRun,
} from "@/lib/spreadsheet-utils";
import { Checkbox } from "@/components/ui/checkbox";
import type { UserPermissions } from "@shared/schema";

interface User {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: string;
  active: boolean | null;
  permissions?: UserPermissions;
  createdAt: string | null;
}

interface AdminUserTableProps {
  users: User[];
  isLoading?: boolean;
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  isDeleting?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  perfilador: "Perfilador",
  asesor: "Asesor",
  actualizador: "Actualizador",
  finanzas: "Finanzas",
  desarrollador: "Desarrollador",
};

const COLUMN_GROUPS: SpreadsheetColumnGroup[] = [
  { key: "corner", label: "", color: SHEET_COLOR_LIGHT },
  { key: "registro", label: "REGISTRO", color: SHEET_COLOR_DARK },
  { key: "informacion", label: "INFORMACIÓN", color: SHEET_COLOR_LIGHT },
  { key: "acceso", label: "ACCESO", color: SHEET_COLOR_DARK },
  { key: "actions", label: "", color: SHEET_COLOR_LIGHT },
];

const COLUMNS: SpreadsheetColumnDef[] = [
  { key: "id", label: "ID", width: "60px", type: "index", cellType: "index", group: "corner" },
  { key: "active", label: "Activo", width: "80px", type: "toggle", cellType: "checkbox", group: "registro" },
  { key: "createdDate", label: "Fecha", width: "80px", type: "date-display", cellType: "readonly", group: "registro" },
  { key: "createdTime", label: "Hora", width: "65px", type: "time-display", cellType: "readonly", group: "registro" },
  { key: "name", label: "Nombre", width: "150px", cellType: "readonly", group: "informacion" },
  { key: "username", label: "Usuario", width: "130px", cellType: "readonly", group: "informacion" },
  { key: "email", label: "Email", width: "200px", cellType: "readonly", group: "informacion" },
  { key: "role", label: "Rol", width: "120px", type: "select", cellType: "readonly", group: "acceso" },
  { key: "actions", label: "", width: "50px", type: "actions", cellType: "actions", group: "actions" },
];

const NO_FILTER_TYPES = new Set(["actions"]);

function getColumnFilterType(type?: string): "boolean" | "number" | "select" | "text" {
  if (!type) return "text";
  if (type === "toggle") return "boolean";
  if (type === "index") return "number";
  if (type === "select") return "select";
  return "text";
}

export function AdminUserTable({ users, isLoading, onEdit, onDelete, onToggleActive, isDeleting }: AdminUserTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Prepare data with date/time split
  const tableData = useMemo(() =>
    users.map((u, i) => ({
      ...u,
      createdDate: u.createdAt ? formatDate(u.createdAt) : "",
      createdTime: u.createdAt ? formatTime(u.createdAt) : "",
      active: u.active ?? false,
    })),
    [users]
  );

  const {
    sortConfig,
    filterConfigs,
    uniqueValuesMap,
    availableValuesMap,
    filteredAndSortedData,
    handleSort,
    handleFilter,
    handleClearFilter,
  } = useColumnFilters(tableData, COLUMNS, undefined, {
    defaultSortKey: "createdAt",
  });

  const filterLabelMaps = useMemo<Record<string, Record<string, string>>>(() => ({
    active: { "true": "Sí", "false": "No" },
    id: Object.fromEntries(tableData.map((u, i) => [u.id, String(i + 1)])),
    role: ROLE_LABELS,
  }), [tableData]);

  // Build column group runs
  const groupLookup = useMemo(() => Object.fromEntries(COLUMN_GROUPS.map(g => [g.key, g])), []);

  const visibleColumnGroups = useMemo<SpreadsheetColumnGroupRun[]>(() => {
    const runs: SpreadsheetColumnGroupRun[] = [];
    let currentGroup = "";
    for (const col of COLUMNS) {
      const g = col.group || "";
      if (g !== currentGroup) {
        const groupDef = groupLookup[g] || { key: g, label: "", color: "" };
        runs.push({ key: groupDef.key, label: groupDef.label, color: groupDef.color || "", colspan: 1 });
        currentGroup = g;
      } else {
        runs[runs.length - 1].colspan++;
      }
    }
    return runs;
  }, [groupLookup]);

  // Section groups for search popover
  const sectionGroups = useMemo(() => {
    const result: { label: string; offset: number; width: number }[] = [];
    let offset = 0;
    let currentGroupKey = "";
    for (const col of COLUMNS) {
      const w = parseInt(col.width);
      const gKey = col.group || "";
      if (gKey === "corner") { offset += w; continue; }
      const groupDef = groupLookup[gKey];
      if (!groupDef?.label) { offset += w; continue; }
      if (gKey !== currentGroupKey) {
        result.push({ label: groupDef.label, offset, width: w });
        currentGroupKey = gKey;
      } else if (result.length > 0) {
        result[result.length - 1].width += w;
      }
      offset += w;
    }
    return result;
  }, [groupLookup]);

  const cornerCols = COLUMNS.filter(c => c.group === "corner");
  const cornerWidth = cornerCols.reduce((sum, c) => sum + parseInt(c.width), 0);

  // Single-column groups
  const singleColGroupKeys = new Set(
    visibleColumnGroups.filter(g => g.colspan === 1 && g.label && g.key !== "corner").map(g => g.key)
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Cargando usuarios...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border rounded-lg bg-muted/30">
        <h3 className="text-lg font-semibold mb-2">No hay usuarios</h3>
        <p className="text-muted-foreground mb-4">Comienza agregando tu primer usuario.</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="overflow-auto spreadsheet-scroll border-b">
      <div className="min-w-max text-xs">
        {/* Header */}
        <div className="sticky top-0 z-20">
          {/* Row 1: Group labels */}
          <div className="flex w-max spreadsheet-header-row1">
            <div
              data-sticky-corner
              className="flex-shrink-0 sticky left-0 z-30 flex items-center justify-center"
              style={{ width: cornerWidth, minWidth: cornerWidth, height: 32, backgroundColor: SHEET_COLOR_LIGHT, borderRight: "1px solid rgba(255,255,255,0.15)", borderBottom: "1px solid rgba(255,255,255,0.15)" }}
            >
              <SpreadsheetSectionSearch groups={sectionGroups} scrollRef={scrollRef} />
            </div>
            {(() => {
              const items: JSX.Element[] = [];
              let colIdx = 0;
              for (const group of visibleColumnGroups) {
                if (group.key === "corner") { colIdx += group.colspan; continue; }
                const groupCols = COLUMNS.slice(colIdx, colIdx + group.colspan);
                const totalWidth = groupCols.reduce((sum, c) => sum + parseInt(c.width), 0);
                if (group.label) {
                  items.push(
                    <div
                      key={`r1-group-${group.key}`}
                      data-section-group={group.label}
                      className="flex items-center justify-center h-8 font-medium text-xs flex-shrink-0 text-white overflow-hidden"
                      style={{ width: totalWidth, minWidth: totalWidth, backgroundColor: group.color || "#9ca3af", borderRight: "1px solid rgba(255,255,255,0.15)", borderBottom: "1px solid rgba(255,255,255,0.15)" }}
                    >
                      <span className="truncate min-w-0 flex-1 text-center">{group.label}</span>
                    </div>
                  );
                } else {
                  groupCols.forEach(col => {
                    const w = parseInt(col.width);
                    items.push(
                      <div
                        key={`r1-${col.key}`}
                        className="h-8 flex-shrink-0"
                        style={{ width: w, minWidth: w, backgroundColor: group.color || "#d1d5db", borderRight: "1px solid rgba(255,255,255,0.15)", borderBottom: "1px solid rgba(255,255,255,0.15)" }}
                      />
                    );
                  });
                }
                colIdx += group.colspan;
              }
              return items;
            })()}
          </div>

          {/* Row 2: Column names */}
          <div className="flex w-max spreadsheet-header-row2">
            <div
              className="flex-shrink-0 sticky left-0 z-30 flex"
              style={{ width: cornerWidth, minWidth: cornerWidth, height: 32, backgroundColor: SHEET_COLOR_LIGHT, borderBottom: "1px solid rgba(255,255,255,0.15)" }}
            >
              {cornerCols.map(col => (
                <div
                  key={col.key}
                  className="flex items-center justify-center font-semibold text-xs text-white"
                  style={{ width: col.width, minWidth: col.width, height: 32, borderRight: "1px solid rgba(255,255,255,0.15)", borderBottom: "1px solid rgba(255,255,255,0.15)" }}
                >
                  {col.label || "ID"}
                </div>
              ))}
            </div>
            {COLUMNS.filter(c => c.group !== "corner").map(col => {
              const groupDef = groupLookup[col.group || ""];
              const groupColor = groupDef?.color || "";
              const isColored = !!groupColor;
              return (
                <div
                  key={`r2-${col.key}`}
                  className="font-medium text-xs flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{
                    width: col.width, minWidth: col.width, height: 32,
                    backgroundColor: isColored ? groupColor : "#d1d5db",
                    color: isColored ? "white" : "#374151",
                    borderRight: "1px solid rgba(255,255,255,0.15)",
                    borderBottom: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  <span className="truncate px-1">{singleColGroupKeys.has(col.group || "") ? "" : col.label}</span>
                </div>
              );
            })}
          </div>

          {/* Row 3: Filter controls */}
          <div className="flex w-max border-b spreadsheet-header-row3">
            <div
              className="flex-shrink-0 sticky left-0 z-30 flex"
              style={{ width: cornerWidth, minWidth: cornerWidth, height: 24, backgroundColor: SHEET_COLOR_LIGHT, color: "white" }}
            >
              {cornerCols.map(col => (
                <div
                  key={col.key}
                  className="flex items-center"
                  style={{ width: col.width, minWidth: col.width, height: 24, borderRight: "1px solid rgba(255,255,255,0.15)" }}
                >
                  {NO_FILTER_TYPES.has(col.type || "") ? <div /> : (
                    <ColumnFilter
                      columnKey={col.key}
                      columnLabel={col.label || "ID"}
                      columnType={getColumnFilterType(col.type)}
                      uniqueValues={uniqueValuesMap[col.key] || []}
                      availableValues={availableValuesMap?.[col.key]}
                      sortDirection={sortConfig.key === col.key ? sortConfig.direction : null}
                      filterState={filterConfigs[col.key] || { selectedValues: new Set() }}
                      onSort={(dir) => handleSort(col.key, dir)}
                      onFilter={(state) => handleFilter(col.key, state)}
                      onClear={() => handleClearFilter(col.key)}
                      labelMap={filterLabelMaps[col.key]}
                      hideLabel
                    />
                  )}
                </div>
              ))}
            </div>
            {COLUMNS.filter(c => c.group !== "corner").map(col => {
              const groupDef = groupLookup[col.group || ""];
              const groupColor = groupDef?.color || "";
              const isColored = !!groupColor;
              return (
                <div
                  key={`r3-${col.key}`}
                  className="flex items-center flex-shrink-0"
                  style={{
                    width: col.width, minWidth: col.width, height: 24,
                    backgroundColor: isColored ? groupColor : "#d1d5db",
                    color: isColored ? "white" : "#374151",
                    borderRight: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  {NO_FILTER_TYPES.has(col.type || "") ? <div /> : (
                    <ColumnFilter
                      columnKey={col.key}
                      columnLabel={col.label}
                      columnType={getColumnFilterType(col.type)}
                      uniqueValues={uniqueValuesMap[col.key] || []}
                      availableValues={availableValuesMap?.[col.key]}
                      sortDirection={sortConfig.key === col.key ? sortConfig.direction : null}
                      filterState={filterConfigs[col.key] || { selectedValues: new Set() }}
                      onSort={(dir) => handleSort(col.key, dir)}
                      onFilter={(state) => handleFilter(col.key, state)}
                      onClear={() => handleClearFilter(col.key)}
                      labelMap={filterLabelMaps[col.key]}
                      hideLabel
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Data rows */}
        {filteredAndSortedData.map((user, index) => {
          const originalUser = users.find(u => u.id === user.id)!;
          return (
            <div
              key={user.id}
              className={`flex w-max border-b ${index % 2 === 0 ? "bg-background" : "bg-muted/10"}`}
              style={{ height: 32, maxHeight: 32 }}
              data-testid={`row-user-${user.id}`}
            >
              {COLUMNS.map(col => {
                if (col.type === "index") {
                  return (
                    <div key={col.key} className={getCellStyle({ type: "index" })} style={{ width: col.width, minWidth: col.width }}>
                      {index + 1}
                    </div>
                  );
                }
                if (col.key === "active") {
                  return (
                    <div
                      key={col.key}
                      className={getCellStyle({ type: "checkbox" })}
                      style={{ width: col.width, minWidth: col.width, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <Checkbox
                        checked={!!user.active}
                        onCheckedChange={(checked) => onToggleActive(user.id, !!checked)}
                        className="h-4 w-4"
                      />
                    </div>
                  );
                }
                if (col.key === "createdDate") {
                  return (
                    <div key={col.key} className={getCellStyle({ type: "readonly" })} style={{ width: col.width, minWidth: col.width, color: "#0d9488", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {user.createdDate}
                    </div>
                  );
                }
                if (col.key === "createdTime") {
                  return (
                    <div key={col.key} className={getCellStyle({ type: "readonly" })} style={{ width: col.width, minWidth: col.width, color: "#0d9488", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {user.createdTime}
                    </div>
                  );
                }
                if (col.key === "role") {
                  return (
                    <div key={col.key} className={getCellStyle({ type: "readonly" })} style={{ width: col.width, minWidth: col.width, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {ROLE_LABELS[user.role] || user.role}
                    </div>
                  );
                }
                if (col.key === "actions") {
                  return (
                    <div key={col.key} className={getCellStyle({ type: "actions" })} style={{ width: col.width, minWidth: col.width, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6" data-testid={`button-actions-${user.id}`}>
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="cursor-pointer" onClick={() => onEdit(originalUser)} data-testid={`action-edit-${user.id}`}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => onToggleActive(user.id, !user.active)} data-testid={`action-toggle-${user.id}`}>
                            {user.active ? (
                              <><UserX className="w-4 h-4 mr-2" />Desactivar</>
                            ) : (
                              <><UserCheck className="w-4 h-4 mr-2" />Activar</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => onDelete(user.id)} disabled={isDeleting} data-testid={`action-delete-${user.id}`}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                }
                // Text fields: name, username, email
                const value = (user as any)[col.key] ?? "";
                return (
                  <div key={col.key} className={getCellStyle({ type: "readonly" })} style={{ width: col.width, minWidth: col.width, display: "flex", alignItems: "center" }}>
                    <span className="truncate px-1">{value}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
