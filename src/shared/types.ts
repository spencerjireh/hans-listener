export interface VoiceInfo {
  id: string
  name: string
  quality: 'high' | 'medium' | 'low'
  gender: 'male' | 'female'
  modelPath: string
  configPath: string
}

export interface SynthesizeRequest {
  text: string
  voiceId: string
  speed: number // 0.5 - 2.0, where 1.0 is normal
}

export interface WordTiming {
  word: string
  start: number
  end: number
  index: number
}

export interface SynthesisResult {
  wavBuffer: ArrayBuffer
  duration: number
  timings: WordTiming[]
}
