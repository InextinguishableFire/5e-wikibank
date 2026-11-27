import express from 'express'
import cors from 'cors'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { transformFeat } from './lib/transform.js'
import { transformItem } from './lib/transformItem.js'
import { transformSpell } from './lib/transformSpell.js'
import { makeIdsUnique, loadSourceNames } from './lib/shared.js'

const PORT = process.env.PORT ?? 3001
const FEATS_FILE = process.env.FEATS_FILE ?? new URL('./data/feats.json', import.meta.url)
const SOURCES_FILE = process.env.SOURCES_FILE ?? new URL('./data/sources.json', import.meta.url)
const ITEMS_FILE = process.env.ITEMS_FILE ?? new URL('./data/items.json', import.meta.url)
const SPELLS_DIR = process.env.SPELLS_DIR ?? new URL('./data/spells/', import.meta.url)

function loadList(file, key) {
  try {
    return JSON.parse(readFileSync(file, 'utf-8'))[key] ?? []
  } catch (error) {
    console.warn(`Could not load "${key}" data: ${error.message}`)
    return []
  }
}

// Loads and merges all spells-*.json files inside server/data/spells/
function loadAllSpells(dirUrl) {
  try {
    if (!existsSync(dirUrl)) return []
    const files = readdirSync(dirUrl).filter((f) => f.endsWith('.json'))
    return files.flatMap((file) => loadList(new URL(file, dirUrl), 'spell'))
  } catch (error) {
    console.warn(`Could not load spells directory: ${error.message}`)
    return []
  }
}

function resolveCopies(items) {
  const byName = new Map(items.map((item) => [`${item.name}|${item.source}`, item]))
  const resolve = (item) => {
    if (!item._copy) return item
    const original = byName.get(`${item._copy.name}|${item._copy._copy ?? item._copy.source}`)
    return original ? { ...resolve(original), ...item } : item
  }
  return items.map(resolve)
}

loadSourceNames(SOURCES_FILE)

const feats = makeIdsUnique(loadList(FEATS_FILE, 'feat').map(transformFeat))
const items = makeIdsUnique(resolveCopies(loadList(ITEMS_FILE, 'item')).map(transformItem))
const spells = makeIdsUnique(loadAllSpells(SPELLS_DIR).map(transformSpell))
console.log(`Loaded ${feats.length} feats, ${items.length} items, and ${spells.length} spells`)

const app = express()
app.use(cors())

function addRoutes(name, list, extraFilter) {
  app.get(`/api/${name}`, (req, res) => {
    const { search = '', source } = req.query
    const text = String(search).trim().toLowerCase()

    const results = list.filter(
      (entry) =>
        entry.name.toLowerCase().includes(text) &&
        (!source || entry.source === source) &&
        (!extraFilter || extraFilter(entry, req.query)),
    )
    res.json(results)
  })

  app.get(`/api/${name}/:id`, (req, res) => {
    const entry = list.find((e) => e.id === req.params.id)
    if (!entry) return res.status(404).json({ error: 'Not found' })
    res.json(entry)
  })
}

addRoutes('feats', feats)
addRoutes('items', items, (item, query) => !query.rarity || item.rarity === query.rarity)
addRoutes('spells', spells)

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`))