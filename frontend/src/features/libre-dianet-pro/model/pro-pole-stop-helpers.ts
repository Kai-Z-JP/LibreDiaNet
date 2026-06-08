import type { GtfsStop, GtfsStopTime, ProPoleDetail, ProPoleStop } from '../../../types'
import { displayRouteName, stopPatternKey } from '../../../utils'
import type { ProConstructedRoute } from './pro-types'

export type ProRoutePatternEntry = {
  route: ProConstructedRoute
  pattern: GtfsStop[]
  patternIndex: number
  presetPatternIndex: number
}

export function hasVisibleProOverride(pole: ProPoleDetail): boolean {
  return (
    pole.override.majorStop ||
    pole.override.branchStart ||
    pole.override.branchEnd ||
    pole.override.nameOverride !== null ||
    pole.override.locationNameOverride !== null ||
    pole.override.jokoOverride !== null ||
    pole.override.rowShading ||
    pole.override.stopNameBold ||
    pole.override.horizontalLine
  )
}

export function proPoleStopKey(stop: Pick<ProPoleStop, 'sourceId' | 'id' | 'stopPatternKey' | 'stopIndex'>): string {
  return `${stop.sourceId}::${stop.stopPatternKey}::${stop.stopIndex}::${stop.id}`
}

export function proStopIdKey(sourceId: string, stopId: string): string {
  return `${sourceId}::${stopId}`
}

export function sameProPoleStop(left: ProPoleStop, right: ProPoleStop): boolean {
  return proPoleStopKey(left) === proPoleStopKey(right)
}

export function proPoleStopFromPatternStop(
  route: ProConstructedRoute,
  pattern: GtfsStop[],
  stop: GtfsStop,
  stopIndex: number,
): ProPoleStop {
  return {
    sourceId: route.sourceId,
    id: stop.stopId,
    stopSequence: stop.stopSequence ?? null,
    stopPatternKey: stopPatternKey(pattern),
    stopIndex,
  }
}

export function proExcludedStopPatternsForSource(patterns: string[][], sourceId: string): string[][] {
  const prefix = `${sourceId}::`
  return patterns
    .filter((pattern) => pattern.length === 1 && pattern[0]?.startsWith(prefix))
    .map((pattern) => [pattern[0].slice(prefix.length)])
}

export function proExcludedPatternKey(sourceId: string, pattern: GtfsStop[]): string {
  return `${sourceId}::${stopPatternKey(pattern)}`
}

export function proStopTimeMatchesPoleStop(
  pattern: GtfsStopTime[],
  stopTime: GtfsStopTime,
  stopIndex: number,
  stop: ProPoleDetail['stops'][number],
): boolean {
  return stopTime.stopId === stop.id && stopPatternKey(pattern) === stop.stopPatternKey && stopIndex === stop.stopIndex
}

export function proPoleDisplayName(pole: ProPoleDetail, stopMap: Record<string, GtfsStop>): string {
  const primaryStop = pole.stops[0]
  const primary = primaryStop ? stopMap[`${primaryStop.sourceId}::${primaryStop.id}`] : null
  return pole.override.nameOverride ?? primary?.name ?? pole.id
}

export function proPoleDefaultLocationName(pole: ProPoleDetail, stopMap: Record<string, GtfsStop>): string {
  const primaryStop = pole.stops[0]
  const primary = primaryStop ? stopMap[`${primaryStop.sourceId}::${primaryStop.id}`] : null
  return primary?.platformCode ?? ''
}

export function proPoleDisplayLocationName(pole: ProPoleDetail, stopMap: Record<string, GtfsStop>): string {
  return pole.override.locationNameOverride ?? proPoleDefaultLocationName(pole, stopMap)
}

export function proRouteDisplayLabel(route: ProConstructedRoute, includeSourceName: boolean): string {
  const routeName = displayRouteName(route.route.shortName, route.route.longName)
  return includeSourceName ? `${route.sourceName} / ${routeName}` : routeName
}

export function proRoutePatternEntries(routes: ProConstructedRoute[]): ProRoutePatternEntry[] {
  const entries: ProRoutePatternEntry[] = []
  for (const route of routes) {
    for (const [patternIndex, pattern] of route.stopPatterns.entries()) {
      entries.push({
        route,
        pattern,
        patternIndex,
        presetPatternIndex: entries.length,
      })
    }
  }
  return entries
}

export function proStopDisplayLabel(
  stop: ProPoleStop,
  stopMap: Record<string, GtfsStop>,
  routes: ProConstructedRoute[],
  includeSourceName: boolean,
): string {
  const stopName = stopMap[`${stop.sourceId}::${stop.id}`]?.name ?? `存在しない停留所`
  const routePattern = proRoutePatternForPoleStop(stop, routes)
  const routeLabel = routePattern ? proRouteDisplayLabel(routePattern.route, includeSourceName) : ''
  const patternLabel = routePattern ? `P${routePattern.presetPatternIndex + 1}: ` : ''
  const indexLabel = `#${stop.stopIndex + 1}`
  return [patternLabel, routeLabel ? `${routeLabel}${indexLabel}` : indexLabel, stopName, `(ID: ${stop.id})`].filter(Boolean).join(' ')
}

export function proRoutePatternForPoleStop(stop: ProPoleStop, routes: ProConstructedRoute[]): ProRoutePatternEntry | null {
  for (const entry of proRoutePatternEntries(routes)) {
    if (entry.route.sourceId !== stop.sourceId) {
      continue
    }
    if (stopPatternKey(entry.pattern) === stop.stopPatternKey && entry.pattern[stop.stopIndex]?.stopId === stop.id) {
      return entry
    }
  }
  return null
}
