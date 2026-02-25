import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'
import type { VoiceInfo, SynthesizeRequest, SynthesisResult, WordTiming, HistoryEntryMeta, SynthesisProgress } from '../shared/types'

export interface HansListenerAPI {
  getVoices(): Promise<VoiceInfo[]>
  getEngineStatus(): Promise<{ ready: boolean }>
  splitSentences(text: string): Promise<string[]>
  synthesize(req: SynthesizeRequest): Promise<SynthesisResult>
  synthesizeSentence(
    req: SynthesizeRequest & { index: number }
  ): Promise<{
    index: number
    wavBuffer: ArrayBuffer
    duration: number
    text: string
    timings: WordTiming[]
  }>
  stop(): Promise<void>
  exportAudio(buffer: ArrayBuffer, defaultName: string): Promise<boolean>
  getHistory(): Promise<HistoryEntryMeta[]>
  loadHistoryWav(id: string): Promise<ArrayBuffer>
  onSynthesisProgress(callback: (progress: SynthesisProgress) => void): void
  offSynthesisProgress(): void
}

const api: HansListenerAPI = {
  getVoices: () => ipcRenderer.invoke(IPC.GET_VOICES),
  getEngineStatus: () => ipcRenderer.invoke(IPC.TTS_STATUS),
  splitSentences: (text) => ipcRenderer.invoke(IPC.SPLIT_SENTENCES, text),
  synthesize: (req) => ipcRenderer.invoke(IPC.SYNTHESIZE, req),
  synthesizeSentence: (req) => ipcRenderer.invoke(IPC.SYNTHESIZE_SENTENCE, req),
  stop: () => ipcRenderer.invoke(IPC.STOP),
  exportAudio: (buffer, defaultName) =>
    ipcRenderer.invoke(IPC.EXPORT_AUDIO, { buffer, defaultName }),
  getHistory: () => ipcRenderer.invoke(IPC.HISTORY_GET),
  loadHistoryWav: (id) => ipcRenderer.invoke(IPC.HISTORY_LOAD_WAV, id),
  onSynthesisProgress: (callback) => {
    ipcRenderer.on(IPC.SYNTHESIS_PROGRESS, (_event, progress) => callback(progress))
  },
  offSynthesisProgress: () => {
    ipcRenderer.removeAllListeners(IPC.SYNTHESIS_PROGRESS)
  },
}

contextBridge.exposeInMainWorld('hansListenerAPI', api)
