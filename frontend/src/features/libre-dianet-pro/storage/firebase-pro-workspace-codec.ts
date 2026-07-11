import type { ProPreset, ProVersion } from '../../../types'

export type FirebaseVersionDocument = {
  id: string
  workspaceId: string
  position: number
  version: ProVersion
}

type FirestoreProPreset = Omit<ProPreset, 'excludedStopPatterns'> & {
  excludedStopPatterns: Array<{ values: string[] }>
}

type FirestoreProVersion = Omit<ProVersion, 'presets'> & {
  presets: FirestoreProPreset[]
}

type FirestoreVersionDocument = Omit<FirebaseVersionDocument, 'version'> & {
  version: FirestoreProVersion
}

export function encodeFirebaseVersionDocument<T extends FirebaseVersionDocument>(document: T): T {
  const encoded: FirestoreVersionDocument = {
    ...document,
    version: {
      ...document.version,
      presets: document.version.presets.map((preset) => ({
        ...preset,
        excludedStopPatterns: preset.excludedStopPatterns.map((values) => ({ values })),
      })),
    },
  }
  return encoded as unknown as T
}

export function decodeFirebaseVersionDocument<T extends FirebaseVersionDocument>(document: T): T {
  return {
    ...document,
    version: {
      ...document.version,
      presets: document.version.presets.map((preset) => ({
        ...preset,
        excludedStopPatterns: decodeExcludedStopPatterns(preset.excludedStopPatterns),
      })),
    },
  } as T
}

function decodeExcludedStopPatterns(value: unknown): string[][] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.flatMap((entry) => {
    if (Array.isArray(entry)) {
      return [entry.filter((item): item is string => typeof item === 'string')]
    }
    if (isRecord(entry) && Array.isArray(entry.values)) {
      return [entry.values.filter((item): item is string => typeof item === 'string')]
    }
    return []
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
