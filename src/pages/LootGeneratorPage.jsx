import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useItems } from '../context/ItemsContext.jsx'
import { fetchItem } from '../services/api.js'
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

  // Tracks which item is currently hovered and caches full item details by id
  const [hoveredId, setHoveredId] = useState(null)
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
    setHoveredId(null)
  }

  function handleGenerate() {
    setGeneratedLoot(pickRandomItems(matchingPool, LOOT_COUNT))
    setHasGeneratedLoot(true)
    setHoveredId(null)
  }

  // On hover, show immediately if we already have the description; otherwise fetch & cache it
  async function handleHoverItem(item) {
    setHoveredId(item.id)

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
    if (!hoveredId) return null
    const base = generatedLoot.find((item) => item.id === hoveredId)
    return detailsCache[hoveredId] ?? base ?? null
  }, [hoveredId, generatedLoot, detailsCache])

  const facts = activeItem
    ? [
        activeItem.damage && `Damage: ${activeItem.damage}`,
        activeItem.ac && `AC: ${activeItem.ac}`,
        activeItem.weight && `Weight: ${activeItem.weight} lb.`,
        activeItem.value && `Value: ${activeItem.value}`,
      ].filter(Boolean)
    : []

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
              <StatusMessage>
                Choose a rarity and click “Generate {LOOT_COUNT} items” to roll loot.
              </StatusMessage>
            ) : generatedLoot.length === 0 ? (
              <StatusMessage>
                No <span className="capitalize">{lootRarity}</span> items are available in your
                currently enabled sources.
              </StatusMessage>
            ) : (
              <div className="grid gap-6 lg:grid-cols-12">
                {/* Left column: compact list of generated items */}
                <div className="lg:col-span-5">
                  {generatedLoot.length < LOOT_COUNT && (
                    <p className="mb-2 text-xs text-stone-500">
                      Showing all {generatedLoot.length} available {lootRarity} items.
                    </p>
                  )}

                  <ul className="divide-y divide-stone-200 overflow-hidden rounded border border-stone-300 bg-white shadow-sm">
                    {generatedLoot.map((item) => {
                      const isActive = hoveredId === item.id
                      return (
                        <li
                          key={item.id}
                          onMouseEnter={() => handleHoverItem(item)}
                          className={`transition-colors ${
                            isActive ? 'bg-red-50' : 'hover:bg-stone-50'
                          }`}
                        >
                          <Link
                            to={`/items/${item.id}`}
                            className="flex items-center justify-between gap-3 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <p
                                className={`truncate font-medium ${
                                  isActive ? 'text-red-900' : 'text-stone-900'
                                }`}
                              >
                                {item.name}
                              </p>
                              <p className="truncate text-xs capitalize text-stone-500">
                                {item.type}
                                {item.attunement ? ' · Attunement' : ''}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs text-stone-400">{item.source}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                {/* Right column: live hover preview popup */}
                <div className="lg:col-span-7">
                  {!activeItem ? (
                    <div className="rounded border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-500">
                      Hover over an item on the left to preview its full description here.
                    </div>
                  ) : (
                    <article className="sticky top-6 rounded border border-stone-300 bg-white p-6 shadow-md">
                      <h2 className="text-2xl font-bold">{activeItem.name}</h2>
                      <p className="mt-1 capitalize text-stone-600">
                        {activeItem.type}
                        {activeItem.rarity !== 'none' ? `, ${activeItem.rarity}` : ''}
                        {activeItem.attunement
                          ? ` (${activeItem.attunement.replace(
                              'Requires attunement',
                              'requires attunement',
                            )})`
                          : ''}
                      </p>

                      {facts.length > 0 && (
                        <p className="mt-2 text-sm text-stone-600">{facts.join(' · ')}</p>
                      )}

                      <div className="mt-4 space-y-3 text-sm text-stone-700">
                        {loadingDetailId === activeItem.id && !activeItem.description ? (
                          <p className="text-stone-500">Loading description…</p>
                        ) : (
                          (activeItem.description ?? []).map((paragraph, index) => (
                            <p key={index}>{paragraph}</p>
                          ))
                        )}
                      </div>

                      {activeItem.variants?.length > 0 && (
                        <div className="mt-4">
                          <h3 className="text-sm font-semibold">Variants</h3>
                          <ul className="mt-1 list-disc pl-5 text-sm text-stone-700">
                            {activeItem.variants.map((variant) => (
                              <li key={variant}>{variant}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <p className="mt-5 text-xs text-stone-500">
                        {activeItem.sourceName}
                        {activeItem.page ? `, page ${activeItem.page}` : ''}
                      </p>
                    </article>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}