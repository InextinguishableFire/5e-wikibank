import { useRef } from 'react'

/**
 * Generic Roster Table for Bestiary, Feats, Spells, and Items.
 *
 * @param {Object} props
 * @param {Array<{ key: string, label: string, width?: string, align?: 'left'|'center'|'right', render: (item: Object, count: number) => React.ReactNode }>} props.columns
 * @param {Array<{ item: Object, count: number }>} props.entries
 * @param {string|null} props.selectedId
 * @param {(item: Object) => void} props.onSelect
 * @param {React.ReactNode} props.summary - Left-side footer summary (e.g. "Total: 3 creatures; 2,200 XP")
 * @param {string} props.emptyMessage
 * @param {string|null} props.importError
 * @param {boolean} props.isImporting
 * @param {(file: File) => void} props.onImportFile
 * @param {() => void} props.onExport
 * @param {() => void} props.onClear
 * @param {string} props.actionLabel - e.g. "Send to Initiative →" or "Send to Card Maker →"
 * @param {() => void} props.onAction
 */
export default function RosterTable({
  columns,
  entries,
  selectedId,
  onSelect,
  summary,
  emptyMessage = 'No entries added yet. Select an entry below and click + to add it.',
  importError,
  isImporting,
  onImportFile,
  onExport,
  onClear,
  actionLabel,
  onAction,
}) {
  const fileInputRef = useRef(null)

  const gridTemplateColumns = columns.map((col) => col.width || '1fr').join(' ')

  function alignClass(align) {
    if (align === 'center') return 'text-center'
    if (align === 'right') return 'text-right'
    return 'text-left'
  }

  return (
    <div className="overflow-hidden rounded border border-stone-300 bg-white shadow-sm">
      {/* Dynamic Column Headers */}
      <div
        style={{ gridTemplateColumns }}
        className="grid items-center gap-2 border-b border-stone-300 bg-stone-50 px-3 py-2 text-xs font-bold tracking-wide text-stone-700 uppercase"
      >
        {columns.map((col) => (
          <div key={col.key} className={`truncate ${alignClass(col.align)}`}>
            {col.label}
          </div>
        ))}
      </div>

      {/* Roster Rows */}
      {entries.length === 0 ? (
        <p className="px-3 py-4 text-center text-xs text-stone-500">{emptyMessage}</p>
      ) : (
        <ul className="max-h-44 divide-y divide-stone-200 overflow-y-auto">
          {entries.map(({ item, count }) => {
            const isSelected = selectedId === item.id

            return (
              <li
                key={item.id}
                onClick={() => onSelect(item)}
                style={{ gridTemplateColumns }}
                className={`grid cursor-pointer items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                  isSelected ? 'bg-red-50' : 'hover:bg-stone-50'
                }`}
              >
                {columns.map((col, colIdx) => (
                  <div
                    key={col.key}
                    className={`truncate ${alignClass(col.align)} ${
                      colIdx === 0
                        ? isSelected
                          ? 'font-semibold text-red-900'
                          : 'font-medium text-stone-900'
                        : 'text-stone-700'
                    }`}
                  >
                    {col.render(item, count)}
                  </div>
                ))}
              </li>
            )
          })}
        </ul>
      )}

      {/* Import Validation Error */}
      {importError && (
        <div className="border-t border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800">
          {importError}
        </div>
      )}

      {/* Footer Summary & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700">
        <div>{summary}</div>

        <div className="flex flex-wrap items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) onImportFile(file)
            }}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:border-red-700 disabled:opacity-50"
          >
            {isImporting ? 'Importing…' : 'Import JSON'}
          </button>

          <button
            type="button"
            onClick={onExport}
            disabled={entries.length === 0}
            className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:border-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Export JSON
          </button>

          <button
            type="button"
            onClick={onClear}
            disabled={entries.length === 0}
            className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-600 hover:border-red-700 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear
          </button>

          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              disabled={entries.length === 0}
              className="rounded bg-red-800 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}