import type { GtfsStop, ProDisplayFont, ProPoleDetail, ProPreset } from '../../../types'
import type { ProConstructedRoute, ProConstructedTrip, ProRouteOption } from './pro-types'
import { formatPreviewDepartureTime, stopPatternKey } from '../../../utils'
import { proPoleDisplayName, proStopTimeMatchesPoleStop } from './pro-pole-stop-helpers'
import { parseTimetableCompareValue, sortTimetableColumns } from './timetable-column-sort'

export const proDisplayFonts: { value: ProDisplayFont; label: string; css: string }[] = [
  { value: 'HEISEI_MINCHO_STD_W3', label: '平成明朝 Std W3', css: '"ヒラギノ明朝 ProN", serif' },
  { value: 'NADIA_R', label: 'ナディア R', css: '"Nadia R", "ヒラギノ角ゴ ProN", sans-serif' },
  { value: 'NADIA_B', label: 'ナディア B', css: '"Nadia B", "ヒラギノ角ゴ ProN", sans-serif' },
]

export const disabledPreviewCellStyle = {
  backgroundColor: '#f1f3f5',
  color: '#8a93a3',
  cursor: 'not-allowed',
} as const

export function proDisplayFontCss(font: ProDisplayFont): string {
  return proDisplayFonts.find((item) => item.value === font)?.css ?? proDisplayFonts[0].css
}

export function normalizeProRouteDisplayOverride(
  override: ProPreset['routeDisplayOverrides'][number] | null,
): ProPreset['routeDisplayOverrides'][number] | null {
  if (!override) {
    return null
  }
  const routeNameOverride = override.routeNameOverride?.trim() || null
  const destinationOverride = override.destinationOverride?.trim() || null
  const stopCellOverrides = override.stopCellOverrides
    .filter((cell) => cell.text.trim() !== '')
    .map((cell) => ({
      ...cell,
      text: cell.text.trim(),
      rowSpan: Math.max(cell.rowSpan, 1),
    }))

  if (!routeNameOverride && !destinationOverride) {
    return stopCellOverrides.length === 0
      ? null
      : {
          ...override,
          routeNameOverride: null,
          routeNameFont: null,
          destinationOverride: null,
          stopCellOverrides,
        }
  }

  return {
    ...override,
    routeNameOverride,
    routeNameFont: routeNameOverride ? override.routeNameFont : null,
    destinationOverride,
    stopCellOverrides,
  }
}

export function buildProPreviewCellDisplay(
  override: ProPreset['routeDisplayOverrides'][number] | undefined,
  poles: ProPoleDetail[],
  poleIndex: number,
) {
  const pole = poles[poleIndex]
  const cellOverrides = override?.stopCellOverrides ?? []
  const cellOverride = pole ? cellOverrides.find((cell) => cell.poleId === pole.id) : undefined
  const hidden = cellOverrides.some((cell) => {
    const startIndex = poles.findIndex((candidate) => candidate.id === cell.poleId)
    return startIndex >= 0 && startIndex < poleIndex && poleIndex < startIndex + cell.rowSpan
  })
  return {
    textOverride: cellOverride?.text,
    rowSpan: cellOverride?.rowSpan ?? 1,
    hidden,
    overridden: Boolean(cellOverride),
    font: cellOverride?.font,
  }
}

export function hasProRouteNameOverride(
  override: ProPreset['routeDisplayOverrides'][number] | undefined,
  defaultRouteName: string,
): boolean {
  return Boolean(override?.routeNameOverride && override.routeNameOverride.trim() !== defaultRouteName.trim())
}

export function hasProDestinationOverride(
  override: ProPreset['routeDisplayOverrides'][number] | undefined,
  defaultDestination: string,
): boolean {
  return Boolean(override?.destinationOverride && override.destinationOverride.trim() !== defaultDestination.trim())
}

export function isProPatternExcluded(preset: ProPreset, route: ProConstructedRoute, pattern: GtfsStop[]): boolean {
  return preset.excludedStopPatterns.some((patternEntry) => patternEntry[0] === `${route.sourceId}::${stopPatternKey(pattern)}`)
}

export function proTripTimeForPole(trip: ProConstructedTrip, pole: ProPoleDetail): string {
  const stopTime = trip.stopTime.find((item, index) =>
    pole.stops.some((stop) => stop.sourceId === trip.sourceId && proStopTimeMatchesPoleStop(trip.stopTime, item, index, stop)),
  )
  return formatPreviewDepartureTime(stopTime?.departureTime)
}

export function proTripPreviewTimes(trip: ProConstructedTrip, poles: ProPoleDetail[]): string[] {
  const times = poles.map((pole) => proTripTimeForPole(trip, pole))
  return fillMissingPreviewTimes(times)
}

export function sortProConstructedTrips(
  trips: ProConstructedTrip[],
  poles: ProPoleDetail[],
  stopMap: Record<string, GtfsStop>,
): ProConstructedTrip[] {
  const poleSpans = poles.map((pole, index) => {
    const name = proPoleDisplayName(pole, stopMap)
    const previousPole = poles[index - 1]
    if (previousPole && proPoleDisplayName(previousPole, stopMap) === name) {
      return { colSpan: 1 }
    }
    let colSpan = 1
    for (let nextIndex = index + 1; nextIndex < poles.length; nextIndex += 1) {
      const nextPole = poles[nextIndex]
      if (!nextPole || proPoleDisplayName(nextPole, stopMap) !== name) {
        break
      }
      colSpan += 1
    }
    return { colSpan }
  })

  return sortTimetableColumns(
    trips.map((trip) => ({
      item: trip,
      compareValues: poles.map((pole) => parseTimetableCompareValue(proTripTimeForPole(trip, pole))),
    })),
    poleSpans,
  )
}

export function proPatternPreviewTimes(pattern: GtfsStop[], poles: ProPoleDetail[], sourceId: string): string[] {
  const times = poles.map((pole) => proPatternTimeForPole(pattern, pole, sourceId))
  return fillMissingPreviewTimes(times)
}

export function proPatternTimeForPole(pattern: GtfsStop[], pole: ProPoleDetail, sourceId: string): string {
  const patternKey = stopPatternKey(pattern)
  const match = pole.stops
    .filter((stop) => stop.sourceId === sourceId)
    .map((stop) =>
      pattern.findIndex((item, index) => item.stopId === stop.id && patternKey === stop.stopPatternKey && index === stop.stopIndex),
    )
    .find((stopIndex) => stopIndex >= 0)
  return match === undefined ? '' : String(match)
}

export function proRouteOptionDisplayLabel(option: ProRouteOption, includeSourceName: boolean): string {
  const routeName = includeSourceName ? `${option.sourceName} / ${option.name}` : option.name
  return `${routeName} (${proRouteOptionMeta(option)})`
}

export function proRouteOptionMeta(option: Pick<ProRouteOption, 'id' | 'direction'>): string {
  return `ID: ${option.id} / dir: ${option.direction ?? '(none)'}`
}

export function splitDestinationColumns(value: string): string[] {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2)
}

export function justifyTextClass(text: string) {
  return text.trim().length <= 1 ? 'pro-preview-text-center' : 'pro-preview-text-justify'
}

function fillMissingPreviewTimes(times: string[]): string[] {
  const first = times.findIndex((time) => time.length > 0)
  let last = -1
  times.forEach((time, index) => {
    if (time.length > 0) {
      last = index
    }
  })

  return times.map((time, index) => {
    if (time.length > 0) {
      return time
    }
    return first >= 0 && index >= first && index <= last ? '‖' : '…'
  })
}
