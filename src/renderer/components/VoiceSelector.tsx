import type { VoiceInfo } from '../../shared/types'

interface VoiceSelectorProps {
  voices: VoiceInfo[]
  selectedId: string
  onChange: (voiceId: string) => void
  disabled?: boolean
}

export function VoiceSelector({ voices, selectedId, onChange, disabled }: VoiceSelectorProps) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-xs font-medium text-ink-500">Voice</span>
      <div className="relative">
        <select
          value={selectedId}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="appearance-none rounded-lg border border-surface-300 bg-white py-1.5 pr-8 pl-3
            text-sm text-ink-700
            focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20
            disabled:bg-surface-200 disabled:text-ink-400"
        >
          {voices.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.name}
            </option>
          ))}
          {voices.length === 0 && (
            <option value="" disabled>
              No voices found
            </option>
          )}
        </select>

        {/* Custom chevron */}
        <svg
          className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-ink-400"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </div>
    </div>
  )
}
