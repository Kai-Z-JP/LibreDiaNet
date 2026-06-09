import type { GtfsStop, ProPoleDetail } from '../../../types'
import { sameProPoleStop } from './pro-pole-stop-helpers'

export function mergeUniqueProStops(targetStops: ProPoleDetail['stops'], sourceStops: ProPoleDetail['stops']) {
  return [...targetStops, ...sourceStops.filter((stop) => !targetStops.some((current) => sameProPoleStop(current, stop)))]
}

export function uniqueProStopNames(stops: ProPoleDetail['stops'], stopMap: Record<string, GtfsStop>): string[] {
  return Array.from(new Set(stops.map((stop) => stopMap[`${stop.sourceId}::${stop.id}`]?.name ?? stop.id))).toSorted((left, right) =>
    left.localeCompare(right, 'ja'),
  )
}
