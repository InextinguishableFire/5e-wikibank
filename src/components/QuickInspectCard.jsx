import RichText from './RichText.jsx'

export default function QuickInspectCard({ entry, onBack, onCloseAll }) {
  const { kind, data } = entry

  return (
    <article className="sticky top-6 rounded border-2 border-red-800 bg-white p-6 shadow-md">
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-stone-200 pb-2 text-xs">
        <button
          type="button"
          onClick={onBack}
          className="font-semibold text-red-800 hover:underline"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onCloseAll}
          className="text-stone-500 hover:text-stone-900"
        >
          Close preview ✕
        </button>
      </div>

      <h2 className="text-2xl font-bold text-red-900">{data.name}</h2>

      {kind === 'spell' ? (
        <>
          <p className="mt-0.5 text-sm italic text-stone-600">{data.levelLabel}</p>
          <div className="mt-3 space-y-1 border-y border-stone-200 py-2 text-xs text-stone-700">
            {data.castingTime && (
              <p>
                <strong>Casting Time:</strong> {data.castingTime}
              </p>
            )}
            {data.range && (
              <p>
                <strong>Range:</strong> {data.range}
              </p>
            )}
            {data.components && (
              <p>
                <strong>Components:</strong> {data.components}
              </p>
            )}
            {data.duration && (
              <p>
                <strong>Duration:</strong> {data.duration}
              </p>
            )}
          </div>
        </>
      ) : (
        <p className="mt-1 capitalize text-stone-600">
          {data.type}
          {data.rarity && data.rarity !== 'none' ? `, ${data.rarity}` : ''}
          {data.attunement ? ` (${data.attunement})` : ''}
        </p>
      )}

      <div className="mt-4 space-y-3 text-sm leading-relaxed text-stone-800">
        {(data.description ?? []).map((p, i) => (
          <p key={i}>
            <RichText text={p} />
          </p>
        ))}
      </div>

      <p className="mt-5 text-xs text-stone-500">
        {data.sourceName || data.source}
        {data.page ? `, page ${data.page}` : ''}
      </p>
    </article>
  )
}