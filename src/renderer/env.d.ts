/// <reference types="vite/client" />

import type { HansListenerAPI } from '../preload/index'

declare global {
  interface Window {
    hansListenerAPI: HansListenerAPI
  }
}
