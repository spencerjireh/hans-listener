const SPEED_PRESETS = [
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1.0, label: '1.0x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
]

interface SpeedSliderProps {
  speed: number
  onChange: (speed: number) => void
  disabled?: boolean
}

export function SpeedSlider({ speed, onChange, disabled }: SpeedSliderProps) {
  const activeIndex = SPEED_PRESETS.findIndex((p) => p.value === speed)

  return (
    <div className="flex items-center gap-2.5">
      <span className="text-xs font-medium text-ink-500">Speed</span>
      <div className="relative flex rounded-lg bg-surface-200 p-0.5">
        {/* Sliding indicator */}
        {activeIndex >= 0 && (
          <div
            className="absolute top-0.5 bottom-0.5 rounded-md bg-white shadow-sm transition-all duration-200"
            style={{
              width: `${100 / SPEED_PRESETS.length}%`,
              left: `${(activeIndex / SPEED_PRESETS.length) * 100}%`,
            }}
          />
        )}

        {SPEED_PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => onChange(preset.value)}
            disabled={disabled}
            className={`relative z-10 rounded-md px-2.5 py-1 text-xs font-medium transition-colors
              ${
                speed === preset.value
                  ? 'text-brand-700'
                  : 'text-ink-400 hover:text-ink-600'
              }
              disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  )
}
