import lamejs from 'lamejs'

export function wavToMp3(wavBuffer: ArrayBuffer): ArrayBuffer {
  const view = new DataView(wavBuffer)

  // Parse WAV header
  const channels = view.getUint16(22, true)
  const sampleRate = view.getUint32(24, true)
  const bitsPerSample = view.getUint16(34, true)

  // PCM data starts at byte 44
  const pcmData = new Int16Array(wavBuffer, 44)

  const mp3Encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128)
  const blockSize = 1152
  const mp3Chunks: Int8Array[] = []

  for (let i = 0; i < pcmData.length; i += blockSize) {
    const chunk = pcmData.subarray(i, i + blockSize)

    let mp3buf: Int8Array
    if (channels === 1) {
      mp3buf = mp3Encoder.encodeBuffer(chunk)
    } else {
      // Deinterleave stereo
      const left = new Int16Array(chunk.length / 2)
      const right = new Int16Array(chunk.length / 2)
      for (let j = 0; j < chunk.length; j += 2) {
        left[j / 2] = chunk[j]
        right[j / 2] = chunk[j + 1]
      }
      mp3buf = mp3Encoder.encodeBuffer(left, right)
    }

    if (mp3buf.length > 0) {
      mp3Chunks.push(mp3buf)
    }
  }

  const flush = mp3Encoder.flush()
  if (flush.length > 0) {
    mp3Chunks.push(flush)
  }

  // Combine all chunks
  const totalLength = mp3Chunks.reduce((acc, chunk) => acc + chunk.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of mp3Chunks) {
    result.set(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength), offset)
    offset += chunk.length
  }

  return result.buffer
}
