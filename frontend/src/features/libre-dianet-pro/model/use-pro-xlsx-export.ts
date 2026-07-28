import { useState } from 'react'
import { buildProCreateFromDataRequest, namespaceId, requestDiaNetXlsx } from '../../../api'
import type { GtfsRepository } from '../../../gtfsRepository'
import type { DayMapping, ProPreset, ProPresetContext, ProVersion } from '../../../types'
import { proExcludedStopPatternsForSource } from './pro-pole-stop-helpers'
import { useProGtfsRepository } from './pro-gtfs-repository-context'

export function useProXlsxExport({
  version,
  preset,
  context,
  sourceNameMap,
}: {
  version: ProVersion
  preset: ProPreset
  context: ProPresetContext
  sourceNameMap: Record<string, string>
}) {
  const repository = useProGtfsRepository()
  const [downloading, setDownloading] = useState(false)

  const requestXlsx = async (dayMapping: DayMapping[]) => {
    setDownloading(true)
    try {
      const gtfsEntries = await Promise.all(
        preset.sourceIds.map(async (sourceId) => {
          const handle = context.handles[sourceId]
          if (!handle) {
            return null
          }
          const singlePreset = {
            id: preset.id,
            name: preset.name,
            index: preset.index,
            info: {
              kind: 'raw' as const,
              id: sourceId,
              uuid: sourceId,
              name: sourceNameMap[sourceId] ?? sourceId,
              cacheState: 'ready' as const,
            },
            routes: preset.routes.filter((route) => route.sourceId === sourceId).map(({ id, direction }) => ({ id, direction })),
            poles: preset.poles.flatMap((pole) =>
              pole.stops
                .filter((stop) => stop.sourceId === sourceId)
                .map((stop) => ({
                  id: stop.id,
                  override: pole.override,
                })),
            ),
            excludedStopPatterns: proExcludedStopPatternsForSource(preset.excludedStopPatterns, sourceId),
          }
          return [sourceId, await repository.buildExportData(handle, singlePreset)] as const
        }),
      )
      const gtfsBySourceId = Object.fromEntries(
        gtfsEntries.filter((entry): entry is readonly [string, NonNullable<typeof entry>[1]] => Boolean(entry)),
      )
      const resolvedDayMapping = await resolveProDayMappingServiceIds(dayMapping, preset.sourceIds, context, repository)
      await requestDiaNetXlsx(buildProCreateFromDataRequest(version, preset, gtfsBySourceId, resolvedDayMapping))
    } finally {
      setDownloading(false)
    }
  }

  return {
    downloading,
    requestXlsx,
  }
}

async function resolveProDayMappingServiceIds(
  dayMapping: DayMapping[],
  sourceIds: string[],
  context: ProPresetContext,
  repository: GtfsRepository,
): Promise<DayMapping[]> {
  return Promise.all(
    dayMapping.map(async (mapping) => {
      if (mapping.type !== 'date') {
        return mapping
      }
      const serviceIds = (
        await Promise.all(
          sourceIds.map(async (sourceId) => {
            const handle = context.handles[sourceId]
            if (!handle) {
              return []
            }
            const [resolved] = await repository.resolveDayMappingServiceIds(handle, [mapping], (serviceId) =>
              namespaceId(sourceId, serviceId),
            )
            return resolved?.type === 'date' ? (resolved.serviceIds ?? []) : []
          }),
        )
      ).flat()
      return {
        ...mapping,
        serviceIds,
      }
    }),
  )
}
