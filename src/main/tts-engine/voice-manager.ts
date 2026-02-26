import { readdirSync, existsSync, readFileSync } from 'fs'
import { join, basename } from 'path'
import { getVoicesDir } from '../utils/paths'
import type { VoiceInfo } from '../../shared/types'

const VOICE_META: Record<
  string,
  { name: string; gender: VoiceInfo['gender']; refText?: string }
> = {
  'german-female': { name: 'Eva', gender: 'female' },
}

export function discoverVoices(): VoiceInfo[] {
  const voices: VoiceInfo[] = []

  // Built-in voice (Qwen3-TTS "Chelsie" -- no reference clip needed)
  voices.push({
    id: '_builtin',
    name: 'Default (Chelsie)',
    gender: 'female',
    referenceAudioPath: null,
    refText: null,
  })

  // Scan for .wav reference clips for zero-shot cloned voices
  const voicesDir = getVoicesDir()
  if (existsSync(voicesDir)) {
    const files = readdirSync(voicesDir)
    const wavFiles = files.filter((f) => f.endsWith('.wav'))

    for (const wavFile of wavFiles) {
      const id = basename(wavFile, '.wav')
      const meta = VOICE_META[id] || { name: id, gender: 'female' as const }

      // Look for companion .txt file with reference transcript
      let refText: string | null = meta.refText ?? null
      const txtPath = join(voicesDir, `${id}.txt`)
      if (existsSync(txtPath)) {
        refText = readFileSync(txtPath, 'utf-8').trim()
      }

      voices.push({
        id,
        name: meta.name,
        gender: meta.gender,
        referenceAudioPath: join(voicesDir, wavFile),
        refText,
      })
    }
  }

  return voices
}
