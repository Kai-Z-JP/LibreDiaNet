import type { GtfsServiceWeekday, GtfsStop, ProPreset } from '../../../types'
import { convertToEnclosedNumber } from '../../../utils'
import { proPoleDisplayLocationName, proPoleDisplayName } from './pro-pole-stop-helpers'
import { proDestinationDisplay, proTripTimeForPole, splitDestinationColumns } from './pro-preview-display-helpers'
import { proTripRouteKey } from './pro-route-keys'
import { proPoleRawJoko } from './pro-preview-table-helpers'
import type { ProConstructedRoute, ProConstructedTrip } from './pro-types'
import { sortTimetableColumns } from './timetable-column-sort'

export type ProInddPreset = {
  id: string
  name: string
  index: number
  diagramServiceNames: string[]
  diagrams: ProInddDiagram[][]
  poles: ProInddPole[]
}

export type ProInddTripsByWeekday = Record<GtfsServiceWeekday, ProConstructedTrip[]>

export const PRO_INDD_WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const satisfies readonly GtfsServiceWeekday[]

const PRO_INDD_WORKWEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const satisfies readonly GtfsServiceWeekday[]

const PRO_INDD_WEEKDAY_NAMES: Record<GtfsServiceWeekday, string> = {
  monday: '月曜',
  tuesday: '火曜',
  wednesday: '水曜',
  thursday: '木曜',
  friday: '金曜',
  saturday: '土曜',
  sunday: '日休',
}

export type ProInddPole = {
  name: string
  joko: string
  locationName: string
  colSpan?: number
  bold?: true
  fill?: true
  topEdgeStroke?: true
  bottomEdgeStroke?: true
  horizontalLine?: true
}

export type ProInddDiagram = {
  destination: string
  destinations: string[]
  cells: string[]
  cellDisplays: ProInddDiagramCellDisplay[]
  routeName: string
}

export type ProInddDiagramCellDisplay = {
  text: string
  rowSpan?: number
  hidden?: true
  compareValue?: number
  overridden?: true
  mincho?: true
}

export function buildProInddPreset({
  preset,
  constructedRoutes,
  stopMap,
  tripsByWeekday,
}: {
  preset: ProPreset
  constructedRoutes: ProConstructedRoute[]
  stopMap: Record<string, GtfsStop>
  tripsByWeekday: ProInddTripsByWeekday
}): ProInddPreset {
  const poles = buildProInddPoles(preset, constructedRoutes, stopMap)
  const diagramsByWeekday = buildProInddDiagramsByWeekday(preset, tripsByWeekday, stopMap, poles)
  const diagramServices = buildProInddDiagramServices(tripsByWeekday, diagramsByWeekday, poles)
  return {
    id: preset.id,
    name: preset.name,
    index: preset.index,
    diagramServiceNames: diagramServices.map((service) => service.name),
    diagrams: diagramServices.map((service) => service.diagrams),
    poles,
  }
}

function buildProInddDiagramsByWeekday(
  preset: ProPreset,
  tripsByWeekday: ProInddTripsByWeekday,
  stopMap: Record<string, GtfsStop>,
  poles: ProInddPole[],
): Record<GtfsServiceWeekday, ProInddDiagram[]> {
  return Object.fromEntries(
    PRO_INDD_WEEKDAYS.map((weekday) => [
      weekday,
      sortProInddDiagrams(
        tripsByWeekday[weekday].map((trip) => buildProInddDiagram(preset, trip, stopMap)),
        poles,
      ),
    ]),
  ) as Record<GtfsServiceWeekday, ProInddDiagram[]>
}

function buildProInddDiagramServices(
  tripsByWeekday: ProInddTripsByWeekday,
  diagramsByWeekday: Record<GtfsServiceWeekday, ProInddDiagram[]>,
  poles: ProInddPole[],
): { name: string; diagrams: ProInddDiagram[] }[] {
  // A single weekday diagram is valid only when the active service_id set is identical Monday through Friday.
  const weekdayGroups = groupWorkweekDaysByServiceIds(tripsByWeekday)
  const hasCommonWeekdayDiagram = weekdayGroups.length === 1
  const specificWeekdayServices = hasCommonWeekdayDiagram
    ? []
    : weekdayGroups.flatMap(({ weekdays }) => {
        const diagrams = diagramsByWeekday[weekdays[0]]
        return diagrams.length === 0 ? [] : [{ name: diagramServiceName(weekdays), diagrams }]
      })

  return [
    { name: '平日', diagrams: hasCommonWeekdayDiagram ? diagramsByWeekday.monday : [] },
    { name: '土曜', diagrams: diagramsByWeekday.saturday },
    { name: '日休', diagrams: diagramsByWeekday.sunday },
    { name: '全日', diagrams: unionProInddDiagrams(diagramsByWeekday, poles) },
    ...specificWeekdayServices,
  ]
}

function groupWorkweekDaysByServiceIds(tripsByWeekday: ProInddTripsByWeekday): { weekdays: (typeof PRO_INDD_WORKWEEK)[number][] }[] {
  const groupsByServiceIds = new Map<string, { weekdays: (typeof PRO_INDD_WORKWEEK)[number][] }>()
  for (const weekday of PRO_INDD_WORKWEEK) {
    const serviceIds = Array.from(new Set(tripsByWeekday[weekday].map((trip) => JSON.stringify([trip.sourceId, trip.serviceId])))).sort()
    const key = JSON.stringify(serviceIds)
    const group = groupsByServiceIds.get(key) ?? { weekdays: [] }
    group.weekdays.push(weekday)
    groupsByServiceIds.set(key, group)
  }
  return Array.from(groupsByServiceIds.values())
}

function unionProInddDiagrams(diagramsByWeekday: Record<GtfsServiceWeekday, ProInddDiagram[]>, poles: ProInddPole[]): ProInddDiagram[] {
  const unionByKey = new Map<string, { diagram: ProInddDiagram; count: number }>()
  for (const weekday of PRO_INDD_WEEKDAYS) {
    const countsForWeekday = new Map<string, { diagram: ProInddDiagram; count: number }>()
    for (const diagram of diagramsByWeekday[weekday]) {
      const key = proInddDiagramKey(diagram)
      const entry = countsForWeekday.get(key) ?? { diagram, count: 0 }
      entry.count += 1
      countsForWeekday.set(key, entry)
    }
    for (const [key, entry] of countsForWeekday) {
      const unionEntry = unionByKey.get(key)
      // A multiset union keeps the largest count seen on any weekday instead of adding seven daily copies.
      if (!unionEntry || entry.count > unionEntry.count) {
        unionByKey.set(key, entry)
      }
    }
  }

  return sortProInddDiagrams(
    Array.from(unionByKey.values()).flatMap(({ diagram, count }) => Array.from({ length: count }, () => diagram)),
    poles,
  )
}

function proInddDiagramKey(diagram: ProInddDiagram): string {
  return JSON.stringify([
    diagram.destination,
    diagram.destinations,
    diagram.cells,
    diagram.cellDisplays.map((cell) => [
      cell.text,
      cell.rowSpan ?? null,
      cell.hidden ?? false,
      cell.compareValue ?? null,
      cell.overridden ?? false,
      cell.mincho ?? false,
    ]),
    diagram.routeName,
  ])
}

function diagramServiceName(weekdays: readonly GtfsServiceWeekday[]): string {
  return weekdays.map((weekday) => PRO_INDD_WEEKDAY_NAMES[weekday]).join('・')
}

export function serializeProInddPreset(preset: ProInddPreset): string {
  return `${JSON.stringify(preset, null, 2)}\n`
}

export function proInddJsonFileName(value: string): string {
  const safeId = safeInddFileBaseName(value, 'preset')
  return `${safeId}.json`
}

export function proInddJsonFileNames(presets: Pick<ProPreset, 'name'>[]): string[] {
  const used = new Set<string>()
  return presets.map((preset) => {
    const baseName = safeInddFileBaseName(preset.name, 'preset')
    let suffix = 1
    let fileName = `${baseName}.json`
    while (used.has(fileName.toLowerCase())) {
      suffix += 1
      fileName = `${baseName}_${suffix}.json`
    }
    used.add(fileName.toLowerCase())
    return fileName
  })
}

export function proInddZipFileName(versionName: string): string {
  return `${safeInddFileBaseName(versionName, 'version')}_indd.zip`
}

function safeInddFileBaseName(value: string, fallback: string): string {
  const safeId = Array.from(value.trim().replace(/[\\/:*?"<>|]/g, '_'))
    .map((character) => (character.charCodeAt(0) < 32 ? '_' : character))
    .join('')
    .replace(/[. ]+$/g, '')
  return safeId || fallback
}

function buildProInddPoles(preset: ProPreset, constructedRoutes: ProConstructedRoute[], stopMap: Record<string, GtfsStop>): ProInddPole[] {
  const names = preset.poles.map((pole) => proPoleDisplayName(pole, stopMap))
  const rawJoko = preset.poles.map((_, index) => proPoleRawJoko(preset.poles, index, constructedRoutes, stopMap))

  return preset.poles.map((pole, index) => {
    const colSpan = consecutiveNameCount(names, index)
    const joko = index > 0 && rawJoko[index] !== '' && rawJoko[index] === rawJoko[index - 1] ? '〃' : (rawJoko[index] ?? '')
    const bold =
      preset.poles
        .slice(index, index + colSpan)
        .some((groupedPole) => groupedPole.override.stopNameBold || groupedPole.override.majorStop) ||
      index === 0 ||
      index + colSpan === preset.poles.length
    const fill = pole.override.rowShading || pole.override.majorStop

    return {
      name: names[index] ?? '',
      joko,
      locationName: convertToEnclosedNumber(proPoleDisplayLocationName(pole, stopMap)),
      ...(colSpan > 1 ? { colSpan } : {}),
      ...(bold ? { bold: true as const } : {}),
      ...(fill ? { fill: true as const } : {}),
      ...(pole.override.branchStart ? { topEdgeStroke: true as const } : {}),
      ...(pole.override.branchEnd ? { bottomEdgeStroke: true as const } : {}),
      ...(pole.override.horizontalLine ? { horizontalLine: true as const } : {}),
    }
  })
}

function buildProInddDiagram(preset: ProPreset, trip: ProConstructedTrip, stopMap: Record<string, GtfsStop>): ProInddDiagram {
  const routeDisplayOverride = preset.routeDisplayOverrides.find((override) => override.routeKey === proTripRouteKey(trip))
  const destinationStopId = trip.stopTime.at(-1)?.stopId
  const defaultDestination = destinationStopId ? (stopMap[`${trip.sourceId}::${destinationStopId}`]?.name ?? '') : ''
  const destinations = splitDestinationColumns(proDestinationDisplay(routeDisplayOverride, defaultDestination, trip.tripHeadsign)).slice(
    0,
    2,
  )
  const cellDisplays = buildProInddCellDisplays(preset, trip, routeDisplayOverride)

  return {
    destination: destinations.join('\n'),
    destinations,
    cells: cellDisplays.map((cell) => (cell.hidden ? '' : cell.text)),
    cellDisplays,
    routeName: routeDisplayOverride?.routeNameOverride ?? trip.routeName,
  }
}

function buildProInddCellDisplays(
  preset: ProPreset,
  trip: ProConstructedTrip,
  routeDisplayOverride: ProPreset['routeDisplayOverrides'][number] | undefined,
): ProInddDiagramCellDisplay[] {
  const legacyTimes = preset.poles.map((pole) => proTripTimeForPole(trip, pole).replace(/^\u2002/, ' '))
  const displays: ProInddDiagramCellDisplay[] = preset.poles.map((pole, index) => {
    const text = legacyTimes[index] || missingTimeText(legacyTimes, preset, index)
    const outputText = normalizeInddCellText(pole.override.horizontalLine && text === '…' ? '――' : text)
    const compareValue = parseCompareValue(outputText)
    return {
      text: outputText,
      ...(compareValue === null ? {} : { compareValue }),
    }
  })

  const poleIndexById = new Map(preset.poles.map((pole, index) => [pole.id, index]))
  const cellOverrides = [...(routeDisplayOverride?.stopCellOverrides ?? [])].toSorted(
    (left, right) =>
      (poleIndexById.get(left.poleId) ?? Number.MAX_SAFE_INTEGER) - (poleIndexById.get(right.poleId) ?? Number.MAX_SAFE_INTEGER),
  )
  for (const override of cellOverrides) {
    const startIndex = poleIndexById.get(override.poleId)
    if (startIndex === undefined) {
      continue
    }
    const rowSpan = Math.max(override.rowSpan, 1)
    const outputText = normalizeInddCellText(override.text)
    const compareValue = rowSpan === 1 ? parseCompareValue(outputText) : null
    displays[startIndex] = {
      text: outputText,
      ...(rowSpan > 1 ? { rowSpan } : {}),
      ...(compareValue === null ? {} : { compareValue }),
      overridden: true,
      ...(override.mincho ? { mincho: true as const } : {}),
    }
    for (let index = startIndex + 1; index < Math.min(startIndex + rowSpan, displays.length); index += 1) {
      displays[index] = {
        text: '',
        hidden: true,
        overridden: true,
        ...(override.mincho ? { mincho: true as const } : {}),
      }
    }
  }

  return displays
}

function missingTimeText(times: string[], preset: ProPreset, poleIndex: number): string {
  if (preset.poles[poleIndex]?.stops.length === 0) {
    return ''
  }
  const first = times.findIndex(Boolean)
  let last = -1
  times.forEach((time, index) => {
    if (time) {
      last = index
    }
  })
  return first >= 0 && poleIndex >= first && poleIndex <= last ? '|' : '…'
}

function consecutiveNameCount(names: string[], startIndex: number): number {
  let count = 1
  for (let index = startIndex + 1; index < names.length && names[index] === names[startIndex]; index += 1) {
    count += 1
  }
  return count
}

function sortProInddDiagrams(diagrams: ProInddDiagram[], poles: ProInddPole[]): ProInddDiagram[] {
  return sortTimetableColumns(
    diagrams.map((diagram) => ({
      item: diagram,
      compareValues: diagram.cellDisplays.map((cell, index) => cell.compareValue ?? parseCompareValue(diagram.cells[index] ?? '')),
    })),
    poles.map((pole) => ({ colSpan: pole.colSpan ?? 1 })),
  )
}

function normalizeInddCellText(value: string): string {
  return value === '‖' ? '|' : value
}

function parseCompareValue(value: string): number | null {
  const normalized = value.trim()
  if (!/^\d+$/.test(normalized)) {
    return null
  }
  return Number(normalized)
}
