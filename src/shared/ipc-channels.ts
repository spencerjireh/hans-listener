export const IPC = {
  // TTS
  SPLIT_SENTENCES: 'tts:split-sentences',
  SYNTHESIZE: 'tts:synthesize',
  SYNTHESIZE_SENTENCE: 'tts:synthesize-sentence',
  STOP: 'tts:stop',
  SYNTHESIS_PROGRESS: 'tts:synthesis-progress',

  // Voices
  GET_VOICES: 'voices:get',

  // Engine
  TTS_STATUS: 'tts:status',

  // Export
  EXPORT_AUDIO: 'export:save',

  // History
  HISTORY_GET: 'history:get',
  HISTORY_LOAD_WAV: 'history:load-wav',
} as const
