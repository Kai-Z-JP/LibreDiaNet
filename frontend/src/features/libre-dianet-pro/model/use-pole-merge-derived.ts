import { useMemo } from 'react'
import type { GtfsStop, ProPreset } from '../../../types'
import { proPoleStopKey, proRoutePatternEntries, proRoutePatternMap, proStopIdKey } from './pro-pole-stop-helpers'
import type { ProConstructedRoute } from './pro-types'

export type PolePatternMap = Record<
  string,
  {
    route: ProConstructedRoute
    pattern: GtfsStop[]
    patternIndex: number
    presetPatternIndex: number
  }
>

export function usePoleMergeDerivedData({ preset, constructedRoutes }: { preset: ProPreset; constructedRoutes: ProConstructedRoute[] }) {
  const includeSourceNameInRoute = preset.sourceIds.length > 1
  const usedPoleStopKeys = useMemo(
    () => new Set(preset.poles.flatMap((pole) => pole.stops.map((stop) => proPoleStopKey(stop)))),
    [preset.poles],
  )
  const patternMap: PolePatternMap = useMemo(
    () =>
      Object.fromEntries(
        proRoutePatternEntries(constructedRoutes).map(({ route, pattern, patternIndex, presetPatternIndex }) => [
          `${route.sourceId}|${route.route.routeId}|${route.direction ?? 'null'}|${patternIndex}`,
          { route, pattern, patternIndex, presetPatternIndex },
        ]),
      ),
    [constructedRoutes],
  )
  const routePatternMap = useMemo(() => proRoutePatternMap(constructedRoutes), [constructedRoutes])
  const duplicateStopIdKeys = useMemo(() => {
    const duplicateKeys = new Set<string>()
    for (const route of constructedRoutes) {
      for (const pattern of route.stopPatterns) {
        const counts = new Map<string, number>()
        for (const stop of pattern) {
          const key = proStopIdKey(route.sourceId, stop.stopId)
          counts.set(key, (counts.get(key) ?? 0) + 1)
        }
        for (const [key, count] of counts) {
          if (count >= 2) {
            duplicateKeys.add(key)
          }
        }
      }
    }
    return duplicateKeys
  }, [constructedRoutes])

  return {
    includeSourceNameInRoute,
    usedPoleStopKeys,
    patternMap,
    routePatternMap,
    duplicateStopIdKeys,
  }
}
