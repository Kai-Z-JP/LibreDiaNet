import type { ProPreset, ProVersion } from '../../../types'

export type ProVersionsAction =
  | { type: 'version/create'; version: ProVersion }
  | { type: 'version/update'; version: ProVersion }
  | { type: 'version/delete'; versionId: string }
  | { type: 'preset/create'; versionId: string; preset: ProPreset }
  | { type: 'preset/delete'; versionId: string; presetId: string }

export function proVersionsReducer(versions: ProVersion[], action: ProVersionsAction): ProVersion[] {
  switch (action.type) {
    case 'version/create':
      return [...versions, action.version]
    case 'version/update':
      return versions.map((version) => (version.id === action.version.id ? action.version : version))
    case 'version/delete':
      return versions.filter((version) => version.id !== action.versionId)
    case 'preset/create':
      return versions.map((version) =>
        version.id === action.versionId ? { ...version, presets: [...version.presets, action.preset] } : version,
      )
    case 'preset/delete':
      return versions.map((version) =>
        version.id === action.versionId
          ? {
              ...version,
              presets: version.presets.filter((preset) => preset.id !== action.presetId),
            }
          : version,
      )
  }
}
