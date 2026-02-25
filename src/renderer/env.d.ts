/// <reference types="vite/client" />

import type { GermannyAPI } from '../preload/index'

declare global {
  interface Window {
    germannyAPI: GermannyAPI
  }
}
