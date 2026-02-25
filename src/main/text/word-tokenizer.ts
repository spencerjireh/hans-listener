import type { WordTiming } from '../../shared/types'

// Approximate German syllable count by counting vowel groups
function countSyllables(word: string): number {
  const lower = word.toLowerCase()
  // Match vowel groups (including umlauts and diphthongs)
  const matches = lower.match(/[aeiouyäöü]+/g)
  return Math.max(1, matches ? matches.length : 1)
}

export function tokenizeWords(text: string): string[] {
  // Split on whitespace and filter empty strings
  return text.split(/\s+/).filter(w => w.length > 0)
}

export function computeWordTimings(
  words: string[],
  totalDuration: number
): WordTiming[] {
  if (words.length === 0) return []

  // Calculate syllable-weighted timing
  const syllableCounts = words.map(countSyllables)
  const totalSyllables = syllableCounts.reduce((a, b) => a + b, 0)

  // Small pause between words (5% of total time distributed as inter-word gaps)
  const pauseFraction = 0.05
  const speechDuration = totalDuration * (1 - pauseFraction)
  const totalPause = totalDuration * pauseFraction
  const pausePerGap = words.length > 1 ? totalPause / (words.length - 1) : 0

  const timings: WordTiming[] = []
  let currentTime = 0

  for (let i = 0; i < words.length; i++) {
    const wordDuration = (syllableCounts[i] / totalSyllables) * speechDuration
    timings.push({
      word: words[i],
      start: currentTime,
      end: currentTime + wordDuration,
      index: i,
    })
    currentTime += wordDuration + pausePerGap
  }

  return timings
}
