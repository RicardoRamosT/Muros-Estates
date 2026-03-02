import { useState } from "react";
import { Plus, Minus, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ColumnFilter } from "@/components/ui/column-filter";
import type { FilterState, SortDirection } from "@/components/ui/column-filter";
import {
  SHEET_COLOR_LIGHT,
  SHEET_FECHAHORA_COLOR,
  type SpreadsheetColumnDef,
  type SpreadsheetColumnGroup,
  type SpreadsheetColumnGroupRun,
} from "@/lib/spreadsheet-utils";

const NO_FILTER_TYPES = new Set([
  'actions', 'folder-link', 'index', 'toggle',
  'calculated-percent', 'date-display', 'time-display', 'group-collapsed',
]);

function getColumnFilterType(type?: string): 'boolean' | 'number' | 'select' | 'text' {
  if (!type) return 'text';
  if (type === 'boolean' || type === 'toggle') return 'boolean';
  if (type === 'number' || type === 'currency') return 'number';
  if (type.includes('select')) return 'select';
  return 'text';
}

interface SectionGroup {
  label: string;
  offset: number;
  width: number;
}

interface SpreadsheetSectionSearchProps {
  groups: SectionGroup[];
  scrollRef: React.RefObject<HTMLDivElement> | { current: HTMLDivElement | null };
}

export function SpreadsheetSectionSearch({ groups, scrollRef }: SpreadsheetSectionSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = query.trim()
    ? groups.filter(g => g.label.toLowerCase().includes(query.toLowerCase()))
    : groups;
  const scrollTo = (group: SectionGroup) => {
    const container = scrollRef.current;
    if (!container) return;
    const freeSpace = container.clientWidth - group.width;
    const centeredLeft = Math.max(0, group.offset - Math.max(0, freeSpace) / 2);
    container.scrollTo({ left: centeredLeft, behavior: 'smooth' });
    setOpen(false);
    setQuery("");
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              className="flex items-center justify-center w-6 h-6 rounded hover:bg-white/20"
              data-testid="button-section-search"
            >
              <Search className="w-3.5 h-3.5 text-white" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Ir a sección</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-52 p-2" align="start">
        <input
          placeholder="Buscar sección..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full h-7 text-xs border rounded px-2 mb-2 outline-none focus:ring-1 focus:ring-primary"
          autoFocus
        />
        <div className="space-y-0.5 max-h-60 overflow-y-auto">
          {filtered.map(g => (
            <button
              key={g.label}
              className="w-full text-left text-xs px-2 py-1 rounded hover:bg-accent uppercase"
              onClick={() => scrollTo(g)}
            >
              {g.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface SpreadsheetHeaderProps {
  visibleColumns: SpreadsheetColumnDef[];
  visibleColumnGroups: SpreadsheetColumnGroupRun[];
  groupLookupMap: Record<string, SpreadsheetColumnGroup>;
  filterConfigs: Record<string, FilterState>;
  sortConfig: { key: string; direction: SortDirection };
  uniqueValuesMap: Record<string, string[]>;
  availableValuesMap?: Record<string, Set<string>>;
  fechaHoraExpanded: boolean;
  onFechaHoraExpand: () => void;
  onFechaHoraCollapse: () => void;
  onSort: (key: string, dir: SortDirection) => void;
  onFilter: (key: string, state: FilterState) => void;
  onClear: (key: string) => void;
  sectionGroups: SectionGroup[];
  scrollRef: React.RefObject<HTMLDivElement> | { current: HTMLDivElement | null };
  idFilterKey?: string;
  labelMaps?: Record<string, Record<string, string>>;
  groupMaps?: Record<string, Record<string, string[]>>;
  collapsedGroups?: Set<string>;
  onToggleGroupCollapse?: (key: string) => void;
}

export function SpreadsheetHeader({
  visibleColumns,
  visibleColumnGroups,
  groupLookupMap,
  filterConfigs,
  sortConfig,
  uniqueValuesMap,
  availableValuesMap,
  fechaHoraExpanded,
  onFechaHoraExpand,
  onFechaHoraCollapse,
  onSort,
  onFilter,
  onClear,
  sectionGroups,
  scrollRef,
  idFilterKey = 'id',
  labelMaps,
  groupMaps,
  collapsedGroups,
  onToggleGroupCollapse,
}: SpreadsheetHeaderProps) {
  return (
    <div className="sticky top-0 z-20">
      {/* Row 1: Group labels */}
      <div className="flex border-b spreadsheet-header-row1" style={{ overflow: 'hidden' }}>
        <div
          className="border-r flex-shrink-0 sticky left-0 z-30 flex items-center justify-center"
          style={{ width: 60, minWidth: 60, height: 32, backgroundColor: SHEET_COLOR_LIGHT }}
        >
          <SpreadsheetSectionSearch groups={sectionGroups} scrollRef={scrollRef} />
        </div>
        {(() => {
          const items: JSX.Element[] = [];
          let colIdx = 0;
          for (const group of visibleColumnGroups) {
            if (group.key === 'corner') { colIdx += group.colspan; continue; }
            const groupCols = visibleColumns.slice(colIdx, colIdx + group.colspan);
            const totalWidth = groupCols.reduce((sum, c) => sum + parseInt(c.width), 0);
            if (group.key === 'fechahora_collapsed' || groupCols[0]?.key === 'fechahora_collapsed') {
              items.push(
                <div
                  key="r1-fechahora_collapsed"
                  className="border-r text-white cursor-pointer flex items-center justify-center flex-shrink-0"
                  style={{ width: 30, minWidth: 30, height: 32, backgroundColor: SHEET_FECHAHORA_COLOR }}
                  onClick={onFechaHoraExpand}
                  data-testid="toggle-fechahora-expand"
                >
                  <Plus className="w-3 h-3" />
                </div>
              );
            } else if (group.label) {
              const isCollapsed = group.key !== 'fechahora' && groupCols[0]?.type === 'group-collapsed';
              if (isCollapsed) {
                items.push(
                  <div
                    key={`r1-group-${group.key}-collapsed`}
                    className="border-r text-white cursor-pointer flex items-center justify-center flex-shrink-0"
                    style={{ width: 30, minWidth: 30, height: 32, backgroundColor: group.color || '#9ca3af' }}
                    onClick={() => onToggleGroupCollapse?.(group.key)}
                    data-testid={`toggle-group-expand-${group.key}`}
                  >
                    <Plus className="w-3 h-3" />
                  </div>
                );
              } else {
                items.push(
                  <div
                    key={`r1-group-${group.key}`}
                    className="border-r border-white/20 flex items-center justify-center gap-1 h-8 px-2 font-bold text-xs uppercase tracking-wide flex-shrink-0 text-white"
                    style={{ width: totalWidth, minWidth: totalWidth, backgroundColor: group.color || '#9ca3af' }}
                  >
                    <span>{group.label}</span>
                    {group.key === 'fechahora' ? (
                      <button
                        onClick={onFechaHoraCollapse}
                        className="ml-1 hover:opacity-80"
                        data-testid="toggle-fechahora-collapse"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                    ) : onToggleGroupCollapse ? (
                      <button
                        onClick={() => onToggleGroupCollapse(group.key)}
                        className="ml-1 hover:opacity-80"
                        data-testid={`toggle-group-collapse-${group.key}`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                    ) : null}
                  </div>
                );
              }
            } else {
              groupCols.forEach(col => {
                items.push(
                  <div
                    key={`r1-${col.key}`}
                    className="border-r h-8 flex-shrink-0"
                    style={{ width: col.width, minWidth: col.width, backgroundColor: group.color || '#d1d5db' }}
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
      <div className="flex border-b spreadsheet-header-row2" style={{ overflow: 'hidden' }}>
        <div
          className="border-r flex-shrink-0 sticky left-0 z-30 flex items-center justify-center"
          style={{ width: 60, minWidth: 60, height: 32, backgroundColor: SHEET_COLOR_LIGHT }}
        >
          <span className="text-xs font-semibold text-white">ID</span>
        </div>
        {visibleColumns.map(col => {
          if (col.group === 'corner') return null;
          if (col.key === 'fechahora_collapsed') {
            return (
              <div
                key="r2-fechahora_collapsed"
                className="flex-shrink-0 border-r"
                style={{ width: 30, minWidth: 30, height: 32, backgroundColor: SHEET_FECHAHORA_COLOR }}
              />
            );
          }
          if (col.type === 'group-collapsed') {
            const groupDef = groupLookupMap[col.group || ''];
            const bg = groupDef?.color || '#9ca3af';
            return (
              <div
                key={`r2-${col.key}`}
                className="flex-shrink-0 border-r"
                style={{ width: 30, minWidth: 30, height: 32, backgroundColor: bg, opacity: 0.35 }}
              />
            );
          }
          const groupDef = groupLookupMap[col.group || ''];
          const groupColor = groupDef?.color || '';
          const isColored = !!groupColor;
          return (
            <div
              key={`r2-${col.key}`}
              className="border-r border-white/30 px-2 font-medium text-xs tracking-wide flex items-center flex-shrink-0"
              title={col.label}
              style={{
                width: col.width, minWidth: col.width, height: 32,
                backgroundColor: isColored ? groupColor : '#d1d5db',
                color: isColored ? 'white' : '#374151',
              }}
            >
              <span className="truncate min-w-0">{col.label}</span>
            </div>
          );
        })}
      </div>

      {/* Row 3: Filter controls */}
      <div className="flex border-b spreadsheet-header-row3" style={{ overflow: 'hidden' }}>
        <div
          className="border-r flex-shrink-0 sticky left-0 z-30 flex items-center justify-center"
          style={{ width: 60, minWidth: 60, height: 24, backgroundColor: SHEET_COLOR_LIGHT }}
        >
          <ColumnFilter
            columnKey={idFilterKey}
            columnLabel="ID"
            columnType="text"
            uniqueValues={uniqueValuesMap[idFilterKey] || []}
            availableValues={availableValuesMap?.[idFilterKey]}
            sortDirection={sortConfig.key === idFilterKey ? sortConfig.direction : null}
            filterState={filterConfigs[idFilterKey] || { search: "", selectedValues: new Set() }}
            onSort={(dir) => onSort(idFilterKey, dir)}
            onFilter={(state) => onFilter(idFilterKey, state)}
            onClear={() => onClear(idFilterKey)}
            hideLabel
          />
        </div>
        {visibleColumns.map(col => {
          if (col.group === 'corner') return null;
          if (col.key === 'fechahora_collapsed') {
            return (
              <div
                key="r3-fechahora_collapsed"
                className="flex-shrink-0 border-r"
                style={{ width: 30, minWidth: 30, height: 24, backgroundColor: SHEET_FECHAHORA_COLOR }}
              />
            );
          }
          if (col.type === 'group-collapsed') {
            const groupDef = groupLookupMap[col.group || ''];
            const bg = groupDef?.color || '#9ca3af';
            return (
              <div
                key={`r3-${col.key}`}
                className="flex-shrink-0 border-r"
                style={{ width: 30, minWidth: 30, height: 24, backgroundColor: bg, opacity: 0.35 }}
              />
            );
          }
          const groupDef = groupLookupMap[col.group || ''];
          const groupColor = groupDef?.color || '';
          const isColored = !!groupColor;
          return (
            <div
              key={`r3-${col.key}`}
              className="border-r border-white/30 flex items-center flex-shrink-0"
              title={col.label}
              style={{
                width: col.width, minWidth: col.width, height: 24,
                backgroundColor: isColored ? groupColor : '#d1d5db',
                color: isColored ? 'white' : '#374151',
              }}
            >
              {NO_FILTER_TYPES.has(col.type || '') ? (
                <div />
              ) : (
                <ColumnFilter
                  columnKey={col.key}
                  columnLabel={col.label}
                  columnType={getColumnFilterType(col.type)}
                  uniqueValues={uniqueValuesMap[col.key] || []}
                  availableValues={availableValuesMap?.[col.key]}
                  sortDirection={sortConfig.key === col.key ? sortConfig.direction : null}
                  filterState={filterConfigs[col.key] || { search: "", selectedValues: new Set() }}
                  onSort={(dir) => onSort(col.key, dir)}
                  onFilter={(state) => onFilter(col.key, state)}
                  onClear={() => onClear(col.key)}
                  labelMap={labelMaps?.[col.key]}
                  groupMap={groupMaps?.[col.key]}
                  hideLabel
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
