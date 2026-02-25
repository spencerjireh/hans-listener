import type { HistoryEntryMeta } from '../../shared/types'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  entries: HistoryEntryMeta[]
  selectedEntryId: string | null
  replayingId: string | null
  loadingId: string | null
  onSelectEntry: (entry: HistoryEntryMeta) => void
  onNewText: () => void
  canNewText: boolean
}

// -- Helpers (migrated from HistoryList.tsx) ---------------------------------

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
}

// -- Icons -------------------------------------------------------------------

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M4.5 2.5l9 5.5-9 5.5V2.5z" />
    </svg>
  )
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 4l-4 4 4 4" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8 3v10M3 8h10" />
    </svg>
  )
}

// -- Component ---------------------------------------------------------------

export function Sidebar({
  collapsed,
  onToggleCollapse,
  entries,
  selectedEntryId,
  replayingId,
  loadingId,
  onSelectEntry,
  onNewText,
  canNewText,
}: SidebarProps) {
  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-surface-300 bg-surface-50
        transition-[width] duration-200 ease-in-out overflow-hidden
        ${collapsed ? 'w-12' : 'w-[300px]'}`}
    >
      {/* macOS drag region */}
      <div className="h-12 shrink-0 [-webkit-app-region:drag]" />

      {/* Toolbar */}
      <div className={`flex shrink-0 items-center gap-1.5 px-2 pb-2
        ${collapsed ? 'flex-col' : 'flex-row'}`}
      >
        <button
          onClick={onToggleCollapse}
          className="flex h-7 w-7 items-center justify-center rounded-md text-ink-400 hover:bg-surface-200 hover:text-ink-600 [-webkit-app-region:no-drag]"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronIcon className={`h-4 w-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
        </button>

        <button
          onClick={onNewText}
          disabled={!canNewText}
          className={`flex items-center justify-center rounded-md text-ink-500 hover:bg-surface-200 hover:text-ink-700
            disabled:opacity-40 disabled:cursor-not-allowed [-webkit-app-region:no-drag]
            ${collapsed ? 'h-7 w-7' : 'h-7 flex-1 gap-1.5 px-2 text-xs font-medium'}`}
          title="New Text"
        >
          <PlusIcon className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && <span className="truncate">New Text</span>}
        </button>
      </div>

      {/* History entries */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-1.5 pb-2">
        {!collapsed && entries.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-ink-400">
            No history yet
          </p>
        )}

        <div className={`flex flex-col ${collapsed ? 'items-center gap-1' : 'gap-0.5'}`}>
          {entries.map((entry) => {
            const isSelected = entry.id === selectedEntryId
            const isReplaying = entry.id === replayingId
            const isLoading = entry.id === loadingId
            const isActive = isSelected || isReplaying

            if (collapsed) {
              return (
                <button
                  key={entry.id}
                  onClick={() => onSelectEntry(entry)}
                  className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors [-webkit-app-region:no-drag]
                    ${isActive ? 'bg-brand-100/60 text-brand-600' : 'text-ink-400 hover:bg-surface-200 hover:text-ink-600'}`}
                  title={entry.text}
                >
                  {isLoading
                    ? <SpinnerIcon className="h-3.5 w-3.5" />
                    : <PlayIcon className="h-3 w-3" />
                  }
                </button>
              )
            }

            return (
              <button
                key={entry.id}
                onClick={() => onSelectEntry(entry)}
                className={`group flex items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors [-webkit-app-region:no-drag]
                  ${isActive ? 'bg-brand-100/60' : 'hover:bg-surface-200'}`}
              >
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center
                  ${isActive ? 'text-brand-600' : 'text-ink-400 group-hover:text-ink-600'}`}>
                  {isLoading
                    ? <SpinnerIcon className="h-4 w-4" />
                    : <PlayIcon className="h-3.5 w-3.5" />
                  }
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`line-clamp-1 text-sm leading-snug
                    ${isActive ? 'font-medium text-ink-800' : 'text-ink-600'}`}>
                    {entry.text}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-400">
                    {formatRelativeTime(entry.createdAt)}
                    {' -- '}
                    {entry.voiceName}
                    {' -- '}
                    {entry.speed}x
                    {' -- '}
                    {formatDuration(entry.duration)}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Attribution */}
      {!collapsed && (
        <div className="shrink-0 border-t border-surface-200 px-3 py-2 text-[10px] text-ink-300 [-webkit-app-region:no-drag]">
          by{' '}
          <a href="https://github.com/spencerjireh/hans-listener" target="_blank" rel="noreferrer" className="hover:text-ink-400">
            Spencer Jireh Cebrian
          </a>
          {' '}
          <a href="mailto:email@spencerjireh.com" target="_blank" rel="noreferrer" className="hover:text-ink-400">
            email
          </a>
        </div>
      )}
    </aside>
  )
}
