import { arch as osArch, platform as osPlatform } from 'os'

export function getArch(): 'arm64' | 'x64' {
  const a = osArch()
  return a === 'arm64' ? 'arm64' : 'x64'
}

export function getPlatform(): 'darwin' | 'linux' | 'win32' {
  return osPlatform() as 'darwin' | 'linux' | 'win32'
}
