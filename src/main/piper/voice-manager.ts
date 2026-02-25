import { readdirSync, existsSync } from 'fs'
import { join, basename } from 'path'
import { getVoicesDir } from '../utils/paths'
import type { VoiceInfo } from '../../shared/types'

const VOICE_META: Record<string, { quality: VoiceInfo['quality']; gender: VoiceInfo['gender']; name: string }> = {
  'de_DE-thorsten-high': { quality: 'high', gender: 'male', name: 'Thorsten' },
  'de_DE-kerstin-low': { quality: 'low', gender: 'female', name: 'Kerstin' },
  'de_DE-ramona-low': { quality: 'low', gender: 'female', name: 'Ramona' },
}

export function discoverVoices(): VoiceInfo[] {
  const voicesDir = getVoicesDir()
  if (!existsSync(voicesDir)) return []

  const files = readdirSync(voicesDir)
  const onnxFiles = files.filter(f => f.endsWith('.onnx'))

  return onnxFiles.map(onnxFile => {
    const id = basename(onnxFile, '.onnx')
    const meta = VOICE_META[id] || { quality: 'low' as const, gender: 'male' as const, name: id }
    const modelPath = join(voicesDir, onnxFile)
    const configPath = modelPath + '.json'

    return {
      id,
      name: meta.name,
      quality: meta.quality,
      gender: meta.gender,
      modelPath,
      configPath,
    }
  })
}
