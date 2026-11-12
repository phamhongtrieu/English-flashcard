import { useCallback, useEffect, useState } from 'react'
import { loadCatalog, loadUnit } from '../services/unitLoader'

function useResource<T>(key: string, loader: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>({ key })
  useEffect(() => {
    const controller = new AbortController()
    setState({ key })
    loader(controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ key, data })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ key, error: error instanceof Error ? error.message : 'Không tải được dữ liệu.' })
    })
    return () => controller.abort()
  }, [key, loader])
  return state.key === key ? state : { key }
}
export function useUnitData(id: string) {
  const loader = useCallback((signal: AbortSignal) => loadUnit(id, signal), [id])
  return useResource(id, loader)
}
export function useUnitCatalog() { return useResource('catalog', loadCatalog) }
