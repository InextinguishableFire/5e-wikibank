// Turns one messy "raw" feat from the JSON file into a simple object
// that is easy for the React app to display.
import { getSourceName, flatten, slugify, titleCase } from './shared.js'

const ABILITY_NAMES = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
}

const FEAT_CATEGORIES = {
  G: 'General Feat',
  O: 'Origin Feat',
  FS: 'Fighting Style Feat',
  'FS:P': 'Fighting Style Replacement (Paladin)',
  'FS:R': 'Fighting Style Replacement (Ranger)',
  EB: 'Epic Boon Feat',
}

function joinWithOr(list) {
  if (list.length <= 1) return list[0] ?? ''
  if (list.length === 2) return `${list[0]} or ${list[1]}`
  return `${list.slice(0, -1).join(', ')}, or ${list[list.length - 1]}`
}

function describePrerequisite(p) {
  const parts = []
  if (p.level) parts.push(`Level ${typeof p.level === 'object' ? p.level.level : p.level}+`)
  if (p.race) {
    parts.push(
      p.race.map((r) => titleCase([r.subrace, r.name].filter(Boolean).join(' '))).join(' or '),
    )
  }
  if (p.ability) {
    parts.push(
      p.ability
        .flatMap((a) => Object.entries(a).map(([k, v]) => `${ABILITY_NAMES[k] ?? k} ${v}+`))
        .join(' or '),
    )
  }
  if (p.campaign) parts.push(`${p.campaign.join(', ')} campaign`)
  if (p.feat) parts.push(p.feat.map((f) => titleCase(f.split('|')[0])).join(', '))
  if (p.spellcasting || p.spellcasting2020) parts.push('Spellcasting')
  if (p.other) parts.push(p.other)
  return parts.join(', ')
}

function describeAbilityIncrease(abilityList) {
  if (!Array.isArray(abilityList) || abilityList.length === 0) return null

  const sentences = []
  for (const block of abilityList) {
    if (!block || typeof block !== 'object') continue

    for (const [key, amount] of Object.entries(block)) {
      if (ABILITY_NAMES[key] && typeof amount === 'number') {
        sentences.push(
          `Increase your ${ABILITY_NAMES[key]} score by ${amount}, to a maximum of 20.`,
        )
      }
    }

    if (block.choose) {
      const amount = block.choose.amount ?? 1
      const from = Array.isArray(block.choose.from)
        ? block.choose.from.map((k) => ABILITY_NAMES[k] ?? k)
        : []

      if (from.length > 0 && from.length < 6) {
        sentences.push(`Increase your ${joinWithOr(from)} by ${amount}, to a maximum of 20.`)
      } else {
        sentences.push(
          `Increase one ability score of your choice by ${amount}, to a maximum of 20.`,
        )
      }
    }
  }

  return sentences.length > 0 ? `Ability Score Increase. ${sentences.join(' ')}` : null
}

function extractAdditionalSpells(additionalSpells) {
  if (!Array.isArray(additionalSpells)) return []
  const spells = new Set()

  const collect = (node) => {
    if (!node) return
    if (typeof node === 'string') {
      spells.add(titleCase(node.split('|')[0]))
      return
    }
    if (Array.isArray(node)) {
      node.forEach(collect)
      return
    }
    if (typeof node === 'object') {
      for (const [key, val] of Object.entries(node)) {
        if (key === 'ability' || key === 'choose' || key === 'name') continue
        collect(val)
      }
    }
  }

  additionalSpells.forEach(collect)
  return [...spells]
}

export function transformFeat(raw) {
  let hasInlineAsi = false

  // Normalize 2014 feats whose ASI line is written as a plain bullet without a bold title
  const description = (raw.entries ?? []).flatMap(flatten).map((line) => {
    const bulletMatch = line.match(/^(•\s+)?(Increase (?:your|one|an) .+? score.+)$/i)
    if (bulletMatch) {
      hasInlineAsi = true
      const prefix = bulletMatch[1] ?? ''
      return `${prefix}Ability Score Increase. ${bulletMatch[2]}`
    }
    if (/ability score increase/i.test(line)) {
      hasInlineAsi = true
    }
    return line
  })

  // For 2024 feats where ASI isn't in `entries`, generate and insert it from `raw.ability`
  const asiText = describeAbilityIncrease(raw.ability)
  if (asiText && !hasInlineAsi) {
    const insertAt = description.length > 1 ? 1 : 0
    description.splice(insertAt, 0, asiText)
  }

  const grantedSpells = extractAdditionalSpells(raw.additionalSpells)

  return {
    id: `${slugify(raw.name)}-${raw.source.toLowerCase()}`,
    name: raw.name,
    source: raw.source,
    sourceName: getSourceName(raw.source),
    page: raw.page ?? null,
    category: raw.category ? (FEAT_CATEGORIES[raw.category] ?? raw.category) : null,
    prerequisite: (raw.prerequisite ?? []).map(describePrerequisite).filter(Boolean).join('; or '),
    ability: raw.ability ?? [],
    grantedSpells,
    description,
  }
}