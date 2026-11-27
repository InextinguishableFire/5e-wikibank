import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { fetchAllItems } from '../services/api.js'
import useApiData from '../hooks/useApiData.js'
import { getSources, getHiddenSourceKeys } from '../utils/sources.js'

const RARITY_ORDER = [
  'none',
  'common',
  'uncommon',
  'rare',
  'very rare',
  'legendary',
  'artifact',
  'varies',
]

const rarityRank = (rarity) => {
  const index = RARITY_ORDER.indexOf(rarity)
  return index === -1 ? RARITY_ORDER.length : index
}

const ItemsContext = createContext(null)

export function ItemsProvider({ children }) {
  const { data, loading, error } = useApiData(fetchAllItems)
  const items = useMemo(() => data ?? [], [data])

  const [excludedKeys, setExcludedKeys] = useState([])
  const [selectedTypes, setSelectedTypes] = useState([])
  const [lootRarity, setLootRarity] = useState('common')
  const [generatedLoot, setGeneratedLoot] = useState([])
  const [hasGeneratedLoot, setHasGeneratedLoot] = useState(false)

  useEffect(() => {
    if (data) setExcludedKeys(getHiddenSourceKeys(data))
  }, [data])

  const sources = useMemo(() => getSources(items), [items])

  const rarities = useMemo(
    () =>
      [...new Set(items.map((item) => item.rarity))].sort(
        (a, b) => rarityRank(a) - rarityRank(b),
      ),
    [items],
  )

  const itemTypes = useMemo(() => {
    const counts = {}
    for (const item of items) {
      const typeLabel = item.type || (item.wondrous ? 'Wondrous Item' : 'Other')
      counts[typeLabel] = (counts[typeLabel] ?? 0) + 1
    }
    return Object.entries(counts)
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [items])

  const sourceFilteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (excludedKeys.includes(item.source)) return false
        if (selectedTypes.length > 0) {
          const typeLabel = item.type || (item.wondrous ? 'Wondrous Item' : 'Other')
          if (!selectedTypes.includes(typeLabel)) return false
        }
        return true
      }),
    [items, excludedKeys, selectedTypes],
  )

  function toggleSource(key) {
    setExcludedKeys((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    )
  }

  function selectManySources(keys) {
    setExcludedKeys((current) => current.filter((k) => !keys.includes(k)))
  }

  function deselectManySources(keys) {
    setExcludedKeys((current) => [...new Set([...current, ...keys])])
  }

  function toggleItemType(type) {
    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type],
    )
  }

  function selectAllItemTypes() {
    setSelectedTypes(itemTypes.map((t) => t.value))
  }

  function clearItemTypes() {
    setSelectedTypes([])
  }

  const value = {
    items,
    loading,
    error,
    sources,
    rarities,
    itemTypes,
    excludedKeys,
    selectedTypes,
    sourceFilteredItems,
    toggleSource,
    selectManySources,
    deselectManySources,
    toggleItemType,
    selectAllItemTypes,
    clearItemTypes,
    lootRarity,
    setLootRarity,
    generatedLoot,
    setGeneratedLoot,
    hasGeneratedLoot,
    setHasGeneratedLoot,
  }

  return <ItemsContext.Provider value={value}>{children}</ItemsContext.Provider>
}

export function useItems() {
  const context = useContext(ItemsContext)
  if (!context) {
    throw new Error('useItems must be used inside an ItemsProvider')
  }
  return context
}