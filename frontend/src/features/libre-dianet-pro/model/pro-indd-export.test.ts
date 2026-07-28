import { describe, expect, it } from 'vitest'
import { EMPTY_OVERRIDE, type GtfsServiceWeekday, type GtfsStop, type ProPoleDetail, type ProPreset } from '../../../types'
import { stopPatternKey } from '../../../utils'
import {
  buildProInddPreset,
  PRO_INDD_WEEKDAYS,
  proInddJsonFileName,
  proInddJsonFileNames,
  proInddZipFileName,
  serializeProInddPreset,
  type ProInddTripsByWeekday,
} from './pro-indd-export'
import { proRouteKeyFromParts } from './pro-route-keys'
import type { ProConstructedRoute, ProConstructedTrip } from './pro-types'

const sourceId = 'source-a'
const stops: GtfsStop[] = [
  { stopId: 'stop-a-1', name: '中央', platformCode: '1番', stopPatternId: 'pattern-a' },
  { stopId: 'stop-a-2', name: '中央', platformCode: '2番', stopPatternId: 'pattern-a' },
  { stopId: 'stop-b', name: '終点', platformCode: '降車', stopPatternId: 'pattern-a' },
]
const patternKey = stopPatternKey(stops)
const poles: ProPoleDetail[] = stops.map((stop, index) => ({
  id: `pole-${index + 1}`,
  stops: [
    {
      sourceId,
      id: stop.stopId,
      stopSequence: index + 1,
      stopPatternKey: patternKey,
      stopIndex: index,
    },
  ],
  override: index === 2 ? { ...EMPTY_OVERRIDE, rowShading: true, stopNameBold: true, branchStart: true, branchEnd: true } : EMPTY_OVERRIDE,
}))
const routeKey = proRouteKeyFromParts(sourceId, 'route-a', 0, patternKey)
const preset: ProPreset = {
  id: 'preset/a',
  name: '中央線',
  index: 7,
  sourceIds: [sourceId],
  routes: [{ sourceId, id: 'route-a', direction: 0 }],
  routeDisplayOverrides: [
    {
      routeKey,
      routeNameOverride: '快速',
      destinationOverride: '右欄\n左欄',
      useTripHeadsignAsDestination: false,
      stopCellOverrides: [{ poleId: 'pole-2', text: '回送\n試運転', rowSpan: 2, mincho: true }],
    },
  ],
  poles,
  excludedStopPatterns: [],
}
const constructedRoutes: ProConstructedRoute[] = [
  {
    sourceId,
    sourceName: 'Source A',
    route: { routeId: 'route-a', shortName: 'A', longName: null },
    direction: 0,
    stopPatterns: [stops],
  },
]
const trip: ProConstructedTrip = {
  sourceId,
  sourceName: 'Source A',
  serviceId: 'service-weekday',
  routeId: 'route-a',
  direction: 0,
  routeName: 'A',
  tripHeadsign: 'GTFS行先',
  stopTime: [
    { tripId: 'trip-a', stopId: 'stop-a-1', stopSequence: 1, departureTime: '08:00:00', stopPatternId: 'pattern-a' },
    { tripId: 'trip-a', stopId: 'stop-a-2', stopSequence: 2, departureTime: null, stopPatternId: 'pattern-a' },
    { tripId: 'trip-a', stopId: 'stop-b', stopSequence: 3, departureTime: '08:10:00', stopPatternId: 'pattern-a' },
  ],
}
const stopMap = Object.fromEntries(stops.map((stop) => [`${sourceId}::${stop.stopId}`, stop]))

const weekdays = PRO_INDD_WEEKDAYS.slice(0, 5)

function tripsForServices(services: { trip: ProConstructedTrip; weekdays: readonly GtfsServiceWeekday[] }[]): ProInddTripsByWeekday {
  const tripsByWeekday: ProInddTripsByWeekday = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  }
  for (const service of services) {
    for (const weekday of service.weekdays) {
      tripsByWeekday[weekday].push(service.trip)
    }
  }
  return tripsByWeekday
}

function tripAt(serviceId: string, tripId: string, hour: number): ProConstructedTrip {
  const hourText = String(hour).padStart(2, '0')
  return {
    ...trip,
    serviceId,
    stopTime: trip.stopTime.map((stopTime, index) => ({
      ...stopTime,
      tripId,
      departureTime: index === 0 ? `${hourText}:00:00` : index === 2 ? `${hourText}:10:00` : null,
    })),
  }
}

describe('Pro InDesign JSON export', () => {
  it('builds the DiaNet InDesign preset shape with Pro display overrides', () => {
    const output = buildProInddPreset({
      preset,
      constructedRoutes,
      stopMap,
      tripsByWeekday: tripsForServices([{ trip, weekdays }]),
    })
    const expectedDiagram = {
      destination: '右欄\n左欄',
      destinations: ['右欄', '左欄'],
      cells: [' 800', '回送\n試運転', ''],
      cellDisplays: [
        { text: ' 800', compareValue: 800 },
        { text: '回送\n試運転', rowSpan: 2, overridden: true, mincho: true },
        { text: '', hidden: true, overridden: true, mincho: true },
      ],
      routeName: '快速',
    }

    expect(output).toEqual({
      id: 'preset/a',
      name: '中央線',
      index: 7,
      diagramServiceNames: ['平日', '土曜', '日休', '全日'],
      diagrams: [[expectedDiagram], [], [], [expectedDiagram]],
      poles: [
        { name: '中央', joko: '発', locationName: '①', colSpan: 2, bold: true },
        { name: '中央', joko: '〃', locationName: '②' },
        {
          name: '終点',
          joko: '着',
          locationName: '降',
          bold: true,
          fill: true,
          topEdgeStroke: true,
          bottomEdgeStroke: true,
        },
      ],
    })
  })

  it('uses legacy pass markers and sorts diagrams by timetable time', () => {
    const earlierTrip: ProConstructedTrip = {
      ...trip,
      tripHeadsign: null,
      stopTime: trip.stopTime.map((stopTime, index) => ({
        ...stopTime,
        tripId: 'trip-earlier',
        departureTime: index === 1 ? null : index === 0 ? '07:00:00' : '07:10:00',
      })),
    }
    const output = buildProInddPreset({
      preset: { ...preset, routeDisplayOverrides: [] },
      constructedRoutes,
      stopMap,
      tripsByWeekday: tripsForServices([
        { trip, weekdays },
        { trip: earlierTrip, weekdays },
      ]),
    })

    expect(output.diagrams[0]?.map((diagram) => diagram.cells)).toEqual([
      [' 700', '|', ' 710'],
      [' 800', '|', ' 810'],
    ])
    expect(output.diagrams[0]?.[0]).toMatchObject({ destination: '終点', destinations: ['終点'], routeName: 'A' })
  })

  it('converts a single double-vertical-line cell override to the InDesign pass marker', () => {
    const output = buildProInddPreset({
      preset: {
        ...preset,
        routeDisplayOverrides: [
          {
            ...preset.routeDisplayOverrides[0]!,
            stopCellOverrides: [{ poleId: 'pole-2', text: '‖', rowSpan: 1, mincho: false }],
          },
        ],
      },
      constructedRoutes,
      stopMap,
      tripsByWeekday: tripsForServices([{ trip, weekdays }]),
    })

    expect(output.diagrams[0]?.[0]?.cells[1]).toBe('|')
    expect(output.diagrams[0]?.[0]?.cellDisplays[1]).toEqual({ text: '|', overridden: true })
  })

  it('serializes valid JSON and uses the preset id as a safe file name', () => {
    const output = buildProInddPreset({ preset, constructedRoutes, stopMap, tripsByWeekday: tripsForServices([]) })

    expect(JSON.parse(serializeProInddPreset(output))).toEqual(output)
    expect(proInddJsonFileName(preset.id)).toBe('preset_a.json')
    expect(proInddJsonFileName('   ')).toBe('preset.json')
  })

  it('全日は平日・土曜・日休を含む全曜日分を統合する', () => {
    const output = buildProInddPreset({
      preset: { ...preset, routeDisplayOverrides: [] },
      constructedRoutes,
      stopMap,
      tripsByWeekday: tripsForServices([
        { trip: tripAt('service-weekday', 'trip-weekday', 8), weekdays },
        { trip: tripAt('service-saturday', 'trip-saturday', 9), weekdays: ['saturday'] },
        { trip: tripAt('service-sunday', 'trip-sunday', 10), weekdays: ['sunday'] },
        { trip: tripAt('service-all-day', 'trip-all-day', 7), weekdays: PRO_INDD_WEEKDAYS },
      ]),
    })

    expect(output.diagramServiceNames).toEqual(['平日', '土曜', '日休', '全日'])
    expect(output.diagrams.map((diagrams) => diagrams.map((diagram) => diagram.cells[0]))).toEqual([
      [' 700', ' 800'],
      [' 700', ' 900'],
      [' 700', '1000'],
      [' 700', ' 800', ' 900', '1000'],
    ])
  })

  it('曜日別の完全なダイヤと全曜日を統合したダイヤを出力する', () => {
    const weekdayTrip = tripAt('service-weekday', 'trip-weekday', 8)
    const saturdayTrip = tripAt('service-saturday', 'trip-saturday', 9)
    const sundayTrip = tripAt('service-sunday', 'trip-sunday', 10)
    const allDayTrip = tripAt('service-all-day', 'trip-all-day', 7)
    const selectedWeekdaysTrip = tripAt('service-tuesday-thursday', 'trip-tuesday-thursday', 11)

    const output = buildProInddPreset({
      preset: { ...preset, routeDisplayOverrides: [] },
      constructedRoutes,
      stopMap,
      tripsByWeekday: tripsForServices([
        { trip: weekdayTrip, weekdays },
        { trip: saturdayTrip, weekdays: ['saturday'] },
        { trip: sundayTrip, weekdays: ['sunday'] },
        { trip: allDayTrip, weekdays: PRO_INDD_WEEKDAYS },
        { trip: selectedWeekdaysTrip, weekdays: ['tuesday', 'thursday'] },
      ]),
    })

    expect(output.diagramServiceNames).toEqual(['平日', '土曜', '日休', '全日', '月曜・水曜・金曜', '火曜・木曜'])
    expect(output.diagrams.map((diagrams) => diagrams.map((diagram) => diagram.cells[0]))).toEqual([
      [],
      [' 700', ' 900'],
      [' 700', '1000'],
      [' 700', ' 800', ' 900', '1000', '1100'],
      [' 700', ' 800'],
      [' 700', ' 800', '1100'],
    ])
  })

  it('全日は同一ダイヤの曜日別最大本数を保つ multiset union にする', () => {
    const identicalTrip = (serviceId: string, tripId: string): ProConstructedTrip => tripAt(serviceId, tripId, 8)
    const output = buildProInddPreset({
      preset: { ...preset, routeDisplayOverrides: [] },
      constructedRoutes,
      stopMap,
      tripsByWeekday: tripsForServices([
        { trip: identicalTrip('service-weekday-base', 'trip-weekday-base'), weekdays },
        { trip: identicalTrip('service-weekday-extra', 'trip-weekday-extra'), weekdays },
        { trip: identicalTrip('service-saturday', 'trip-saturday'), weekdays: ['saturday'] },
        { trip: identicalTrip('service-sunday', 'trip-sunday'), weekdays: ['sunday'] },
        {
          trip: identicalTrip('service-monday-wednesday-friday', 'trip-monday-wednesday-friday'),
          weekdays: ['monday', 'wednesday', 'friday'],
        },
      ]),
    })

    expect(output.diagramServiceNames).toEqual(['平日', '土曜', '日休', '全日', '月曜・水曜・金曜', '火曜・木曜'])
    expect(output.diagrams.map((diagrams) => diagrams.length)).toEqual([0, 1, 1, 3, 3, 2])
    expect(output.diagrams[3]?.map((diagram) => diagram.cells)).toEqual([
      [' 800', '|', ' 810'],
      [' 800', '|', ' 810'],
      [' 800', '|', ' 810'],
    ])
  })

  it('uses unique preset names for files inside a version ZIP', () => {
    expect(proInddJsonFileNames([{ name: '中央/線' }, { name: '中央/線' }, { name: '中央_線' }, { name: '  ' }])).toEqual([
      '中央_線.json',
      '中央_線_2.json',
      '中央_線_3.json',
      'preset.json',
    ])
    expect(proInddZipFileName('2026/春改正')).toBe('2026_春改正_indd.zip')
  })
})
