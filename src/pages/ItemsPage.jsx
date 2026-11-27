import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAllItems } from '../services/api.js'
import { useInteraction } from '../context/InteractionContext.jsx'
import useRosterBuilder from '../hooks/useRosterBuilder.js'
import useCatalogFilters from '../hooks/useCatalogFilters.js'
import { SOURCE_FILTER_CONFIG } from '../utils/catalogFilters.js'
import SearchBar from '../components/SearchBar.jsx'
import CatalogFilterPanel from '../components/CatalogFilterPanel.jsx'
import RosterTable from '../components/RosterTable.jsx'
import ItemPreviewPanel from '../components/ItemPreviewPanel.jsx'
import StatusMessage from '../components/StatusMessage.jsx'

const ITEMS_STORAGE_KEY = '5e-wiki-item-loadout-v1'
const ITEMS_SCHEMA_VERSION = '5e-wikibank-items-v1'
const CARD_BRIDGE_STORAGE_KEY = '5e-wiki-card-bridge-v1'

const RARITY_ORDER = ['none', 'common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact']

function formatWeight(weight) {
  if (weight === undefined || weight === null || weight === '' || Number(weight) === 0) {
    return '-'
  }
  return `${weight} lb.`
}

function formatCost(item) {
  const raw = item.value ?? item.cost
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return '-'
  }
  return String(raw)
}

const ITEM_FILTER_CONFIGS = [
  SOURCE_FILTER_CONFIG,
  {
    key: 'type',
    title: 'Type',
    deriveOptions: (items) => {
      const unique = Array.from(new Set(items.map((it) => it.type).filter(Boolean))).sort()
      return unique.map((t) => ({ value: t, label: t }))
    },
    match: (item, selected) => selected.includes(item.type),
  },
  {
    key: 'rarity',
    title: 'Rarity',
    selectAll: true,
    deriveOptions: (items) => {
      const present = new Set(items.map((it) => String(it.rarity ?? 'none').toLowerCase()))
      const sorted = RARITY_ORDER.filter((r) => present.has(r))
      for (const r of present) {
        if (!sorted.includes(r)) sorted.push(r)
      }
      return sorted.map((r) => ({
        value: r,
        label: r.charAt(0).toUpperCase() + r.slice(1),
      }))
    },
    match: (item, selected) => selected.includes(String(item.rarity ?? 'none').toLowerCase()),
  },
  {
    key: 'attunement',
    title: 'Attunement',
    options: [
      { value: 'yes', label: 'Requires Attunement' },
      { value: 'no', label: 'No Attunement' },
    ],
    match: (item, selected) => {
      const reqAttune = Boolean(item.attunement)
      return (selected.includes('yes') && reqAttune) || (selected.includes('no') && !reqAttune)
    },
  },
]

const ITEM_COLUMNS = [
  {
    key: 'name',
    label: 'Name',
    width: '1fr',
    render: (it) => it.name,
  },
  {
    key: 'weight',
    label: 'Weight',
    width: '5rem',
    align: 'center',
    render: (it) => <span className="font-mono">{formatWeight(it.weight)}</span>,
  },
  {
    key: 'cost',
    label: 'Cost',
    width: '5.5rem',
    align: 'center',
    render: (it) => <span className="font-mono">{formatCost(it)}</span>,
  },
  {
    key: 'number',
    label: 'Number',
    width: '4.5rem',
    align: 'center',
    render: (_, count) => <span className="font-mono font-bold">{count ?? '-'}</span>,
  },
]

export default function ItemsPage() {
  const navigate = useNavigate()
  const { clearInspect } = useInteraction()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  const {
    search,
    setSearch,
    sections,
    filteredItems,
    activeFilterCount,
    toggleFilter,
    selectAllFilter,
    clearFilter,
    clearAllFilters,
  } = useCatalogFilters(items, ITEM_FILTER_CONFIGS)

  const {
    entries: inventory,
    importError,
    isImporting,
    addItem,
    removeItem,
    clearRoster: clearInventory,
    getCount: getItemCount,
    exportJson: exportItemsJson,
    importJsonFile: importItemsFile,
  } = useRosterBuilder({
    storageKey: ITEMS_STORAGE_KEY,
    schema: ITEMS_SCHEMA_VERSION,
    catalog: items,
    allowDuplicates: true,
    maxCount: 99,
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetchAllItems()
      .then((list) => {
        if (!cancelled) setItems(list)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  function handleSelectItem(item) {
    clearInspect()
    setSelectedId(item.id)
  }

  function handleSendToCardMaker() {
    if (inventory.length === 0) return

    try {
      localStorage.setItem(
        CARD_BRIDGE_STORAGE_KEY,
        JSON.stringify({
          cardType: 'items',
          ids: inventory.map((entry) => entry.item.id),
        }),
      )
    } catch {
      // Ignore storage errors
    }

    navigate('/card-maker')
  }

  const activeItem = useMemo(() => {
    if (!selectedId) return null
    return (
      items.find((it) => it.id === selectedId) ??
      inventory.find((e) => e.item.id === selectedId)?.item ??
      null
    )
  }, [selectedId, items, inventory])

  const inventoryTotals = useMemo(() => {
    let totalCount = 0
    let totalWeight = 0
    for (const { item, count } of inventory) {
      totalCount += count
      const w = Number(item?.weight)
      if (!Number.isNaN(w) && w > 0) {
        totalWeight += w * count
      }
    }
    return {
      totalCount,
      totalWeight: Math.round(totalWeight * 100) / 100,
    }
  }, [inventory])

  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">Items</h1>

      <SearchBar value={search} onChange={setSearch} placeholder="Search items by name" />

      {!loading && !error && (
        <CatalogFilterPanel
          sections={sections}
          activeFilterCount={activeFilterCount}
          onToggle={toggleFilter}
          onSelectAll={selectAllFilter}
          onClear={clearFilter}
          onClearAll={clearAllFilters}
        />
      )}

      <div className="mt-6">
        {loading && <StatusMessage>Loading items…</StatusMessage>}
        {error && <StatusMessage type="error">{error}</StatusMessage>}

        {!loading && !error && (
          <>
            <p className="mb-2 text-sm text-stone-500">
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
            </p>

            {filteredItems.length === 0 ? (
              <StatusMessage>No items match your search and filters.</StatusMessage>
            ) : (
              <div className="grid gap-6 lg:grid-cols-12">
                {/* Left column: scrollable item list */}
                <div className="lg:col-span-5">
                  <ul className="max-h-[78vh] divide-y divide-stone-200 overflow-y-auto rounded border border-stone-300 bg-white shadow-sm">
                    {filteredItems.map((item) => {
                      const isActive = selectedId === item.id

                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectItem(item)}
                            className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors ${
                              isActive ? 'bg-red-50' : 'hover:bg-stone-50'
                            }`}
                          >
                            <span
                              className={`truncate text-sm font-medium ${
                                isActive ? 'text-red-900' : 'text-stone-900'
                              }`}
                            >
                              {item.name}
                            </span>

                            <span className="flex shrink-0 items-center gap-1.5 text-[11px] capitalize text-stone-500">
                              {item.rarity && item.rarity !== 'none' && (
                                <span>{item.rarity}</span>
                              )}
                              <span className="text-stone-400 uppercase">{item.source}</span>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                {/* Right column: Item Inventory RosterTable + ItemPreviewPanel */}
                <div className="space-y-4 lg:col-span-7">
                  <RosterTable
                    columns={ITEM_COLUMNS}
                    entries={inventory}
                    selectedId={selectedId}
                    onSelect={handleSelectItem}
                    emptyMessage="No items in inventory yet. Select an item below and click + to add it, or import a saved .json file."
                    summary={
                      <span>
                        Total:{' '}
                        <strong>
                          {inventoryTotals.totalCount}{' '}
                          {inventoryTotals.totalCount === 1 ? 'item' : 'items'}
                        </strong>
                        {inventoryTotals.totalWeight > 0 && (
                          <>
                            ; <strong>{inventoryTotals.totalWeight} lb.</strong>
                          </>
                        )}
                      </span>
                    }
                    importError={importError}
                    isImporting={isImporting}
                    onImportFile={(file) =>
                      importItemsFile(file, (imported) => {
                        setSelectedId(imported[0].item.id)
                      })
                    }
                    onExport={() => exportItemsJson('items-inventory')}
                    onClear={clearInventory}
                    actionLabel="Send to Card Maker →"
                    onAction={handleSendToCardMaker}
                  />

                  <ItemPreviewPanel
                    item={activeItem}
                    rosterCount={getItemCount(activeItem?.id)}
                    onAddItem={addItem}
                    onRemoveItem={removeItem}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}