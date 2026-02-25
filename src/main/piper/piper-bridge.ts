import { spawn, ChildProcess } from 'child_process'
import { dirname, join } from 'path'
import { getPiperBinaryPath } from '../utils/paths'
import { discoverVoices } from './voice-manager'

let currentProcess: ChildProcess | null = null

function speedToLengthScale(speed: number): number {
  // speed 1.0 = normal, 0.5 = slow, 1.5 = fast, 2.0 = fastest
  // length_scale is inverse: higher = slower
  return 1.0 / speed
}

export function synthesize(
  text: string,
  voiceId: string,
  speed: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const voices = discoverVoices()
    const voice = voices.find(v => v.id === voiceId)
    if (!voice) {
      reject(new Error(`Voice not found: ${voiceId}`))
      return
    }

    const piperPath = getPiperBinaryPath()
    const lengthScale = speedToLengthScale(speed)

    const args = [
      '--model', voice.modelPath,
      '--output-raw',
      '--length_scale', lengthScale.toFixed(2),
    ]

    // Piper needs its companion dylibs (libespeak-ng, libpiper_phonemize, libonnxruntime)
    // which live in a lib/ directory next to the binary
    const piperDir = dirname(piperPath)
    const libDir = join(piperDir, 'lib')

    const proc = spawn(piperPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        DYLD_LIBRARY_PATH: libDir,
      },
    })
    currentProcess = proc

    const chunks: Buffer[] = []
    let stderrData = ''

    proc.stdout.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })

    proc.stderr.on('data', (chunk: Buffer) => {
      stderrData += chunk.toString()
    })

    proc.on('close', (code) => {
      currentProcess = null
      if (code === 0) {
        const rawPcm = Buffer.concat(chunks)
        const wav = pcmToWav(rawPcm, 22050, 16, 1)
        resolve(wav)
      } else {
        reject(new Error(`Piper exited with code ${code}: ${stderrData}`))
      }
    })

    proc.on('error', (err) => {
      currentProcess = null
      reject(err)
    })

    // Write text to stdin and close it to signal end of input
    proc.stdin.write(text)
    proc.stdin.end()
  })
}

export function stopSynthesis(): void {
  if (currentProcess) {
    currentProcess.kill('SIGTERM')
    currentProcess = null
  }
}

function pcmToWav(
  pcm: Buffer,
  sampleRate: number,
  bitsPerSample: number,
  channels: number
): Buffer {
  const byteRate = sampleRate * channels * (bitsPerSample / 8)
  const blockAlign = channels * (bitsPerSample / 8)
  const dataSize = pcm.length

  const header = Buffer.alloc(44)
  // RIFF header
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataSize, 4)
  header.write('WAVE', 8)
  // fmt chunk
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  // data chunk
  header.write('data', 36)
  header.writeUInt32LE(dataSize, 40)

  return Buffer.concat([header, pcm])
}
