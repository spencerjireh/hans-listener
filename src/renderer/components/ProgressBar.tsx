import type { SynthesisProgress } from '../../shared/types'

interface ProgressBarProps {
  progress: SynthesisProgress
}

export function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div className="flex w-48 flex-col items-center gap-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-200">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-500 ease-out"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <span className="text-[11px] text-ink-400">{progress.message}</span>
    </div>
  )
}
