import { useEffect, useMemo, useRef, useState } from 'react'
import type { GtfsRepository } from '../../../gtfsRepository'
import type { GtfsStop, ProPreset, ProPresetContext, ProVersion } from '../../../types'
import {
  buildProPoleStopIdsBySource,
  buildProRouteSelection,
  sameProStopIdsBySource,
  type ProStopIdsBySource,
} from './pro-preset-change-helpers'
import { proGtfsSourceDisplayName } from './pro-source-helpers'
import type { ProConstructedRoute, ProRouteOption } from './pro-types'
import { useProGtfsRepository } from './pro-gtfs-repository-context'

type LoadedStopMapInputs = {
  constructedRoutes: ProConstructedRoute[]
  handles: ProPresetContext['handles']
  poleStopIdsBySource: ProStopIdsBySource
}

export function useProEditorData({
  context,
  draftVersion,
  draftPreset,
}: {
  context: ProPresetContext
  draftVersion: ProVersion
  draftPreset: ProPreset | null
}) {
  const repository = useProGtfsRepository()
  const draftContext = useProDraftContext(context, draftVersion, repository)
  const sourceNameMap = useMemo(
    () => Object.fromEntries(draftVersion.gtfsSources.map((source) => [source.sourceId, proGtfsSourceDisplayName(source)])),
    [draftVersion.gtfsSources],
  )
  const routeOptions = useProRouteOptions(draftVersion, draftContext, repository)
  const constructedRoutes = useProConstructedRoutes(draftPreset, draftContext, sourceNameMap, repository)
  const stopMap = useProStopMap(draftPreset, draftContext, constructedRoutes, repository)

  return {
    draftContext,
    sourceNameMap,
    routeOptions,
    constructedRoutes,
    stopMap,
  }
}

function useProDraftContext(context: ProPresetContext, draftVersion: ProVersion, repository: GtfsRepository): ProPresetContext {
  const [draftContext, setDraftContext] = useState<ProPresetContext>({ loading: false, handles: {}, errors: {} })

  useEffect(() => {
    let cancelled = false
    setDraftContext((current) => ({ ...current, loading: true }))
    const load = async () => {
      const entries = await Promise.all(
        draftVersion.gtfsSources.map(async (source) => {
          const existing = context.handles[source.sourceId]
          if (existing) {
            return [source.sourceId, existing, null] as const
          }
          try {
            if (source.info.kind === 'raw' && source.info.cacheState === 'missing') {
              throw new Error('GTFSキャッシュが見つからないため、ZIPの再アップロードが必要です。')
            }
            const result =
              source.info.kind === 'repo' ? await repository.openRepoFeed(source.info) : await repository.openRawFeed(source.info)
            return [source.sourceId, result.handle, null] as const
          } catch (error) {
            return [source.sourceId, null, error instanceof Error ? error.message : 'GTFSデータの読み込みに失敗しました'] as const
          }
        }),
      )
      if (cancelled) {
        return
      }
      setDraftContext({
        loading: false,
        handles: Object.fromEntries(entries.flatMap(([sourceId, handle]) => (handle ? [[sourceId, handle]] : []))),
        errors: Object.fromEntries(entries.flatMap(([sourceId, , error]) => (error ? [[sourceId, error]] : []))),
      })
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [context.handles, draftVersion.gtfsSources, repository])

  return draftContext
}

function useProRouteOptions(draftVersion: ProVersion, draftContext: ProPresetContext, repository: GtfsRepository): ProRouteOption[] {
  const [routeOptions, setRouteOptions] = useState<ProRouteOption[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const options = await Promise.all(
        draftVersion.gtfsSources.map(async (source) => {
          const handle = draftContext.handles[source.sourceId]
          if (!handle) {
            return []
          }
          const sourceName = proGtfsSourceDisplayName(source)
          const routes = await repository.listRoutesWithDirections(handle)
          return routes.map((route) => ({
            ...route,
            railwayCode: `${source.sourceId}::${route.railwayCode}`,
            sourceId: source.sourceId,
            sourceName,
            label: `${sourceName} / ${route.label}`,
          }))
        }),
      )
      if (!cancelled) {
        setRouteOptions(options.flat())
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [draftContext.handles, draftVersion.gtfsSources, repository])

  return routeOptions
}

function useProConstructedRoutes(
  draftPreset: ProPreset | null,
  draftContext: ProPresetContext,
  sourceNameMap: Record<string, string>,
  repository: GtfsRepository,
): ProConstructedRoute[] {
  const [constructedRoutes, setConstructedRoutes] = useState<ProConstructedRoute[]>([])
  const routeSelection = useMemo(
    () => buildProRouteSelection(draftPreset?.sourceIds, draftPreset?.routes),
    [draftPreset?.routes, draftPreset?.sourceIds],
  )

  useEffect(() => {
    if (!routeSelection) {
      setConstructedRoutes([])
      return
    }
    let cancelled = false
    const load = async () => {
      const routes = await Promise.all(
        routeSelection.sourceIds.map(async (sourceId) => {
          const handle = draftContext.handles[sourceId]
          if (!handle) {
            return []
          }
          const selectedRoutes = routeSelection.routes.filter((route) => route.sourceId === sourceId)
          const built = await repository.buildConstructedRoutes(handle, selectedRoutes)
          return built.map((route) => ({
            ...route,
            sourceId,
            sourceName: sourceNameMap[sourceId] ?? sourceId,
          }))
        }),
      )
      if (!cancelled) {
        setConstructedRoutes(routes.flat())
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [draftContext.handles, repository, routeSelection, sourceNameMap])

  return constructedRoutes
}

function useProStopMap(
  draftPreset: ProPreset | null,
  draftContext: ProPresetContext,
  constructedRoutes: ProConstructedRoute[],
  repository: GtfsRepository,
): Record<string, GtfsStop> {
  const [stopMap, setStopMap] = useState<Record<string, GtfsStop>>({})
  const loadedInputsRef = useRef<LoadedStopMapInputs | null>(null)
  const routeSelection = useMemo(
    () => buildProRouteSelection(draftPreset?.sourceIds, draftPreset?.routes),
    [draftPreset?.routes, draftPreset?.sourceIds],
  )
  const poleStopIdsBySource = useMemo(() => buildProPoleStopIdsBySource(draftPreset?.poles), [draftPreset?.poles])

  useEffect(() => {
    if (!routeSelection) {
      setStopMap({})
      loadedInputsRef.current = null
      return
    }
    const loadedInputs = loadedInputsRef.current
    if (
      loadedInputs &&
      loadedInputs.constructedRoutes === constructedRoutes &&
      loadedInputs.handles === draftContext.handles &&
      sameProStopIdsBySource(loadedInputs.poleStopIdsBySource, poleStopIdsBySource)
    ) {
      return
    }

    let cancelled = false
    const load = async () => {
      const sourceStopIds = new Map<string, Set<string>>()
      for (const route of constructedRoutes) {
        const ids = sourceStopIds.get(route.sourceId) ?? new Set<string>()
        for (const stop of route.stopPatterns.flat()) {
          ids.add(stop.stopId)
        }
        sourceStopIds.set(route.sourceId, ids)
      }
      for (const [sourceId, stopIds] of poleStopIdsBySource) {
        const ids = sourceStopIds.get(sourceId) ?? new Set<string>()
        stopIds.forEach((stopId) => ids.add(stopId))
        sourceStopIds.set(sourceId, ids)
      }
      const stopEntries = await Promise.all(
        Array.from(sourceStopIds.entries()).map(async ([sourceId, stopIds]) => {
          const handle = draftContext.handles[sourceId]
          if (!handle) {
            return {}
          }
          const stops = await repository.getStopsByIds(handle, Array.from(stopIds))
          return Object.fromEntries(Object.entries(stops).map(([id, stop]) => [`${sourceId}::${id}`, stop]))
        }),
      )
      if (!cancelled) {
        setStopMap(Object.assign({}, ...stopEntries))
        loadedInputsRef.current = {
          constructedRoutes,
          handles: draftContext.handles,
          poleStopIdsBySource,
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [constructedRoutes, draftContext.handles, poleStopIdsBySource, repository, routeSelection])

  return stopMap
}
