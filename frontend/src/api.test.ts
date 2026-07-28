import { buildCreateFromDataRequest, buildProCreateFromDataRequest } from './api'
import { EMPTY_OVERRIDE, type ProPreset, type ProVersion, type RoutePresetV2 } from './types'
import { stopPatternKey } from './utils'

describe('buildCreateFromDataRequest', () => {
  it('creates browser xlsx export payload', async () => {
    const preset: RoutePresetV2 = {
      id: 'preset-3',
      name: 'DataExport',
      index: 1,
      info: {
        kind: 'raw',
        id: 'raw-uuid',
        uuid: 'raw-uuid',
        name: 'cached.sqlite3',
        cacheState: 'ready',
      },
      routes: [{ id: 'route-1', direction: 0 }],
      poles: [],
      excludedStopPatterns: [],
    }

    const payload = await buildCreateFromDataRequest(
      preset,
      {
        agencyName: 'Agency',
        stops: [{ id: 'stop-1', name: 'Stop 1', platformCode: null }],
        routes: [{ id: 'route-1', shortName: 'R1', longName: null }],
        trips: [{ tripId: 'trip-1', routeId: 'route-1', directionId: 0, serviceId: 'svc-1' }],
        stopTimes: [{ tripId: 'trip-1', stopId: 'stop-1', stopSequence: 1, departureTime: '08:00:00' }],
        calendars: [
          {
            id: 'svc-1',
            startDate: '20260101',
            endDate: '20261231',
            sunday: 0,
            monday: 1,
            tuesday: 1,
            wednesday: 1,
            thursday: 1,
            friday: 1,
            saturday: 0,
          },
        ],
      },
      [{ name: '平日', type: 'date', date: '2026-03-25' }],
    )

    expect(payload).toEqual({
      gtfs: {
        agencyName: 'Agency',
        stops: [{ id: 'stop-1', name: 'Stop 1', platformCode: null }],
        routes: [{ id: 'route-1', shortName: 'R1', longName: null }],
        trips: [{ tripId: 'trip-1', routeId: 'route-1', directionId: 0, serviceId: 'svc-1' }],
        stopTimes: [{ tripId: 'trip-1', stopId: 'stop-1', stopSequence: 1, departureTime: '08:00:00' }],
        calendars: [
          {
            id: 'svc-1',
            startDate: '20260101',
            endDate: '20261231',
            sunday: 0,
            monday: 1,
            tuesday: 1,
            wednesday: 1,
            thursday: 1,
            friday: 1,
            saturday: 0,
          },
        ],
      },
      preset: {
        id: 'preset-3',
        name: 'DataExport',
        index: 1,
        info: {
          type: 'jp.kaiz.shachia.dianet.RawGtfsInformation',
          name: 'cached.sqlite3',
          uuid: 'raw-uuid',
        },
        routes: [{ id: 'route-1', direction: 0 }],
        poles: [],
        excludedStopPatterns: [],
      },
      dayMapping: [{ name: '平日', type: 'date', date: '2026-03-25' }],
    })
  })
})

describe('buildProCreateFromDataRequest', () => {
  it('namespaces multiple GTFS datasets and maps merged poles to synthetic stops', () => {
    const sourceAPatternKey = stopPatternKey([{ stopId: 'same-stop' }, { stopId: 'same-stop' }])
    const sourceBPatternKey = stopPatternKey([{ stopId: 'same-stop' }])
    const version: ProVersion = {
      id: 'version-1',
      name: '2026春改正',
      revisionDate: '2026-04-01',
      gtfsSources: [],
      presets: [],
    }
    const preset: ProPreset = {
      id: 'preset-pro',
      name: 'Pro preset',
      index: 7,
      sourceIds: ['source-a', 'source-b'],
      routes: [
        { sourceId: 'source-a', id: 'route', direction: 0 },
        { sourceId: 'source-b', id: 'route', direction: 1 },
      ],
      routeDisplayOverrides: [
        {
          routeKey: `source-a::route::0::${sourceAPatternKey}`,
          routeNameOverride: null,
          destinationOverride: null,
          useTripHeadsignAsDestination: true,
          stopCellOverrides: [],
        },
      ],
      poles: [
        {
          id: 'merged-pole',
          stops: [
            { sourceId: 'source-a', id: 'same-stop', stopSequence: 1, stopPatternKey: sourceAPatternKey, stopIndex: 0 },
            { sourceId: 'source-b', id: 'same-stop', stopSequence: 1, stopPatternKey: sourceBPatternKey, stopIndex: 0 },
          ],
          override: {
            majorStop: false,
            branchStart: false,
            branchEnd: false,
            nameOverride: '統合停留所',
            locationNameOverride: null,
            jokoOverride: null,
            rowShading: false,
            stopNameBold: false,
            horizontalLine: false,
          },
        },
      ],
      excludedStopPatterns: [],
    }

    const payload = buildProCreateFromDataRequest(
      version,
      preset,
      {
        'source-a': {
          agencyName: 'Agency A',
          stops: [{ id: 'same-stop', name: 'Stop A', platformCode: '1' }],
          routes: [{ id: 'route', shortName: 'A', longName: null }],
          trips: [{ tripId: 'trip', routeId: 'route', directionId: 0, serviceId: 'svc', tripHeadsign: 'Headsign A' }],
          stopTimes: [
            { tripId: 'trip', stopId: 'same-stop', stopSequence: 1, departureTime: '08:00:00' },
            { tripId: 'trip', stopId: 'same-stop', stopSequence: 2, departureTime: '08:05:00' },
          ],
          calendars: [
            {
              id: 'svc',
              startDate: '20260401',
              endDate: '20270331',
              sunday: 0,
              monday: 1,
              tuesday: 1,
              wednesday: 1,
              thursday: 1,
              friday: 1,
              saturday: 0,
            },
          ],
        },
        'source-b': {
          agencyName: 'Agency B',
          stops: [{ id: 'same-stop', name: 'Stop B', platformCode: '2' }],
          routes: [{ id: 'route', shortName: 'B', longName: null }],
          trips: [{ tripId: 'trip', routeId: 'route', directionId: 1, serviceId: 'svc', tripHeadsign: 'Headsign B' }],
          stopTimes: [{ tripId: 'trip', stopId: 'same-stop', stopSequence: 1, departureTime: '09:00:00' }],
          calendars: [
            {
              id: 'svc',
              startDate: '20260401',
              endDate: '20270331',
              sunday: 1,
              monday: 0,
              tuesday: 0,
              wednesday: 0,
              thursday: 0,
              friday: 0,
              saturday: 1,
            },
          ],
        },
      },
      [{ name: '平日', type: 'date', date: '2026-04-01' }],
    )

    expect(payload.preset.routes).toEqual([
      { id: 'source-a::route', direction: 0 },
      { id: 'source-b::route', direction: 1 },
    ])
    expect(payload.preset.poles).toEqual([
      {
        id: 'pole::merged-pole',
        override: preset.poles[0]?.override,
      },
    ])
    expect(payload.preset.routeDisplayOverrides).toEqual(preset.routeDisplayOverrides)
    expect(payload.gtfs.routes.map((route) => route.id)).toEqual(['source-a::route', 'source-b::route'])
    expect(payload.gtfs.trips).toEqual([
      {
        tripId: 'source-a::trip',
        routeId: 'source-a::route',
        directionId: 0,
        serviceId: 'source-a::svc',
        tripHeadsign: 'Headsign A',
        routeDisplayOverrideKey: `source-a::route::0::${sourceAPatternKey}`,
      },
      {
        tripId: 'source-b::trip',
        routeId: 'source-b::route',
        directionId: 1,
        serviceId: 'source-b::svc',
        tripHeadsign: null,
        routeDisplayOverrideKey: `source-b::route::1::${sourceBPatternKey}`,
      },
    ])
    expect(payload.gtfs.calendars.map((calendar) => calendar.id)).toEqual(['source-a::svc', 'source-b::svc'])
    expect(payload.gtfs.stopTimes.map((stopTime) => stopTime.stopId)).toEqual([
      'pole::merged-pole',
      'source-a::same-stop',
      'pole::merged-pole',
    ])
    expect(payload.gtfs.stops).toContainEqual({
      id: 'pole::merged-pole',
      name: '統合停留所',
      platformCode: '1',
      jokoOverride: null,
    })
  })

  it('keeps an empty output pole as a blank synthetic stop', () => {
    const version: ProVersion = {
      id: 'version-1',
      name: '2026春改正',
      revisionDate: '2026-04-01',
      gtfsSources: [],
      presets: [],
    }
    const preset: ProPreset = {
      id: 'preset-pro',
      name: 'Pro preset',
      index: 7,
      sourceIds: [],
      routes: [],
      routeDisplayOverrides: [],
      poles: [
        {
          id: 'empty-pole',
          stops: [],
          override: EMPTY_OVERRIDE,
        },
      ],
      excludedStopPatterns: [],
    }

    const payload = buildProCreateFromDataRequest(version, preset, {}, [{ name: '平日', type: 'date', date: '2026-04-01' }])

    expect(payload.preset.poles).toEqual([
      {
        id: 'pole::empty-pole',
        override: EMPTY_OVERRIDE,
      },
    ])
    expect(payload.gtfs.stops).toContainEqual({
      id: 'pole::empty-pole',
      name: '',
      platformCode: null,
      jokoOverride: '',
      emptyPole: true,
    })
  })
})
