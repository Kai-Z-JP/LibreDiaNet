import { useMemo } from 'react'
import type { ProPreset, ProPresetContext } from '../../../types'
import { isProPatternExcluded, proPatternPreviewTimes, proTripPreviewTimes } from './pro-preview-display-helpers'
import { proRouteKey } from './pro-route-keys'
import type { ProConstructedRoute, ProConstructedTrip } from './pro-types'

export function useProPreviewDisplay({
  preset,
  context,
  constructedRoutes,
  constructedTrips,
}: {
  preset: ProPreset
  context: ProPresetContext
  constructedRoutes: ProConstructedRoute[]
  constructedTrips: ProConstructedTrip[]
}) {
  const includeSourceNameInRoute = preset.sourceIds.length > 1
  const routeDisplayOverridesByKey = useMemo(
    () => Object.fromEntries(preset.routeDisplayOverrides.map((override) => [override.routeKey, override])),
    [preset.routeDisplayOverrides],
  )
  const previewConstructedRoutes = constructedRoutes
  const previewTimesByTripKey = useMemo(
    () =>
      Object.fromEntries(
        constructedTrips.map((trip, index) => [
          `${trip.sourceId}::${trip.stopTime[0]?.tripId ?? index}`,
          proTripPreviewTimes(trip, preset.poles),
        ]),
      ),
    [constructedTrips, preset.poles],
  )
  const previewTimesByPatternKey = useMemo(
    () =>
      Object.fromEntries(
        previewConstructedRoutes.flatMap((route) =>
          route.stopPatterns.map((pattern) => [
            proRouteKey(route, pattern),
            isProPatternExcluded(preset, route, pattern) ? [] : proPatternPreviewTimes(pattern, preset.poles, route.sourceId),
          ]),
        ),
      ),
    [preset, previewConstructedRoutes],
  )
  const exportDisabled = preset.sourceIds.length === 0 || preset.sourceIds.some((sourceId) => !context.handles[sourceId])

  return {
    includeSourceNameInRoute,
    routeDisplayOverridesByKey,
    previewConstructedRoutes,
    previewTimesByTripKey,
    previewTimesByPatternKey,
    exportDisabled,
  }
}
