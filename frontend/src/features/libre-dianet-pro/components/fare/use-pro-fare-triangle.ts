import { useEffect, useMemo, useState } from 'react'
import type { FareV1Data, GtfsRepository } from '../../../../gtfsRepository'
import type { GtfsStop, ProPreset, ProPresetContext } from '../../../../types'
import { buildFareTriangle, buildFareTriangleAxis, type FareTriangle, type FareTriangleAxisEntry } from '../../model/pro-fare-triangle'
import type { ProConstructedRoute } from '../../model/pro-types'

export type ProFareSourceRequest = {
  sourceId: string
  routeIds: string[]
  stopIds: string[]
}

export type ProFareLoadState = {
  dataBySource: Record<string, FareV1Data>
  errorsBySource: Record<string, string>
  pendingSourceIds: string[]
}

export function buildProFareSourceRequests(preset: Pick<ProPreset, 'routes' | 'poles'>): ProFareSourceRequest[] {
  const sourceIds = new Set(preset.routes.map((route) => route.sourceId))

  return Array.from(sourceIds, (sourceId) => ({
    sourceId,
    routeIds: Array.from(new Set(preset.routes.filter((route) => route.sourceId === sourceId).map((route) => route.id))),
    stopIds: Array.from(
      new Set(preset.poles.flatMap((pole) => pole.stops.filter((stop) => stop.sourceId === sourceId).map((stop) => stop.id))),
    ),
  }))
}

export function selectCurrentFareRoutes(
  preset: Pick<ProPreset, 'routes'>,
  constructedRoutes: ProConstructedRoute[],
): ProConstructedRoute[] {
  const selectedRouteKeys = new Set(preset.routes.map((route) => fareRouteKey(route.sourceId, route.id, route.direction)))
  return constructedRoutes.filter((route) => selectedRouteKeys.has(fareRouteKey(route.sourceId, route.route.routeId, route.direction)))
}

export function useProFareTriangle({
  preset,
  context,
  constructedRoutes,
  stopMap,
  sourceNameMap,
  repository,
}: {
  preset: ProPreset
  context: ProPresetContext
  constructedRoutes: ProConstructedRoute[]
  stopMap: Record<string, GtfsStop>
  sourceNameMap: Record<string, string>
  repository: GtfsRepository
}): {
  axis: FareTriangleAxisEntry[]
  triangle: FareTriangle
  loadState: ProFareLoadState
  loading: boolean
} {
  const requests = useMemo(() => buildProFareSourceRequests({ routes: preset.routes, poles: preset.poles }), [preset.poles, preset.routes])
  const axis = useMemo(() => buildFareTriangleAxis(preset.poles, stopMap), [preset.poles, stopMap])
  const currentConstructedRoutes = useMemo(
    () => selectCurrentFareRoutes({ routes: preset.routes }, constructedRoutes),
    [constructedRoutes, preset.routes],
  )
  const [loadState, setLoadState] = useState<ProFareLoadState>({
    dataBySource: {},
    errorsBySource: {},
    pendingSourceIds: [],
  })

  useEffect(() => {
    let cancelled = false
    const errorsBySource: Record<string, string> = {}
    const loadableRequests = context.loading
      ? []
      : requests.filter(({ sourceId }) => {
          const contextError = context.errors[sourceId]
          if (contextError) {
            errorsBySource[sourceId] = contextError
            return false
          }
          if (!context.handles[sourceId]) {
            errorsBySource[sourceId] = 'GTFSデータを読み込めませんでした。'
            return false
          }
          return true
        })

    setLoadState({
      dataBySource: {},
      errorsBySource,
      pendingSourceIds: context.loading ? requests.map((request) => request.sourceId) : loadableRequests.map((request) => request.sourceId),
    })

    if (context.loading) {
      return () => {
        cancelled = true
      }
    }

    loadableRequests.forEach(({ sourceId, routeIds, stopIds }) => {
      const handle = context.handles[sourceId]
      if (!handle) {
        return
      }
      void repository.loadFareV1Data(handle, routeIds, stopIds).then(
        (data) => {
          if (cancelled) {
            return
          }
          setLoadState((current) => ({
            ...current,
            dataBySource: { ...current.dataBySource, [sourceId]: data },
            pendingSourceIds: current.pendingSourceIds.filter((pendingSourceId) => pendingSourceId !== sourceId),
          }))
        },
        (error: unknown) => {
          if (cancelled) {
            return
          }
          setLoadState((current) => ({
            ...current,
            errorsBySource: {
              ...current.errorsBySource,
              [sourceId]: error instanceof Error ? error.message : '運賃データの読み込みに失敗しました。',
            },
            pendingSourceIds: current.pendingSourceIds.filter((pendingSourceId) => pendingSourceId !== sourceId),
          }))
        },
      )
    })

    return () => {
      cancelled = true
    }
  }, [context.errors, context.handles, context.loading, repository, requests])

  const triangle = useMemo(
    () =>
      buildFareTriangle({
        axis,
        constructedRoutes: currentConstructedRoutes,
        fareDataBySource: loadState.dataBySource,
        sourceNameMap,
        stopMap,
        excludedStopPatterns: preset.excludedStopPatterns,
      }),
    [axis, currentConstructedRoutes, loadState.dataBySource, preset.excludedStopPatterns, sourceNameMap, stopMap],
  )

  return {
    axis,
    triangle,
    loadState,
    loading: context.loading || loadState.pendingSourceIds.length > 0,
  }
}

function fareRouteKey(sourceId: string, routeId: string, direction: number | null): string {
  return `${sourceId}::${routeId}::${direction ?? 'null'}`
}
