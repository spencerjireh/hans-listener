import { ipcMain, dialog, BrowserWindow } from 'electron'
import { writeFile } from 'fs/promises'
import { IPC } from '../shared/ipc-channels'
import { synthesize, stopSynthesis } from './tts-engine/tts-bridge'
import { discoverVoices } from './tts-engine/voice-manager'
import { isReady } from './tts-engine/sidecar-manager'
import { splitSentences } from './text/sentence-splitter'
import { tokenizeWords, computeWordTimings } from './text/word-tokenizer'
import { addHistoryEntry, getHistoryMeta, loadHistoryWav } from './history/history-store'
import { bufferToArrayBuffer } from './utils/buffer'
import type { SynthesizeRequest, WordTiming } from '../shared/types'

function wavDuration(wav: Buffer): number {
  if (wav.length < 44) return 0
  const sampleRate = wav.readUInt32LE(24)
  const channels = wav.readUInt16LE(22)
  const bitsPerSample = wav.readUInt16LE(34)
  const bytesPerSecond = sampleRate * channels * (bitsPerSample / 8)
  if (bytesPerSecond === 0) return 0
  return (wav.length - 44) / bytesPerSecond
}

async function synthesizeAndTime(
  text: string,
  voiceId: string,
  speed: number
): Promise<{ wavBuffer: Buffer; duration: number; timings: WordTiming[] }> {
  const wavBuffer = await synthesize(text, voiceId, speed)
  const duration = wavDuration(wavBuffer)
  const words = tokenizeWords(text)
  const timings = computeWordTimings(words, duration)
  return { wavBuffer, duration, timings }
}

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.TTS_STATUS, () => {
    return { ready: isReady() }
  })

  ipcMain.handle(IPC.GET_VOICES, () => {
    return discoverVoices()
  })

  ipcMain.handle(IPC.SPLIT_SENTENCES, (_event, text: string) => {
    return splitSentences(text)
  })

  ipcMain.handle(IPC.SYNTHESIZE, async (_event, req: SynthesizeRequest) => {
    const { wavBuffer, duration, timings } = await synthesizeAndTime(
      req.text, req.voiceId, req.speed
    )

    const voices = discoverVoices()
    const voiceName = voices.find((v) => v.id === req.voiceId)?.name ?? req.voiceId
    addHistoryEntry({
      text: req.text,
      voiceId: req.voiceId,
      voiceName,
      speed: req.speed,
      duration,
      timings,
      wavBuffer,
    }).catch((err) => console.error('[history] Failed to save entry:', err))

    return { wavBuffer: bufferToArrayBuffer(wavBuffer), duration, timings }
  })

  ipcMain.handle(
    IPC.SYNTHESIZE_SENTENCE,
    async (_event, req: SynthesizeRequest & { index: number }) => {
      const { wavBuffer, duration, timings } = await synthesizeAndTime(
        req.text, req.voiceId, req.speed
      )

      return {
        index: req.index,
        wavBuffer: bufferToArrayBuffer(wavBuffer),
        duration,
        text: req.text,
        timings,
      }
    }
  )

  // Stop synthesis
  ipcMain.handle(IPC.STOP, () => {
    stopSynthesis()
  })

  // History
  ipcMain.handle(IPC.HISTORY_GET, () => {
    return getHistoryMeta()
  })

  ipcMain.handle(IPC.HISTORY_LOAD_WAV, (_event, id: string) => {
    return loadHistoryWav(id)
  })

  // Export audio
  ipcMain.handle(
    IPC.EXPORT_AUDIO,
    async (_event, data: { buffer: ArrayBuffer; defaultName: string }) => {
      const win = BrowserWindow.getFocusedWindow()
      if (!win) return false

      const ext = data.defaultName.endsWith('.mp3') ? 'mp3' : 'wav'
      const result = await dialog.showSaveDialog(win, {
        defaultPath: data.defaultName,
        filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
      })

      if (result.canceled || !result.filePath) return false

      await writeFile(result.filePath, Buffer.from(data.buffer))
      return true
    }
  )
}
