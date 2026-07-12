import { describe, expect, it } from 'vitest'
import { EMPTY_OVERRIDE, type GtfsStop, type ProPoleDetail, type ProPreset } from '../../../types'
import { stopPatternKey } from '../../../utils'
import { buildProInddPreset, proInddJsonFileName, serializeProInddPreset } from './pro-indd-export'
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

describe('Pro InDesign JSON export', () => {
  it('builds the DiaNet InDesign preset shape with Pro display overrides', () => {
    const output = buildProInddPreset({
      preset,
      constructedRoutes,
      stopMap,
      tripsByDay: [[trip], [], []],
    })

    expect(output).toEqual({
      id: 'preset/a',
      name: '中央線',
      index: 7,
      diagrams: [
        [
          {
            destination: '右欄\n左欄',
            destinations: ['右欄', '左欄'],
            cells: [' 800', '回送\n試運転', ''],
            cellDisplays: [
              { text: ' 800', compareValue: 800 },
              { text: '回送\n試運転', rowSpan: 2, overridden: true, mincho: true },
              { text: '', hidden: true, overridden: true, mincho: true },
            ],
            routeName: '快速',
          },
        ],
        [],
        [],
      ],
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
      tripsByDay: [[trip, earlierTrip], [], []],
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
      tripsByDay: [[trip], [], []],
    })

    expect(output.diagrams[0]?.[0]?.cells[1]).toBe('|')
    expect(output.diagrams[0]?.[0]?.cellDisplays[1]).toEqual({ text: '|', overridden: true })
  })

  it('serializes valid JSON and uses the preset id as a safe file name', () => {
    const output = buildProInddPreset({ preset, constructedRoutes, stopMap, tripsByDay: [[], [], []] })

    expect(JSON.parse(serializeProInddPreset(output))).toEqual(output)
    expect(proInddJsonFileName(preset.id)).toBe('preset_a.json')
    expect(proInddJsonFileName('   ')).toBe('preset.json')
  })
})
