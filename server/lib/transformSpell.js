import { getSourceName, flatten, slugify } from './shared.js'

const SCHOOLS = {
  A: 'Abjuration',
  C: 'Conjuration',
  D: 'Divination',
  E: 'Enchantment',
  V: 'Evocation',
  I: 'Illusion',
  N: 'Necromancy',
  T: 'Transmutation',
}

function formatTime(timeArr) {
  if (!Array.isArray(timeArr) || timeArr.length === 0) return ''
  return timeArr
    .map((t) => `${t.number} ${t.unit}${t.condition ? ` (${t.condition})` : ''}`)
    .join(' or ')
}

function formatRange(range) {
  if (!range) return ''
  if (range.type === 'point') {
    const dist = range.distance
    if (!dist) return ''
    if (dist.type === 'self' || dist.type === 'touch' || dist.type === 'sight' || dist.type === 'unlimited') {
      return dist.type.charAt(0).toUpperCase() + dist.type.slice(1)
    }
    return `${dist.amount} ${dist.type}`
  }
  if (range.distance) {
    return `Self (${range.distance.amount}-${range.distance.type} ${range.type})`
  }
  return range.type ?? ''
}

function formatComponents(comp) {
  if (!comp) return ''
  const parts = []
  if (comp.v) parts.push('V')
  if (comp.s) parts.push('S')
  if (comp.m) {
    const mat = typeof comp.m === 'string' ? comp.m : comp.m.text
    parts.push(mat ? `M (${mat})` : 'M')
  }
  return parts.join(', ')
}

function formatDuration(durArr) {
  if (!Array.isArray(durArr) || durArr.length === 0) return ''
  return durArr
    .map((d) => {
      if (d.type === 'instant') return 'Instantaneous'
      if (d.type === 'permanent') return 'Permanent'
      if (d.type === 'special') return 'Special'
      if (d.type === 'timed' && d.duration) {
        const span = `${d.duration.amount} ${d.duration.type}${d.duration.amount > 1 ? 's' : ''}`
        return d.concentration ? `Concentration, up to ${span}` : span
      }
      return d.type ?? ''
    })
    .join(' or ')
}

export function transformSpell(raw) {
  const levelLabel =
    raw.level === 0
      ? `${SCHOOLS[raw.school] ?? raw.school} cantrip`
      : `Level ${raw.level} ${SCHOOLS[raw.school] ?? raw.school}`

  const description = [
    ...(raw.entries ?? []).flatMap(flatten),
    ...(raw.entriesHigherLevel ?? []).flatMap(flatten),
  ]

  return {
    id: `${slugify(raw.name)}-${raw.source.toLowerCase()}`,
    name: raw.name,
    source: raw.source,
    sourceName: getSourceName(raw.source),
    page: raw.page ?? null,
    level: raw.level ?? 0,
    school: SCHOOLS[raw.school] ?? raw.school,
    levelLabel,
    castingTime: formatTime(raw.time),
    range: formatRange(raw.range),
    components: formatComponents(raw.components),
    duration: formatDuration(raw.duration),
    description,
  }
}