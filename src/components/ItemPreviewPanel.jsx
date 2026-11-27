import { useInteraction } from '../context/InteractionContext.jsx'
import RichText from './RichText.jsx'
import QuickInspectCard from './QuickInspectCard.jsx'
import RosterToolbar from './RosterToolbar.jsx'

export default function ItemPreviewPanel({
  item,
  rosterCount = 0,
  onAddItem,
  onRemoveItem,
}) {
  const { inspectStack, popInspect, clearInspect } = useInteraction()

  if (inspectStack.length > 0) {
    return (
      <QuickInspectCard
        entry={inspectStack[inspectStack.length - 1]}
        onBack={popInspect}
        onCloseAll={clearInspect}
      />
    )
  }

  if (!item) {
    return (
      <div className="rounded border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-500">
        Click an item on the left to view its details and add it to your inventory.
      </div>
    )
  }

  const subtitle = [
    item.type,
    item.rarity && item.rarity !== 'none' ? item.rarity : null,
    item.attunement ? 'requires attunement' : null,
  ]
    .filter(Boolean)
    .join(', ')

  const costText = item.value || item.cost || null
  const weightText =
    item.weight !== undefined && item.weight !== null && item.weight !== ''
      ? `${item.weight} lb.`
      : null

  return (
    <article className="rounded border border-stone-300 bg-white p-6 shadow-md">
      <RosterToolbar
        label="In inventory"
        count={rosterCount}
        canAdd={true}
        onAdd={onAddItem ? () => onAddItem(item) : undefined}
        onRemove={onRemoveItem ? () => onRemoveItem(item.id) : undefined}
      />

      <h2 className="text-2xl font-bold text-red-900">{item.name}</h2>
      {subtitle && <p className="mt-0.5 text-sm italic capitalize text-stone-600">{subtitle}</p>}

      {(costText || weightText || item.ac || item.damage) && (
        <div className="mt-3 space-y-1 border-y border-red-800 py-2.5 text-sm text-stone-800">
          {costText && (
            <p>
              <strong className="font-semibold text-red-900">Cost:</strong> {costText}
            </p>
          )}
          {weightText && (
            <p>
              <strong className="font-semibold text-red-900">Weight:</strong> {weightText}
            </p>
          )}
          {item.ac && (
            <p>
              <strong className="font-semibold text-red-900">Armor Class:</strong> {item.ac}
            </p>
          )}
          {item.damage && (
            <p>
              <strong className="font-semibold text-red-900">Damage:</strong> {item.damage}
            </p>
          )}
        </div>
      )}

      <div className="mt-4 space-y-2.5 text-sm leading-relaxed text-stone-800">
        {(item.description ?? []).map((paragraph, idx) => (
          <p key={idx}>
            <RichText text={paragraph} />
          </p>
        ))}
      </div>

      <p className="mt-5 text-xs text-stone-500">
        <span className="font-semibold">Source:</span> {item.sourceName || item.source}
      </p>
    </article>
  )
}