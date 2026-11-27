// A "controlled input": the text shown always comes from the `value` prop,
// and every keystroke is reported to the parent through `onChange`.
export default function SearchBar({ value, onChange, placeholder }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="w-full rounded border border-stone-300 bg-white px-4 py-2 shadow-sm focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-700/30"
    />
  )
}
