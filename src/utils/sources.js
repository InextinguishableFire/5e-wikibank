// Helpers for the source filter. They work for feats AND items,
// because both have `source` (a code) and `sourceName` (readable name).

// Sources whose name matches this are switched OFF by default.
// Change or extend this pattern to hide other sources at startup.
const HIDDEN_BY_DEFAULT = /adventurer/i

// Build the list of sources, with how many entries each one has.
export function getSources(list) {
  const byKey = {}
  for (const entry of list) {
    if (!byKey[entry.source]) {
      byKey[entry.source] = { key: entry.source, name: entry.sourceName, count: 0 }
    }
    byKey[entry.source].count += 1
  }
  return Object.values(byKey).sort((a, b) => a.name.localeCompare(b.name))
}

// Keys of the sources that should start switched off.
export function getHiddenSourceKeys(list) {
  const hidden = list.filter((entry) => HIDDEN_BY_DEFAULT.test(entry.sourceName))
  return [...new Set(hidden.map((entry) => entry.source))]
}
