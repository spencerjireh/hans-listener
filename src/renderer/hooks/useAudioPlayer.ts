import { useRef, useState, useCallback } from 'react'

interface AudioPlayerState {
  isPlaying: boolean
  currentTime: number
  duration: number
}

export function useAudioPlayer() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const startTimeRef = useRef(0)
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
  })

  const getContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    return audioContextRef.current
  }, [])

  const play = useCallback(
    async (wavBuffer: ArrayBuffer): Promise<number> => {
      const ctx = getContext()

      // Stop any currently playing audio
      if (sourceRef.current) {
        sourceRef.current.stop()
        sourceRef.current.disconnect()
      }

      const audioBuffer = await ctx.decodeAudioData(wavBuffer.slice(0))
      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(ctx.destination)

      sourceRef.current = source
      startTimeRef.current = ctx.currentTime

      setState({
        isPlaying: true,
        currentTime: 0,
        duration: audioBuffer.duration,
      })

      return new Promise((resolve) => {
        source.onended = () => {
          sourceRef.current = null
          setState((prev) => ({ ...prev, isPlaying: false }))
          resolve(audioBuffer.duration)
        }
        source.start()
      })
    },
    [getContext]
  )

  const stop = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.stop()
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    setState({ isPlaying: false, currentTime: 0, duration: 0 })
  }, [])

  const getCurrentTime = useCallback((): number => {
    if (!audioContextRef.current || !sourceRef.current) return 0
    return audioContextRef.current.currentTime - startTimeRef.current
  }, [])

  return {
    ...state,
    play,
    stop,
    getCurrentTime,
  }
}
