// German abbreviations that end with a period but are NOT sentence endings
const ABBREVIATIONS = new Set([
  'z.b.', 'z. b.', 'd.h.', 'd. h.', 'u.a.', 'u. a.', 'o.ä.', 'o. ä.',
  'bzw.', 'ca.', 'evtl.', 'ggf.', 'inkl.', 'max.', 'min.', 'nr.',
  'tel.', 'usw.', 'vgl.', 'vol.',
  // Titles
  'dr.', 'prof.', 'hr.', 'fr.', 'herr.', 'frau.',
  'mr.', 'mrs.', 'ms.',
  // Common
  'str.', 'abs.', 'abt.', 'anm.', 'bd.', 'bsp.',
])

// Ordinal number pattern: digit(s) followed by a period
const ORDINAL_RE = /^\d+\.$/

export function splitSentences(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  const sentences: string[] = []
  let current = ''

  // Split into tokens preserving whitespace
  const tokens = normalized.split(/(\s+)/)

  for (const token of tokens) {
    current += token

    // Check if this token ends with sentence-ending punctuation
    if (/[.!?]$/.test(token.trim()) && token.trim().length > 0) {
      const trimmed = token.trim().toLowerCase()

      // Skip if it's a known abbreviation
      if (ABBREVIATIONS.has(trimmed)) continue

      // Skip if it looks like an ordinal number (1. 2. 3.)
      if (ORDINAL_RE.test(token.trim())) continue

      // Skip if it's a single letter abbreviation (e.g., "A.")
      if (/^[a-zA-ZäöüÄÖÜ]\.$/.test(token.trim())) continue

      // This looks like a sentence boundary
      const trimmedSentence = current.trim()
      if (trimmedSentence) {
        sentences.push(trimmedSentence)
      }
      current = ''
    }
  }

  // Add any remaining text as the last sentence
  const remaining = current.trim()
  if (remaining) {
    sentences.push(remaining)
  }

  return sentences
}
