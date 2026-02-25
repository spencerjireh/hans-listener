import { ipcMain, dialog, BrowserWindow } from 'electron'
import { writeFile } from 'fs/promises'
import { IPC } from '../shared/ipc-channels'
import { synthesize, stopSynthesis, fetchProgress } from './chatterbox/chatterbox-bridge'
import { discoverVoices } from './chatterbox/voice-manager'
import { isReady } from './chatterbox/sidecar-manager'
import { splitSentences } from './text/sentence-splitter'
import { tokenizeWords, computeWordTimings } from './text/word-tokenizer'
import { addHistoryEntry, getHistoryMeta, loadHistoryWav } from './history/history-store'
import type { SynthesizeRequest } from '../shared/types'

function wavDuration(wav: Buffer): number {
  const sampleRate = wav.readUInt32LE(24)
  const channels = wav.readUInt16LE(22)
  const bitsPerSample = wav.readUInt16LE(34)
  return (wav.length - 44) / (sampleRate * channels * (bitsPerSample / 8))
}

export function registerIpcHandlers(): void {
  // Engine status
  ipcMain.handle(IPC.TTS_STATUS, () => {
    return { ready: isReady() }
  })

  // Voices
  ipcMain.handle(IPC.GET_VOICES, () => {
    return discoverVoices()
  })

  // Sentence splitting
  ipcMain.handle(IPC.SPLIT_SENTENCES, (_event, text: string) => {
    return splitSentences(text)
  })

  // Full-text synthesis
  ipcMain.handle(IPC.SYNTHESIZE, async (event, req: SynthesizeRequest) => {
    const progressInterval = setInterval(async () => {
      try {
        const progress = await fetchProgress()
        event.sender.send(IPC.SYNTHESIS_PROGRESS, progress)
      } catch {
        // Sidecar may not be ready yet
      }
    }, 1000)

    try {
      const wavBuffer = await synthesize(req.text, req.voiceId, req.speed)

      const duration = wavDuration(wavBuffer)

      const words = tokenizeWords(req.text)
      const timings = computeWordTimings(words, duration)

      // Save to history (non-fatal)
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

      event.sender.send(IPC.SYNTHESIS_PROGRESS, {
        stage: 'done',
        percent: 100,
        message: '',
      })

      return {
        wavBuffer: wavBuffer.buffer.slice(
          wavBuffer.byteOffset,
          wavBuffer.byteOffset + wavBuffer.byteLength
        ),
        duration,
        timings,
      }
    } finally {
      clearInterval(progressInterval)
    }
  })

  // Single sentence synthesis
  ipcMain.handle(
    IPC.SYNTHESIZE_SENTENCE,
    async (event, req: SynthesizeRequest & { index: number }) => {
      const progressInterval = setInterval(async () => {
        try {
          const progress = await fetchProgress()
          event.sender.send(IPC.SYNTHESIS_PROGRESS, progress)
        } catch {
          // Sidecar may not be ready yet
        }
      }, 1000)

      try {
        const wavBuffer = await synthesize(req.text, req.voiceId, req.speed)

        const duration = wavDuration(wavBuffer)

        const words = tokenizeWords(req.text)
        const timings = computeWordTimings(words, duration)

        event.sender.send(IPC.SYNTHESIS_PROGRESS, {
          stage: 'done',
          percent: 100,
          message: '',
        })

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
      } finally {
        clearInterval(progressInterval)
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
