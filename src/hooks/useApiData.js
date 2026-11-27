import { useEffect, useState } from 'react'

// Custom hook that runs `fetchData()` and tracks the three states every
// page needs: data, loading and error.
// Pass `dependency` (e.g. an id from the URL) to fetch again when it changes.
export default function useApiData(fetchData, dependency) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false // ignore the answer if the user already left the page
    setLoading(true)
    setError(null)

    fetchData()
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load data. Please try again later.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependency])

  return { data, loading, error }
}
