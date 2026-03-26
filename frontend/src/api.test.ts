import { buildCreateFromDataRequest, buildCreateRequestAsync } from './api'
import type { RoutePresetV2 } from './types'

describe('buildCreateRequestAsync', () => {
  it('creates backend payload for repo preset', async () => {
    const preset: RoutePresetV2 = {
      id: 'preset-1',
      name: 'Repo',
      index: 9,
      info: {
        kind: 'repo',
        id: 'feed_org',
        orgId: 'org',
        feedId: 'feed',
        name: 'label',
      },
      routes: [{ id: 'route-1', direction: 0 }],
      poles: [],
      excludedStopPatterns: [],
    }

    const payload = await buildCreateRequestAsync(preset, null, [['平日', '2026-03-25']])

    expect(payload.dateSource).toEqual({
      type: 'jp.kaiz.shachia.dianet.GTFSDataSourceRepo',
      orgId: 'org',
      feedId: 'feed',
    })
    expect(payload.preset.info).toEqual({
      type: 'jp.kaiz.shachia.dianet.DataRepoGtfsInformation',
      orgId: 'org',
      feedId: 'feed',
      name: 'label',
    })
  })

  it('creates backend payload for raw preset', async () => {
    const preset: RoutePresetV2 = {
      id: 'preset-2',
      name: 'Raw',
      index: 3,
      info: {
        kind: 'raw',
        id: 'raw-uuid',
        uuid: 'raw-uuid',
        name: 'raw.zip',
        cacheState: 'ready',
      },
      routes: [],
      poles: [],
      excludedStopPatterns: [],
    }

    const file = new File([new Uint8Array([1, 2, 3])], 'raw.zip', { type: 'application/zip' })
    const payload = await buildCreateRequestAsync(preset, file, [['休日', '2026-03-26']])

    expect(payload.dateSource).toEqual({
      type: 'jp.kaiz.shachia.dianet.GTFSRawSource',
      zipByteArray: [1, 2, 3],
    })
    expect(payload.preset.info).toEqual({
      type: 'jp.kaiz.shachia.dianet.RawGtfsInformation',
      name: 'raw.zip',
      uuid: 'raw-uuid',
    })
  })

  it('creates backend payload for create_from_data export', async () => {
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
      [['平日', '2026-03-25']],
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
      dayMapping: [['平日', '2026-03-25']],
    })
  })
})
