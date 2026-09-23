import { useCallback, useEffect, useRef, useState } from 'react'

// Standardises loading / error / empty / data states for any async service
// call, so every page handles the API the same way.
export function useApi(fetcher, deps = [], { skip = false, emptyWhen } = {}) {
  const [state, setState] = useState({ status: skip ? 'idle' : 'loading', data: null, error: null })
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const run = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading', error: null }))
    try {
      const data = await fetcherRef.current()
      setState({ status: 'success', data, error: null })
    } catch (error) {
      setState({ status: 'error', data: null, error })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    if (skip) return
    run()
  }, [run, skip])

  const isEmpty =
    state.status === 'success' &&
    (emptyWhen ? emptyWhen(state.data) : Array.isArray(state.data) && state.data.length === 0)

  return { ...state, isEmpty, refetch: run }
}
