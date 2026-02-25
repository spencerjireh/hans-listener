import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'
import type { VoiceInfo, SynthesizeRequest, SynthesisResult, WordTiming } from '../shared/types'

export interface HansListenerAPI {
  getVoices(): Promise<VoiceInfo[]>
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
}

const api: HansListenerAPI = {
  getVoices: () => ipcRenderer.invoke(IPC.GET_VOICES),
  splitSentences: (text) => ipcRenderer.invoke(IPC.SPLIT_SENTENCES, text),
  synthesize: (req) => ipcRenderer.invoke(IPC.SYNTHESIZE, req),
  synthesizeSentence: (req) => ipcRenderer.invoke(IPC.SYNTHESIZE_SENTENCE, req),
  stop: () => ipcRenderer.invoke(IPC.STOP),
  exportAudio: (buffer, defaultName) =>
    ipcRenderer.invoke(IPC.EXPORT_AUDIO, { buffer, defaultName }),
}

contextBridge.exposeInMainWorld('hansListenerAPI', api)
