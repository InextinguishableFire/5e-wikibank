export default function RosterToolbar({
  label = 'In list',
  count = 0,
  canAdd = true,
  onAdd,
  onRemove,
}) {
  if (!onAdd || !onRemove) return null

  return (
    <div className="mb-4 flex items-center justify-between gap-2 border-b border-stone-200 pb-3">
      <span className="text-xs font-medium text-stone-500">
        {label}:{' '}
        <strong className="font-mono text-sm font-bold text-stone-900">{count}</strong>
      </span>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onAdd}
          disabled={!canAdd}
          title="Add to list"
          aria-label="Add to list"
          className="flex h-8 w-9 cursor-pointer items-center justify-center rounded border border-stone-300 bg-stone-50 text-lg font-bold !text-emerald-500 transition hover:!border-emerald-500 hover:!bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          +
        </button>

        <button
          type="button"
          onClick={onRemove}
          disabled={count === 0}
          title="Remove from list"
          aria-label="Remove from list"
          className="flex h-8 w-9 cursor-pointer items-center justify-center rounded border border-stone-300 bg-stone-50 text-lg font-bold !text-red-500 transition hover:!border-red-500 hover:!bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>
      </div>
    </div>
  )
}