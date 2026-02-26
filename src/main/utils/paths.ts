import { app } from 'electron'
import { join } from 'path'
const isDev = !app.isPackaged

export interface SidecarSpawnConfig {
  command: string
  args: string[]
  cwd?: string
  env?: Record<string, string>
}

export function getTtsEngineSpawnConfig(port: number): SidecarSpawnConfig {
  if (isDev) {
    // Dev mode: let mlx-audio download/cache model from HuggingFace automatically
    const sidecarDir = join(process.cwd(), 'sidecar')
    const venvPython = join(sidecarDir, '.venv', 'bin', 'python3')
    return {
      command: venvPython,
      args: ['server.py', '--port', String(port)],
      cwd: sidecarDir,
    }
  }

  // Prod mode: use bundled model from resources
  const resourcesPath = process.resourcesPath
  const modelDir = getModelDir()
  const venvPython = join(resourcesPath, 'tts-engine', 'bin', 'python3')
  const serverScript = join(resourcesPath, 'tts-engine', 'server.py')
  return {
    command: venvPython,
    args: [serverScript, '--port', String(port), '--model-dir', modelDir],
    env: { HF_HUB_OFFLINE: '1' },
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
