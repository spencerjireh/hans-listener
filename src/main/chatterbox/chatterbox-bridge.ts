import { getBaseUrl } from './sidecar-manager'
import { discoverVoices } from './voice-manager'

let currentAbort: AbortController | null = null

export async function synthesize(
  text: string,
  voiceId: string,
  speed: number
): Promise<Buffer> {
  const voices = discoverVoices()
  const voice = voices.find((v) => v.id === voiceId)

  const referenceAudioPath = voice?.referenceAudioPath ?? null

  currentAbort = new AbortController()
  const { signal } = currentAbort

  const res = await fetch(`${getBaseUrl()}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      reference_audio_path: referenceAudioPath,
      speed,
    }),
    signal,
  })

  if (!res.ok) {
    currentAbort = null
    const body = await res.text()
    throw new Error(`Chatterbox TTS failed (${res.status}): ${body}`)
  }

  const arrayBuf = await res.arrayBuffer()
  currentAbort = null
  return Buffer.from(arrayBuf)
}

export async function fetchProgress(): Promise<{
  stage: string
  percent: number
  message: string
}> {
  const res = await fetch(`${getBaseUrl()}/progress`)
  return res.json()
}

export function stopSynthesis(): void {
  if (currentAbort) {
    currentAbort.abort()
    currentAbort = null
  }

  // Also tell the server to stop any in-progress generation
  fetch(`${getBaseUrl()}/cancel`, { method: 'POST' }).catch(() => {
    // Best-effort -- server may already be idle
  })
}
