import { useInteraction } from '../context/InteractionContext.jsx'

// Strips [[type:...|label]] tokens back to plain text (used by Card Maker)
export function stripTokens(text) {
  if (!text) return ''
  return text.replace(/\[\[(?:dice|spell|item):([^\]]+)\]\]/g, (_m, inner) => {
    const parts = inner.split('|')
    return parts[parts.length - 1]
  })
}

export default function RichText({ text }) {
  const { triggerDiceRoll, inspectReference } = useInteraction()

  if (!text) return null

  // Matches [[dice:formula|label]], [[spell:name|src|label]], [[item:name|src|label]], OR raw NdM dice like 3d6+4
  const pattern = /(\[\[(?:dice|spell|item):[^\]]+\]\]|\b\d+d\d+(?:\s*[+-]\s*\d+)?\b)/g
  const segments = text.split(pattern)

  return (
    <>
      {segments.map((part, idx) => {
        if (!part) return null

        // 1. Structured [[...]] token from 5etools JSON
        const tokenMatch = part.match(/^\[\[(dice|spell|item):([^\]]+)\]\]$/)
        if (tokenMatch) {
          const [, kind, payload] = tokenMatch
          const parts = payload.split('|')

          if (kind === 'dice') {
            const [formula, label] = parts
            return (
              <button
                key={idx}
                type="button"
                onClick={() => triggerDiceRoll(formula)}
                title={`Roll ${formula}`}
                className="inline rounded bg-stone-100 px-1 py-0.5 font-mono text-xs font-semibold text-red-800 underline decoration-dotted hover:bg-red-50"
              >
                {label || formula}
              </button>
            )
          }

          const [name, source, label] = parts
          return (
            <button
              key={idx}
              type="button"
              onClick={() => inspectReference({ kind, name, source })}
              title={`Preview ${label || name}`}
              className="inline font-medium text-red-800 underline decoration-dotted hover:text-red-700"
            >
              {label || name}
            </button>
          )
        }

        // 2. Plain NdM dice expression (e.g. from Monster stat blocks)
        if (/^\d+d\d+(?:\s*[+-]\s*\d+)?$/i.test(part)) {
          return (
            <button
              key={idx}
              type="button"
              onClick={() => triggerDiceRoll(part)}
              title={`Roll ${part}`}
              className="inline rounded bg-stone-100 px-1 py-0.5 font-mono text-xs font-semibold text-red-800 underline decoration-dotted hover:bg-red-50"
            >
              {part}
            </button>
          )
        }

        return <span key={idx}>{part}</span>
      })}
    </>
  )
}