import { app } from 'electron'
import { join } from 'path'
import { getArch } from './platform'

const isDev = !app.isPackaged

export function getPiperBinaryPath(): string {
  if (isDev) {
    return join(process.cwd(), 'resources', 'piper', getArch(), 'piper')
  }
  return join(process.resourcesPath, 'piper', 'piper')
}

export function getVoicesDir(): string {
  if (isDev) {
    return join(process.cwd(), 'resources', 'voices')
  }
  return join(process.resourcesPath, 'voices')
}
