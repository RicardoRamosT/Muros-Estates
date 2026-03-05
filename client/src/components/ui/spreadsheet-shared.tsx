import { useState } from "react";
import { Plus, Minus, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ColumnFilter } from "@/components/ui/column-filter";
import type { FilterState, SortDirection } from "@/components/ui/column-filter";
import {
  SHEET_COLOR_LIGHT,
  type SpreadsheetColumnDef,
  type SpreadsheetColumnGroup,
  type SpreadsheetColumnGroupRun,
} from "@/lib/spreadsheet-utils";

const NO_FILTER_TYPES = new Set([
  'actions', 'folder-link', 'group-collapsed', 'calculated-percent',
  'date-display', 'time-display', 'typology-type',
]);

const COLLAPSED_COL_WIDTH = 20;

function getColumnFilterType(type?: string): 'boolean' | 'number' | 'select' | 'text' {
  if (!type) return 'text';
  if (type === 'boolean' || type === 'toggle') return 'boolean';
  if (type === 'number' || type === 'currency' || type === 'index') return 'number';
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
    setOpen(false);
    setQuery("");
    requestAnimationFrame(() => {
      const container = scrollRef.current;
      if (!container) return;
      const stickyEl = container.querySelector<HTMLElement>('[data-sticky-corner]');
      const stickyWidth = stickyEl ? stickyEl.clientWidth : 60;
      const visibleWidth = container.clientWidth - stickyWidth;
      const el = container.querySelector<HTMLElement>(`[data-section-group="${group.label}"]`);
      if (el) {
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const elLeft = elRect.left - containerRect.left + container.scrollLeft;
        const centeredLeft = Math.max(0, elLeft + elRect.width / 2 - stickyWidth - visibleWidth / 2);
        container.scrollTo({ left: centeredLeft, behavior: 'smooth' });
      } else {
        const centeredLeft = Math.max(0, group.offset - stickyWidth - (visibleWidth - group.width) / 2);
        container.scrollTo({ left: centeredLeft, behavior: 'smooth' });
      }
    });
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="p-1 rounded hover:bg-white/20 text-white" data-testid="button-section-search">
          <Search className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
        <input
          className="w-full text-xs border rounded px-2 py-1 mb-2 outline-none focus:ring-1"
          placeholder="Buscar sección..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        <div className="max-h-48 overflow-y-auto space-y-0.5">
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
  collapsedColumns?: Set<string>;
  onToggleColumnCollapse?: (key: string) => void;
}

export function SpreadsheetHeader({
  visibleColumns,
  visibleColumnGroups,
  groupLookupMap,
  filterConfigs,
  sortConfig,
  uniqueValuesMap,
  availableValuesMap,
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
  collapsedColumns,
  onToggleColumnCollapse,
}: SpreadsheetHeaderProps) {
  const cornerCols = visibleColumns.filter(c => c.group === 'corner');
  const cornerWidth = cornerCols.reduce((sum, c) => sum + parseInt(c.width || '60'), 0) || 60;

  const getColW = (col: SpreadsheetColumnDef) =>
    collapsedColumns?.has(col.key) ? COLLAPSED_COL_WIDTH : parseInt(col.width);

  return (
    <div className="sticky top-0 z-20">
      {/* Row 1: Group labels */}
      <div className="flex spreadsheet-header-row1">
        <div
          data-sticky-corner
          className="flex-shrink-0 sticky left-0 z-30 flex items-center justify-center"
          style={{ width: cornerWidth, minWidth: cornerWidth, height: 32, backgroundColor: SHEET_COLOR_LIGHT, borderRight: '1px solid rgba(255,255,255,0.15)', borderBottom: '1px solid rgba(255,255,255,0.15)' }}
        >
          <SpreadsheetSectionSearch groups={sectionGroups} scrollRef={scrollRef} />
        </div>
        {(() => {
          const items: JSX.Element[] = [];
          let colIdx = 0;
          for (const group of visibleColumnGroups) {
            if (group.key === 'corner') { colIdx += group.colspan; continue; }
            const groupCols = visibleColumns.slice(colIdx, colIdx + group.colspan);
            const totalWidth = groupCols.reduce((sum, c) => sum + getColW(c), 0);
            if (group.label) {
              const isCollapsed = groupCols[0]?.type === 'group-collapsed';
              if (isCollapsed) {
                items.push(
                  <Tooltip key={`r1-group-${group.key}-collapsed`}>
                    <TooltipTrigger asChild>
                      <div
                        data-section-group={group.label}
                        className="text-white cursor-pointer flex items-center justify-center flex-shrink-0"
                        style={{ width: 30, minWidth: 30, height: 32, backgroundColor: group.color || '#9ca3af', borderRight: '1px solid rgba(255,255,255,0.15)', borderBottom: '1px solid rgba(255,255,255,0.15)' }}
                        onClick={() => onToggleGroupCollapse?.(group.key)}
                        data-testid={`toggle-group-expand-${group.key}`}
                      >
                        <Plus className="w-3 h-3" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {group.label}
                    </TooltipContent>
                  </Tooltip>
                );
              } else {
                const isSingleCol = group.colspan === 1;
                items.push(
                  <div
                    key={`r1-group-${group.key}`}
                    data-section-group={group.label}
                    className="flex items-center justify-between h-8 font-medium text-xs flex-shrink-0 text-white overflow-hidden"
                    style={{ width: totalWidth, minWidth: totalWidth, backgroundColor: group.color || '#9ca3af', borderRight: '1px solid rgba(255,255,255,0.15)', borderBottom: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    {!isSingleCol && <div style={{ width: 20, flexShrink: 0 }} />}
                    <span className="truncate min-w-0 flex-1 text-center">{group.label}</span>
                    {!isSingleCol && onToggleGroupCollapse ? (
                      <button
                        onClick={() => onToggleGroupCollapse(group.key)}
                        className="flex-shrink-0 flex items-center justify-center hover:bg-white/10 h-full cursor-pointer"
                        style={{ width: 20 }}
                        data-testid={`toggle-group-collapse-${group.key}`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                    ) : !isSingleCol ? (
                      <div style={{ width: 20, flexShrink: 0 }} />
                    ) : null}
                  </div>
                );
              }
            } else {
              groupCols.forEach(col => {
                const w = getColW(col);
                items.push(
                  <div
                    key={`r1-${col.key}`}
                    className="h-8 flex-shrink-0"
                    style={{ width: w, minWidth: w, backgroundColor: group.color || '#d1d5db', borderRight: '1px solid rgba(255,255,255,0.15)', borderBottom: '1px solid rgba(255,255,255,0.15)' }}
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
      <div className="flex spreadsheet-header-row2">
        <div
          className="flex-shrink-0 sticky left-0 z-30 flex"
          style={{ width: cornerWidth, minWidth: cornerWidth, height: 32, backgroundColor: SHEET_COLOR_LIGHT, borderBottom: '1px solid rgba(255,255,255,0.15)' }}
        >
          {cornerCols.map((col) => (
            <div
              key={col.key}
              className="flex items-center justify-center font-semibold text-xs text-white"
              style={{
                width: col.width, minWidth: col.width, height: 32,
                borderRight: '1px solid rgba(255,255,255,0.15)',
                borderBottom: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              {col.label || 'ID'}
            </div>
          ))}
        </div>
        {(() => {
          const items: JSX.Element[] = [];
          for (const col of visibleColumns) {
            if (col.group === 'corner') continue;
            if (col.type === 'group-collapsed') {
              const groupDef = groupLookupMap[col.group || ''];
              const bg = groupDef?.color || '#9ca3af';
              const groupLabel = groupDef?.label || col.group || '';
              items.push(
                <Tooltip key={`r2-${col.key}`}>
                  <TooltipTrigger asChild>
                    <div
                      className="flex-shrink-0 flex items-center justify-center cursor-pointer text-white hover:brightness-110"
                      style={{ width: 30, minWidth: 30, height: 32, backgroundColor: bg, borderRight: '1px solid rgba(255,255,255,0.15)', borderBottom: '1px solid rgba(255,255,255,0.15)' }}
                      onClick={() => onToggleGroupCollapse?.(col.group!)}
                      data-testid={`toggle-group-expand-r2-${col.group}`}
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {groupLabel}
                  </TooltipContent>
                </Tooltip>
              );
              continue;
            }
            const groupDef = groupLookupMap[col.group || ''];
            const groupColor = groupDef?.color || '';
            const isColored = !!groupColor;
            const isColCollapsed = collapsedColumns?.has(col.key) ?? false;

            if (isColored && isColCollapsed) {
              items.push(
                <Tooltip key={`r2-${col.key}`}>
                  <TooltipTrigger asChild>
                    <div
                      className="flex-shrink-0 flex items-center justify-center cursor-pointer text-white hover:brightness-110"
                      style={{ width: COLLAPSED_COL_WIDTH, minWidth: COLLAPSED_COL_WIDTH, height: 32, backgroundColor: groupColor, borderRight: '1px solid rgba(255,255,255,0.15)', borderBottom: '1px solid rgba(255,255,255,0.15)' }}
                      onClick={() => onToggleColumnCollapse?.(col.key)}
                      data-testid={`toggle-col-expand-${col.key}`}
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {col.label}
                  </TooltipContent>
                </Tooltip>
              );
              continue;
            }

            items.push(
              <div
                key={`r2-${col.key}`}
                className="font-medium text-xs flex items-center justify-between flex-shrink-0 overflow-hidden"
                title={col.label}
                style={{
                  width: col.width, minWidth: col.width, height: 32,
                  backgroundColor: isColored ? groupColor : '#d1d5db',
                  color: isColored ? 'white' : '#374151',
                  borderRight: '1px solid rgba(255,255,255,0.15)',
                  borderBottom: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                <div style={{ width: isColored ? 20 : 8, flexShrink: 0 }} />
                <span className="truncate min-w-0 flex-1 text-center">{col.label}</span>
                {isColored && onToggleColumnCollapse ? (
                  <button
                    onClick={() => onToggleColumnCollapse(col.key)}
                    className="flex-shrink-0 flex items-center justify-center hover:bg-white/20 cursor-pointer h-full"
                    style={{ width: 16 }}
                    data-testid={`toggle-col-collapse-${col.key}`}
                  >
                    <Minus className="w-2.5 h-2.5 text-white/80" />
                  </button>
                ) : (
                  <div style={{ width: 8, flexShrink: 0 }} />
                )}
              </div>
            );
          }
          return items;
        })()}
      </div>

      {/* Row 3: Filter controls */}
      <div className="flex border-b spreadsheet-header-row3">
        <div
          className="flex-shrink-0 sticky left-0 z-30 flex"
          style={{ width: cornerWidth, minWidth: cornerWidth, height: 24, backgroundColor: SHEET_COLOR_LIGHT }}
        >
          {cornerCols.map((col) => (
            <div
              key={col.key}
              className="flex items-center"
              style={{ width: col.width, minWidth: col.width, height: 24, borderRight: '1px solid rgba(255,255,255,0.15)' }}
            >
              {NO_FILTER_TYPES.has(col.type || '') || (col as any).noFilter ? (
                <div />
              ) : (
                <ColumnFilter
                  columnKey={col.key}
                  columnLabel={col.label || 'ID'}
                  columnType={getColumnFilterType(col.type)}
                  uniqueValues={uniqueValuesMap[col.key] || []}
                  availableValues={availableValuesMap?.[col.key]}
                  sortDirection={sortConfig.key === col.key ? sortConfig.direction : null}
                  filterState={filterConfigs[col.key] || { selectedValues: new Set() }}
                  onSort={(dir) => onSort(col.key, dir)}
                  onFilter={(state) => onFilter(col.key, state)}
                  onClear={() => onClear(col.key)}
                  labelMap={labelMaps?.[col.key]}
                  groupMap={groupMaps?.[col.key]}
                  hideLabel
                />
              )}
            </div>
          ))}
        </div>
        {visibleColumns.map(col => {
          if (col.group === 'corner') return null;
          if (col.type === 'group-collapsed') {
            const groupDef = groupLookupMap[col.group || ''];
            const bg = groupDef?.color || '#9ca3af';
            return (
              <div
                key={`r3-${col.key}`}
                className="flex-shrink-0"
                style={{ width: 30, minWidth: 30, height: 24, backgroundColor: bg, opacity: 0.35, borderRight: '1px solid rgba(255,255,255,0.15)' }}
              />
            );
          }
          const groupDef = groupLookupMap[col.group || ''];
          const groupColor = groupDef?.color || '';
          const isColored = !!groupColor;
          const isColCollapsed = collapsedColumns?.has(col.key) ?? false;

          if (isColored && isColCollapsed) {
            return (
              <div
                key={`r3-${col.key}`}
                className="flex-shrink-0"
                style={{ width: COLLAPSED_COL_WIDTH, minWidth: COLLAPSED_COL_WIDTH, height: 24, backgroundColor: groupColor, opacity: 0.35, borderRight: '1px solid rgba(255,255,255,0.15)' }}
              />
            );
          }

          return (
            <div
              key={`r3-${col.key}`}
              className="flex items-center flex-shrink-0"
              title={col.label}
              style={{
                width: col.width, minWidth: col.width, height: 24,
                backgroundColor: isColored ? groupColor : '#d1d5db',
                color: isColored ? 'white' : '#374151',
                borderRight: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              {NO_FILTER_TYPES.has(col.type || '') || (col as any).noFilter ? (
                <div />
              ) : (
                <ColumnFilter
                  columnKey={col.key}
                  columnLabel={col.label}
                  columnType={getColumnFilterType(col.type)}
                  uniqueValues={uniqueValuesMap[col.key] || []}
                  availableValues={availableValuesMap?.[col.key]}
                  sortDirection={sortConfig.key === col.key ? sortConfig.direction : null}
                  filterState={filterConfigs[col.key] || { selectedValues: new Set() }}
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
