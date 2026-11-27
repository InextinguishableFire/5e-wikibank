import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAllFeats } from '../services/api.js'
import { useInteraction } from '../context/InteractionContext.jsx'
import useRosterBuilder from '../hooks/useRosterBuilder.js'
import useCatalogFilters from '../hooks/useCatalogFilters.js'
import { SOURCE_FILTER_CONFIG } from '../utils/catalogFilters.js'
import SearchBar from '../components/SearchBar.jsx'
import CatalogFilterPanel from '../components/CatalogFilterPanel.jsx'
import RosterTable from '../components/RosterTable.jsx'
import FeatPreviewPanel, {
  getFeatAbilityList,
  getFeatAbilityShort,
} from '../components/FeatPreviewPanel.jsx'
import StatusMessage from '../components/StatusMessage.jsx'

const FEATS_STORAGE_KEY = '5e-wiki-feat-loadout-v1'
const FEATS_SCHEMA_VERSION = '5e-wikibank-feats-v1'
const CARD_BRIDGE_STORAGE_KEY = '5e-wiki-card-bridge-v1'

const FEAT_CATEGORY_LABELS = {
  G: 'General',
  O: 'Origin',
  D: 'Mark',
  FS: 'Fighting Style',
  'FS:P': 'Fighting Style (Paladin)',
  'FS:R': 'Fighting Style (Ranger)',
  EB: 'Epic Boon',
}

function getFeatCategory(feat) {
  const raw = String(feat.category ?? '').trim()
  if (!raw) return 'General'
  return FEAT_CATEGORY_LABELS[raw] || raw
}

const ABILITY_FILTER_OPTIONS = [
  { value: 'Strength', label: 'Strength' },
  { value: 'Dexterity', label: 'Dexterity' },
  { value: 'Constitution', label: 'Constitution' },
  { value: 'Intelligence', label: 'Intelligence' },
  { value: 'Wisdom', label: 'Wisdom' },
  { value: 'Charisma', label: 'Charisma' },
  { value: 'Any', label: 'Any (+1)' },
  { value: 'None', label: 'None' },
]

const FEAT_FILTER_CONFIGS = [
  SOURCE_FILTER_CONFIG,
  {
    key: 'category',
    title: 'Category',
    deriveOptions: (items) => {
      const unique = Array.from(new Set(items.map(getFeatCategory))).sort()
      return unique.map((cat) => ({ value: cat, label: cat }))
    },
    match: (feat, selected) => selected.includes(getFeatCategory(feat)),
  },
  {
    key: 'ability',
    title: 'Ability Score Increase',
    options: ABILITY_FILTER_OPTIONS,
    match: (feat, selected) => {
      const featAbilities = getFeatAbilityList(feat)
      return selected.some((val) => {
        if (val === 'None') return featAbilities.length === 0
        return featAbilities.includes(val) || featAbilities.includes('Any')
      })
    },
  },
  {
    key: 'prerequisite',
    title: 'Prerequisite',
    options: [
      { value: 'none', label: 'No Prerequisite' },
      { value: 'has', label: 'Has Prerequisite' },
    ],
    match: (feat, selected) => {
      const hasPrereq = Boolean(feat.prerequisite)
      return (
        (selected.includes('none') && !hasPrereq) ||
        (selected.includes('has') && hasPrereq)
      )
    },
  },
]

const FEAT_COLUMNS = [
  {
    key: 'name',
    label: 'Name',
    width: '1fr',
    render: (f) => f.name,
  },
  {
    key: 'ability',
    label: 'Ability',
    width: '7rem',
    render: (f) => getFeatAbilityShort(f),
  },
  {
    key: 'prerequisite',
    label: 'Prerequisite',
    width: '9.5rem',
    render: (f) => f.prerequisite || '—',
  },
]

export default function FeatsPage() {
  const navigate = useNavigate()
  const { clearInspect } = useInteraction()

  const [feats, setFeats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  const {
    search,
    setSearch,
    sections,
    filteredItems: filteredFeats,
    activeFilterCount,
    toggleFilter,
    selectAllFilter,
    clearFilter,
    clearAllFilters,
  } = useCatalogFilters(feats, FEAT_FILTER_CONFIGS)

  const {
    entries: loadout,
    importError,
    isImporting,
    addItem: addFeat,
    removeItem: removeFeat,
    clearRoster: clearLoadout,
    getCount: getFeatCount,
    exportJson: exportFeatsJson,
    importJsonFile: importFeatsFile,
  } = useRosterBuilder({
    storageKey: FEATS_STORAGE_KEY,
    schema: FEATS_SCHEMA_VERSION,
    catalog: feats,
    allowDuplicates: false,
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetchAllFeats()
      .then((list) => {
        if (!cancelled) setFeats(list)
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

  function handleSelectFeat(feat) {
    clearInspect()
    setSelectedId(feat.id)
  }

  function handleSendToCardMaker() {
    if (loadout.length === 0) return

    try {
      localStorage.setItem(
        CARD_BRIDGE_STORAGE_KEY,
        JSON.stringify({
          cardType: 'feats',
          ids: loadout.map((entry) => entry.item.id),
        }),
      )
    } catch {
      // Ignore storage errors
    }

    navigate('/card-maker')
  }

  const activeFeat = useMemo(() => {
    if (!selectedId) return null
    return (
      feats.find((f) => f.id === selectedId) ??
      loadout.find((e) => e.item.id === selectedId)?.item ??
      null
    )
  }, [selectedId, feats, loadout])

  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">Feats</h1>

      <SearchBar value={search} onChange={setSearch} placeholder="Search feats by name" />

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
        {loading && <StatusMessage>Loading feats…</StatusMessage>}
        {error && <StatusMessage type="error">{error}</StatusMessage>}

        {!loading && !error && (
          <>
            <p className="mb-2 text-sm text-stone-500">
              {filteredFeats.length} {filteredFeats.length === 1 ? 'feat' : 'feats'}
            </p>

            {filteredFeats.length === 0 ? (
              <StatusMessage>No feats match your search and filters.</StatusMessage>
            ) : (
              <div className="grid gap-6 lg:grid-cols-12">
                {/* Left column: scrollable feat list */}
                <div className="lg:col-span-5">
                  <ul className="max-h-[78vh] divide-y divide-stone-200 overflow-y-auto rounded border border-stone-300 bg-white shadow-sm">
                    {filteredFeats.map((feat) => {
                      const isActive = selectedId === feat.id

                      return (
                        <li key={feat.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectFeat(feat)}
                            className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors ${
                              isActive ? 'bg-red-50' : 'hover:bg-stone-50'
                            }`}
                          >
                            <span
                              className={`truncate text-sm font-medium ${
                                isActive ? 'text-red-900' : 'text-stone-900'
                              }`}
                            >
                              {feat.name}
                            </span>

                            <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-stone-500">
                              {feat.prerequisite && (
                                <span className="max-w-[9rem] truncate text-stone-500">
                                  {feat.prerequisite}
                                </span>
                              )}
                              <span className="text-stone-400 uppercase">{feat.source}</span>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                {/* Right column: Feat Loadout RosterTable + FeatPreviewPanel */}
                <div className="space-y-4 lg:col-span-7">
                  <RosterTable
                    columns={FEAT_COLUMNS}
                    entries={loadout}
                    selectedId={selectedId}
                    onSelect={handleSelectFeat}
                    emptyMessage="No feats in loadout yet. Select a feat below and click + to add it, or import a saved .json file."
                    summary={
                      <span>
                        Total:{' '}
                        <strong>
                          {loadout.length} {loadout.length === 1 ? 'feat' : 'feats'}
                        </strong>
                      </span>
                    }
                    importError={importError}
                    isImporting={isImporting}
                    onImportFile={(file) =>
                      importFeatsFile(file, (imported) => {
                        setSelectedId(imported[0].item.id)
                      })
                    }
                    onExport={() => exportFeatsJson('feats-loadout')}
                    onClear={clearLoadout}
                    actionLabel="Send to Card Maker →"
                    onAction={handleSendToCardMaker}
                  />

                  <FeatPreviewPanel
                    feat={activeFeat}
                    rosterCount={getFeatCount(activeFeat?.id)}
                    onAddFeat={addFeat}
                    onRemoveFeat={removeFeat}
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