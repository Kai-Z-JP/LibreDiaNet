import { useState } from 'react'
import { buildProCreateFromDataRequest, namespaceId, requestDiaNetXlsx } from '../../../api'
import type { DayMapping, ProPreset, ProPresetContext, ProVersion } from '../../../types'
import { libreDiaNetRepository } from '../../libre-dianet/lib/repository'
import { proExcludedStopPatternsForSource } from './pro-pole-stop-helpers'

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
          return [sourceId, await libreDiaNetRepository.buildExportData(handle, singlePreset)] as const
        }),
      )
      const gtfsBySourceId = Object.fromEntries(
        gtfsEntries.filter((entry): entry is readonly [string, NonNullable<typeof entry>[1]] => Boolean(entry)),
      )
      const resolvedDayMapping = await resolveProDayMappingServiceIds(dayMapping, preset.sourceIds, context)
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
            const [resolved] = await libreDiaNetRepository.resolveDayMappingServiceIds(handle, [mapping], (serviceId) =>
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
