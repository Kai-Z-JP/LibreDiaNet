import { buildCreateRequestAsync } from './api'
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
      zipByteArray: [1, 2, 3],
      name: 'raw.zip',
      uuid: 'raw-uuid',
    })
  })
})
