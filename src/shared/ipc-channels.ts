export const IPC = {
  // TTS
  SPLIT_SENTENCES: 'tts:split-sentences',
  SYNTHESIZE: 'tts:synthesize',
  SYNTHESIZE_SENTENCE: 'tts:synthesize-sentence',
  STOP: 'tts:stop',

  // Voices
  GET_VOICES: 'voices:get',

  // Export
  EXPORT_AUDIO: 'export:save',
} as const
