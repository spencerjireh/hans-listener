interface SentenceListProps {
  sentences: string[]
  activeIndex: number
  onSelect: (index: number) => void
}

export function SentenceList({ sentences, activeIndex, onSelect }: SentenceListProps) {
  if (sentences.length <= 1) return null

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] font-medium uppercase tracking-widest text-ink-400">
        Sentences
      </p>
      <div className="flex flex-col gap-1">
        {sentences.map((text, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`group flex items-start gap-3 rounded-xl px-3.5 py-2.5 text-left transition-colors
              ${
                i === activeIndex
                  ? 'bg-brand-100/60'
                  : 'hover:bg-surface-200'
              }`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium
                transition-colors ${
                  i === activeIndex
                    ? 'bg-brand-500 text-white'
                    : 'bg-surface-300 text-ink-500 group-hover:bg-surface-200 group-hover:text-ink-600'
                }`}
            >
              {i + 1}
            </span>
            <span className={`line-clamp-2 text-sm leading-snug ${
              i === activeIndex ? 'font-medium text-ink-800' : 'text-ink-600'
            }`}>
              {text}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
