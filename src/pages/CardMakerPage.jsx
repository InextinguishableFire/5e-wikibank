import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import SearchBar from '../components/SearchBar.jsx'
import StatusMessage from '../components/StatusMessage.jsx'
import { stripTokens } from '../components/RichText.jsx'
import {
  fetchAllFeats,
  fetchFeat,
  fetchAllItems,
  fetchItem,
  fetchAllSpells,
  fetchSpell,
} from '../services/api.js'

const CARDS_PER_PAGE = 9
const COLS_PER_ROW = 3

const CARD_TYPES = {
  feats: {
    label: 'Feats',
    backIcon: '/feats_icon.svg',
    fetchAll: fetchAllFeats,
    fetchOne: fetchFeat,
  },
  items: {
    label: 'Items',
    backIcon: '/items_icon.svg',
    fetchAll: fetchAllItems,
    fetchOne: fetchItem,
  },
  spells: {
    label: 'Spells',
    backIcon: '/spells_icon.svg',
    fetchAll: fetchAllSpells,
    fetchOne: fetchSpell,
  },
}

function chunkIntoPages(items, size) {
  const pages = []
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size))
  }
  return pages
}

function buildMirroredBackSlots(pageEntries) {
  const slots = []
  for (let i = 0; i < pageEntries.length; i += COLS_PER_ROW) {
    const row = [
      pageEntries[i] ?? null,
      pageEntries[i + 1] ?? null,
      pageEntries[i + 2] ?? null,
    ]
    slots.push(...row.reverse())
  }
  return slots
}

function getSubtitle(entry, cardType) {
  if (cardType === 'items') {
    return [
      entry.type,
      entry.rarity !== 'none' ? entry.rarity : null,
      entry.attunement ? 'Attunement' : null,
    ]
      .filter(Boolean)
      .join(' • ')
  }
  if (cardType === 'spells') {
    return [entry.levelLabel, entry.castingTime, entry.range].filter(Boolean).join(' • ')
  }
  return [
    entry.sourceName || entry.source,
    entry.prerequisite ? `Req: ${entry.prerequisite}` : null,
  ]
    .filter(Boolean)
    .join(' • ')
}

// Front card that measures real DOM height and reports any overflowing paragraphs
// Front card that measures real DOM height and splits right at the overflowing word boundary
function FrontCard({ entry, cardType, iconSrc, onOverflowCalculated }) {
  const bodyRef = useRef(null)
  const paragraphs = useMemo(
    () => (entry.description ?? []).map(stripTokens),
    [entry.description],
  )

  const [splitState, setSplitState] = useState(() => ({
    front: paragraphs,
    back: [],
    wordRange: null, // { paraIndex, low, high, best } when binary-searching the boundary paragraph
    done: false,
  }))

  useEffect(() => {
    setSplitState({ front: paragraphs, back: [], wordRange: null, done: false })
  }, [entry.id, paragraphs, cardType])

  useLayoutEffect(() => {
    if (splitState.done) {
      onOverflowCalculated(entry.id, splitState.back)
      return
    }

    const el = bodyRef.current
    if (!el) return

    const fits = el.scrollHeight <= el.clientHeight + 1

    // Phase 2: Binary-search the exact word split inside the paragraph that crosses the bottom edge
    if (splitState.wordRange) {
      const { paraIndex, low, high, best } = splitState.wordRange
      const fullPara = paragraphs[paraIndex]
      const words = fullPara.split(/\s+/)
      const currentMid = Math.floor((low + high) / 2)

      let nextBest = best
      let nextLow = low
      let nextHigh = high

      if (fits) {
        nextBest = currentMid
        nextLow = currentMid + 1
      } else {
        nextHigh = currentMid - 1
      }

      // Finished binary search: lock in the longest prefix that fits on the front
      if (nextLow > nextHigh) {
        if (nextBest > 0) {
          const head = `${words.slice(0, nextBest).join(' ')}…`
          const tail = `…${words.slice(nextBest).join(' ')}`
          setSplitState({
            front: [...paragraphs.slice(0, paraIndex), head],
            back: [tail, ...paragraphs.slice(paraIndex + 1)],
            wordRange: null,
            done: true,
          })
        } else {
          // Even the first word of this paragraph didn't fit — move the whole paragraph to the back
          setSplitState({
            front: paragraphs.slice(0, paraIndex),
            back: paragraphs.slice(paraIndex),
            wordRange: null,
            done: true,
          })
        }
        return
      }

      const trialMid = Math.floor((nextLow + nextHigh) / 2)
      const trialHead = `${words.slice(0, trialMid).join(' ')}…`
      const trialTail = `…${words.slice(trialMid).join(' ')}`

      setSplitState({
        front: [...paragraphs.slice(0, paraIndex), trialHead],
        back: [trialTail, ...paragraphs.slice(paraIndex + 1)],
        wordRange: { paraIndex, low: nextLow, high: nextHigh, best: nextBest },
        done: false,
      })
      return
    }

    // Phase 1: Whole-paragraph check
    if (fits) {
      // Everything already fits without splitting
      if (splitState.back.length === 0) {
        setSplitState((prev) => ({ ...prev, done: true }))
        return
      }

      // A paragraph was moved to `back`, leaving empty space at the bottom of `front`.
      // Start binary-searching `back[0]` so its leading words fill the remaining front space.
      const boundaryIndex = splitState.front.length
      const words = paragraphs[boundaryIndex].split(/\s+/)

      if (words.length <= 1) {
        setSplitState((prev) => ({ ...prev, done: true }))
        return
      }

      const low = 1
      const high = words.length - 1
      const mid = Math.floor((low + high) / 2)

      setSplitState({
        front: [...paragraphs.slice(0, boundaryIndex), `${words.slice(0, mid).join(' ')}…`],
        back: [`…${words.slice(mid).join(' ')}`, ...paragraphs.slice(boundaryIndex + 1)],
        wordRange: { paraIndex: boundaryIndex, low, high, best: 0 },
        done: false,
      })
      return
    }

    // Still overflowing: pop one whole paragraph onto `back` and re-check
    if (splitState.front.length > 1) {
      const moved = splitState.front[splitState.front.length - 1]
      setSplitState({
        front: splitState.front.slice(0, -1),
        back: [moved, ...splitState.back],
        wordRange: null,
        done: false,
      })
      return
    }

    // Even paragraph 0 alone overflows — binary-search paragraph 0 directly
    const words = paragraphs[0].split(/\s+/)
    if (words.length <= 1) {
      setSplitState((prev) => ({ ...prev, done: true }))
      return
    }

    const low = 1
    const high = words.length - 1
    const mid = Math.floor((low + high) / 2)

    setSplitState({
      front: [`${words.slice(0, mid).join(' ')}…`],
      back: [`…${words.slice(mid).join(' ')}`, ...paragraphs.slice(1)],
      wordRange: { paraIndex: 0, low, high, best: 0 },
      done: false,
    })
  }, [splitState, entry.id, paragraphs, onOverflowCalculated])

  return (
    <article className="relative flex h-[88mm] w-[63mm] flex-col overflow-hidden rounded-[2mm] border border-dashed border-stone-500 bg-white p-[2.5mm] text-stone-900">
      {/* Top-right corner watermark at 50% opacity */}
      <img
        src={iconSrc}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute top-[2mm] right-[2mm] h-[9mm] w-[9mm] object-contain opacity-50 select-none"
      />

      <header className="relative z-10 border-b border-red-800 pr-[10mm] pb-[1mm]">
        <h2 className="text-[10pt] leading-tight font-bold text-red-900">{entry.name}</h2>
        <p className="text-[6.5pt] capitalize text-stone-500">{getSubtitle(entry, cardType)}</p>
      </header>

      <div
        ref={bodyRef}
        className="relative z-10 mt-[1.5mm] flex-1 space-y-[1.2mm] overflow-hidden text-[7pt] leading-[1.25] text-stone-800"
      >
        {splitState.front.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      {splitState.back.length > 0 && (
        <p className="relative z-10 pt-[0.5mm] text-right text-[5.5pt] italic text-stone-500">
          (continued on back ↻)
        </p>
      )}
    </article>
  )
}

// Back card: full-opacity framed logo normally, or 50% watermark behind overflow text
function BackCard({ entry, config, overflowParagraphs }) {
  const hasOverflow = overflowParagraphs && overflowParagraphs.length > 0

  if (!hasOverflow) {
    return (
      <div className="flex h-[88mm] w-[63mm] items-center justify-center rounded-[2mm] border border-dashed border-stone-500 bg-white p-[4mm]">
        <div className="flex h-full w-full flex-col items-center justify-center rounded-[1.5mm] border-2 border-stone-700 p-[3mm]">
          <div className="flex h-full w-full flex-col items-center justify-center rounded-[1mm] border border-stone-400">
            <img
              src={config.backIcon}
              alt={`${config.label} card back`}
              className="h-[24mm] w-[24mm] object-contain opacity-100"
            />
            <span className="mt-[2mm] text-[7pt] font-semibold tracking-widest text-stone-600 uppercase">
              {config.label}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <article className="relative flex h-[88mm] w-[63mm] flex-col overflow-hidden rounded-[2mm] border border-dashed border-stone-500 bg-white p-[2.5mm] text-stone-900">
      {/* Centered background logo dropped to 50% opacity behind overflow text */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
      >
        <img
          src={config.backIcon}
          alt=""
          className="h-[28mm] w-[28mm] object-contain opacity-20"
        />
      </div>

      <header className="relative z-10 flex items-baseline justify-between gap-2 border-b border-stone-300 pb-[1mm]">
        <h3 className="truncate text-[8.5pt] font-bold text-red-900">{entry.name}</h3>
        <span className="shrink-0 text-[6pt] italic text-stone-500">Continued</span>
      </header>

      <div className="relative z-10 mt-[1.5mm] flex-1 space-y-[1.2mm] overflow-hidden text-[7pt] leading-[1.25] text-stone-800">
        {overflowParagraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </article>
  )
}

export default function CardMakerPage() {
  const [cardType, setCardType] = useState('')
  const [availableEntries, setAvailableEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [search, setSearch] = useState('')
  const [selectedEntries, setSelectedEntries] = useState([])
  const [overflowById, setOverflowById] = useState({})

  useEffect(() => {
    if (!cardType || !CARD_TYPES[cardType]) {
      setAvailableEntries([])
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    CARD_TYPES[cardType]
      .fetchAll()
      .then((data) => {
        if (!cancelled) setAvailableEntries(data ?? [])
      })
      .catch(() => {
        if (!cancelled) setError(`Failed to load ${CARD_TYPES[cardType].label.toLowerCase()}.`)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [cardType])

  function handleTypeChange(nextType) {
    setCardType(nextType)
    setSearch('')
    setSelectedEntries([])
    setOverflowById({})
  }

  function handleOverflowCalculated(id, overflowParagraphs) {
    setOverflowById((prev) => {
      const existing = prev[id] ?? []
      if (
        existing.length === overflowParagraphs.length &&
        existing.every((line, idx) => line === overflowParagraphs[idx])
      ) {
        return prev
      }
      return { ...prev, [id]: overflowParagraphs }
    })
  }

  const selectedIds = useMemo(
    () => new Set(selectedEntries.map((entry) => entry.id)),
    [selectedEntries],
  )

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase()
    return availableEntries.filter((entry) => entry.name.toLowerCase().includes(query))
  }, [availableEntries, search])

  async function handleToggleEntry(entry) {
    if (selectedIds.has(entry.id)) {
      setSelectedEntries((prev) => prev.filter((item) => item.id !== entry.id))
      setOverflowById((prev) => {
        const next = { ...prev }
        delete next[entry.id]
        return next
      })
      return
    }

    if (Array.isArray(entry.description) && entry.description.length > 0) {
      setSelectedEntries((prev) => [...prev, entry])
      return
    }

    try {
      const fullEntry = await CARD_TYPES[cardType].fetchOne(entry.id)
      setSelectedEntries((prev) =>
        prev.some((e) => e.id === fullEntry.id) ? prev : [...prev, fullEntry],
      )
    } catch {
      setSelectedEntries((prev) => [...prev, entry])
    }
  }

  const pages = useMemo(() => chunkIntoPages(selectedEntries, CARDS_PER_PAGE), [selectedEntries])
  const currentConfig = CARD_TYPES[cardType] ?? null

  const pendingBridgeIdsRef = useRef(null)

  // 1. Read the bridge payload on mount and trigger loading that cardType
  useEffect(() => {
    try {
      const raw = localStorage.getItem('5e-wiki-card-bridge-v1')
      if (!raw) return
      localStorage.removeItem('5e-wiki-card-bridge-v1')

      const parsed = JSON.parse(raw)
      if (
        parsed &&
        ['feats', 'items', 'spells'].includes(parsed.cardType) &&
        Array.isArray(parsed.ids) &&
        parsed.ids.length > 0
      ) {
        const cleanIds = parsed.ids.filter((id) => typeof id === 'string')
        if (cleanIds.length > 0) {
          pendingBridgeIdsRef.current = cleanIds
          setCardType(parsed.cardType)
        }
      }
    } catch {
      // Ignore invalid bridge payloads
    }
  }, [])

  // 2. Once availableEntries loads for that cardType, hydrate and select the bridged IDs
  useEffect(() => {
    const idsToLoad = pendingBridgeIdsRef.current
    if (!idsToLoad || !cardType || availableEntries.length === 0) return

    pendingBridgeIdsRef.current = null
    let cancelled = false

    const byId = new Map(availableEntries.map((entry) => [entry.id, entry]))
    const matched = idsToLoad.map((id) => byId.get(id)).filter(Boolean)

    if (matched.length === 0) return

    Promise.all(
      matched.map(async (entry) => {
        if (Array.isArray(entry.description) && entry.description.length > 0) {
          return entry
        }
        try {
          return await CARD_TYPES[cardType].fetchOne(entry.id)
        } catch {
          return entry
        }
      }),
    ).then((fullEntries) => {
      if (!cancelled) {
        setSelectedEntries(fullEntries)
      }
    })

    return () => {
      cancelled = true
    }
  }, [cardType, availableEntries])


  return (
    <section>
      {/* Controls & Picker — hidden when printing to PDF */}
      <div className="print:hidden">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Card Maker</h1>
          <p className="text-sm text-stone-500">
            Choose a card type, pick entries, and print front + mirrored back sheets on A4.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={cardType}
              onChange={(e) => handleTypeChange(e.target.value)}
              aria-label="Select card type"
              className="rounded border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium shadow-sm"
            >
              <option value="">-- Select card type --</option>
              {Object.entries(CARD_TYPES).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </select>

            {cardType && (
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-stone-700">
                  {selectedEntries.length} selected ({pages.length * 2}{' '}
                  {pages.length === 1 ? 'side (1 front + 1 back)' : 'total A4 sides'})
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedEntries([])
                    setOverflowById({})
                  }}
                  disabled={selectedEntries.length === 0}
                  className="rounded border border-stone-300 bg-white px-3 py-1.5 text-sm hover:border-red-700 disabled:opacity-40"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={selectedEntries.length === 0}
                  className="rounded bg-red-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
                >
                  Print / Save as PDF
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Empty state before a card type is chosen */}
        {!cardType ? (
          <div className="rounded border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-500">
            Select a card type from the dropdown above to begin building your printable deck.
          </div>
        ) : (
          <>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={`Search ${currentConfig.label.toLowerCase()} to add...`}
            />

            <div className="mt-4">
              {loading && <StatusMessage>Loading {currentConfig.label.toLowerCase()}…</StatusMessage>}
              {error && <StatusMessage type="error">{error}</StatusMessage>}

              {!loading && !error && (
                <ul className="grid max-h-64 gap-2 overflow-y-auto rounded border border-stone-300 bg-white p-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredEntries.map((entry) => {
                    const isSelected = selectedIds.has(entry.id)
                    return (
                      <li key={entry.id}>
                        <label
                          className={`flex cursor-pointer items-center gap-2 rounded border px-2.5 py-1.5 text-sm transition ${
                            isSelected
                              ? 'border-red-700 bg-red-50 font-medium text-red-950'
                              : 'border-stone-200 hover:border-stone-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleEntry(entry)}
                            className="accent-red-800"
                          />
                          <span className="truncate">{entry.name}</span>
                          <span className="ml-auto text-xs text-stone-400">{entry.source}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      {/* Printable A4 Front + Mirrored Back Sheets */}
      {cardType && selectedEntries.length > 0 && (
        <div className="mt-8 space-y-8 print:mt-0 print:space-y-0">
          {pages.map((pageEntries, pageIndex) => {
            const mirroredBacks = buildMirroredBackSlots(pageEntries)

            return (
              <div key={pageIndex} className="space-y-8 print:space-y-0">
                {/* FRONT SHEET */}
                <div className="a4-sheet">
                  <p className="mb-2 text-xs font-medium text-stone-500 print:hidden">
                    Sheet {pageIndex + 1} — Front ({pageEntries.length} / {CARDS_PER_PAGE} cards)
                  </p>

                  <div className="mx-auto grid w-fit grid-cols-3 gap-[2mm] rounded border border-stone-300 bg-white p-[5mm] shadow-sm print:border-0 print:p-0 print:shadow-none">
                    {pageEntries.map((entry) => (
                      <FrontCard
                        key={entry.id}
                        entry={entry}
                        cardType={cardType}
                        iconSrc={currentConfig.backIcon}
                        onOverflowCalculated={handleOverflowCalculated}
                      />
                    ))}
                  </div>
                </div>

                {/* MIRRORED BACK SHEET */}
                <div className="a4-sheet">
                  <p className="mb-2 text-xs font-medium text-stone-500 print:hidden">
                    Sheet {pageIndex + 1} — Mirrored Back (print on reverse side)
                  </p>

                  <div className="mx-auto grid w-fit grid-cols-3 gap-[2mm] rounded border border-stone-300 bg-white p-[5mm] shadow-sm print:border-0 print:p-0 print:shadow-none">
                    {mirroredBacks.map((entry, slotIndex) =>
                      entry ? (
                        <BackCard
                          key={`back-${entry.id}`}
                          entry={entry}
                          config={currentConfig}
                          overflowParagraphs={overflowById[entry.id]}
                        />
                      ) : (
                        <div
                          key={`empty-${slotIndex}`}
                          className="h-[88mm] w-[63mm]"
                          aria-hidden="true"
                        />
                      ),
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}