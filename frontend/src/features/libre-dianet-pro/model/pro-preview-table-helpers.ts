import type { GtfsStop, ProPreset } from '../../../types'
import { stopPatternKey } from '../../../utils'
import { proPoleDisplayName } from './pro-pole-stop-helpers'
import type { ProConstructedRoute } from './pro-types'

export function countConsecutivePoleNames(poles: ProPreset['poles'], startIndex: number, stopMap: Record<string, GtfsStop>): number {
  const name = proPoleDisplayName(poles[startIndex], stopMap)
  let count = 1
  for (let index = startIndex + 1; index < poles.length; index += 1) {
    if (proPoleDisplayName(poles[index], stopMap) !== name) {
      break
    }
    count += 1
  }
  return count
}

export function proPoleRawJoko(
  poles: ProPreset['poles'],
  poleIndex: number,
  constructedRoutes: ProConstructedRoute[],
  stopMap: Record<string, GtfsStop>,
): string {
  const override = poles[poleIndex]?.override.jokoOverride
  if (override === '発' || override === '着' || override === '') {
    return override
  }
  if (poles[poleIndex]?.stops.length === 0) {
    return ''
  }
  if (poleIndex === 0) {
    return '発'
  }
  if (poleIndex === poles.length - 1) {
    return '着'
  }

  const pole = poles[poleIndex]
  if (pole.stops.some((stop) => stopMap[`${stop.sourceId}::${stop.id}`]?.platformCode === '降車')) {
    return '着'
  }

  const matchingPatterns = constructedRoutes.flatMap((route) =>
    route.stopPatterns
      .map((pattern) => ({
        pattern,
        stopIndex: pattern.findIndex((patternStop, index) =>
          pole.stops.some((stop) => proPatternStopMatchesPoleStop(route.sourceId, pattern, patternStop, index, stop)),
        ),
      }))
      .filter((match) => match.stopIndex >= 0),
  )

  if (matchingPatterns.length === 1) {
    const [match] = matchingPatterns
    return match.stopIndex === match.pattern.length - 1 ? '着' : '発'
  }

  return '発'
}

function proPatternStopMatchesPoleStop(
  sourceId: string,
  pattern: GtfsStop[],
  patternStop: GtfsStop,
  patternStopIndex: number,
  stop: ProPreset['poles'][number]['stops'][number],
): boolean {
  if (stop.sourceId !== sourceId || patternStop.stopId !== stop.id) {
    return false
  }
  return stopPatternKey(pattern) === stop.stopPatternKey && patternStopIndex === stop.stopIndex
}
