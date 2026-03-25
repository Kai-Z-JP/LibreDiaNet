import { migrateLegacyStore } from './storage'

describe('migrateLegacyStore', () => {
  it('converts legacy repo preset into v2', () => {
    const legacy = JSON.stringify([
      {
        id: 'preset-1',
        name: 'Repo preset',
        index: 5,
        info: {
          type: 'jp.kaiz.shachia.dianet.DataRepoGtfsInformation',
          orgId: 'org',
          feedId: 'feed',
          name: 'feed<label>',
        },
        routes: [{ id: 'route-1', direction: 0 }],
        poles: [{ id: 'stop-1', override: { majorStop: true } }],
        excludedStopPatterns: [['a', 'b']],
      },
    ])

    const store = migrateLegacyStore(legacy)

    expect(store.version).toBe(2)
    expect(store.presets[0]?.info).toEqual({
      kind: 'repo',
      id: 'feed_org',
      orgId: 'org',
      feedId: 'feed',
      name: 'feed<label>',
    })
    expect(store.presets[0]?.excludedStopPatterns).toEqual([['a', 'b']])
  })

  it('converts legacy raw preset and marks cache missing', () => {
    const legacy = JSON.stringify([
      {
        id: 'preset-2',
        info: {
          type: 'jp.kaiz.shachia.dianet.RawGtfsInformation',
          uuid: 'raw-uuid',
          name: 'raw.zip',
        },
      },
    ])

    const store = migrateLegacyStore(legacy)

    expect(store.presets[0]?.info).toEqual({
      kind: 'raw',
      id: 'raw-uuid',
      uuid: 'raw-uuid',
      name: 'raw.zip',
      cacheState: 'missing',
    })
  })
})
