import { useState, useEffect } from 'react'
import { TextInput } from './components/TextInput'
import { PlaybackControls } from './components/PlaybackControls'
import { VoiceSelector } from './components/VoiceSelector'
import { SpeedSlider } from './components/SpeedSlider'
import { HighlightedText } from './components/HighlightedText'
import { SentenceList } from './components/SentenceList'
import { DownloadPanel } from './components/DownloadPanel'
import { useAudioPlayer } from './hooks/useAudioPlayer'
import { useHighlighting } from './hooks/useHighlighting'
import { useSentences } from './hooks/useSentences'
import type { VoiceInfo, WordTiming } from '../shared/types'

export default function App() {
  const [text, setText] = useState('')
  const [voices, setVoices] = useState<VoiceInfo[]>([])
  const [selectedVoice, setSelectedVoice] = useState('')
  const [speed, setSpeed] = useState(1.0)
  const [isLoading, setIsLoading] = useState(false)
  const [currentTimings, setCurrentTimings] = useState<WordTiming[]>([])
  const [fullAudioBuffer, setFullAudioBuffer] = useState<ArrayBuffer | null>(null)

  const player = useAudioPlayer()
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

  useEffect(() => {
    if (!window.hansListenerAPI) return
    window.hansListenerAPI.getVoices().then((v) => {
      setVoices(v)
      if (v.length > 0) {
        const defaultVoice = v.find((voice) => voice.id === 'de_DE-thorsten-high')
        setSelectedVoice(defaultVoice ? defaultVoice.id : v[0].id)
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

    setIsLoading(true)

    try {
      // Synthesize full text as one audio blob
      const result = await window.hansListenerAPI.synthesize({
        text,
        voiceId: selectedVoice,
        speed,
      })

      setFullAudioBuffer(result.wavBuffer)

      // Populate sentence list in the background (fire-and-forget)
      loadSentences(text)

      setIsLoading(false)
      setCurrentTimings(result.timings)
      await player.play(result.wavBuffer)
      setCurrentTimings([])
    } catch (err) {
      console.error('Playback error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  function handleStop() {
    player.stop()
    window.hansListenerAPI.stop()
    setCurrentTimings([])
  }

  async function handleSentenceSelect(index: number) {
    // Stop whatever is currently playing
    player.stop()
    window.hansListenerAPI.stop()

    setActiveSentenceIndex(index)
    const sentenceText = sentences[index]
    if (!sentenceText) return

    try {
      const result = await window.hansListenerAPI.synthesizeSentence({
        text: sentenceText,
        voiceId: selectedVoice,
        speed,
        index,
      })

      setCurrentTimings(result.timings)
      await player.play(result.wavBuffer)
      setCurrentTimings([])
    } catch (err) {
      console.error('Sentence playback error:', err)
    }
  }

  const isPlaying = player.isPlaying

  return (
    <div className="flex h-screen">
      {/* -- Sidebar ------------------------------------------------- */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-surface-300 bg-surface-50">
        {/* Drag region */}
        <div className="h-12 shrink-0 [-webkit-app-region:drag]" />

        {/* Brand */}
        <div className="px-5 pb-4">
          <h1 className="font-display text-2xl tracking-tight text-ink-900">
            Hans Listener
          </h1>
          <p className="mt-0.5 text-xs text-ink-400">
            Offline German text-to-speech
          </p>
        </div>

      </aside>

      {/* -- Main content --------------------------------------------- */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Drag region */}
        <div className="h-12 shrink-0 [-webkit-app-region:drag]" />

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-10 pb-8">
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
              disabled={!text.trim() || !selectedVoice}
            />
          </div>

          {/* Settings bar */}
          <div className="flex items-center justify-center gap-4">
            <VoiceSelector
              voices={voices}
              selectedId={selectedVoice}
              onChange={setSelectedVoice}
              disabled={isPlaying}
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
