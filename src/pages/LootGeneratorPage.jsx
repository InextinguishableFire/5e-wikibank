import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useItems } from '../context/ItemsContext.jsx'
import { useInteraction } from '../context/InteractionContext.jsx'
import { fetchItem } from '../services/api.js'
import ItemPreviewPanel from '../components/ItemPreviewPanel.jsx'
import StatusMessage from '../components/StatusMessage.jsx'

const LOOT_COUNT = 8

function pickRandomItems(pool, count) {
  const copy = [...pool]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, count)
}

export default function LootGeneratorPage() {
  const { clearInspect } = useInteraction()

  const {
    loading,
    error,
    rarities,
    sourceFilteredItems,
    sources,
    excludedKeys,
    lootRarity,
    setLootRarity,
    generatedLoot,
    setGeneratedLoot,
    hasGeneratedLoot,
    setHasGeneratedLoot,
  } = useItems()

  const [selectedId, setSelectedId] = useState(null)
  const [detailsCache, setDetailsCache] = useState({})
  const [loadingDetailId, setLoadingDetailId] = useState(null)

  const matchingPool = useMemo(
    () => sourceFilteredItems.filter((item) => item.rarity === lootRarity),
    [sourceFilteredItems, lootRarity],
  )

  function handleRarityChange(event) {
    setLootRarity(event.target.value)
    setGeneratedLoot([])
    setHasGeneratedLoot(false)
    setSelectedId(null)
    clearInspect()
  }

  function handleGenerate() {
    setGeneratedLoot(pickRandomItems(matchingPool, LOOT_COUNT))
    setHasGeneratedLoot(true)
    setSelectedId(null)
    clearInspect()
  }

  async function handleSelectItem(item) {
    clearInspect()
    setSelectedId(item.id)

    if (detailsCache[item.id] || Array.isArray(item.description)) {
      return
    }

    setLoadingDetailId(item.id)
    try {
      const fullItem = await fetchItem(item.id)
      setDetailsCache((prev) => ({ ...prev, [item.id]: fullItem }))
    } catch {
      // Fall back to the summary item if the detail request fails
    } finally {
      setLoadingDetailId((current) => (current === item.id ? null : current))
    }
  }

  const activeItem = useMemo(() => {
    if (!selectedId) return null
    const base = generatedLoot.find((item) => item.id === selectedId)
    return detailsCache[selectedId] ?? base ?? null
  }, [selectedId, generatedLoot, detailsCache])

  const activeSourceCount = sources.length - excludedKeys.length

  return (
    <section>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Loot Generator</h1>
        <p className="mt-1 text-sm text-stone-500">
          Using {activeSourceCount} of {sources.length} active sources from{' '}
          <Link to="/items" className="text-red-800 underline">
            Items
          </Link>
          .
        </p>
      </div>

      {loading && <StatusMessage>Loading items…</StatusMessage>}
      {error && <StatusMessage type="error">{error}</StatusMessage>}

      {!loading && !error && (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded border border-stone-300 bg-white p-4 shadow-sm">
            <label htmlFor="loot-rarity" className="text-sm font-medium text-stone-700">
              Rarity
            </label>

            <select
              id="loot-rarity"
              value={lootRarity}
              onChange={handleRarityChange}
              className="rounded border border-stone-300 bg-white px-3 py-2 text-sm capitalize shadow-sm"
            >
              {rarities.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={matchingPool.length === 0}
              className="rounded bg-red-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 active:bg-red-950 disabled:opacity-40"
            >
              Generate {LOOT_COUNT} items
            </button>

            <span className="text-sm text-stone-500">
              {matchingPool.length} matching {matchingPool.length === 1 ? 'item' : 'items'} in pool
            </span>
          </div>

          <div className="mt-6">
            {!hasGeneratedLoot ? (
              <StatusMessage
