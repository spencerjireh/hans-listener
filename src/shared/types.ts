export interface VoiceInfo {
  id: string
  name: string
  gender: 'male' | 'female'
  referenceAudioPath: string | null
  refText: string | null
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

export interface HistoryEntry {
  id: string
  text: string
  voiceId: string
  voiceName: string
  speed: number
  duration: number
  timings: WordTiming[]
  wavFilename: string
  createdAt: string
}

export type HistoryEntryMeta = Omit<HistoryEntry, 'wavFilename'>