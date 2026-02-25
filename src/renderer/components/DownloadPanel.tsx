import { useState } from 'react'
import { wavToMp3 } from '../lib/mp3-encoder'

interface DownloadPanelProps {
  wavBuffer: ArrayBuffer | null
  disabled?: boolean
}

export function DownloadPanel({ wavBuffer, disabled }: DownloadPanelProps) {
  const [exporting, setExporting] = useState(false)

  const hasAudio = wavBuffer !== null

  async function handleExportWav() {
    if (!wavBuffer) return
    setExporting(true)
    try {
      await window.germannyAPI.exportAudio(wavBuffer, 'germanny-audio.wav')
    } finally {
      setExporting(false)
    }
  }

  async function handleExportMp3() {
    if (!wavBuffer) return
    setExporting(true)
    try {
      const mp3 = wavToMp3(wavBuffer)
      await window.germannyAPI.exportAudio(mp3, 'germanny-audio.mp3')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleExportWav}
        disabled={disabled || !hasAudio || exporting}
        className="flex items-center gap-1.5 rounded-lg border border-surface-300 bg-white px-3 py-1.5
          text-xs font-medium text-ink-600 transition-colors
          hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700
          disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-surface-300
          disabled:hover:bg-white disabled:hover:text-ink-600"
      >
        <DownloadIcon />
        WAV
      </button>
      <button
        onClick={handleExportMp3}
        disabled={disabled || !hasAudio || exporting}
        className="flex items-center gap-1.5 rounded-lg border border-surface-300 bg-white px-3 py-1.5
          text-xs font-medium text-ink-600 transition-colors
          hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700
          disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-surface-300
          disabled:hover:bg-white disabled:hover:text-ink-600"
      >
        <DownloadIcon />
        MP3
      </button>
    </div>
  )
}

function DownloadIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2v9m0 0l-3-3m3 3l3-3" />
      <path d="M3 13h10" />
    </svg>
  )
}
