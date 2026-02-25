import { useState, useEffect, useCallback } from 'react'
import type { HistoryEntryMeta } from '../../shared/types'

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntryMeta[]>([])

  const refresh = useCallback(async () => {
    try {
      const data = await window.hansListenerAPI.getHistory()
      setEntries(data)
    } catch (err) {
      console.error('Failed to load history:', err)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const loadWav = useCallback(async (id: string): Promise<ArrayBuffer> => {
    return window.hansListenerAPI.loadHistoryWav(id)
  }, [])

  return { entries, refresh, loadWav }
}
