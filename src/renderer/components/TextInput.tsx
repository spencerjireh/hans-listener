interface TextInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function TextInput({ value, onChange, disabled }: TextInputProps) {
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder=" "
        className="peer min-h-[200px] w-full resize-none rounded-2xl border border-surface-300
          bg-white px-6 py-5 text-base leading-relaxed text-ink-800
          shadow-sm shadow-ink-900/5 placeholder:text-transparent
          focus:border-brand-400 focus:shadow-md focus:outline-none focus:ring-4 focus:ring-brand-400/10
          disabled:bg-surface-200 disabled:text-ink-500"
      />

      {/* Empty state overlay */}
      {!value && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink-300">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
          </svg>
          <p className="text-sm">Geben Sie hier Ihren deutschen Text ein...</p>
        </div>
      )}

      {/* Character count */}
      <span className="absolute right-4 bottom-3 text-[11px] text-ink-300">
        {value.length}
      </span>
    </div>
  )
}
