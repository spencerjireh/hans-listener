import { ipcMain, dialog, BrowserWindow } from 'electron'
import { writeFile } from 'fs/promises'
import { IPC } from '../shared/ipc-channels'
import { synthesize, stopSynthesis } from './piper/piper-bridge'
import { discoverVoices } from './piper/voice-manager'
import { splitSentences } from './text/sentence-splitter'
import { tokenizeWords, computeWordTimings } from './text/word-tokenizer'
import type { SynthesizeRequest } from '../shared/types'

export function registerIpcHandlers(): void {
  // Voices
  ipcMain.handle(IPC.GET_VOICES, () => {
    return discoverVoices()
  })

  // Sentence splitting
  ipcMain.handle(IPC.SPLIT_SENTENCES, (_event, text: string) => {
    return splitSentences(text)
  })

  // Full-text synthesis
  ipcMain.handle(IPC.SYNTHESIZE, async (_event, req: SynthesizeRequest) => {
    const wavBuffer = await synthesize(req.text, req.voiceId, req.speed)

    const pcmBytes = wavBuffer.length - 44
    const duration = pcmBytes / (22050 * 2)

    const words = tokenizeWords(req.text)
    const timings = computeWordTimings(words, duration)

    return {
      wavBuffer: wavBuffer.buffer.slice(
        wavBuffer.byteOffset,
        wavBuffer.byteOffset + wavBuffer.byteLength
      ),
      duration,
      timings,
    }
  })

  // Single sentence synthesis
  ipcMain.handle(
    IPC.SYNTHESIZE_SENTENCE,
    async (_event, req: SynthesizeRequest & { index: number }) => {
      const wavBuffer = await synthesize(req.text, req.voiceId, req.speed)

      // Compute word timings from the WAV duration
      // WAV header is 44 bytes, 22050 Hz, 16-bit mono
      const pcmBytes = wavBuffer.length - 44
      const duration = pcmBytes / (22050 * 2) // 2 bytes per sample

      const words = tokenizeWords(req.text)
      const timings = computeWordTimings(words, duration)

      return {
        index: req.index,
        wavBuffer: wavBuffer.buffer.slice(
          wavBuffer.byteOffset,
          wavBuffer.byteOffset + wavBuffer.byteLength
        ),
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
