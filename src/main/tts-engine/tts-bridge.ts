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

  currentAbort = new AbortController()
  const { signal } = currentAbort

  // Build OpenAI-compatible request body for Qwen3-TTS
  const body: Record<string, unknown> = {
    model: 'Qwen3-TTS',
    input: text,
    speed,
    lang_code: 'German',
    response_format: 'wav',
  }

  if (voiceId === '_builtin') {
    body.voice = 'Chelsie'
  } else if (voice) {
    body.voice = 'Chelsie'
    if (voice.referenceAudioPath) {
      body.ref_audio = voice.referenceAudioPath
    }
    if (voice.refText) {
      body.ref_text = voice.refText
    }
  }

  const res = await fetch(`${getBaseUrl()}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    currentAbort = null
    const errBody = await res.text()
    throw new Error(`TTS synthesis failed (${res.status}): ${errBody}`)
  }

  const arrayBuf = await res.arrayBuffer()
  currentAbort = null
  return Buffer.from(arrayBuf)
}

export function stopSynthesis(): void {
  if (currentAbort) {
    currentAbort.abort()
    currentAbort = null
  }
}
