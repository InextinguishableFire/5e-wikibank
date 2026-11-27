// Helpers used by BOTH the feats and the items converters.
import { readFileSync } from 'node:fs'

const sourceNames = {}

export function loadSourceNames(file) {
  try {
    const data = JSON.parse(readFileSync(file, 'utf-8'))
    for (const group of Object.values(data)) {
      if (!Array.isArray(group)) continue
      for (const entry of group) {
        const code = entry.source ?? entry.id
        if (code && entry.name) sourceNames[code] = entry.name
      }
    }
    console.log(`Loaded ${Object.keys(sourceNames).length} source names`)
  } catch (error) {
    console.warn(`Could not load source names: ${error.message}`)
  }
}

export const getSourceName = (code) => sourceNames[code] ?? code

export const titleCase = (text) => text.replace(/\b\w/g, (c) => c.toUpperCase())

export const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/\+/g, 'plus-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// Converts clickable tags into [[type:target|label]] tokens, and strips other tags to plain text.
export function cleanTags(text) {
  return text.replace(/\{@(\w+) ([^}]*)\}/g, (_match, tag, body) => {
    const parts = body.split('|')
    const display = tag !== 'filter' && parts[2] ? parts[2] : parts[0]

    if (tag === 'dice' || tag === 'damage') {
      // e.g. "{@damage 3d6}" -> "[[dice:3d6|3d6]]"
      return `[[dice:${parts[0]}|${display}]]`
    }

    if (tag === 'spell') {
      // e.g. "{@spell misty step|phb}" -> "[[spell:misty step|phb|misty step]]"
      const src = parts[1] ?? ''
      return `[[spell:${parts[0]}|${src}|${display}]]`
    }

    if (tag === 'item') {
      // e.g. "{@item longsword|phb}" -> "[[item:longsword|phb|longsword]]"
      const src = parts[1] ?? ''
      return `[[item:${parts[0]}|${src}|${display}]]`
    }

    return display
  })
}

function cellText(cell) {
  if (typeof cell === 'string') return cleanTags(cell)
  if (typeof cell === 'number') return String(cell)
  const roll = cell?.roll
  if (roll) return roll.exact !== undefined ? String(roll.exact) : `${roll.min}–${roll.max}`
  return ''
}

export function flatten(entry) {
  if (typeof entry === 'string') return [cleanTags(entry)]

  if (entry.type === 'list') {
    return (entry.items ?? []).flatMap(flatten).map((line) => `• ${line}`)
  }

  if (entry.type === 'table') {
    const rows = (entry.rows ?? []).map((row) => row.map(cellText).join(' – '))
    return entry.caption ? [`${entry.caption}:`, ...rows] : rows
  }

  const children = entry.entries ?? (entry.entry ? [entry.entry] : [])
  const lines = children.flatMap(flatten)
  if (entry.name && lines.length > 0) lines[0] = `${entry.name}. ${lines[0]}`
  return lines
}

export function makeIdsUnique(list) {
  const seen = new Map()
  for (const entry of list) {
    const count = (seen.get(entry.id) ?? 0) + 1
    seen.set(entry.id, count)
    if (count > 1) entry.id = `${entry.id}-${count}`
  }
  return list
}