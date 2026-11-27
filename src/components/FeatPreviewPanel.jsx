import { useInteraction } from '../context/InteractionContext.jsx'
import RichText from './RichText.jsx'
import QuickInspectCard from './QuickInspectCard.jsx'
import RosterToolbar from './RosterToolbar.jsx'

const ABILITY_NAMES = [
  'Strength',
  'Dexterity',
  'Constitution',
  'Intelligence',
  'Wisdom',
  'Charisma',
]

const ABILITY_CODE_MAP = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
}

const ABILITY_SHORT_MAP = {
  Strength: 'Str',
  Dexterity: 'Dex',
  Constitution: 'Con',
  Intelligence: 'Int',
  Wisdom: 'Wis',
  Charisma: 'Cha',
}

export function getFeatAbilityList(feat) {
  if (!feat) return []

  // 1. Structured 5etools `ability` array
  if (Array.isArray(feat.ability) && feat.ability.length > 0) {
    const found = []
    for (const entry of feat.ability) {
      if (!entry || typeof entry !== 'object') continue

      if (entry.choose && Array.isArray(entry.choose.from)) {
        const mapped = entry.choose.from.map(
          (code) => ABILITY_CODE_MAP[String(code).toLowerCase()] || String(code),
        )
        if (mapped.length === 6) return ['Any']
        for (const m of mapped) {
          if (!found.includes(m)) found.push(m)
        }
      } else {
        for (const [key, val] of Object.entries(entry)) {
          const full = ABILITY_CODE_MAP[key.toLowerCase()]
          if (full && typeof val === 'number' && !found.includes(full)) {
            found.push(full)
          }
        }
      }
    }
    if (found.length > 0) return found
  }

  // 2. Pre-formatted array or string fields if present
  if (Array.isArray(feat.abilityIncreases) && feat.abilityIncreases.length > 0) {
    return feat.abilityIncreases
  }
  if (typeof feat.ability === 'string' && feat.ability.trim() && feat.ability !== 'None') {
    return [feat.ability.trim()]
  }

  // 3. Description text fallback
  const text = (feat.description ?? []).join(' ')
  if (!text) return []

  if (/increase one ability(?: score)? of your choice/i.test(text)) {
    return ['Any']
  }

  const found = []
  const sentenceMatch = text.match(/increase your ([^.]+?)(?: score)? by \d+/i)
  if (sentenceMatch) {
    for (const ability of ABILITY_NAMES) {
      if (new RegExp(`\\b${ability}\\b`, 'i').test(sentenceMatch[1])) {
        found.push(ability)
      }
    }
  } else {
    for (const ability of ABILITY_NAMES) {
      if (new RegExp(`increase your ${ability}`, 'i').test(text)) {
        found.push(ability)
      }
    }
  }

  return found
}

export function getFeatAbilitySummary(feat) {
  const list = getFeatAbilityList(feat)
  if (list.length === 0) return 'None'
  if (list.includes('Any')) return 'Any (+1)'
  return list.join(' / ')
}

export function getFeatAbilityShort(feat) {
  const list = getFeatAbilityList(feat)
  if (list.length === 0) return 'None'
  if (list.includes('Any')) return 'Any (+1)'
  return list.map((name) => ABILITY_SHORT_MAP[name] || name).join('/')
}

function FormattedFeatParagraph({ text }) {
  // Bold leading title like "Ability Score Increase." or "Mimicry." at the start of a paragraph
  const match = String(text).match(/^([A-Z][A-Za-z0-9\s'’()-]{1,45}\.)(\s+[\s\S]*)$/)
  if (match) {
    return (
      <p>
        <strong className="font-bold text-stone-900">{match[1]}</strong>
        <RichText text={match[2]} />
      </p>
    )
  }

  return (
    <p>
      <RichText text={text} />
    </p>
  )
}

export default function FeatPreviewPanel({
  feat,
  rosterCount = 0,
  onAddFeat,
  onRemoveFeat,
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

  if (!feat) {
    return (
      <div className="rounded border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-500">
        Click a feat on the left to view its details and add it to your loadout.
      </div>
    )
  }

  const abilitySummary = getFeatAbilitySummary(feat)

  return (
    <article className="rounded border border-stone-300 bg-white p-6 shadow-md">
      <RosterToolbar
        label="In loadout"
        count={rosterCount}
        canAdd={rosterCount === 0}
        onAdd={onAddFeat ? () => onAddFeat(feat) : undefined}
        onRemove={onRemoveFeat ? () => onRemoveFeat(feat.id) : undefined}
      />

      <h2 className="text-2xl font-bold text-red-900">{feat.name}</h2>

      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
        <span>
          <strong className="font-semibold text-stone-800">Prerequisite:</strong>{' '}
          {feat.prerequisite || 'None'}
        </span>
        <span>
          <strong className="font-semibold text-stone-800">Ability Increase:</strong>{' '}
          {abilitySummary}
        </span>
      </div>

      <div className="mt-4 space-y-2.5 border-t border-red-800 pt-3 text-sm leading-relaxed text-stone-800">
        {(feat.description ?? []).map((paragraph, idx) => (
          <FormattedFeatParagraph key={idx} text={paragraph} />
        ))}
      </div>

      <p className="mt-5 text-xs text-stone-500">
        <span className="font-semibold">Source:</span> {feat.sourceName || feat.source}
      </p>
    </article>
  )
}