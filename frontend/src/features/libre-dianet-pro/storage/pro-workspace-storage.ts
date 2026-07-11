import type { GtfsDatabaseProvider } from '@gtfs-jp/loader'
import { gtfsCacheFilename } from '../../../gtfsRepository'
import { loadProPresetStore, saveProPresetStore } from '../../../storage'
import type { ProPresetStore } from '../../../types'
import { createOpfsSqliteBlobStore } from './sqlite-blob-store'

export type ProWorkspaceDescriptor =
  | { kind: 'local' }
  | { kind: 'file-system'; name: string; workspaceId: string }
  | { kind: 'firebase'; workspaceId: string; name?: string }

export interface SqliteBlobStore {
  read(filename: string): Promise<Uint8Array | null>
  write(filename: string, bytes: Uint8Array): Promise<void>
  delete(filename: string): Promise<void>
}

export type ProWorkspaceSaveOptions = {
  changedVersionIds?: readonly string[]
  removedVersionIds?: readonly string[]
  replace?: boolean
}

export type ProWorkspaceCopyLog = {
  level: 'info' | 'warning' | 'success' | 'error'
  message: string
}

export type ProWorkspaceCopyLogger = (entry: ProWorkspaceCopyLog) => void

export interface ProWorkspaceStorage {
  readonly descriptor: ProWorkspaceDescriptor
  readonly label: string
  readonly databaseBlobs: SqliteBlobStore
  loadStore(): Promise<ProPresetStore>
  saveStore(store: ProPresetStore, options?: ProWorkspaceSaveOptions): Promise<void>
  createDatabaseProvider(filename: string): GtfsDatabaseProvider | undefined
  subscribeStore?(listener: (store: ProPresetStore) => void): () => void
  awaitInitialSync?(): Promise<void>
  awaitRemoteSync?(): Promise<void>
  dispose?(): Promise<void>
}

export function emptyProPresetStore(): ProPresetStore {
  return { version: 1, versions: [] }
}

export function createLocalProWorkspaceStorage(storage: Storage = window.localStorage): ProWorkspaceStorage {
  const databaseBlobs = createOpfsSqliteBlobStore()
  return {
    descriptor: { kind: 'local' },
    label: 'このブラウザ',
    databaseBlobs,
    async loadStore() {
      return loadProPresetStore(storage)
    },
    async saveStore(store) {
      saveProPresetStore(store, storage)
    },
    createDatabaseProvider() {
      return undefined
    },
  }
}

export async function copyProWorkspace(
  source: ProWorkspaceStorage,
  target: ProWorkspaceStorage,
  store: ProPresetStore,
  log?: ProWorkspaceCopyLogger,
): Promise<ProPresetStore> {
  const sourceInfos = store.versions.flatMap((version) => version.gtfsSources.map((source) => source.info))
  const infosByFilename = new Map(sourceInfos.map((info) => [gtfsCacheFilename(info), info]))
  const missingRawUuids = new Set<string>()
  const totalDatabases = infosByFilename.size

  log?.({ level: 'info', message: `SQLiteデータを確認しています（${totalDatabases}件）` })

  let databaseIndex = 0
  for (const [filename, info] of infosByFilename) {
    databaseIndex += 1
    const bytes = await source.databaseBlobs.read(filename)
    if (bytes) {
      await target.databaseBlobs.write(filename, bytes)
      log?.({ level: 'info', message: `SQLiteをコピーしました（${databaseIndex}/${totalDatabases}）` })
      continue
    }
    await target.databaseBlobs.delete(filename)
    if (info.kind === 'raw') {
      missingRawUuids.add(info.uuid)
      log?.({ level: 'warning', message: `元データがないSQLiteを欠損として記録しました（${databaseIndex}/${totalDatabases}）` })
    } else {
      log?.({ level: 'warning', message: `取得できないSQLiteをコピー先から除外しました（${databaseIndex}/${totalDatabases}）` })
    }
  }

  const copiedStore: ProPresetStore = {
    version: 1,
    versions: store.versions.map((version) => ({
      ...version,
      gtfsSources: version.gtfsSources.map((source) =>
        source.info.kind === 'raw' && missingRawUuids.has(source.info.uuid)
          ? { ...source, info: { ...source.info, cacheState: 'missing' } }
          : source,
      ),
    })),
  }
  const presetCount = copiedStore.versions.reduce((count, version) => count + version.presets.length, 0)
  log?.({
    level: 'info',
    message: `ワークスペースデータを保存しています（${copiedStore.versions.length}改正・${presetCount}プリセット）`,
  })
  await target.saveStore(copiedStore, { replace: true })
  if (target.awaitRemoteSync) {
    log?.({ level: 'info', message: 'リモートストレージとの同期を待っています' })
    await target.awaitRemoteSync()
  }
  log?.({ level: 'success', message: 'コピーが完了しました' })
  return copiedStore
}
