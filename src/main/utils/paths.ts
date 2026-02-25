import { app } from 'electron'
import { join } from 'path'
const isDev = !app.isPackaged

export interface SidecarSpawnConfig {
  command: string
  args: string[]
  cwd?: string
}

export function getChatterboxSpawnConfig(port: number): SidecarSpawnConfig {
  const modelDir = getModelDir()
  const baseArgs = ['--port', String(port), '--model-dir', modelDir, '--cfm-steps', '2']

  if (isDev) {
    const sidecarDir = join(process.cwd(), 'sidecar')
    const venvPython = join(sidecarDir, '.venv', 'bin', 'python3')
    return {
      command: venvPython,
      args: ['server.py', ...baseArgs],
      cwd: sidecarDir,
    }
  }

  const binPath = join(process.resourcesPath, 'chatterbox', 'server')
  return {
    command: binPath,
    args: baseArgs,
  }
}

export function getModelDir(): string {
  if (isDev) {
    return join(process.cwd(), 'resources', 'model')
  }
  return join(process.resourcesPath, 'model')
}

export function getVoicesDir(): string {
  if (isDev) {
    return join(process.cwd(), 'resources', 'voices')
  }
  return join(process.resourcesPath, 'voices')
}
