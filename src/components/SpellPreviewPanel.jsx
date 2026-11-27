import { useInteraction } from '../context/InteractionContext.jsx'
import RichText from './RichText.jsx'
import QuickInspectCard from './QuickInspectCard.jsx'
import RosterToolbar from './RosterToolbar.jsx'

export default function SpellPreviewPanel({
  spell,
  rosterCount = 0,
  onAddSpell,
  onRemoveSpell,
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

  if (!spell) {
    return (
      <div className="rounded border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-500">
        Click a spell on the left to view its details and add it to your spellbook.
      </div>
    )
  }

  const levelSubtitle =
    spell.level === 0
      ? `${spell.school} cantrip`
      : `Level ${spell.level} ${spell.school}${spell.ritual ? ' (ritual)' : ''}`

  return (
    <article className="rounded border border-stone-300 bg-white p-6 shadow-md">
      <RosterToolbar
        label="In spellbook"
        count={rosterCount}
        canAdd={rosterCount === 0}
        onAdd={onAddSpell ? () => onAddSpell(spell) : undefined}
        onRemove={onRemoveSpell ? () => onRemoveSpell(spell.id) : undefined}
      />

      <h2 className="text-2xl font-bold text-red-900">{spell.name}</h2>
      <p className="mt-0.5 text-sm italic capitalize text-stone-600">
        {spell.levelLabel || levelSubtitle}
      </p>

      <div className="mt-3 space-y-1 border-y border-red-800 py-2.5 text-sm text-stone-800">
        <p>
          <strong className="font-semibold text-red-900">Casting Time:</strong>{' '}
          {spell.castingTime || '—'}
        </p>
        <p>
          <strong className="font-semibold text-red-900">Range:</strong> {spell.range || '—'}
        </p>
        <p>
          <strong className="font-semibold text-red-900">Components:</strong>{' '}
          {spell.components || '—'}
        </p>
        <p>
          <strong className="font-semibold text-red-900">Duration:</strong>{' '}
          {spell.duration || '—'}
        </p>
      </div>

      <div className="mt-4 space-y-2.5 text-sm leading-relaxed text-stone-800">
        {(spell.description ?? []).map((paragraph, idx) => (
          <p key={idx}>
            <RichText text={paragraph} />
          </p>
        ))}

        {spell.higherLevels && (
          <p>
            <strong className="font-bold italic text-stone-900">At Higher Levels.</strong>{' '}
            <RichText text={spell.higherLevels} />
          </p>
        )}
      </div>

      {spell.classes?.length > 0 && (
        <p className="mt-4 text-xs text-stone-600">
          <strong className="font-semibold text-stone-800">Classes:</strong>{' '}
          {spell.classes.join(', ')}
        </p>
      )}

      <p className="mt-3 text-xs text-stone-500">
        <span className="font-semibold">Source:</span> {spell.sourceName || spell.source}
      </p>
    </article>
  )
}