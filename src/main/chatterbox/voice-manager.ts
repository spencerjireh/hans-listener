import { readdirSync, existsSync } from 'fs'
import { join, basename } from 'path'
import { getVoicesDir } from '../utils/paths'
import type { VoiceInfo } from '../../shared/types'

const VOICE_META: Record<
  string,
  { name: string; gender: VoiceInfo['gender'] }
> = {
  'german-female': { name: 'Eva', gender: 'female' },
}

export function discoverVoices(): VoiceInfo[] {
  const voices: VoiceInfo[] = []

  // Built-in voice (uses conds.pt baked into the model, no reference clip needed)
  voices.push({
    id: '_builtin',
    name: 'Default',
    gender: 'female',
    referenceAudioPath: null,
  })

  // Scan for .wav reference clips for zero-shot cloned voices
  const voicesDir = getVoicesDir()
  if (existsSync(voicesDir)) {
    const files = readdirSync(voicesDir)
    const wavFiles = files.filter((f) => f.endsWith('.wav'))

    for (const wavFile of wavFiles) {
      const id = basename(wavFile, '.wav')
      const meta = VOICE_META[id] || { name: id, gender: 'female' as const }

      voices.push({
        id,
        name: meta.name,
        gender: meta.gender,
        referenceAudioPath: join(voicesDir, wavFile),
      })
    }
  }

  return voices
}
