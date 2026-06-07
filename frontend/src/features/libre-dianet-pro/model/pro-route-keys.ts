import type { GtfsStop } from '../../../types'
import { stopPatternKey } from '../../../utils'
import type { ProConstructedTrip } from './pro-types'

export function proRouteBaseKeyFromParts(sourceId: string, routeId: string, direction: number | null): string {
  return `${sourceId}::${routeId}::${direction ?? 'null'}`
}

export function proRouteKey(
  route: { sourceId: string; route: { routeId: string }; direction: number | null },
  pattern: GtfsStop[],
): string {
  return proRouteKeyFromParts(route.sourceId, route.route.routeId, route.direction, stopPatternKey(pattern))
}

export function proTripRouteKey(trip: ProConstructedTrip): string {
  return proRouteKeyFromParts(trip.sourceId, trip.routeId, trip.direction, stopPatternKey(trip.stopTime))
}

export function proRouteKeyFromParts(sourceId: string, routeId: string, direction: number | null, patternKey: string): string {
  return `${proRouteBaseKeyFromParts(sourceId, routeId, direction)}::${patternKey}`
}
