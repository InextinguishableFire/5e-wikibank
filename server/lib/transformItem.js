// Turns one raw magic item / piece of equipment into a simple object.
import { getSourceName, flatten, slugify, titleCase } from './shared.js'

// The data stores item types as short codes, e.g. "WD|XDMG" (wand).
const ITEM_TYPES = {
  LA: 'Light Armor',
  MA: 'Medium Armor',
  HA: 'Heavy Armor',
  S: 'Shield',
  M: 'Melee Weapon',
  R: 'Ranged Weapon',
  A: 'Ammunition',
  AF: 'Ammunition',
  RD: 'Rod',
  WD: 'Wand',
  ST: 'Staff',
  RG: 'Ring',
  P: 'Potion',
  SC: 'Scroll',
  W: 'Wondrous Item',
  G: 'Adventuring Gear',
  SCF: 'Spellcasting Focus',
  GV: 'Generic Variant',
  INS: 'Musical Instrument',
  T: 'Tools',
  AT: "Artisan's Tools",
  GS: 'Gaming Set',
  MNT: 'Mount',
  VEH: 'Vehicle',
  TAH: 'Tack and Harness',
  TG: 'Trade Good',
  FD: 'Food and Drink',
  EXP: 'Explosive',
  SHP: 'Ship',
  OTH: 'Other',
}

const DAMAGE_TYPES = {
  P: 'piercing',
  S: 'slashing',
  B: 'bludgeoning',
  N: 'necrotic',
  R: 'radiant',
  F: 'fire',
  C: 'cold',
  L: 'lightning',
  A: 'acid',
  T: 'thunder',
  O: 'force',
  Y: 'psychic',
  I: 'poison',
}

// Prices are stored in copper pieces. 1 gp = 100 cp, 1 sp = 10 cp.
function formatValue(copper) {
  if (typeof copper !== 'number') return ''
  if (copper >= 100 && copper % 100 === 0) return `${copper / 100} gp`
  if (copper >= 10 && copper % 10 === 0) return `${copper / 10} sp`
  return `${copper} cp`
}

export function transformItem(raw) {
  const typeCode = raw.type?.split('|')[0]
  const rarity = raw.rarity ?? 'none'

  let attunement = ''
  if (raw.reqAttune === true) attunement = 'Requires attunement'
  else if (typeof raw.reqAttune === 'string') attunement = `Requires attunement ${raw.reqAttune}`

  return {
    id: `${slugify(raw.name)}-${raw.source.toLowerCase()}`,
    name: raw.name,
    source: raw.source,
    sourceName: getSourceName(raw.source),
    page: raw.page ?? null,
    type: ITEM_TYPES[typeCode] ?? (raw.wondrous ? 'Wondrous Item' : 'Item'),
    rarity,
    attunement,
    weight: raw.weight ?? null,
    value: formatValue(raw.value),
    ac: raw.ac ?? null,
    damage: raw.dmg1 ? `${raw.dmg1} ${DAMAGE_TYPES[raw.dmgType] ?? ''}`.trim() : '',
    description: (raw.entries ?? []).flatMap(flatten),
    // Some entries are a family of items, e.g. "+1 Wand of the War Mage", "+2 ...".
    variants: (raw.items ?? [])
      .filter((v) => typeof v === 'string')
      .map((v) => v.split('|')[0]),
  }
}

export { titleCase }
