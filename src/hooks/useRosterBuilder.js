import { useEffect, useState } from 'react'

const MAX_IMPORT_BYTES = 100 * 1024 // 100 KB
const MAX_ROSTER_ENTRIES = 60
const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]+$/
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function containsDangerousKeys(value, depth = 0) {
  if (depth > 5) return true
  if (value === null || typeof value !== 'object') return false
  if (Array.isArray(value)) {
    return value.some((item) => containsDangerousKeys(item, depth + 1))
  }
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key)) return true
    if (containsDangerousKeys(value[key], depth + 1)) return true
  }
  return false
}

/**
 * Generic state & hardened import/export manager for Bestiary, Feats, Spells, and Items rosters.
 *
 * @param {Object} config
 * @param {string} config.storageKey - localStorage key
 * @param {string} config.schema - Versioned JSON schema identifier
 * @param {Array} config.catalog - Full loaded array of valid items from the API (used as allowlist)
 * @param {boolean} [config.allowDuplicates=true] - Whether count can exceed 1 (true for Monsters/Items, false for Feats/Spells)
 * @param {number} [config.maxCount=99] - Max quantity per entry when allowDuplicates is true
 * @param {(id: string) => Promise<Object>} [config.hydrateItem] - Optional async fetcher to load full details on import
 * @param {(item: Object) => boolean} [config.isHydrated] - Predicate checking if an item already has full details
 */
export default function useRosterBuilder({
  storageKey,
  schema,
  catalog = [],
  allowDuplicates = true,
  maxCount = 99,
  hydrateItem,
  isHydrated = () => true,
}) {
  const effectiveMax = allowDuplicates ? maxCount : 1

  const [entries, setEntries] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey))
      if (!Array.isArray(saved)) return []

      return saved
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null
          // Support both current { item, count } and legacy { monster, count }
          const resolvedItem = entry.item ?? entry.monster
          if (!resolvedItem?.id) return null
          return {
            item: resolvedItem,
            count: Number.isInteger(entry.count) && entry.count > 0 ? entry.count : 1,
          }
        })
        .filter(Boolean)
    } catch {
      return []
    }
  })

  const [importError, setImportError] = useState(null)
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(entries))
    } catch {
      // Ignore storage quota errors
    }
  }, [storageKey, entries])

  function addItem(item) {
    if (!item?.id) return
    setImportError(null)

    setEntries((prev) => {
      const existing = prev.find((e) => e.item.id === item.id)
      if (existing) {
        if (!allowDuplicates) return prev
        return prev.map((e) =>
          e.item.id === item.id
            ? {
                item: isHydrated(item) ? item : e.item,
                count: Math.min(effectiveMax, e.count + 1),
              }
            : e,
        )
      }
      return [...prev, { item, count: 1 }]
    })
  }

  function removeItem(itemId) {
    setEntries((prev) =>
      prev
        .map((e) => (e.item.id === itemId ? { ...e, count: e.count - 1 } : e))
        .filter((e) => e.count > 0),
    )
  }

  function clearRoster() {
    setEntries([])
    setImportError(null)
  }

  function getCount(itemId) {
    if (!itemId) return 0
    return entries.find((e) => e.item.id === itemId)?.count ?? 0
  }

  function exportJson(filenamePrefix = 'roster') {
    if (entries.length === 0) return

    const payload = {
      schema,
      entries: entries.map(({ item, count }) => ({
        id: item.id,
        count,
      })),
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  async function importJsonFile(file, onImported) {
    setImportError(null)
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.json')) {
      setImportError('Invalid file type. Only .json files are allowed.')
      return
    }
    if (file.size === 0 || file.size > MAX_IMPORT_BYTES) {
      setImportError('File size must be between 1 byte and 100 KB.')
      return
    }

    setIsImporting(true)
    try {
      const rawText = await file.text()

      let parsed
      try {
        parsed = JSON.parse(rawText)
      } catch {
        throw new Error('Malformed JSON file.')
      }

      if (
        parsed === null ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed) ||
        containsDangerousKeys(parsed)
      ) {
        throw new Error('Invalid or unsafe JSON structure.')
      }

      const allowedTopKeys = new Set(['schema', 'entries'])
      for (const key of Object.keys(parsed)) {
        if (!allowedTopKeys.has(key)) {
          throw new Error(`Unexpected property "${key}" in file.`)
        }
      }

      if (parsed.schema !== schema) {
        throw new Error(`Incompatible file format (expected "${schema}").`)
      }

      if (!Array.isArray(parsed.entries) || parsed.entries.length === 0) {
        throw new Error('Imported file contains no entries.')
      }

      if (parsed.entries.length > MAX_ROSTER_ENTRIES) {
        throw new Error(`Roster cannot exceed ${MAX_ROSTER_ENTRIES} distinct entries.`)
      }

      const catalogById = new Map(catalog.map((item) => [item.id, item]))
      const mergedCounts = new Map()

      for (const entry of parsed.entries) {
        if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
          throw new Error('Invalid entry structure inside file.')
        }

        const keys = Object.keys(entry)
        if (keys.length !== 2 || !('id' in entry) || !('count' in entry)) {
          throw new Error('Each entry must only contain "id" and "count".')
        }

        const { id, count } = entry
        if (typeof id !== 'string' || !SAFE_ID_REGEX.test(id)) {
          throw new Error('Invalid entry ID format detected.')
        }

        if (!catalogById.has(id)) {
          throw new Error(`Unknown entry "${id}" — only official catalog items are allowed.`)
        }

        if (!Number.isInteger(count) || count < 1 || count > effectiveMax) {
          throw new Error(
            `Count for "${id}" must be an integer between 1 and ${effectiveMax}.`,
          )
        }

        const prev = mergedCounts.get(id) ?? 0
        mergedCounts.set(id, Math.min(effectiveMax, prev + count))
      }

      const hydrated = await Promise.all(
        Array.from(mergedCounts.entries()).map(async ([id, count]) => {
          const baseItem = catalogById.get(id)
          if (hydrateItem && !isHydrated(baseItem)) {
            const full = await hydrateItem(id)
            return { item: full, count }
          }
          return { item: baseItem, count }
        }),
      )

      setEntries(hydrated)
      if (onImported && hydrated.length > 0) {
        onImported(hydrated)
      }
    } catch (err) {
      setImportError(err.message || 'Failed to import JSON file.')
    } finally {
      setIsImporting(false)
    }
  }

  return {
    entries,
    importError,
    isImporting,
    addItem,
    removeItem,
    clearRoster,
    getCount,
    exportJson,
    importJsonFile,
  }
}