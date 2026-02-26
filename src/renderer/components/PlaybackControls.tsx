interface PlaybackControlsProps {
  isPlaying: boolean
  isLoading: boolean
  onPlay: () => void
  onStop: () => void
  disabled?: boolean
  synthesisProgress?: null
}

export function PlaybackControls({
  isPlaying,
  isLoading,
  onPlay,
  onStop,
  disabled,
}: PlaybackControlsProps) {
  const label = isPlaying
    ? 'Playing...'
    : isLoading
      ? 'Synthesizing...'
      : 'Speak'

  return (
    <div className="flex flex-col items-center gap-2">
      {isPlaying ? (
        <button
          onClick={onStop}
          className="flex h-16 w-16 items-center justify-center rounded-full
            bg-danger-500 text-white shadow-lg shadow-danger-500/25
            transition-transform hover:scale-105 active:scale-95"
        >
          <StopIcon className="h-6 w-6" />
        </button>
      ) : (
        <button
          onClick={onPlay}
          disabled={disabled || isLoading}
          className="flex h-16 w-16 items-center justify-center rounded-full
            bg-brand-500 text-white shadow-lg shadow-brand-500/25
            transition-transform hover:scale-105 active:scale-95
            disabled:cursor-not-allowed disabled:bg-ink-200 disabled:shadow-none disabled:hover:scale-100"
        >
          {isLoading ? <Spinner className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
        </button>
      )}
      <span className="text-xs font-medium text-ink-400">{label}</span>
    </div>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4v16l14-8z" />
    </svg>
  )
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  )
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="42"
        strokeDashoffset="30"
      />
    </svg>
  )
}
