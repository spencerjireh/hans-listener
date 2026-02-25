import { useState, useCallback } from 'react'

export function useSentences() {
  const [sentences, setSentences] = useState<string[]>([])
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(-1)

  const loadSentences = useCallback(async (text: string) => {
    const texts = await window.hansListenerAPI.splitSentences(text)
    setSentences(texts)
    setActiveSentenceIndex(-1)
    return texts
  }, [])

  return {
    sentences,
    activeSentenceIndex,
    setActiveSentenceIndex,
    loadSentences,
  }
}
