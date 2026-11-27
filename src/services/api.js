// All network code lives here, so components never need to know URLs.
// Locally the API runs on port 3001. When deployed, set VITE_API_URL
// (e.g. https://my-feats-api.onrender.com/api) in your hosting settings.
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api'

async function getJson(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }
  return response.json()
}

// Feats (our own API returns plain arrays)
export const fetchAllFeats = () => getJson(`${BASE_URL}/feats`)
export const fetchFeat = (id) => getJson(`${BASE_URL}/feats/${encodeURIComponent(id)}`)

// Items
export const fetchAllItems = () => getJson(`${BASE_URL}/items`)
export const fetchItem = (id) => getJson(`${BASE_URL}/items/${encodeURIComponent(id)}`)


const DND_API_BASE = 'https://www.dnd5eapi.co'

export const fetchAllSpells = () => getJson(`${BASE_URL}/spells`)
export const fetchSpell = (id) => getJson(`${BASE_URL}/spells/${encodeURIComponent(id)}`)

export async function fetchAllMonsters() {
  const res = await fetch(`${DND_API_BASE}/api/2014/monsters`)
  if (!res.ok) throw new Error('Failed to load monsters from D&D 5e API.')
  const data = await res.json()

  // Normalize to { id, name, source, sourceName } so it works seamlessly with your filters
  return (data.results ?? []).map((m) => ({
    id: m.index,
    name: m.name,
    source: 'SRD',
    sourceName: '5e SRD (2014)',
  }))
}

export async function fetchMonster(index) {
  const res = await fetch(`${DND_API_BASE}/api/2014/monsters/${index}`)
  if (!res.ok) throw new Error('Failed to load monster details.')
  const m = await res.json()

  const acValue = Array.isArray(m.armor_class)
    ? m.armor_class.map((a) => (a.type ? `${a.value} (${a.type})` : a.value)).join(', ')
    : m.armor_class

  const speedText = m.speed
    ? Object.entries(m.speed)
        .map(([mode, val]) => (mode === 'walk' ? val : `${mode} ${val}`))
        .join(', ')
    : ''

  return {
    id: m.index,
    name: m.name,
    source: 'SRD',
    sourceName: '5e SRD (2014)',
    size: m.size,
    type: m.type,
    subtype: m.subtype,
    alignment: m.alignment,
    ac: acValue,
    hp: m.hit_points,
    hitDice: m.hit_dice,
    speed: speedText,
    stats: {
      str: m.strength,
      dex: m.dexterity,
      con: m.constitution,
      int: m.intelligence,
      wis: m.wisdom,
      cha: m.charisma,
    },
    proficiencies: m.proficiencies ?? [],
    vulnerabilities: m.damage_vulnerabilities ?? [],
    resistances: m.damage_resistances ?? [],
    immunities: m.damage_immunities ?? [],
    conditionImmunities: (m.condition_immunities ?? []).map((c) => c.name),
    senses: m.senses ?? {},
    languages: m.languages,
    cr: m.challenge_rating,
    xp: m.xp,
    traits: m.special_abilities ?? [],
    actions: m.actions ?? [],
    bonusActions: m.bonus_actions ?? [],
    reactions: m.reactions ?? [],
    legendaryActions: m.legendary_actions ?? [],
    imageUrl: m.image ? `${DND_API_BASE}${m.image}` : null,
  }
}