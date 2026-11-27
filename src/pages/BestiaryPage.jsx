import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAllMonsters, fetchMonster } from '../services/api.js'
import { useInteraction } from '../context/InteractionContext.jsx'
import useRosterBuilder from '../hooks/useRosterBuilder.js'
import useCatalogFilters from '../hooks/useCatalogFilters.js'
import { SOURCE_FILTER_CONFIG } from '../utils/catalogFilters.js'
import SearchBar from '../components/SearchBar.jsx'
import CatalogFilterPanel from '../components/CatalogFilterPanel.jsx'
import RosterTable from '../components/RosterTable.jsx'
import MonsterPreviewPanel from '../components/MonsterPreviewPanel.jsx'
import StatusMessage from '../components/StatusMessage.jsx'

const ENCOUNTER_STORAGE_KEY = '5e-wiki-encounter-v1'
const INITIATIVE_STORAGE_KEY = '5e-wiki-initiative-tracker-v1'
const ENCOUNTER_SCHEMA_VERSION = '5e-wikibank-encounter-v1'

const CR_TIERS = [
  { value: '0-1', label: 'CR 0 – 1', match: (cr) => cr <= 1 },
  { value: '2-4', label: 'CR 2 – 4', match: (cr) => cr >= 2 && cr <= 4 },
  { value: '5-10', label: 'CR 5 – 10', match: (cr) => cr >= 5 && cr <= 10 },
  { value: '11-16', label: 'CR 11 – 16', match: (cr) => cr >= 11 && cr <= 16 },
  { value: '17+', label: 'CR 17+', match: (cr) => cr >= 17 },
]

const ALL_CRS = [
  0, 0.125, 0.25, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21, 22,
  23, 24, 30,
]

const CREATURE_TYPES = [
  'aberration',
  'beast',
  'celestial',
  'construct',
  'dragon',
  'elemental',
  'fey',
  'fiend',
  'giant',
  'humanoid',
  'monstrosity',
  'ooze',
  'plant',
  'swarm of Tiny beasts',
  'undead',
]

const CREATURE_SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan']

function formatCRShort(cr) {
  if (cr === undefined || cr === null) return ''
  if (cr === 0.125) return 'CR 1/8'
  if (cr === 0.25) return 'CR 1/4'
  if (cr === 0.5) return 'CR 1/2'
  return `CR ${cr}`
}

function formatCRValue(cr) {
  if (cr === undefined || cr === null) return '—'
  if (cr === 0.125) return '1/8'
  if (cr === 0.25) return '1/4'
  if (cr === 0.5) return '1/2'
  return String(cr)
}

const BESTIARY_COLUMNS = [
  { key: 'name', label: 'Name', width: '1fr', render: (m) => m.name },
  {
    key: 'type',
    label: 'Type',
    width: '8.5rem',
    render: (m) => (
      <span className="capitalize">
        {m.type ?? '—'}
        {m.subtype ? ` (${m.subtype})` : ''}
      </span>
    ),
  },
  {
    key: 'cr',
    label: 'CR',
    width: '3.5rem',
    align: 'center',
    render: (m) => <span className="font-mono">{formatCRValue(m.cr)}</span>,
  },
  {
    key: 'number',
    label: 'Number',
    width: '4.5rem',
    align: 'center',
    render: (_, count) => <span className="font-mono font-bold">{count}</span>,
  },
]

export default function BestiaryPage() {
  const navigate = useNavigate()
  const { clearInspect } = useInteraction()

  const [monsters, setMonsters] = useState([])
  const [crByIndex, setCrByIndex] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedId, setSelectedId] = useState(null)
  const [detailsCache, setDetailsCache] = useState({})
  const [loadingDetailId, setLoadingDetailId] = useState(null)

const bestiaryFilterConfigs = useMemo(
    () => [
      SOURCE_FILTER_CONFIG,
      {
        key: 'cr',
        title: 'Challenge Rating',
        selectAll: true,
        options: CR_TIERS.map(({ value, label }) => ({ value, label })),
        match: (monster, selected) => {
          const cr = crByIndex[monster.id] ?? monster.cr
          if (cr === undefined || cr === null) return true
          return selected.some((tierKey) => {
            const tier = CR_TIERS.find((t) => t.value === tierKey)
            return tier ? tier.match(cr) : false
          })
        },
      },
      {
        key: 'type',
        title: 'Creature Type (inspected)',
        options: CREATURE_TYPES.map((t) => ({ value: t, label: t })),
        match: (monster, selected) => {
          if (monster.id === selectedId) return true
          const detail = detailsCache[monster.id] ?? monster
          if (!detail?.type) return true
          return selected.includes(detail.type)
        },
      },
      {
        key: 'size',
        title: 'Size (inspected)',
        options: CREATURE_SIZES.map((s) => ({ value: s, label: s })),
        match: (monster, selected) => {
          if (monster.id === selectedId) return true
          const detail = detailsCache[monster.id] ?? monster
          if (!detail?.size) return true
          return selected.includes(detail.size)
        },
      },
      {
        key: 'artwork',
        title: 'Artwork',
        options: [{ value: 'yes', label: 'Has Image' }],
        match: (monster, selected) => {
          if (!selected.includes('yes')) return true
          if (monster.id === selectedId) return true
          const detail = detailsCache[monster.id] ?? monster
          if (!detail?.stats && detail?.imageUrl === undefined) return true
          return Boolean(detail.imageUrl)
        },
      },
    ],
    [crByIndex, detailsCache, selectedId],
  )

  const {
    search,
    setSearch,
    sections,
    filteredItems: filteredMonsters,
    activeFilterCount,
    toggleFilter,
    selectAllFilter,
    clearFilter,
    clearAllFilters,
  } = useCatalogFilters(monsters, bestiaryFilterConfigs)

  const {
    entries: encounter,
    importError,
    isImporting,
    addItem: addToEncounter,
    removeItem: removeFromEncounter,
    clearRoster: clearEncounter,
    getCount: getEncounterCount,
    exportJson: exportEncounterJson,
    importJsonFile: importEncounterFile,
  } = useRosterBuilder({
    storageKey: ENCOUNTER_STORAGE_KEY,
    schema: ENCOUNTER_SCHEMA_VERSION,
    catalog: monsters,
    allowDuplicates: true,
    maxCount: 99,
    isHydrated: (m) => Boolean(m?.stats),
    hydrateItem: async (id) => {
      if (detailsCache[id]) return detailsCache[id]
      const fullMonster = await fetchMonster(id)
      setDetailsCache((prev) => ({ ...prev, [id]: fullMonster }))
      return fullMonster
    },
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetchAllMonsters()
      .then((list) => {
        if (!cancelled) setMonsters(list)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    Promise.all(
      ALL_CRS.map((cr) =>
        fetch(`https://www.dnd5eapi.co/api/2014/monsters?challenge_rating=${cr}`)
          .then((r) => (r.ok ? r.json() : { results: [] }))
          .then((data) => ({ cr, results: data.results ?? [] }))
          .catch(() => ({ cr, results: [] })),
      ),
    ).then((buckets) => {
      if (cancelled) return
      const map = {}
      for (const { cr, results } of buckets) {
        for (const m of results) {
          map[m.index] = cr
        }
      }
      setCrByIndex(map)
    })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleSelectMonster(monster) {
    clearInspect()
    setSelectedId(monster.id)

    if (detailsCache[monster.id] || monster.stats) return

    setLoadingDetailId(monster.id)
    try {
      const fullMonster = await fetchMonster(monster.id)
      setDetailsCache((prev) => ({ ...prev, [monster.id]: fullMonster }))
    } catch {
      // Keep summary fallback if detail fetch fails
    } finally {
      setLoadingDetailId((curr) => (curr === monster.id ? null : curr))
    }
  }

  function handleSendToInitiative() {
    if (encounter.length === 0) return

    const combatRows = []
    for (const entry of encounter) {
      const monster = entry?.item ?? entry?.monster
      const count = entry?.count ?? 0
      if (!monster || count <= 0) continue

      const numericAc = String(monster.ac ?? '').match(/\d+/)?.[0] ?? ''
      const numericHp = monster.hp !== undefined && monster.hp !== null ? String(monster.hp) : ''

      for (let i = 1; i <= count; i++) {
        combatRows.push({
          id: crypto.randomUUID(),
          initiative: '',
          name: count > 1 ? `${monster.name} ${i}` : monster.name,
          ac: numericAc,
          currentHp: numericHp,
          maxHp: numericHp,
        })
      }
    }

    try {
      const existing = JSON.parse(localStorage.getItem(INITIATIVE_STORAGE_KEY))
      const nonEmptyExisting = (existing?.rows ?? []).filter(
        (r) => r.name || r.initiative || r.ac || r.maxHp,
      )
      localStorage.setItem(
        INITIATIVE_STORAGE_KEY,
        JSON.stringify({
          rows: [...nonEmptyExisting, ...combatRows],
          activeIndex: existing?.activeIndex ?? 0,
          round: existing?.round ?? 1,
        }),
      )
    } catch {
      // Ignore storage errors
    }

    navigate('/initiative')
  }

  const activeMonster = useMemo(() => {
    if (!selectedId) return null
    const inEncounter = encounter.find((e) => e.item?.id === selectedId)?.item
    const base = monsters.find((m) => m.id === selectedId)
    return detailsCache[selectedId] ?? (inEncounter?.stats ? inEncounter : null) ?? base ?? null
  }, [selectedId, monsters, detailsCache, encounter])

  const encounterTotals = useMemo(() => {
    let creatures = 0
    let xp = 0
    for (const entry of encounter) {
      const monster = entry?.item ?? entry?.monster
      if (!monster) continue
      const count = entry.count ?? 0
      creatures += count
      xp += (Number(monster.xp) || 0) * count
    }
    return { creatures, xp }
  }, [encounter])

  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">Bestiary</h1>

      <SearchBar value={search} onChange={setSearch} placeholder="Search monsters by name" />

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
        {loading && <StatusMessage>Loading bestiary…</StatusMessage>}
        {error && <StatusMessage type="error">{error}</StatusMessage>}

        {!loading && !error && (
          <>
            <p className="mb-2 text-sm text-stone-500">
              {filteredMonsters.length} {filteredMonsters.length === 1 ? 'monster' : 'monsters'}
            </p>

            {filteredMonsters.length === 0 ? (
              <StatusMessage>No monsters match your search and filters.</StatusMessage>
            ) : (
              <div className="grid gap-6 lg:grid-cols-12">
                {/* Left column: full scrollable compact monster list */}
                <div className="lg:col-span-5">
                  <ul className="max-h-[78vh] divide-y divide-stone-200 overflow-y-auto rounded border border-stone-300 bg-white shadow-sm">
                    {filteredMonsters.map((monster) => {
                      const isActive = selectedId === monster.id
                      const detail = detailsCache[monster.id]
                      const crLabel = formatCRShort(crByIndex[monster.id])

                      return (
                        <li key={monster.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectMonster(monster)}
                            className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors ${
                              isActive ? 'bg-red-50' : 'hover:bg-stone-50'
                            }`}
                          >
                            <span
                              className={`truncate text-sm font-medium ${
                                isActive ? 'text-red-900' : 'text-stone-900'
                              }`}
                            >
                              {monster.name}
                            </span>

                            <span className="flex shrink-0 items-center gap-1.5 text-[11px] capitalize text-stone-500">
                              {detail?.type && <span>{detail.type}</span>}
                              {crLabel && (
                                <span className="font-mono font-medium text-stone-600">
                                  {crLabel}
                                </span>
                              )}
                              <span className="text-stone-400 uppercase">{monster.source}</span>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                {/* Right column: Reusable RosterTable (top) + Monster Preview Panel (bottom) */}
                <div className="space-y-4 lg:col-span-7">
                  <RosterTable
                    columns={BESTIARY_COLUMNS}
                    entries={encounter}
                    selectedId={selectedId}
                    onSelect={handleSelectMonster}
                    emptyMessage="No creatures in encounter yet. Select a monster below and click + to add it, or import a saved .json file."
                    summary={
                      <span>
                        Total:{' '}
                        <strong>
                          {encounterTotals.creatures}{' '}
                          {encounterTotals.creatures === 1 ? 'creature' : 'creatures'}
                        </strong>
                        ; <strong>{encounterTotals.xp.toLocaleString()} XP</strong>
                      </span>
                    }
                    importError={importError}
                    isImporting={isImporting}
                    onImportFile={(file) =>
                      importEncounterFile(file, (imported) => {
                        setSelectedId(imported[0].item.id)
                      })
                    }
                    onExport={() => exportEncounterJson('encounter')}
                    onClear={clearEncounter}
                    actionLabel="Send to Initiative →"
                    onAction={handleSendToInitiative}
                  />

                  <MonsterPreviewPanel
                    monster={activeMonster}
                    loading={loadingDetailId === activeMonster?.id}
                    encounterCount={getEncounterCount(activeMonster?.id)}
                    onAddMonster={addToEncounter}
                    onRemoveMonster={removeFromEncounter}
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