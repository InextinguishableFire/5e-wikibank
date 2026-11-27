import { useEffect, useRef, useState } from 'react'
import { useInteraction } from '../context/InteractionContext.jsx'

function parseAndRoll(rawInput) {
  const cleaned = rawInput.trim().toLowerCase().replace(/\s+/g, '')
  const match = cleaned.match(/^(\d*)d(\d+)([+-]\d+)?$/)
  if (!match) return null

  const count = match[1] === '' ? 1 : Number(match[1])
  const sides = Number(match[2])
  const modifier = match[3] ? Number(match[3]) : 0

  if (count < 1 || count > 100 || sides < 2 || sides > 1000) {
    return { error: 'Use 1–100 dice with 2–1000 sides (e.g. 5d8).' }
  }

  const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1)
  const diceSum = rolls.reduce((acc, n) => acc + n, 0)
  const total = diceSum + modifier

  const label = `${count}d${sides}${modifier > 0 ? `+${modifier}` : modifier < 0 ? modifier : ''}`

  let breakdown = rolls.join(' + ')
  if (modifier > 0) breakdown += ` + ${modifier}`
  if (modifier < 0) breakdown += ` - ${Math.abs(modifier)}`

  const isSingleD20 = count === 1 && sides === 20 && modifier === 0

  return {
    id: crypto.randomUUID(),
    label,
    rolls,
    breakdown,
    total,
    showEquation: count > 1 || modifier !== 0,
    isCrit: isSingleD20 && rolls[0] === 20,
    isFumble: isSingleD20 && rolls[0] === 1,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
}

export default function DiceTray() {
  const { pendingRoll } = useInteraction()

  const [isOpen, setIsOpen] = useState(false)
  const [formula, setFormula] = useState('')
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])

  const bottomRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [history, isOpen])

  function executeRoll(expression) {
    const result = parseAndRoll(expression)
    if (!result) {
      setError('Invalid format. Try 5d8, 1d20, or 2d6+3.')
      return false
    }
    if (result.error) {
      setError(result.error)
      return false
    }

    setError('')
    setHistory((prev) => [...prev, result])
    return true
  }

  // Triggered whenever a clickable dice link is clicked anywhere in the app
  useEffect(() => {
    if (!pendingRoll) return
    setIsOpen(true)
    executeRoll(pendingRoll.formula)
  }, [pendingRoll])

  function handleSubmit(event) {
    event.preventDefault()
    if (!formula.trim()) return
    if (executeRoll(formula)) {
      setFormula('')
    }
  }

  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end print:hidden">
      {isOpen && (
        <div className="mb-3 flex h-[28rem] w-96 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-lg border border-stone-300 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-3">
            <span className="text-sm font-bold tracking-wide text-stone-700 uppercase">
              Dice Tray
            </span>

            <div className="flex items-center gap-3">
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHistory([])}
                  className="text-xs font-medium text-stone-500 hover:text-red-800"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close dice tray"
                className="rounded px-2 py-1 text-sm font-bold text-stone-500 hover:bg-stone-200 hover:text-stone-900"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
            {history.length === 0 ? (
              <p className="pt-12 text-center text-sm leading-relaxed text-stone-500">
                Click the <span className="font-semibold">d20</span> button or enter a formula like{' '}
                <span className="font-mono font-semibold">5d8</span> below.
              </p>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border border-stone-200 bg-stone-50 px-3.5 py-2.5"
                >
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span className="font-mono text-sm font-bold text-red-800">{item.label}</span>
                    <span>{item.time}</span>
                  </div>

                  <p className="mt-1 font-mono text-sm leading-relaxed break-words text-stone-800">
                    {item.showEquation ? (
                      <>
                        <span>{item.breakdown} = </span>
                        <strong className="text-lg font-bold text-stone-900">{item.total}</strong>
                      </>
                    ) : (
                      <strong
                        className={`text-lg font-bold ${
                          item.isCrit
                            ? 'text-emerald-500'
                            : item.isFumble
                              ? 'text-red-500'
                              : 'text-stone-900'
                        }`}
                      >
                        {item.total}
                        {item.isCrit && ' (Nat 20!)'}
                        {item.isFumble && ' (Nat 1)'}
                      </strong>
                    )}
                  </p>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {error && (
            <p className="border-t border-stone-200 bg-red-50 px-4 py-1.5 text-xs text-red-800">
              {error}
            </p>
          )}

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-stone-200 bg-stone-50 p-3"
          >
            <button
              type="button"
              onClick={() => executeRoll('1d20')}
              title="Roll 1d20"
              aria-label="Roll 1d20"
              className="flex shrink-0 items-center justify-center rounded-md border border-stone-300 bg-white p-2 transition hover:border-red-700"
            >
              <img src="/d20_icon.svg" alt="d20" className="h-6 w-6 object-contain" />
            </button>

            <input
              type="text"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="e.g. 5d8"
              aria-label="Dice formula"
              className="min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-sm focus:border-red-700 focus:outline-none"
            />

            <button
              type="submit"
              className="shrink-0 rounded-md bg-red-800 px-3.5 py-2 text-sm font-medium text-white hover:bg-red-700 active:bg-red-950"
            >
              Roll
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Toggle Dice Tray"
        aria-label="Toggle Dice Tray"
        className="flex h-14 w-14 items-center justify-center rounded-full border border-stone-300 bg-white shadow-lg transition hover:scale-105 hover:border-red-700"
      >
        <img src="/d20_icon.svg" alt="Dice Tray" className="h-8 w-8 object-contain" />
      </button>
    </div>
  )
}