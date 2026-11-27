import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = '5e-wiki-initiative-tracker-v1'

function createEmptyRow() {
  return {
    id: crypto.randomUUID(),
    initiative: '',
    name: '',
    ac: '',
    currentHp: '',
    maxHp: '',
  }
}

export default function InitiativeTrackerPage() {
  const [rows, setRows] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
      if (saved?.rows?.length > 0) return saved.rows
    } catch {
      // Ignore storage errors
    }
    return Array.from({ length: 5 }, createEmptyRow)
  })

  const [activeIndex, setActiveIndex] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
      return typeof saved?.activeIndex === 'number' ? saved.activeIndex : 0
    } catch {
      return 0
    }
  })

  const [round, setRound] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
      return typeof saved?.round === 'number' ? saved.round : 1
    } catch {
      return 1
    }
  })

  const [openHpRowId, setOpenHpRowId] = useState(null)
  const [hpDelta, setHpDelta] = useState(1)

  // Drag-and-drop state
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dropTargetIndex, setDropTargetIndex] = useState(null)

  const tableWrapperRef = useRef(null)
  const maxHpSnapshotRef = useRef({})

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rows, activeIndex, round }))
    } catch {
      // Ignore storage errors
    }
  }, [rows, activeIndex, round])

  useEffect(() => {
    function handleOutsideClick(event) {
      if (tableWrapperRef.current && !tableWrapperRef.current.contains(event.target)) {
        setOpenHpRowId(null)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  function updateRow(id, patch) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function handleRollSingle(id) {
    const roll = Math.floor(Math.random() * 20) + 1
    updateRow(id, { initiative: String(roll) })
  }

  function handleMaxHpFocus(row) {
    setOpenHpRowId(row.id)
    maxHpSnapshotRef.current[row.id] = row.maxHp
  }

  function handleMaxHpChange(row, rawValue) {
    if (!(row.id in maxHpSnapshotRef.current)) {
      maxHpSnapshotRef.current[row.id] = row.maxHp
    }
    const cleaned = rawValue.replace(/[^\d]/g, '')
    updateRow(row.id, { maxHp: cleaned })
  }

  function handleMaxHpCommit(row) {
    const prevMax = maxHpSnapshotRef.current[row.id] ?? ''
    delete maxHpSnapshotRef.current[row.id]

    const nextMax = row.maxHp
    if (nextMax === '' || nextMax === prevMax) return

    const wasEmpty = row.currentHp === ''
    const wasAtFullHp = prevMax !== '' && row.currentHp === prevMax

    if (wasEmpty || wasAtFullHp) {
      updateRow(row.id, { currentHp: nextMax })
    }
  }

  function handleCurrentHpChange(row, rawValue) {
    const cleaned = rawValue.replace(/[^\d-]/g, '')
    updateRow(row.id, { currentHp: cleaned })
  }

  function applyHpDelta(row, sign) {
    const amount = Math.max(0, Number(hpDelta) || 0)
    const baseCurrent = row.currentHp === '' ? Number(row.maxHp) || 0 : Number(row.currentHp) || 0
    const nextHp = Math.max(0, baseCurrent + sign * amount)

    updateRow(row.id, { currentHp: String(nextHp) })
  }

  // Drag-and-drop handlers
  function handleDragStart(e, index) {
    setDraggedIndex(index)
    setOpenHpRowId(null)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  function handleDragOver(e, index) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dropTargetIndex !== index) {
      setDropTargetIndex(index)
    }
  }

  function handleDrop(e, targetIndex) {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null)
      setDropTargetIndex(null)
      return
    }

    const activeId = rows[activeIndex]?.id
    const nextRows = [...rows]
    const [movedRow] = nextRows.splice(draggedIndex, 1)
    nextRows.splice(targetIndex, 0, movedRow)

    setRows(nextRows)

    if (activeId) {
      const newActiveIdx = nextRows.findIndex((r) => r.id === activeId)
      setActiveIndex(newActiveIdx >= 0 ? newActiveIdx : 0)
    }

    setDraggedIndex(null)
    setDropTargetIndex(null)
  }

  function handleDragEnd() {
    setDraggedIndex(null)
    setDropTargetIndex(null)
  }

  function handleAddRow() {
    setRows((prev) => [...prev, createEmptyRow()])
  }

  function handleRemoveRow(indexToRemove, rowId) {
    if (openHpRowId === rowId) setOpenHpRowId(null)

    setRows((prev) => {
      if (prev.length <= 1) {
        return [createEmptyRow()]
      }
      const next = prev.filter((_, idx) => idx !== indexToRemove)
      setActiveIndex((currActive) => {
        if (indexToRemove < currActive) return Math.max(0, currActive - 1)
        if (currActive >= next.length) return 0
        return currActive
      })
      return next
    })
  }

  function handleNextTurn() {
    if (rows.length === 0) return
    if (activeIndex + 1 >= rows.length) {
      setActiveIndex(0)
      setRound((r) => r + 1)
    } else {
      setActiveIndex((idx) => idx + 1)
    }
  }

  function handleSort() {
    const activeId = rows[activeIndex]?.id
    const sorted = [...rows].sort((a, b) => {
      const aEmpty = a.initiative === ''
      const bEmpty = b.initiative === ''
      if (aEmpty && bEmpty) return 0
      if (aEmpty) return 1
      if (bEmpty) return -1
      return Number(b.initiative) - Number(a.initiative)
    })
    setRows(sorted)
    if (activeId) {
      const newIdx = sorted.findIndex((r) => r.id === activeId)
      setActiveIndex(newIdx >= 0 ? newIdx : 0)
    }
  }

  function handleRollAll() {
    const hasEmpty = rows.some((r) => r.initiative === '')
    setRows((prev) =>
      prev.map((row) => {
        if (hasEmpty && row.initiative !== '') return row
        const roll = Math.floor(Math.random() * 20) + 1
        return { ...row, initiative: String(roll) }
      }),
    )
  }

  function handleClear() {
    setRows(Array.from({ length: 5 }, createEmptyRow))
    setActiveIndex(0)
    setRound(1)
    setOpenHpRowId(null)
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold">Initiative Tracker</h1>
          <p className="text-sm text-stone-500">
            Track turn order, AC, and hit points during combat. Drag <span className="font-mono">⋮⋮</span> to reorder rows manually.
          </p>
        </div>
      </div>

      {/* Main Tracker Table */}
      <div
        ref={tableWrapperRef}
        className="overflow-visible rounded-lg border border-stone-700 bg-white shadow-sm"
      >
        {/* Header Row */}
        <div className="grid grid-cols-[7.25rem_1fr_5rem_8.5rem_3rem] rounded-t-lg border-b border-stone-700 bg-stone-50 text-xs font-bold tracking-wide text-stone-700 uppercase">
          <div className="border-r border-stone-700 px-3 py-2.5 text-center">Initiative</div>
          <div className="border-r border-stone-700 px-3 py-2.5">Name</div>
          <div className="border-r border-stone-700 px-3 py-2.5 text-center">AC</div>
          <div className="border-r border-stone-700 px-3 py-2.5 text-center">HP</div>
          <div className="px-2 py-2.5 text-center" aria-label="Remove row" />
        </div>

        {/* Combatant Rows */}
        <div>
          {rows.map((row, idx) => {
            const isActive = idx === activeIndex
            const isHpOpen = openHpRowId === row.id
            const isDown =
              row.currentHp !== '' && row.maxHp !== '' && Number(row.currentHp) <= 0
            const isLast = idx === rows.length - 1
            const isDragging = draggedIndex === idx
            const isDropTarget = dropTargetIndex === idx && draggedIndex !== idx

            return (
              <div
                key={row.id}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                className={`relative grid grid-cols-[7.25rem_1fr_5rem_8.5rem_3rem] items-center transition-colors ${
                  !isLast ? 'border-b border-stone-700' : 'rounded-b-lg'
                } ${
                  isActive
                    ? 'border-l-4 border-l-sky-500 !bg-sky-950/45'
                    : 'hover:bg-stone-800/40'
                } ${isDragging ? 'opacity-40' : ''} ${
                  isDropTarget
                    ? draggedIndex !== null && draggedIndex < idx
                      ? 'border-b-2 border-b-sky-400'
                      : 'border-t-2 border-t-sky-400'
                    : ''
                }`}
              >
                {/* 1. Drag Handle + Initiative Column */}
                <div className="group/init relative flex h-12 items-center border-r border-stone-700 pl-1.5 pr-2">
                  <span
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragEnd={handleDragEnd}
                    title="Drag to reorder row"
                    aria-label="Drag to reorder row"
                    className="flex h-7 w-5 shrink-0 cursor-grab items-center justify-center rounded text-xs tracking-tighter text-stone-500 select-none hover:bg-stone-800 hover:text-sky-400 active:cursor-grabbing"
                  >
                    ⋮⋮
                  </span>

                  <input
                    type="text"
                    inputMode="numeric"
                    value={row.initiative}
                    onChange={(e) =>
                      updateRow(row.id, {
                        initiative: e.target.value.replace(/[^\d-]/g, ''),
                      })
                    }
                    placeholder="—"
                    aria-label="Initiative"
                    className="w-full rounded bg-transparent px-1 py-1 text-center font-mono text-sm font-semibold text-stone-900 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => handleRollSingle(row.id)}
                    title="Roll 1d20 for this combatant"
                    aria-label="Roll initiative for this row"
                    className="absolute right-1.5 flex h-6 w-6 items-center justify-center rounded border border-sky-500/60 bg-sky-950/90 opacity-0 shadow-sm transition-opacity group-hover/init:opacity-100 focus:opacity-100 hover:border-sky-400 hover:bg-sky-900"
                  >
                    <img
                      src="/d20_icon.svg"
                      alt="Roll d20"
                      className="h-3.5 w-3.5 object-contain invert"
                    />
                  </button>
                </div>

                {/* 2. Name Column (with active turn ▶ indicator) */}
                <div className="flex h-12 items-center gap-2 border-r border-stone-700 px-3">
                  <button
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    title="Set as active turn"
                    className={`shrink-0 text-xs transition ${
                      isActive ? 'text-sky-400' : 'text-stone-500 hover:text-sky-400'
                    }`}
                  >
                    ▶
                  </button>
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateRow(row.id, { name: e.target.value })}
                    placeholder="Combatant name..."
                    aria-label="Combatant name"
                    className={`w-full rounded bg-transparent px-1.5 py-1 text-sm font-medium focus:ring-1 focus:ring-sky-500 focus:outline-none ${
                      isDown ? 'text-stone-400 line-through' : 'text-stone-900'
                    }`}
                  />
                </div>

                {/* 3. AC Column */}
                <div className="flex h-12 items-center border-r border-stone-700 px-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={row.ac}
                    onChange={(e) =>
                      updateRow(row.id, { ac: e.target.value.replace(/[^\d]/g, '') })
                    }
                    placeholder="—"
                    aria-label="Armor Class"
                    className="w-full rounded bg-transparent px-1 py-1 text-center font-mono text-sm text-stone-800 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                {/* 4. HP Column (Left = Current HP, Right = Max HP) */}
                <div
                  onClick={() => {
                    if (openHpRowId !== row.id) {
                      setOpenHpRowId(row.id)
                      setHpDelta(1)
                    }
                  }}
                  className="relative flex h-12 cursor-pointer items-center justify-center border-r border-stone-700 px-1.5"
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    value={row.currentHp}
                    onFocus={() => setOpenHpRowId(row.id)}
                    onChange={(e) => handleCurrentHpChange(row, e.target.value)}
                    placeholder="Cur"
                    aria-label="Current HP"
                    className={`w-12 rounded bg-transparent px-1 py-1 text-right font-mono text-sm font-semibold focus:ring-1 focus:ring-sky-500 focus:outline-none ${
                      isDown ? 'text-red-500' : 'text-stone-900'
                    }`}
                  />
                  <span className="mx-1 font-mono text-sm text-stone-400 select-none">/</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={row.maxHp}
                    onFocus={() => handleMaxHpFocus(row)}
                    onBlur={() => handleMaxHpCommit(row)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                    }}
                    onChange={(e) => handleMaxHpChange(row, e.target.value)}
                    placeholder="Max"
                    aria-label="Maximum HP"
                    className="w-12 rounded bg-transparent px-1 py-1 text-left font-mono text-sm text-stone-700 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />

                  {/* HP Adjustment Popover Below HP Cell */}
                  {isHpOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-full right-0 z-30 mt-1 flex items-center gap-1.5 rounded-lg border border-stone-600 bg-white p-1.5 shadow-xl"
                    >
                      <button
                        type="button"
                        onClick={() => applyHpDelta(row, -1)}
                        title="Subtract HP (Damage)"
                        aria-label="Subtract HP"
                        className="flex h-8 w-8 items-center justify-center rounded border border-stone-600 bg-stone-50 text-base font-bold text-red-400 hover:border-red-500 hover:bg-red-950/40"
                      >
                        −
                      </button>

                      <input
                        type="number"
                        min="0"
                        value={hpDelta}
                        onChange={(e) => setHpDelta(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') applyHpDelta(row, -1)
                          if (e.key === 'Escape') setOpenHpRowId(null)
                        }}
                        aria-label="HP change amount"
                        className="h-8 w-14 rounded border border-stone-600 bg-white px-1.5 text-center font-mono text-sm font-semibold text-stone-900 focus:border-sky-500 focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => applyHpDelta(row, 1)}
                        title="Add HP (Heal)"
                        aria-label="Add HP"
                        className="flex h-8 w-8 items-center justify-center rounded border border-stone-600 bg-stone-50 text-base font-bold text-emerald-400 hover:border-emerald-500 hover:bg-emerald-950/40"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>

                {/* 5. Fast Remove Column */}
                <div className="flex h-12 items-center justify-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(idx, row.id)}
                    title="Remove row"
                    aria-label="Remove row"
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-stone-600 text-xs text-stone-400 transition hover:border-sky-500 hover:bg-sky-950/50 hover:text-sky-300"
                  >
                    −
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleNextTurn}
            className="rounded bg-sky-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-600"
          >
            Next
          </button>

          <button
            type="button"
            onClick={handleSort}
            className="rounded border border-stone-600 bg-white px-3.5 py-2 text-sm font-medium text-stone-800 hover:border-sky-500"
          >
            Sort
          </button>

          <button
            type="button"
            onClick={handleRollAll}
            className="rounded border border-stone-600 bg-white px-3.5 py-2 text-sm font-medium text-stone-800 hover:border-sky-500"
          >
            Roll all
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="rounded border border-red-400/60 bg-white px-3.5 py-2 text-sm font-medium text-red-400 hover:border-red-400 hover:bg-red-950/30"
          >
            Clear
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm font-medium text-stone-700">
            <span>Round</span>
            <span className="font-mono text-base font-bold text-stone-900">{round}</span>
            <button
              type="button"
              onClick={() => {
                setRound(1)
                setActiveIndex(0)
              }}
              title="Reset round to 1"
              aria-label="Reset round"
              className="ml-1 rounded px-1.5 py-0.5 text-stone-400 hover:bg-stone-800 hover:text-sky-300"
            >
              ↻
            </button>
          </div>

          <button
            type="button"
            onClick={handleAddRow}
            title="Add empty row"
            aria-label="Add empty row"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-700 text-xl font-bold text-white shadow-sm transition hover:bg-sky-600"
          >
            +
          </button>
        </div>
      </div>
    </section>
  )
}