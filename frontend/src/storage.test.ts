import { loadProPresetStore, migrateLegacyStore, parseProPresetImport, PRO_STORAGE_KEY, saveProPresetStore } from './storage'

describe('parseProPresetImport', () => {
  it('parses a standalone Pro preset', () => {
    const preset = parseProPresetImport(
      JSON.stringify({
        id: 'preset-a',
        name: 'Preset A',
        index: 1,
        sourceIds: [],
        routes: [],
        routeDisplayOverrides: [],
        poles: [],
        excludedStopPatterns: [],
      }),
    )

    expect(preset.id).toBe('preset-a')
    expect(preset.name).toBe('Preset A')
  })
})

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
      fileUid: null,
      fileLabel: null,
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

describe('Pro preset store', () => {
  it('loads empty Pro store without migrating legacy presets', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      'libre-dianet',
      JSON.stringify([
        {
          id: 'legacy',
          info: {
            type: 'jp.kaiz.shachia.dianet.DataRepoGtfsInformation',
            orgId: 'org',
            feedId: 'feed',
          },
        },
      ]),
    )

    expect(loadProPresetStore(storage)).toEqual({ version: 1, versions: [] })
  })

  it('saves and loads versions, gtfs sources, presets, and merged poles', () => {
    const storage = new MemoryStorage()
    saveProPresetStore(
      {
        version: 1,
        versions: [
          {
            id: 'version-1',
            name: '2026春改正',
            revisionDate: '2026-04-01',
            gtfsSources: [
              {
                sourceId: 'source-a',
                displayName: '表示用フィード名',
                info: {
                  kind: 'repo',
                  id: 'feed_org_file-uid',
                  orgId: 'org',
                  feedId: 'feed',
                  fileUid: 'file-uid',
                  fileLabel: '春改正 / uid:file-u',
                  name: 'Repo Feed',
                },
              },
              {
                sourceId: 'source-b',
                info: {
                  kind: 'raw',
                  id: 'raw-uuid',
                  uuid: 'raw-uuid',
                  name: 'raw.zip',
                  cacheState: 'ready',
                },
              },
            ],
            presets: [
              {
                id: 'preset-1',
                name: '統合プリセット',
                index: 1,
                sourceIds: ['source-a', 'source-b'],
                routes: [
                  { sourceId: 'source-a', id: 'route-a', direction: 0 },
                  { sourceId: 'source-b', id: 'route-b', direction: null },
                ],
                routeDisplayOverrides: [
                  {
                    routeKey: 'source-a::route-a::0',
                    routeNameOverride: 'A1',
                    destinationOverride: '終点',
                    useTripHeadsignAsDestination: false,
                    stopCellOverrides: [{ poleId: 'pole-1', text: '回送', rowSpan: 1, mincho: true }],
                  },
                ],
                poles: [
                  {
                    id: 'pole-1',
                    stops: [
                      { sourceId: 'source-a', id: 'stop-a', stopSequence: 10, stopPatternKey: 'pattern_hash:source-a', stopIndex: 0 },
                      { sourceId: 'source-b', id: 'stop-b', stopSequence: 20, stopPatternKey: 'pattern_hash:source-b', stopIndex: 1 },
                    ],
                    override: {
                      majorStop: true,
                      branchStart: false,
                      branchEnd: false,
                      nameOverride: '統合停留所',
                      locationNameOverride: null,
                      jokoOverride: null,
                      rowShading: true,
                      stopNameBold: false,
                      horizontalLine: true,
                    },
                  },
                ],
                excludedStopPatterns: [['source-a::pattern_hash:excluded']],
              },
            ],
          },
        ],
      },
      storage,
    )

    expect(JSON.parse(storage.getItem(PRO_STORAGE_KEY) ?? '{}').version).toBe(1)
    expect(loadProPresetStore(storage).versions[0]?.gtfsSources[0]?.displayName).toBe('表示用フィード名')
    expect(loadProPresetStore(storage).versions[0]?.presets[0]?.poles[0]).toEqual({
      id: 'pole-1',
      stops: [
        { sourceId: 'source-a', id: 'stop-a', stopSequence: 10, stopPatternKey: 'pattern_hash:source-a', stopIndex: 0 },
        { sourceId: 'source-b', id: 'stop-b', stopSequence: 20, stopPatternKey: 'pattern_hash:source-b', stopIndex: 1 },
      ],
      override: {
        majorStop: true,
        branchStart: false,
        branchEnd: false,
        nameOverride: '統合停留所',
        locationNameOverride: null,
        jokoOverride: null,
        rowShading: true,
        stopNameBold: false,
        horizontalLine: true,
      },
    })
    expect(loadProPresetStore(storage).versions[0]?.presets[0]?.routeDisplayOverrides).toEqual([
      {
        routeKey: 'source-a::route-a::0',
        routeNameOverride: 'A1',
        destinationOverride: '終点',
        useTripHeadsignAsDestination: false,
        stopCellOverrides: [{ poleId: 'pole-1', text: '回送', rowSpan: 1, mincho: true }],
      },
    ])
  })

  it('defaults fields missing from old Pro route display overrides', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      PRO_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        versions: [
          {
            id: 'version-1',
            name: '2026春改正',
            revisionDate: '2026-04-01',
            gtfsSources: [],
            presets: [
              {
                id: 'preset-1',
                name: '統合プリセット',
                index: 1,
                sourceIds: [],
                routes: [],
                routeDisplayOverrides: [
                  {
                    routeKey: 'source-a::route-a::0::pattern',
                    routeNameOverride: null,
                    routeNameFont: null,
                    destinationOverride: '終点',
                    stopCellOverrides: [{ poleId: 'pole-1', text: '回送', rowSpan: 1 }],
                  },
                ],
                poles: [],
                excludedStopPatterns: [],
              },
            ],
          },
        ],
      }),
    )

    expect(loadProPresetStore(storage).versions[0]?.presets[0]?.routeDisplayOverrides[0]?.useTripHeadsignAsDestination).toBe(false)
    expect(loadProPresetStore(storage).versions[0]?.presets[0]?.routeDisplayOverrides[0]?.stopCellOverrides[0]?.mincho).toBe(false)
  })
})

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}
