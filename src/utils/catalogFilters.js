export const SOURCE_FILTER_CONFIG = {
  key: 'source',
  title: 'Source',
  selectAll: true,
  deriveOptions: (items) => {
    const unique = Array.from(
      new Set(items.map((item) => String(item.source ?? '').trim()).filter(Boolean)),
    ).sort()
    return unique.map((src) => ({ value: src, label: src.toUpperCase() }))
  },
  match: (item, selected) => selected.includes(String(item.source ?? '').trim()),
}