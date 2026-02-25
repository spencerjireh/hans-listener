import { useState, useEffect } from 'react'
import { TextInput } from './components/TextInput'
import { PlaybackControls } from './components/PlaybackControls'
import { VoiceSelector } from './components/VoiceSelector'
import { SpeedSlider } from './components/SpeedSlider'
import { HighlightedText } from './components/HighlightedText'
import { SentenceList } from './components/SentenceList'
import { Sidebar } from './components/Sidebar'
import { DownloadPanel } from './components/DownloadPanel'
import { useAudioPlayer } from './hooks/useAudioPlayer'
import { useHighlighting } from './hooks/useHighlighting'
import { useSentences } from './hooks/useSentences'
import { useHistory } from './hooks/useHistory'
import type { VoiceInfo, WordTiming, SynthesisProgress } from '../shared/types'

export default function App() {
  const [text, setText] = useState('')
  const [voices, setVoices] = useState<VoiceInfo[]>([])
  const [selectedVoice, setSelectedVoice] = useState('')
  const [speed, setSpeed] = useState(1.0)
  const [isLoading, setIsLoading] = useState(false)
  const [engineReady, setEngineReady] = useState(false)
  const [currentTimings, setCurrentTimings] = useState<WordTiming[]>([])
  const [fullAudioBuffer, setFullAudioBuffer] = useState<ArrayBuffer | null>(null)
  const [replayingId, setReplayingId] = useState<string | null>(null)
  const [replayLoadingId, setReplayLoadingId] = useState<string | null>(null)
  const [selectedHistoryEntryId, setSelectedHistoryEntryId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [synthesisProgress, setSynthesisProgress] = useState<SynthesisProgress | null>(null)

  const player = useAudioPlayer()
  const history = useHistory()
  const {
    sentences,
    activeSentenceIndex,
    setActiveSentenceIndex,
    loadSentences,
  } = useSentences()

  const activeWordIndex = useHighlighting(
    currentTimings,
    player.getCurrentTime,
    player.isPlaying
  )

  // Poll engine readiness
  useEffect(() => {
    if (!window.hansListenerAPI) return
    if (engineReady) return

    const poll = setInterval(async () => {
      try {
        const status = await window.hansListenerAPI.getEngineStatus()
        if (status.ready) {
          setEngineReady(true)
          clearInterval(poll)
        }
      } catch {
        // Keep polling
      }
    }, 1000)

    return () => clearInterval(poll)
  }, [engineReady])

  useEffect(() => {
    if (!window.hansListenerAPI) return
    window.hansListenerAPI.getVoices().then((v) => {
      setVoices(v)
      if (v.length > 0) {
        setSelectedVoice(v[0].id)
      }
    })
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleStop()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!player.isPlaying && text.trim()) {
          handlePlay()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  async function handlePlay() {
    if (!text.trim() || !selectedVoice) return

    // Check if any history entry already has this exact synthesis
    const cachedEntry = history.entries.find(
      (e) => e.text === text && e.voiceId === selectedVoice && e.speed === speed
    )

    if (cachedEntry) {
      setReplayLoadingId(cachedEntry.id)
      setReplayingId(cachedEntry.id)
      try {
        const wavBuffer = await history.loadWav(cachedEntry.id)
        setFullAudioBuffer(wavBuffer)
        loadSentences(text)
        setReplayLoadingId(null)
        setCurrentTimings(cachedEntry.timings)
        await player.play(wavBuffer)
        setCurrentTimings([])
        setReplayingId(null)
      } catch (err) {
        console.error('Cached playback error:', err)
        setReplayLoadingId(null)
        setReplayingId(null)
      }
      return
    }

    // Full synthesis path
    setIsLoading(true)
    setSelectedHistoryEntryId(null)
    setSynthesisProgress({ stage: 'starting', percent: 0, message: 'Starting synthesis...' })

    window.hansListenerAPI.onSynthesisProgress(setSynthesisProgress)

    try {
      const result = await window.hansListenerAPI.synthesize({
        text,
        voiceId: selectedVoice,
        speed,
      })

      setFullAudioBuffer(result.wavBuffer)
      loadSentences(text)
      history.refresh()

      setIsLoading(false)
      setSynthesisProgress(null)
      setCurrentTimings(result.timings)
      await player.play(result.wavBuffer)
      setCurrentTimings([])
    } catch (err) {
      console.error('Playback error:', err)
    } finally {
      setIsLoading(false)
      setSynthesisProgress(null)
      window.hansListenerAPI.offSynthesisProgress()
    }
  }

  function handleStop() {
    player.stop()
    window.hansListenerAPI.stop()
    setCurrentTimings([])
    setReplayingId(null)
    setReplayLoadingId(null)
    setSynthesisProgress(null)
    window.hansListenerAPI.offSynthesisProgress()
  }

  async function handleSentenceSelect(index: number) {
    // Stop whatever is currently playing
    player.stop()
    window.hansListenerAPI.stop()

    setActiveSentenceIndex(index)
    const sentenceText = sentences[index]
    if (!sentenceText) return

    setIsLoading(true)
    setSynthesisProgress({ stage: 'starting', percent: 0, message: 'Starting synthesis...' })
    window.hansListenerAPI.onSynthesisProgress(setSynthesisProgress)

    try {
      const result = await window.hansListenerAPI.synthesizeSentence({
        text: sentenceText,
        voiceId: selectedVoice,
        speed,
        index,
      })

      setIsLoading(false)
      setSynthesisProgress(null)
      setCurrentTimings(result.timings)
      await player.play(result.wavBuffer)
      setCurrentTimings([])
    } catch (err) {
      console.error('Sentence playback error:', err)
    } finally {
      setIsLoading(false)
      setSynthesisProgress(null)
      window.hansListenerAPI.offSynthesisProgress()
    }
  }

  function handleSelectHistoryEntry(entry: { id: string; text: string }) {
    player.stop()
    window.hansListenerAPI.stop()
    setCurrentTimings([])
    setReplayingId(null)
    setReplayLoadingId(null)

    setText(entry.text)
    setSelectedHistoryEntryId(entry.id)
    loadSentences(entry.text)
  }

  function handleNewText() {
    player.stop()
    window.hansListenerAPI.stop()
    setCurrentTimings([])
    setReplayingId(null)
    setReplayLoadingId(null)

    setText('')
    setSelectedHistoryEntryId(null)
    setFullAudioBuffer(null)
  }

  const isPlaying = player.isPlaying
  const canInteract = engineReady && !isPlaying
  const canNewText = text.trim().length > 0 || selectedHistoryEntryId !== null

  return (
    <div className="flex h-screen">
      {/* -- Sidebar ------------------------------------------------- */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        entries={history.entries}
        selectedEntryId={selectedHistoryEntryId}
        replayingId={replayingId}
        loadingId={replayLoadingId}
        onSelectEntry={handleSelectHistoryEntry}
        onNewText={handleNewText}
        canNewText={canNewText}
      />

      {/* -- Main content --------------------------------------------- */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Drag region with branding */}
        <div className="flex h-12 shrink-0 items-center px-4 [-webkit-app-region:drag]">
          <h1 className="font-display text-base tracking-tight text-ink-900">Hans Listener</h1>
          <span className="ml-2 text-[10px] text-ink-400">Offline German TTS</span>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-10 pb-8">
          {/* Engine loading indicator */}
          {!engineReady && (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-surface-300 bg-surface-100 px-4 py-3">
              <svg
                className="h-4 w-4 animate-spin text-ink-400"
                viewBox="0 0 24 24"
                fill="none"
              >
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
              <span className="text-sm text-ink-500">Loading TTS engine...</span>
            </div>
          )}

          {/* Hero text input */}
          <TextInput
            value={text}
            onChange={setText}
            disabled={isPlaying}
          />

          {/* Centered play button */}
          <div className="flex justify-center">
            <PlaybackControls
              isPlaying={isPlaying}
              isLoading={isLoading}
              onPlay={handlePlay}
              onStop={handleStop}
              disabled={!engineReady || !text.trim() || !selectedVoice}
              synthesisProgress={synthesisProgress}
            />
          </div>

          {/* Settings bar */}
          <div className="flex items-center justify-center gap-4">
            <VoiceSelector
              voices={voices}
              selectedId={selectedVoice}
              onChange={setSelectedVoice}
              disabled={!canInteract}
            />
            <div className="h-5 w-px bg-surface-300" />
            <SpeedSlider
              speed={speed}
              onChange={setSpeed}
              disabled={isPlaying}
            />
            <div className="h-5 w-px bg-surface-300" />
            <DownloadPanel
              wavBuffer={fullAudioBuffer}
              disabled={isPlaying}
            />
          </div>

          {/* Karaoke display */}
          <HighlightedText
            timings={currentTimings}
            activeWordIndex={activeWordIndex}
          />

          {/* Sentence navigator */}
          <SentenceList
            sentences={sentences}
            activeIndex={activeSentenceIndex}
            onSelect={handleSentenceSelect}
          />

          {/* Keyboard shortcut hints */}
          <p className="mt-auto pt-4 text-center text-[11px] text-ink-400">
            <kbd className="rounded border border-surface-300 bg-surface-200 px-1.5 py-0.5 font-sans text-[10px] text-ink-500">
              Cmd+Enter
            </kbd>
            {' '}to play{' / '}
            <kbd className="rounded border border-surface-300 bg-surface-200 px-1.5 py-0.5 font-sans text-[10px] text-ink-500">
              Esc
            </kbd>
            {' '}to stop
          </p>
        </div>
      </main>
    </div>
  )
}
