import { gtfsCacheFilename } from '../../../gtfsRepository'
import type { ProPresetStore, RawInfoV2, RepoInfoV2 } from '../../../types'
import {
  copyProWorkspace,
  emptyProPresetStore,
  type ProWorkspaceCopyLog,
  type ProWorkspaceStorage,
  type SqliteBlobStore,
} from './pro-workspace-storage'

describe('copyProWorkspace', () => {
  it('copies the Pro store and its SQLite blobs', async () => {
    const repoInfo: RepoInfoV2 = {
      kind: 'repo',
      id: 'repo',
      orgId: 'org',
      feedId: 'feed',
      fileUid: 'file-uid',
      fileLabel: null,
      name: 'Repo',
    }
    const rawInfo: RawInfoV2 = {
      kind: 'raw',
      id: 'raw',
      uuid: 'raw',
      name: 'raw.zip',
      cacheState: 'ready',
    }
    const missingRawInfo: RawInfoV2 = {
      kind: 'raw',
      id: 'missing',
      uuid: 'missing',
      name: 'missing.zip',
      cacheState: 'ready',
    }
    const store: ProPresetStore = {
      version: 1,
      versions: [
        {
          id: 'version',
          name: 'Version',
          revisionDate: '2026-04-01',
          gtfsSources: [
            { sourceId: 'repo-source', info: repoInfo },
            { sourceId: 'raw-source', info: rawInfo },
            { sourceId: 'missing-source', info: missingRawInfo },
          ],
          presets: [
            {
              id: 'preset',
              name: 'Preset',
              index: 0,
              sourceIds: ['repo-source'],
              routes: [],
              routeDisplayOverrides: [],
              poles: [],
              excludedStopPatterns: [],
            },
          ],
        },
      ],
    }
    const source = createMemoryWorkspace(store)
    const target = createMemoryWorkspace()
    await source.databaseBlobs.write(gtfsCacheFilename(repoInfo), new Uint8Array([1, 2]))
    await source.databaseBlobs.write(gtfsCacheFilename(rawInfo), new Uint8Array([3, 4]))
    await target.databaseBlobs.write(gtfsCacheFilename(missingRawInfo), new Uint8Array([9]))

    const saveStore = vi.spyOn(target, 'saveStore')
    const logs: ProWorkspaceCopyLog[] = []
    const copied = await copyProWorkspace(source, target, store, (entry) => logs.push(entry))

    expect(await target.databaseBlobs.read(gtfsCacheFilename(repoInfo))).toEqual(new Uint8Array([1, 2]))
    expect(await target.databaseBlobs.read(gtfsCacheFilename(rawInfo))).toEqual(new Uint8Array([3, 4]))
    expect(await target.databaseBlobs.read(gtfsCacheFilename(missingRawInfo))).toBeNull()
    expect(copied.versions[0]?.gtfsSources[2]?.info).toMatchObject({ kind: 'raw', cacheState: 'missing' })
    expect(copied.versions[0]?.presets).toEqual(store.versions[0]?.presets)
    expect(await target.loadStore()).toEqual(copied)
    expect(saveStore).toHaveBeenLastCalledWith(copied, { replace: true })
    expect(target.awaitRemoteSync).toHaveBeenCalledOnce()
    expect(logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ level: 'warning' }),
        expect.objectContaining({ message: 'ワークスペースデータを保存しています（1改正・1プリセット）' }),
        { level: 'info', message: 'リモートストレージとの同期を待っています' },
        { level: 'success', message: 'コピーが完了しました' },
      ]),
    )
  })
})

function createMemoryWorkspace(initialStore: ProPresetStore = emptyProPresetStore()): ProWorkspaceStorage {
  let store = structuredClone(initialStore)
  const blobs = new Map<string, Uint8Array>()
  const databaseBlobs: SqliteBlobStore = {
    async read(filename) {
      const bytes = blobs.get(filename)
      return bytes ? new Uint8Array(bytes) : null
    },
    async write(filename, bytes) {
      blobs.set(filename, new Uint8Array(bytes))
    },
    async delete(filename) {
      blobs.delete(filename)
    },
  }
  return {
    descriptor: { kind: 'local' },
    label: 'memory',
    databaseBlobs,
    async loadStore() {
      return structuredClone(store)
    },
    async saveStore(nextStore) {
      store = structuredClone(nextStore)
    },
    awaitRemoteSync: vi.fn().mockResolvedValue(undefined),
    createDatabaseProvider() {
      return undefined
    },
  }
}
