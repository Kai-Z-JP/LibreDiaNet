import type { OverrideConfig, RouteDetail } from './types'

export function routeKey(route: RouteDetail): string {
  return `${route.id}_${route.direction ?? 'null'}`
}

export function stopPatternKey(stopIds: string[]): string {
  return JSON.stringify(stopIds)
}

export function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function displayRouteName(shortName: string | null, longName: string | null): string {
  return shortName?.trim() || longName?.trim() || ''
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export function extractFileName(contentDisposition: string | null): string {
  if (!contentDisposition) {
    return 'dianet.xlsx'
  }
  const match = /filename="?([^";]+)"?/.exec(contentDisposition)
  if (!match?.[1]) {
    return 'dianet.xlsx'
  }
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

export function isSameOverride(left: OverrideConfig, right: OverrideConfig): boolean {
  return (
    left.majorStop === right.majorStop &&
    left.branchStart === right.branchStart &&
    left.branchEnd === right.branchEnd &&
    left.nameOverride === right.nameOverride &&
    left.locationNameOverride === right.locationNameOverride
  )
}

export function convertToEnclosedNumber(value: string | null): string {
  return (value ?? '')
    .replace(/(1[0-9]|2[0-9]|3[0-5]|[0-9])/g, (raw) => {
      const number = Number(raw)
      if (number === 0) {
        return '\u24EA'
      }
      if (number >= 1 && number <= 20) {
        return String.fromCharCode(number + 0x245f)
      }
      if (number >= 21 && number <= 35) {
        return String.fromCharCode(number - 20 + 0x3250)
      }
      if (number >= 36 && number <= 50) {
        return String.fromCharCode(number - 35 + 0x32b0)
      }
      return raw
    })
    .replaceAll('番', '')
    .replaceAll('降車', '降')
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function sameStringMatrix(left: string[][], right: string[][]): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}
