// Reusable loading / error text, so every page handles these states the same way.
export default function StatusMessage({ type, children }) {
  const style =
    type === 'error'
      ? 'border-red-300 bg-red-50 text-red-800'
      : 'border-stone-300 bg-white text-stone-600'

  return (
    <div role={type === 'error' ? 'alert' : 'status'} className={`rounded border p-4 ${style}`}>
      {children}
    </div>
  )
}
