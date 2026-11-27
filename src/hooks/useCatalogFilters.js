import { useMemo, useState } from 'react'

/**
 * Centralized search + multi-section filter engine for catalog pages.
 *
 * @param {Array} items - Full catalog array
 * @param {Array<{
 *   key: string,
 *   title: string,
 *   options?: Array<{ value: any, label: string }>,
 *   deriveOptions?: (items: Array) => Array<{ value: any, label: string }>,
 *   selectAll?: boolean,
 *   match: (item: Object, selectedValues: Array) => boolean
 * }>} filterConfigs
 */
export default function useCatalogFilters(items = [], filterConfigs = []) {
  const [search, setSearch] = useState('')
  const [selectedByKey, setSelectedByKey] = useState({})

  const sections = useMemo(() => {
    return filterConfigs.map((cfg) => {
      const options = cfg.deriveOptions ? cfg.deriveOptions(items) : (cfg.options ?? [])
      return {
        ...cfg,
        options,
        selected: selectedByKey[cfg.key] ?? [],
      }
    })
  }, [items, filterConfigs, selectedByKey])

  function toggleFilter(key, value) {
    setSelectedByKey((prev) => {
      const current = prev[key] ?? []
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { ...prev, [key]: next }
    })
  }

  function selectAllFilter(key, options) {
    setSelectedByKey((prev) => ({
      ...prev,
      [key]: options.map((o) => o.value),
    }))
  }

  function clearFilter(key) {
    setSelectedByKey((prev) => ({
      ...prev,
      [key]: [],
    }))
  }

  function clearAllFilters() {
    setSelectedByKey({})
  }

  const activeFilterCount = useMemo(() => {
    return Object.values(selectedByKey).reduce((sum, arr) => sum + arr.length, 0)
  }, [selectedByKey])

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()

    return items.filter((item) => {
      if (query && !String(item.name ?? '').toLowerCase().includes(query)) {
        return false
      }

      for (const section of sections) {
        if (section.selected.length > 0 && !section.match(item, section.selected)) {
          return false
        }
      }

      return true
    })
  }, [items, search, sections])

  return {
    search,
    setSearch,
    sections,
    filteredItems,
    activeFilterCount,
    toggleFilter,
    selectAllFilter,
    clearFilter,
    clearAllFilters,
  }
}