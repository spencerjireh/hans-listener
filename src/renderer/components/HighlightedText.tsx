import type { WordTiming } from '../../shared/types'

interface HighlightedTextProps {
  timings: WordTiming[]
  activeWordIndex: number
}

export function HighlightedText({ timings, activeWordIndex }: HighlightedTextProps) {
  if (timings.length === 0) return null

  return (
    <div className="rounded-2xl border border-brand-200 bg-gradient-to-b from-brand-50 to-surface-50 px-6 py-5">
      <p className="mb-3 text-[10px] font-medium uppercase tracking-widest text-brand-500">
        Now speaking
      </p>
      <div className="text-lg leading-loose">
        {timings.map((timing, i) => (
          <span
            key={i}
            className={`inline-block transition-all duration-150 ${
              i === activeWordIndex
                ? 'scale-105 rounded bg-brand-400/30 font-semibold text-ink-900'
                : i < activeWordIndex
                  ? 'text-ink-300'
                  : 'text-ink-700'
            }`}
          >
            {timing.word}
            {i < timings.length - 1 ? '\u00A0' : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
