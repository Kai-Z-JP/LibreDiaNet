import type { GtfsRepository } from '../../../gtfsRepository'
import type { GtfsStop, ProPreset, ProPresetContext, ProVersion } from '../../../types'
import { todayIsoDate } from '../../../utils'
import { buildProInddPreset, PRO_INDD_WEEKDAYS, type ProInddPreset, type ProInddTripsByWeekday } from './pro-indd-export'
import { proExcludedStopPatternsForSource } from './pro-pole-stop-helpers'
import { proGtfsSourceDisplayName } from './pro-source-helpers'
import type { ProConstructedRoute } from './pro-types'

export async function openProInddVersionContext(repository: GtfsRepository, version: ProVersion): Promise<ProPresetContext> {
  const usedSourceIds = new Set(version.presets.flatMap((preset) => preset.sourceIds))
  const sourcesById = new Map(version.gtfsSources.map((source) => [source.sourceId, source]))
  const entries = await Promise.all(
    Array.from(usedSourceIds).map(async (sourceId) => {
      const source = sourcesById.get(sourceId)
      if (!source) {
        throw new Error(`GTFSデータがバージョン内に見つかりません: ${sourceId}`)
      }
      if (source.info.kind === 'raw' && source.info.cacheState === 'missing') {
        throw new Error(`${proGtfsSourceDisplayName(source)} のGTFSキャッシュが見つかりません。ZIPを再アップロードしてください。`)
      }
      const result = source.info.kind === 'repo' ? await repository.openRepoFeed(source.info) : await repository.openRawFeed(source.info)
      return [sourceId, result.handle] as const
    }),
  )
  return {
    loading: false,
    handles: Object.fromEntries(entries),
    errors: {},
  }
}

export async function prepareProInddPreset({
  repository,
  version,
  preset,
  context,
  sourceNameMap,
}: {
  repository: GtfsRepository
  version: ProVersion
  preset: ProPreset
  context: ProPresetContext
  sourceNameMap: Record<string, string>
}): Promise<ProInddPreset> {
  const constructedRoutes = await loadProInddConstructedRoutes(repository, preset, context, sourceNameMap)
  const stopMap = await loadProInddStopMap(repository, preset, context, constructedRoutes)
  const tripsByWeekday = await loadProInddTripsByDay({
    repository,
    preset,
    context,
    sourceNameMap,
    referenceDate: version.revisionDate || todayIsoDate(),
  })
  return buildProInddPreset({ preset, constructedRoutes, stopMap, tripsByWeekday })
}

export async function loadProInddTripsByDay({
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
}): Promise<ProInddTripsByWeekday> {
  const entries = await Promise.all(
    PRO_INDD_WEEKDAYS.map(async (weekday) => {
      const tripsBySource = await Promise.all(
        preset.sourceIds.map(async (sourceId) => {
          const handle = requireProInddHandle(context, sourceId, sourceNameMap)
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
      return [weekday, tripsBySource.flat()] as const
    }),
  )
  return Object.fromEntries(entries) as ProInddTripsByWeekday
}

function loadProInddConstructedRoutes(
  repository: GtfsRepository,
  preset: ProPreset,
  context: ProPresetContext,
  sourceNameMap: Record<string, string>,
): Promise<ProConstructedRoute[]> {
  return Promise.all(
    preset.sourceIds.map(async (sourceId) => {
      const handle = requireProInddHandle(context, sourceId, sourceNameMap)
      const selectedRoutes = preset.routes.filter((route) => route.sourceId === sourceId)
      if (selectedRoutes.length === 0) {
        return []
      }
      const routes = await repository.buildConstructedRoutes(handle, selectedRoutes)
      return routes.map((route) => ({
        ...route,
        sourceId,
        sourceName: sourceNameMap[sourceId] ?? sourceId,
      }))
    }),
  ).then((routes) => routes.flat())
}

async function loadProInddStopMap(
  repository: GtfsRepository,
  preset: ProPreset,
  context: ProPresetContext,
  constructedRoutes: ProConstructedRoute[],
): Promise<Record<string, GtfsStop>> {
  const stopIdsBySource = new Map<string, Set<string>>()
  for (const route of constructedRoutes) {
    const ids = stopIdsBySource.get(route.sourceId) ?? new Set<string>()
    route.stopPatterns.flat().forEach((stop) => ids.add(stop.stopId))
    stopIdsBySource.set(route.sourceId, ids)
  }
  for (const pole of preset.poles) {
    for (const stop of pole.stops) {
      const ids = stopIdsBySource.get(stop.sourceId) ?? new Set<string>()
      ids.add(stop.id)
      stopIdsBySource.set(stop.sourceId, ids)
    }
  }
  const entries = await Promise.all(
    Array.from(stopIdsBySource.entries()).map(async ([sourceId, stopIds]) => {
      const handle = requireProInddHandle(context, sourceId, {})
      const stops = await repository.getStopsByIds(handle, Array.from(stopIds))
      return Object.entries(stops).map(([stopId, stop]) => [`${sourceId}::${stopId}`, stop] as const)
    }),
  )
  return Object.fromEntries(entries.flat())
}

function requireProInddHandle(context: ProPresetContext, sourceId: string, sourceNameMap: Record<string, string>) {
  const handle = context.handles[sourceId]
  if (!handle) {
    throw new Error(`${sourceNameMap[sourceId] ?? sourceId} のGTFSデータを読み込めません。`)
  }
  return handle
}
