import { spawn, ChildProcess } from 'child_process'
import { createServer } from 'net'
import { getChatterboxSpawnConfig } from '../utils/paths'

let sidecarProcess: ChildProcess | null = null
let sidecarPort = 0
let ready = false
let restartCount = 0

const MAX_RESTARTS = 3
const HEALTH_POLL_MS = 500
const SHUTDOWN_TIMEOUT_MS = 5000

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address()
      if (addr && typeof addr === 'object') {
        const port = addr.port
        srv.close(() => resolve(port))
      } else {
        srv.close(() => reject(new Error('Could not determine port')))
      }
    })
    srv.on('error', reject)
  })
}

export async function startSidecar(): Promise<void> {
  sidecarPort = await findFreePort()
  ready = false
  restartCount = 0
  spawnProcess()
  await waitForReady()
}

function spawnProcess(): void {
  const config = getChatterboxSpawnConfig(sidecarPort)

  console.log(`[chatterbox] Spawning: ${config.command} ${config.args.join(' ')}`)

  const proc = spawn(config.command, config.args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: config.cwd,
  })

  proc.stdout?.on('data', (chunk: Buffer) => {
    process.stdout.write(`[chatterbox] ${chunk}`)
  })

  proc.stderr?.on('data', (chunk: Buffer) => {
    process.stderr.write(`[chatterbox] ${chunk}`)
  })

  proc.on('exit', (code) => {
    console.log(`[chatterbox] Process exited with code ${code}`)
    sidecarProcess = null
    ready = false

    if (code !== 0 && code !== null && restartCount < MAX_RESTARTS) {
      restartCount++
      const delay = restartCount * 1000
      console.log(`[chatterbox] Restarting in ${delay}ms (attempt ${restartCount}/${MAX_RESTARTS})`)
      setTimeout(() => spawnProcess(), delay)
    }
  })

  proc.on('error', (err) => {
    console.error('[chatterbox] Failed to start sidecar:', err.message)
    sidecarProcess = null
  })

  sidecarProcess = proc
}

export function waitForReady(): Promise<void> {
  return new Promise((resolve, reject) => {
    const maxWait = 120_000 // 2 minutes for model download + load
    const start = Date.now()

    const poll = async (): Promise<void> => {
      if (Date.now() - start > maxWait) {
        reject(new Error('Chatterbox sidecar timed out waiting for model'))
        return
      }

      try {
        const res = await fetch(`http://127.0.0.1:${sidecarPort}/health`)
        if (res.ok) {
          const data = await res.json()
          if (data.status === 'ready') {
            ready = true
            resolve()
            return
          }
        }
      } catch {
        // Server not up yet, keep polling
      }

      setTimeout(poll, HEALTH_POLL_MS)
    }

    poll()
  })
}

export function getBaseUrl(): string {
  return `http://127.0.0.1:${sidecarPort}`
}

export function isReady(): boolean {
  return ready
}

export async function shutdown(): Promise<void> {
  if (!sidecarProcess) return

  const proc = sidecarProcess
  sidecarProcess = null
  ready = false
  restartCount = MAX_RESTARTS // prevent auto-restart during shutdown

  proc.kill('SIGTERM')

  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      proc.kill('SIGKILL')
      resolve()
    }, SHUTDOWN_TIMEOUT_MS)

    proc.on('exit', () => {
      clearTimeout(timer)
      resolve()
    })
  })
}
