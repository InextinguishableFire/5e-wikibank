//- Call triggerDiceRoll('3d6') to open DiceTray and immediately roll that formula.
//- Call inspectReference({ kind: 'spell' | 'item', name, source }) to push a Spell or Item preview onto 
//a stack inside your sticky right-hand panel with a  Back button.

import { createContext, useContext, useState } from 'react'

const InteractionContext = createContext(null)

export function InteractionProvider({ children }) {
  // Dice roll trigger consumed by DiceTray
  const [pendingRoll, setPendingRoll] = useState(null)

  // Stack of quick-inspected spells/items shown inside the sticky right-hand panel
  const [inspectStack, setInspectStack] = useState([])
  const [inspectLoading, setInspectLoading] = useState(false)

  function triggerDiceRoll(formula) {
    setPendingRoll({ formula, id: crypto.randomUUID() })
  }

  async function inspectReference({ kind, name, source }) {
    setInspectLoading(true)
    try {
      const endpoint = kind === 'spell' ? '/api/spells' : '/api/items'
      const res = await fetch(`http://localhost:3001${endpoint}?search=${encodeURIComponent(name)}`)
      const list = res.ok ? await res.json() : []

      const normalized = name.trim().toLowerCase()
      const exactMatches = list.filter((e) => e.name.toLowerCase() === normalized)
      const chosen =
        (source && exactMatches.find((e) => e.source.toLowerCase() === source.toLowerCase())) ||
        exactMatches[0] ||
        list[0]

      if (chosen) {
        setInspectStack((prev) => [...prev, { kind, data: chosen }])
        return
      }

      // Fallback to dnd5eapi.co SRD if the spell isn't in your local server/data/spells folder yet
      if (kind === 'spell') {
        const slug = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        const srdRes = await fetch(`https://www.dnd5eapi.co/api/2014/spells/${slug}`)
        if (srdRes.ok) {
          const s = await srdRes.json()
          setInspectStack((prev) => [
            ...prev,
            {
              kind: 'spell',
              data: {
                id: s.index,
                name: s.name,
                source: 'SRD',
                sourceName: '5e SRD (2014)',
                levelLabel:
                  s.level === 0 ? `${s.school?.name} cantrip` : `Level ${s.level} ${s.school?.name}`,
                castingTime: s.casting_time,
                range: s.range,
                components: (s.components ?? []).join(', '),
                duration: s.concentration ? `Concentration, ${s.duration}` : s.duration,
                description: [...(s.desc ?? []), ...(s.higher_level ?? [])],
              },
            },
          ])
        }
      }
    } finally {
      setInspectLoading(false)
    }
  }

  function popInspect() {
    setInspectStack((prev) => prev.slice(0, -1))
  }

  function clearInspect() {
    setInspectStack([])
  }

  return (
    <InteractionContext.Provider
      value={{
        pendingRoll,
        triggerDiceRoll,
        inspectStack,
        inspectLoading,
        inspectReference,
        popInspect,
        clearInspect,
      }}
    >
      {children}
    </InteractionContext.Provider>
  )
}

export function useInteraction() {
  const ctx = useContext(InteractionContext)
  if (!ctx) throw new Error('useInteraction must be used inside InteractionProvider')
  return ctx
}