export default function FilterSection({
  title,
  options, // [{ value, label, count? }]
  selected, // array of selected values
  onToggle,
  onSelectAll,
  onClear,
}) {
  return (
    <div className="border-t border-stone-200 pt-3 first:border-t-0 first:pt-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wide text-stone-600 uppercase">
          {title}
          {selected.length > 0 && (
            <span className="ml-1.5 font-normal text-red-800">({selected.length} active)</span>
          )}
        </span>

        <div className="flex gap-1.5">
          {onSelectAll && (
            <button
              type="button"
              onClick={onSelectAll}
              className="rounded border border-stone-300 bg-stone-50 px-2 py-0.5 text-xs text-stone-700 hover:border-red-700 hover:text-red-800"
            >
              All
            </button>
          )}
          <button
            type="button"
            onClick={onClear}
            disabled={selected.length === 0}
            className="rounded border border-stone-300 bg-stone-50 px-2 py-0.5 text-xs text-stone-700 hover:border-red-700 hover:text-red-800 disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isActive = selected.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onToggle(opt.value)}
              className={`rounded border px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                isActive
                  ? 'border-red-900 bg-red-800 text-white'
                  : 'border-stone-300 bg-stone-50 text-stone-700 hover:border-red-700 hover:bg-red-50'
              }`}
            >
              {opt.label}
              {opt.count !== undefined && (
                <span className={`ml-1 ${isActive ? 'text-red-200' : 'text-stone-400'}`}>
                  ({opt.count})
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}