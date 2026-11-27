import FilterSection from './FilterSection.jsx'

export default function CatalogFilterPanel({
  sections,
  activeFilterCount,
  onToggle,
  onSelectAll,
  onClear,
  onClearAll,
}) {
  const visibleSections = sections.filter((s) => s.options.length > 0)
  if (visibleSections.length === 0) return null

  return (
    <details className="mt-3 rounded border border-stone-300 bg-white">
      <summary className="flex cursor-pointer items-center justify-between px-4 py-2 text-sm font-medium">
        <span>
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 text-xs text-red-800">({activeFilterCount} active)</span>
          )}
        </span>

        {activeFilterCount > 0 && onClearAll && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              onClearAll()
            }}
            className="text-xs font-medium text-stone-500 underline hover:text-red-800"
          >
            Reset all
          </button>
        )}
      </summary>

      <div className="space-y-4 border-t border-stone-200 p-4">
        {visibleSections.map((section) => (
          <FilterSection
            key={section.key}
            title={section.title}
            options={section.options}
            selected={section.selected}
            onToggle={(val) => onToggle(section.key, val)}
            onSelectAll={
              section.selectAll ? () => onSelectAll(section.key, section.options) : undefined
            }
            onClear={() => onClear(section.key)}
          />
        ))}
      </div>
    </details>
  )
}