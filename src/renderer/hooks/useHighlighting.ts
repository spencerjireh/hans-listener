import { useState, useRef, useCallback, useEffect } from 'react'
import type { WordTiming } from '../../shared/types'

export function useHighlighting(
  timings: WordTiming[],
  getCurrentTime: () => number,
  isPlaying: boolean
) {
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1)
  const rafRef = useRef<number>(0)

  const tick = useCallback(() => {
    const t = getCurrentTime()
    let found = -1
    for (let i = 0; i < timings.length; i++) {
      if (t >= timings[i].start && t < timings[i].end) {
        found = i
        break
      }
    }
    setActiveWordIndex(found)
    rafRef.current = requestAnimationFrame(tick)
  }, [timings, getCurrentTime])

  useEffect(() => {
    if (isPlaying && timings.length > 0) {
      rafRef.current = requestAnimationFrame(tick)
    } else {
      cancelAnimationFrame(rafRef.current)
      if (!isPlaying) setActiveWordIndex(-1)
    }
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying, timings, tick])

  return activeWordIndex
}
