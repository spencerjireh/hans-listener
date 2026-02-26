import { app } from 'electron'
import { join } from 'path'
import { mkdir, readFile, writeFile, rename, unlink, readdir } from 'fs/promises'
import { randomUUID } from 'crypto'
import { bufferToArrayBuffer } from '../utils/buffer'
import type { HistoryEntry, HistoryEntryMeta, WordTiming } from '../../shared/types'

const MAX_ENTRIES = 100

let historyDir: string
let indexPath: string
let entries: HistoryEntry[] = []

export async function initHistoryStore(): Promise<void> {
  historyDir = join(app.getPath('userData'), 'history')
  indexPath = join(historyDir, 'index.json')

  await mkdir(historyDir, { recursive: true })

  try {
    const raw = await readFile(indexPath, 'utf-8')
    entries = JSON.parse(raw)
  } catch {
    entries = []
  }

  // Clean up orphan WAV files
  try {
    const knownFiles = new Set(entries.map((e) => e.wavFilename))
    const files = await readdir(historyDir)
    for (const file of files) {
      if (file.endsWith('.wav') && !knownFiles.has(file)) {
        await unlink(join(historyDir, file)).catch(() => {})
      }
    }
  } catch {
    // Non-fatal
  }
}

export function getHistoryMeta(): HistoryEntryMeta[] {
  return entries.map(({ wavFilename: _, ...meta }) => meta)
}

export async function addHistoryEntry(params: {
  text: string
  voiceId: string
  voiceName: string
  speed: number
  duration: number
  timings: WordTiming[]
  wavBuffer: Buffer
}): Promise<void> {
  const id = randomUUID()
  const wavFilename = `${id}.wav`

  await writeFile(join(historyDir, wavFilename), params.wavBuffer)

  const entry: HistoryEntry = {
    id,
    text: params.text,
    voiceId: params.voiceId,
    voiceName: params.voiceName,
    speed: params.speed,
    duration: params.duration,
    timings: params.timings,
    wavFilename,
    createdAt: new Date().toISOString(),
  }

  entries.unshift(entry)

  // Evict oldest entries beyond cap
  while (entries.length > MAX_ENTRIES) {
    const evicted = entries.pop()!
    await unlink(join(historyDir, evicted.wavFilename)).catch(() => {})
  }

  await atomicWriteIndex()
}

export async function loadHistoryWav(id: string): Promise<ArrayBuffer> {
  const entry = entries.find((e) => e.id === id)
  if (!entry) throw new Error(`History entry not found: ${id}`)

  const buf = await readFile(join(historyDir, entry.wavFilename))
  return bufferToArrayBuffer(buf)
}

async function atomicWriteIndex(): Promise<void> {
  const tmpPath = indexPath + '.tmp'
  await writeFile(tmpPath, JSON.stringify(entries, null, 2))
  await rename(tmpPath, indexPath)
}
