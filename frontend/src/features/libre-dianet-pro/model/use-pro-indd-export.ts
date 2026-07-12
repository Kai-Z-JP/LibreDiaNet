import { useState } from 'react'
import type { GtfsStop, ProPreset, ProPresetContext, ProVersion } from '../../../types'
import { downloadBlob, todayIsoDate } from '../../../utils'
import { loadProInddTripsByDay } from './pro-indd-export-data'
import { buildProInddPreset, proInddJsonFileName, serializeProInddPreset } from './pro-indd-export'
import { useProGtfsRepository } from './pro-gtfs-repository-context'
import type { ProConstructedRoute } from './pro-types'

export function useProInddExport({
  version,
  preset,
  context,
  constructedRoutes,
  stopMap,
  sourceNameMap,
}: {
  version: ProVersion
  preset: ProPreset
  context: ProPresetContext
  constructedRoutes: ProConstructedRoute[]
  stopMap: Record<string, GtfsStop>
  sourceNameMap: Record<string, string>
}) {
  const repository = useProGtfsRepository()
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestInddJson = async () => {
    setExporting(true)
    setError(null)
    try {
      const tripsByDay = await loadProInddTripsByDay({
        repository,
        preset,
        context,
        sourceNameMap,
        referenceDate: version.revisionDate || todayIsoDate(),
      })
      const inddPreset = buildProInddPreset({ preset, constructedRoutes, stopMap, tripsByDay })
      downloadBlob(
        new Blob([serializeProInddPreset(inddPreset)], { type: 'application/json;charset=utf-8' }),
        proInddJsonFileName(preset.id),
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'InDesign用JSONの作成に失敗しました。')
    } finally {
      setExporting(false)
    }
  }

  return {
    exporting,
    error,
    requestInddJson,
  }
}
