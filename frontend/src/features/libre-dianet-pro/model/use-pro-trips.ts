import { useEffect, useMemo, useState } from 'react'
import type { GtfsServiceWeekday, GtfsStop, ProPreset, ProPresetContext } from '../../../types'
import { todayIsoDate } from '../../../utils'
import { libreDiaNetRepository } from '../../libre-dianet/lib/repository'
import { buildProRouteSelection } from './pro-preset-change-helpers'
import { proExcludedStopPatternsForSource } from './pro-pole-stop-helpers'
import { sortProConstructedTrips } from './pro-preview-display-helpers'
import type { ProConstructedTrip } from './pro-types'
import type { ProPreviewMode } from './use-pro-preview-state'

export function useProTrips({
  revisionDate,
  preset,
  context,
  previewMode,
  weekday,
  date,
  sourceNameMap,
}: {
  revisionDate: string
  preset: ProPreset
  context: ProPresetContext
  previewMode: ProPreviewMode
  weekday: GtfsServiceWeekday
  date: string
  sourceNameMap: Record<string, string>
}): ProConstructedTrip[] {
  const [trips, setTrips] = useState<ProConstructedTrip[]>([])
  const routeSelection = useMemo(() => buildProRouteSelection(preset.sourceIds, preset.routes), [preset.routes, preset.sourceIds])

  useEffect(() => {
    if (!routeSelection) {
      setTrips([])
      return
    }
    let cancelled = false
    const weekdayReferenceDate = revisionDate || todayIsoDate()
    const load = async () => {
      const nextTrips = await Promise.all(
        routeSelection.sourceIds.map(async (sourceId) => {
          const handle = context.handles[sourceId]
          if (!handle) {
            return []
          }
          const selectedRoutes = routeSelection.routes
            .filter((route) => route.sourceId === sourceId)
            .map(({ id, direction }) => ({ id, direction }))
          if (selectedRoutes.length === 0) {
            return []
          }
          const excludedStopPatterns = proExcludedStopPatternsForSource(preset.excludedStopPatterns, sourceId)
          const sourceTrips =
            previewMode === 'day-type'
              ? await libreDiaNetRepository.listTripsForWeekday(handle, selectedRoutes, weekday, weekdayReferenceDate, excludedStopPatterns)
              : await libreDiaNetRepository.listTripsForDate(handle, selectedRoutes, date, excludedStopPatterns)
          return sourceTrips.map((trip) => ({
            ...trip,
            sourceId,
            sourceName: sourceNameMap[sourceId] ?? sourceId,
          }))
        }),
      )
      if (!cancelled) {
        setTrips(nextTrips.flat())
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [context.handles, date, preset.excludedStopPatterns, previewMode, revisionDate, routeSelection, sourceNameMap, weekday])

  return trips
}

export function useSortedProTrips(
  trips: ProConstructedTrip[],
  poles: ProPreset['poles'],
  stopMap: Record<string, GtfsStop>,
): ProConstructedTrip[] {
  return useMemo(() => sortProConstructedTrips(trips, poles, stopMap), [poles, stopMap, trips])
}
