import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAllSpells } from '../services/api.js'
import { useInteraction } from '../context/InteractionContext.jsx'
import useRosterBuilder from '../hooks/useRosterBuilder.js'
import useCatalogFilters from '../hooks/useCatalogFilters.js'
import { SOURCE_FILTER_CONFIG } from '../utils/catalogFilters.js'
import SearchBar from '../components/SearchBar.jsx'
import CatalogFilterPanel from '../components/CatalogFilterPanel.jsx'
import RosterTable from '../components/RosterTable.jsx'
import SpellPreviewPanel from '../components/SpellPreviewPanel.jsx'
import StatusMessage from '../components/StatusMessage.jsx'

const SPELLS_STORAGE_KEY = '5e-wiki-spellbook-v1'
const SPELLS_SCHEMA_VERSION = '5e-wikibank-spells-v1'
const CARD_BRIDGE_STORAGE_KEY = '5e-wiki-card-bridge-v1'

const SPELL_LEVELS = [
  { value: 0, label: 'Cantrip' },
  { value: 1, label: '1st' },
  { value: 2, label: '2nd' },
  { value: 3, label: '3rd' },
  { value: 4, label: '4th' },
  { value: 5, label: '5th' },
  { value: 6, label: '6th' },
  { value: 7, label: '7th' },
  { value: 8, label: '8th' },
  { value: 9, label: '9th' },
]

const SPELL_SCHOOLS = [
  'abjuration',
  'conjuration',
  'divination',
  'enchantment',
  'evocation',
  'illusion',
  'necromancy',
  'transmutation',
]

function isConcentrationSpell(spell) {
  if (typeof spell.concentration === 'boolean') return spell.concentration
  return String(spell.duration ?? '').toLowerCase().includes('concentration')
}

function getSpellComponentTags(spell) {
  const tags = new Set()
  const raw = spell.components

  if (Array.isArray(raw)) {
    for (const c of raw) {
      const upper = String(c).trim().toUpperCase()
      if (upper === 'V' || upper === 'S' || upper === 'M') tags.add(upper)
    }
  } else if (raw && typeof raw === 'object') {
    if (raw.v) tags.add('V')
    if (raw.s) tags.add('S')
    if (raw.m) tags.add('M')
  } else if (typeof raw === 'string') {
    // Strip parenthetical material text like "V, S, M (a pinch of sulfur)" before matching V/S/M tokens
    const withoutMaterialDetails = raw.replace(/\([^)]*\)/g, '')
    if (/\bV\b/i.test(withoutMaterialDetails)) tags.add('V')
    if (/\bS\b/i.test(withoutMaterialDetails)) tags.add('S')
    if (/\bM\b/i.test(withoutMaterialDetails)) tags.add('M')
  }

  return tags
}

function getCastingTimeBucket(spell) {
  const time = String(spell.castingTime ?? '').toLowerCase()
  if (time.includes('bonus')) return 'bonus'
  if (time.includes('reaction')) return 'reaction'
  if (time.includes('action')) return 'action'
  return 'longer'
}

const SPELL_FILTER_CONFIGS = [
  SOURCE_FILTER_CONFIG,
  {
    key: 'level',
    title: 'Level',
    options: SPELL_LEVELS,
    match: (spell, selected) => selected.includes(spell.level),
  },
  {
    key: 'school',
    title: 'School',
    options: SPELL_SCHOOLS.map((sc) => ({
      value: sc,
      label: sc.charAt(0).toUpperCase() + sc.slice(1),
    })),
    match: (spell, selected) => selected.includes(String(spell.school ?? '').toLowerCase()),
  },
  {
    key: 'concentration',
    title: 'Concentration',
    options: [
      { value: 'yes', label: 'Concentration' },
      { value: 'no', label: 'Non-Concentration' },
    ],
    match: (spell, selected) => {
      const isConc = isConcentrationSpell(spell)
      return (selected.includes('yes') && isConc) || (selected.includes('no') && !isConc)
    },
  },
  {
    key: 'components',
    title: 'Casting Requirement',
    options: [
      { value: 'V', label: 'Verbal (V)' },
      { value: 'S', label: 'Somatic (S)' },
      { value: 'M', label: 'Material / Component (M)' },
    ],
    match: (spell, selected) => {
      const tags = getSpellComponentTags(spell)
      return selected.every((req) => tags.has(req))
    },
  },
  {
    key: 'castingTime',
    title: 'Casting Time',
    options: [
      { value: 'action', label: '1 Action' },
      { value: 'bonus', label: '1 Bonus Action' },
      { value: 'reaction', label: '1 Reaction' },
      { value: 'longer', label: '1 Minute or Longer' },
      { value: 'ritual', label: 'Ritual' },
    ],
    match: (spell, selected) => {
      const bucket = getCastingTimeBucket(spell)
      return selected.some((val) => {
        if (val === 'ritual') return Boolean(spell.ritual)
        return bucket === val
      })
    },
  },
]

const SPELL_COLUMNS = [
  {
    key: 'name',
    label: 'Name',
    width: '1fr',
    render: (s) => s.name,
  },
  {
    key: 'level',
    label: 'Level',
    width: '3.75rem',
    align: 'center',
    render: (s) => <span className="font-mono">{s.level === 0 ? 'Cantrip' : s.level}</span>,
  },
  {
    key: 'time',
    label: 'Time',
    width: '5.5rem',
    render: (s) => s.castingTime || '—',
  },
  {
    key: 'school',
    label: 'School',
    width: '6rem',
    render: (s) => <span className="capitalize">{s.school || '—'}</span>,
  },
  {
    key: 'conc',
    label: 'Conc.',
    width: '3.25rem',
    align: 'center',
    render: (s) => (isConcentrationSpell(s) ? <span className="font-bold">x</span> : '—'),
  },
  {
    key: 'range',
    label: 'Range',
    width: '5.25rem',
    render: (s) => s.range || '—',
  },
]

export default function SpellsPage() {
  const navigate = useNavigate()
  const { clearInspect } = useInteraction()

  const [spells, setSpells] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  const {
    search,
    setSearch,
    sections,
    filteredItems: filteredSpells,
    activeFilterCount,
    toggleFilter,
    selectAllFilter,
    clearFilter,
    clearAllFilters,
  } = useCatalogFilters(spells, SPELL_FILTER_CONFIGS)

  const {
    entries: spellbook,
    importError,
    isImporting,
    addItem: addSpell,
    removeItem: removeSpell,
    clearRoster: clearSpellbook,
    getCount: getSpellCount,
    exportJson: exportSpellsJson,
    importJsonFile: importSpellsFile,
  } = useRosterBuilder({
    storageKey: SPELLS_STORAGE_KEY,
    schema: SPELLS_SCHEMA_VERSION,
    catalog: spells,
    allowDuplicates: false,
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetchAllSpells()
      .then((list) => {
        if (!cancelled) setSpells(list)
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

  function handleSelectSpell(spell) {
    clearInspect()
    setSelectedId(spell.id)
  }

  function handleSendToCardMaker() {
    if (spellbook.length === 0) return

    try {
      localStorage.setItem(
        CARD_BRIDGE_STORAGE_KEY,
        JSON.stringify({
          cardType: 'spells',
          ids: spellbook.map((entry) => entry.item.id),
        }),
      )
    } catch {
      // Ignore storage errors
    }

    navigate('/card-maker')
  }

  const activeSpell = useMemo(() => {
    if (!selectedId) return null
    return (
      spells.find((s) => s.id === selectedId) ??
      spellbook.find((e) => e.item.id === selectedId)?.item ??
      null
    )
  }, [selectedId, spells, spellbook])

  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">Spells</h1>

      <SearchBar value={search} onChange={setSearch} placeholder="Search spells by name" />

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
        {loading && <StatusMessage>Loading spells…</StatusMessage>}
        {error && <StatusMessage type="error">{error}</StatusMessage>}

        {!loading && !error && (
          <>
            <p className="mb-2 text-sm text-stone-500">
              {filteredSpells.length} {filteredSpells.length === 1 ? 'spell' : 'spells'}
            </p>

            {filteredSpells.length === 0 ? (
              <StatusMessage>No spells match your search and filters.</StatusMessage>
            ) : (
              <div className="grid gap-6 lg:grid-cols-12">
                {/* Left column: scrollable spell list */}
                <div className="lg:col-span-5">
                  <ul className="max-h-[78vh] divide-y divide-stone-200 overflow-y-auto rounded border border-stone-300 bg-white shadow-sm">
                    {filteredSpells.map((spell) => {
                      const isActive = selectedId === spell.id

                      return (
                        <li key={spell.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectSpell(spell)}
                            className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors ${
                              isActive ? 'bg-red-50' : 'hover:bg-stone-50'
                            }`}
                          >
                            <span
                              className={`truncate text-sm font-medium ${
                                isActive ? 'text-red-900' : 'text-stone-900'
                              }`}
                            >
                              {spell.name}
                            </span>

                            <span className="flex shrink-0 items-center gap-1.5 text-[11px] capitalize text-stone-500">
                              <span>{spell.level === 0 ? 'Cantrip' : `Lvl ${spell.level}`}</span>
                              {spell.school && <span>• {spell.school}</span>}
                              <span className="text-stone-400 uppercase">{spell.source}</span>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                {/* Right column: Spellbook RosterTable + SpellPreviewPanel */}
                <div className="space-y-4 lg:col-span-7">
                  <RosterTable
                    columns={SPELL_COLUMNS}
                    entries={spellbook}
                    selectedId={selectedId}
                    onSelect={handleSelectSpell}
                    emptyMessage="No spells in spellbook yet. Select a spell below and click + to add it, or import a saved .json file."
                    summary={
                      <span>
                        Total:{' '}
                        <strong>
                          {spellbook.length} {spellbook.length === 1 ? 'spell' : 'spells'}
                        </strong>
                      </span>
                    }
                    importError={importError}
                    isImporting={isImporting}
                    onImportFile={(file) =>
                      importSpellsFile(file, (imported) => {
                        setSelectedId(imported[0].item.id)
                      })
                    }
                    onExport={() => exportSpellsJson('spellbook')}
                    onClear={clearSpellbook}
                    actionLabel="Send to Card Maker →"
                    onAction={handleSendToCardMaker}
                  />

                  <SpellPreviewPanel
                    spell={activeSpell}
                    rosterCount={getSpellCount(activeSpell?.id)}
                    onAddSpell={addSpell}
                    onRemoveSpell={removeSpell}
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