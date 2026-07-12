import { useState } from 'react'
import type { GtfsRepository } from '../../../gtfsRepository'
import type { GtfsServiceWeekday, GtfsStop, ProPreset, ProPresetContext, ProVersion } from '../../../types'
import { downloadBlob, todayIsoDate } from '../../../utils'
import { proExcludedStopPatternsForSource } from './pro-pole-stop-helpers'
import { buildProInddPreset, proInddJsonFileName, serializeProInddPreset } from './pro-indd-export'
import { useProGtfsRepository } from './pro-gtfs-repository-context'
import type { ProConstructedRoute, ProConstructedTrip } from './pro-types'

const INDD_DAY_TYPES: GtfsServiceWeekday[] = ['monday', 'saturday', 'sunday']

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

async function loadProInddTripsByDay({
  repository,
  preset,
  context,
  sourceNameMap,
  referenceDate,
}: {
  repository: GtfsRepository
  preset: ProPreset
  context: ProPresetContext
  sourceNameMap: Record<string, string>
  referenceDate: string
}): Promise<ProConstructedTrip[][]> {
  return Promise.all(
    INDD_DAY_TYPES.map(async (weekday) => {
      const tripsBySource = await Promise.all(
        preset.sourceIds.map(async (sourceId) => {
          const handle = context.handles[sourceId]
          if (!handle) {
            throw new Error(`${sourceNameMap[sourceId] ?? sourceId} のGTFSデータを読み込めません。`)
          }
          const selectedRoutes = preset.routes
            .filter((route) => route.sourceId === sourceId)
            .map(({ id, direction }) => ({ id, direction }))
          if (selectedRoutes.length === 0) {
            return []
          }
          const trips = await repository.listTripsForWeekday(
            handle,
            selectedRoutes,
            weekday,
            referenceDate,
            proExcludedStopPatternsForSource(preset.excludedStopPatterns, sourceId),
          )
          return trips.map((trip) => ({
            ...trip,
            sourceId,
            sourceName: sourceNameMap[sourceId] ?? sourceId,
          }))
        }),
      )
      return tripsBySource.flat()
    }),
  )
}
