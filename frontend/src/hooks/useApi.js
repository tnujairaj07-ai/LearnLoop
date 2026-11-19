import { useCallback, useEffect, useRef, useState } from 'react'

// Standardises loading / error / empty / data states for any async service
// call, so every page handles the API the same way.
export function useApi(fetcher, deps = [], { skip = false, emptyWhen } = {}) {
  const [state, setState] = useState({ status: skip ? 'idle' : 'loading', data: null, error: null })
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const requestIdRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const run = useCallback(async () => {
    const reqId = ++requestIdRef.current
    setState((s) => ({ ...s, status: 'loading', error: null }))
    try {
      const data = await fetcherRef.current()
      if (!mountedRef.current || reqId !== requestIdRef.current) return
      setState({ status: 'success', data, error: null })
    } catch (error) {
      if (!mountedRef.current || reqId !== requestIdRef.current) return
      setState({ status: 'error', data: null, error })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    if (skip) return
    run()
  }, [run, skip])

  const effectiveStatus = !skip && state.status === 'idle' ? 'loading' : state.status
  const isEmpty =
    effectiveStatus === 'success' &&
    (emptyWhen ? emptyWhen(state.data) : Array.isArray(state.data) && state.data.length === 0)

  return { ...state, status: effectiveStatus, isEmpty, refetch: run }
}
