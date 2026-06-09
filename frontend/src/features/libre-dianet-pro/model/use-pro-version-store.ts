import { useEffect, useReducer } from 'react'
import { loadProPresetStore, saveProPresetStore } from '../../../storage'
import type { ProPreset, ProVersion } from '../../../types'
import { createProPreset, createProVersion } from './pro-factories'
import { proVersionsReducer } from './pro-versions.reducer'

export function useProVersionStore({ onPresetCreated }: { onPresetCreated: (presetId: string) => void }) {
  const [versions, dispatchVersions] = useReducer(proVersionsReducer, [], () => loadProPresetStore().versions)

  useEffect(() => {
    saveProPresetStore({ version: 1, versions })
  }, [versions])

  const updateVersion = (version: ProVersion) => {
    dispatchVersions({ type: 'version/update', version })
  }

  const createVersion = (): ProVersion => {
    const version = createProVersion()
    dispatchVersions({ type: 'version/create', version })
    return version
  }

  const deleteVersion = (version: ProVersion) => {
    dispatchVersions({ type: 'version/delete', versionId: version.id })
  }

  const createPreset = (version: ProVersion) => {
    const gtfsSourceIds = version.gtfsSources.map((source) => source.sourceId)
    const preset = createProPreset(gtfsSourceIds.length === 1 ? gtfsSourceIds : [])
    dispatchVersions({ type: 'preset/create', versionId: version.id, preset })
    onPresetCreated(preset.id)
  }

  const deletePreset = (version: ProVersion, preset: ProPreset) => {
    dispatchVersions({ type: 'preset/delete', versionId: version.id, presetId: preset.id })
  }

  return {
    versions,
    updateVersion,
    createVersion,
    deleteVersion,
    createPreset,
    deletePreset,
  }
}
