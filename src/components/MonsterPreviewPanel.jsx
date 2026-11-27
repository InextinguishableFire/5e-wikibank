import { useEffect, useState } from 'react'
import { useInteraction } from '../context/InteractionContext.jsx'
import RichText from './RichText.jsx'
import QuickInspectCard from './QuickInspectCard.jsx'

function formatMod(score) {
  if (typeof score !== 'number') return '+0'
  const mod = Math.floor((score - 10) / 2)
  return mod >= 0 ? `+${mod}` : `${mod}`
}

function formatCR(cr) {
  if (cr === 0.125) return '1/8'
  if (cr === 0.25) return '1/4'
  if (cr === 0.5) return '1/2'
  return String(cr ?? '0')
}

function AbilityBlockList({ title, entries }) {
  if (!entries || entries.length === 0) return null

  return (
    <div className="mt-4">
      <h3 className="border-b border-red-800 pb-1 text-base font-bold text-red-900">
        {title}
      </h3>
      <div className="mt-2 space-y-2.5 text-sm leading-relaxed text-stone-800">
        {entries.map((entry, idx) => (
          <p key={`${entry.name}-${idx}`}>
            <strong className="font-bold italic text-stone-900">{entry.name}.</strong>{' '}
            <RichText text={entry.desc} />
          </p>
        ))}
      </div>
    </div>
  )
}

export default function MonsterPreviewPanel({
  monster,
  loading,
  encounterCount = 0,
  onAddMonster,
  onRemoveMonster,
}) {
  const { inspectStack, popInspect, clearInspect } = useInteraction()
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    setImgFailed(false)
  }, [monster?.id])

  if (inspectStack.length > 0) {
    return (
      <QuickInspectCard
        entry={inspectStack[inspectStack.length - 1]}
        onBack={popInspect}
        onCloseAll={clearInspect}
      />
    )
  }

  if (!monster) {
    return (
      <div className="rounded border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-500">
        Click a monster on the left to view its stat block and add it to the encounter.
      </div>
    )
  }

  const hasDetails = Boolean(monster.stats)
  const saves = (monster.proficiencies ?? [])
    .filter((p) => p.proficiency?.index?.startsWith('saving-throw-'))
    .map((p) => `${p.proficiency.name.replace('Saving Throw: ', '')} +${p.value}`)

  const skills = (monster.proficiencies ?? [])
    .filter((p) => p.proficiency?.index?.startsWith('skill-'))
    .map((p) => `${p.proficiency.name.replace('Skill: ', '')} +${p.value}`)

  const sensesText = Object.entries(monster.senses ?? {})
    .map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`)
    .join(', ')

  return (
    <article className="rounded border border-stone-300 bg-white p-6 shadow-md">
      {/* Encounter + / - Toolbar above the monster stat block */}
      {onAddMonster && onRemoveMonster && (
        <div className="mb-4 flex items-center justify-between gap-2 border-b border-stone-200 pb-3">
          <span className="text-xs font-medium text-stone-500">
            In encounter:{' '}
            <strong className="font-mono text-sm font-bold text-stone-900">
              {encounterCount}
            </strong>
          </span>

<div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onAddMonster(monster)}
              disabled={!hasDetails}
              title="Add 1 to encounter"
              aria-label="Add monster to encounter"
              className="flex h-8 w-9 cursor-pointer items-center justify-center rounded border border-stone-300 bg-stone-50 text-lg font-bold !text-emerald-500 transition hover:!border-emerald-500 hover:!bg-emerald-950/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              +
            </button>

            <button
              type="button"
              onClick={() => onRemoveMonster(monster.id)}
              disabled={encounterCount === 0}
              title="Remove 1 from encounter"
              aria-label="Remove monster from encounter"
              className="flex h-8 w-9 cursor-pointer items-center justify-center rounded border border-stone-300 bg-stone-50 text-lg font-bold !text-red-500 transition hover:!border-red-500 hover:!bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              −
            </button>
          </div>
        </div>
      )}

      {/* Top-right Monster Artwork */}
      {monster.imageUrl && !imgFailed && (
        <div className="float-right mb-3 ml-4 w-36 overflow-hidden rounded-lg border border-stone-300 bg-stone-50 shadow-sm sm:w-44">
          <img
            src={monster.imageUrl}
            alt={monster.name}
            onError={() => setImgFailed(true)}
            className="h-auto w-full object-contain"
          />
        </div>
      )}

      {/* Header */}
      <h2 className="text-2xl font-bold text-red-900">{monster.name}</h2>
      {hasDetails ? (
        <p className="mt-0.5 text-sm italic capitalize text-stone-600">
          {monster.size} {monster.type}
          {monster.subtype ? ` (${monster.subtype})` : ''}, {monster.alignment}
        </p>
      ) : (
        <p className="mt-2 text-sm text-stone-500">
          {loading ? 'Loading monster stat block…' : 'Select to load details.'}
        </p>
      )}

      {hasDetails && (
        <>
          <div className="mt-3 space-y-1 border-y border-red-800 py-2.5 text-sm text-stone-800">
            <p>
              <strong className="font-semibold text-red-900">Armor Class:</strong> {monster.ac}
            </p>
            <p>
              <strong className="font-semibold text-red-900">Hit Points:</strong> {monster.hp}{' '}
              <span className="text-stone-500">
                (<RichText text={monster.hitDice} />)
              </span>
            </p>
            <p>
              <strong className="font-semibold text-red-900">Speed:</strong> {monster.speed}
            </p>
          </div>

          <div className="clear-both mt-3 grid grid-cols-6 gap-1 rounded border border-stone-200 bg-stone-50 py-2 text-center text-xs">
            {[
              ['STR', monster.stats.str],
              ['DEX', monster.stats.dex],
              ['CON', monster.stats.con],
              ['INT', monster.stats.int],
              ['WIS', monster.stats.wis],
              ['CHA', monster.stats.cha],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="font-bold text-red-900">{label}</p>
                <p className="mt-0.5 font-mono text-stone-800">
                  {val} ({formatMod(val)})
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-1 border-b border-red-800 pb-3 text-xs leading-relaxed text-stone-800">
            {saves.length > 0 && (
              <p>
                <strong className="font-semibold text-red-900">Saving Throws:</strong>{' '}
                {saves.join(', ')}
              </p>
            )}
            {skills.length > 0 && (
              <p>
                <strong className="font-semibold text-red-900">Skills:</strong> {skills.join(', ')}
              </p>
            )}
            {monster.vulnerabilities.length > 0 && (
              <p>
                <strong className="font-semibold text-red-900">Damage Vulnerabilities:</strong>{' '}
                {monster.vulnerabilities.join(', ')}
              </p>
            )}
            {monster.resistances.length > 0 && (
              <p>
                <strong className="font-semibold text-red-900">Damage Resistances:</strong>{' '}
                {monster.resistances.join(', ')}
              </p>
            )}
            {monster.immunities.length > 0 && (
              <p>
                <strong className="font-semibold text-red-900">Damage Immunities:</strong>{' '}
                {monster.immunities.join(', ')}
              </p>
            )}
            {monster.conditionImmunities.length > 0 && (
              <p>
                <strong className="font-semibold text-red-900">Condition Immunities:</strong>{' '}
                {monster.conditionImmunities.join(', ')}
              </p>
            )}
            {sensesText && (
              <p>
                <strong className="font-semibold text-red-900">Senses:</strong> {sensesText}
              </p>
            )}
            <p>
              <strong className="font-semibold text-red-900">Languages:</strong>{' '}
              {monster.languages || '—'}
            </p>
            <p>
              <strong className="font-semibold text-red-900">Challenge:</strong>{' '}
              {formatCR(monster.cr)} ({monster.xp?.toLocaleString()} XP)
            </p>
          </div>

          <AbilityBlockList title="Traits" entries={monster.traits} />
          <AbilityBlockList title="Actions" entries={monster.actions} />
          <AbilityBlockList title="Bonus Actions" entries={monster.bonusActions} />
          <AbilityBlockList title="Reactions" entries={monster.reactions} />
          <AbilityBlockList title="Legendary Actions" entries={monster.legendaryActions} />
        </>
      )}

      <p className="mt-5 text-xs text-stone-500">
        <span className="font-semibold">Source:</span> {monster.sourceName}
      </p>
    </article>
  )
}