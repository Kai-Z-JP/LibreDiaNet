import { useEffect, useState } from 'react'
import type { ProVersion } from '../../../types'

export function useProSelection(versions: ProVersion[]) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)
  const selectedVersion = versions.find((version) => version.id === selectedVersionId) ?? null
  const selectedPreset = selectedVersion?.presets.find((preset) => preset.id === selectedPresetId) ?? null

  useEffect(() => {
    if (versions.length === 0 || selectedVersionId === null) {
      setSelectedVersionId(null)
      setSelectedPresetId(null)
      return
    }
    if (!selectedVersion) {
      setSelectedVersionId(null)
      setSelectedPresetId(null)
      return
    }
    if (!selectedPresetId || !selectedVersion.presets.some((preset) => preset.id === selectedPresetId)) {
      setSelectedPresetId(selectedVersion.presets[0]?.id ?? null)
    }
  }, [selectedPresetId, selectedVersion, selectedVersionId, versions])

  const selectVersion = (versionId: string) => {
    setSelectedVersionId(versionId)
    setSelectedPresetId(versions.find((version) => version.id === versionId)?.presets[0]?.id ?? null)
  }

  return {
    selectedVersionId,
    selectedPresetId,
    selectedVersion,
    selectedPreset,
    setSelectedVersionId,
    setSelectedPresetId,
    selectVersion,
  }
}
