import { collection as firestoreCollection, type CollectionReference } from 'firebase/firestore'
import { deleteObject, getBytes, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage'
import { createRxDatabase, type RxCollection, type RxDatabase, type RxJsonSchema } from 'rxdb/plugins/core'
import { replicateFirestore } from 'rxdb/plugins/replication-firestore'
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie'
import type { ProPresetStore } from '../../../types'
import { getFirebaseProClient } from './firebase-pro-client'
import { FIREBASE_WORKSPACES_COLLECTION, requireFirebaseWorkspaceAccess, validateWorkspaceId } from './firebase-pro-workspace-access'
import { decodeFirebaseVersionDocument, encodeFirebaseVersionDocument, type FirebaseVersionDocument } from './firebase-pro-workspace-codec'
import { firebaseVersionConflictHandler } from './firebase-version-conflict-handler'
import { createMirroredOpfsDatabaseProvider, storageKeyHash } from './sqlite-blob-store'
import type { ProWorkspaceSaveOptions, ProWorkspaceStorage, SqliteBlobStore } from './pro-workspace-storage'

const FIREBASE_VERSIONS_COLLECTION = 'versions'
const FIREBASE_SYNC_TIMEOUT_MS = 30_000

type FirebaseCollections = {
  versions: RxCollection<FirebaseVersionDocument>
}

const VERSION_SCHEMA = {
  title: 'LibreDiaNet Pro version',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 200 },
    workspaceId: { type: 'string', maxLength: 200 },
    position: { type: 'integer', minimum: 0, maximum: 1_000_000 },
    version: { type: 'object', additionalProperties: true },
  },
  required: ['id', 'workspaceId', 'position', 'version'],
  indexes: [['workspaceId', 'position']],
  additionalProperties: false,
} as RxJsonSchema<FirebaseVersionDocument>

export async function createFirebaseProWorkspaceStorage(workspaceId: string): Promise<ProWorkspaceStorage> {
  const normalizedWorkspaceId = workspaceId.trim()
  if (!normalizedWorkspaceId) {
    throw new Error('Firebase workspace ID is required')
  }
  validateWorkspaceId(normalizedWorkspaceId)
  const access = await requireFirebaseWorkspaceAccess(normalizedWorkspaceId)
  const { firestore, projectId, storage: firebaseStorage } = getFirebaseProClient()

  const database = await createRxDatabase<FirebaseCollections>({
    name: `libredianetpro${storageKeyHash(`${projectId}:${normalizedWorkspaceId}`)}`,
    storage: getRxStorageDexie(),
    multiInstance: true,
    eventReduce: true,
  })
  const collections = await database.addCollections<FirebaseCollections>({
    versions: { schema: VERSION_SCHEMA, conflictHandler: firebaseVersionConflictHandler },
  })
  const versions = collections.versions
  const remoteCollection = firestoreCollection(
    firestore,
    FIREBASE_WORKSPACES_COLLECTION,
    normalizedWorkspaceId,
    FIREBASE_VERSIONS_COLLECTION,
  ) as CollectionReference<FirebaseVersionDocument>
  const replication = replicateFirestore({
    replicationIdentifier: `libre-dianet-pro:${projectId}:${normalizedWorkspaceId}`,
    collection: versions,
    firestore: {
      projectId,
      database: firestore,
      collection: remoteCollection,
    },
    pull: {
      modifier: decodeFirebaseVersionDocument,
    },
    push: {
      filter: (document) => document.workspaceId === normalizedWorkspaceId,
      modifier: encodeFirebaseVersionDocument,
    },
    live: true,
    waitForLeadership: false,
  })
  const databaseBlobs = createFirebaseSqliteBlobStore(normalizedWorkspaceId, firebaseStorage)
  let writeQueue: Promise<void> = Promise.resolve()
  let latestReplicationError: unknown = null
  const replicationErrorSubscription = replication.error$.subscribe((error) => {
    latestReplicationError = error
  })
  let pendingLocalWrites = 0
  let refreshAfterLocalWrite = false
  const storeListeners = new Set<(store: ProPresetStore) => void>()

  const loadStore = async (): Promise<ProPresetStore> => {
    const documents = await versions
      .find({
        selector: { workspaceId: normalizedWorkspaceId },
        sort: [{ position: 'asc' }],
      })
      .exec()
    return {
      version: 1,
      versions: documents.map((document) => document.toJSON().version),
    }
  }

  const persistStore = async (store: ProPresetStore, saveOptions: ProWorkspaceSaveOptions = {}): Promise<void> => {
    const nextIds = new Set<string>()
    const changedVersionIds = saveOptions.changedVersionIds ? new Set(saveOptions.changedVersionIds) : null
    for (const [position, version] of store.versions.entries()) {
      const id = firebaseVersionDocumentId(normalizedWorkspaceId, version.id)
      nextIds.add(id)
      if (saveOptions.replace || !changedVersionIds || changedVersionIds.has(version.id)) {
        await versions.incrementalUpsert({ id, workspaceId: normalizedWorkspaceId, position, version })
      }
    }

    const removedDocuments = saveOptions.replace
      ? (await versions.find({ selector: { workspaceId: normalizedWorkspaceId } }).exec()).filter(
          (document) => !nextIds.has(document.primary),
        )
      : await findVersionDocumentsByVersionIds(versions, normalizedWorkspaceId, saveOptions.removedVersionIds ?? [])
    if (removedDocuments.length > 0) {
      const result = await versions.bulkRemove(removedDocuments)
      if (result.error.length > 0) {
        throw result.error[0]
      }
    }
  }

  const storeQuery = versions.find({
    selector: { workspaceId: normalizedWorkspaceId },
    sort: [{ position: 'asc' }],
  })
  const storeSubscription = storeQuery.$.subscribe((documents) => {
    if (pendingLocalWrites > 0) {
      refreshAfterLocalWrite = true
      return
    }
    const store: ProPresetStore = {
      version: 1,
      versions: documents.map((document) => document.toJSON().version),
    }
    storeListeners.forEach((listener) => listener(store))
  })

  const enqueueStoreSave = (store: ProPresetStore, saveOptions?: ProWorkspaceSaveOptions) => {
    pendingLocalWrites += 1
    const task = writeQueue
      .catch(() => undefined)
      .then(async () => {
        try {
          await persistStore(store, saveOptions)
        } finally {
          pendingLocalWrites -= 1
          if (pendingLocalWrites === 0 && refreshAfterLocalWrite) {
            refreshAfterLocalWrite = false
            const latestStore = await loadStore()
            storeListeners.forEach((listener) => listener(latestStore))
          }
        }
      })
    writeQueue = task
    return task
  }

  return {
    descriptor: { kind: 'firebase', workspaceId: normalizedWorkspaceId, name: access.workspaceName },
    label: `Firebase / ${access.workspaceName}`,
    databaseBlobs,
    loadStore,
    saveStore(store, saveOptions) {
      return enqueueStoreSave(store, saveOptions)
    },
    createDatabaseProvider(filename) {
      return createMirroredOpfsDatabaseProvider(databaseBlobs, `firebase:${normalizedWorkspaceId}`, filename)
    },
    subscribeStore(listener) {
      storeListeners.add(listener)
      return () => storeListeners.delete(listener)
    },
    async awaitInitialSync() {
      await replication.awaitInitialReplication()
    },
    async awaitRemoteSync() {
      await writeQueue
      if (latestReplicationError) {
        throw new Error('Firestore への同期に失敗しました', { cause: latestReplicationError })
      }
      let timeout: number | undefined
      let syncErrorSubscription: { unsubscribe(): void } | undefined
      try {
        await Promise.race([
          replication.awaitInSync(),
          new Promise<never>((_, reject) => {
            syncErrorSubscription = replication.error$.subscribe((error) => {
              reject(new Error('Firestore への同期に失敗しました', { cause: error }))
            })
          }),
          new Promise<never>((_, reject) => {
            timeout = window.setTimeout(() => reject(new Error('Firestore への同期がタイムアウトしました')), FIREBASE_SYNC_TIMEOUT_MS)
          }),
        ])
      } finally {
        if (timeout !== undefined) {
          window.clearTimeout(timeout)
        }
        syncErrorSubscription?.unsubscribe()
      }
      if (latestReplicationError) {
        throw new Error('Firestore への同期に失敗しました', { cause: latestReplicationError })
      }
    },
    async dispose() {
      await writeQueue
      await replication.cancel()
      replicationErrorSubscription.unsubscribe()
      storeSubscription.unsubscribe()
      await closeRxDatabase(database)
    },
  }
}

async function findVersionDocumentsByVersionIds(
  versions: RxCollection<FirebaseVersionDocument>,
  workspaceId: string,
  versionIds: readonly string[],
) {
  if (versionIds.length === 0) {
    return []
  }
  const ids = versionIds.map((versionId) => firebaseVersionDocumentId(workspaceId, versionId))
  return Array.from((await versions.findByIds(ids).exec()).values())
}

function createFirebaseSqliteBlobStore(workspaceId: string, storage: FirebaseStorage): SqliteBlobStore {
  const objectReference = (filename: string) => ref(storage, `libre-dianet-pro/${workspaceId}/gtfs/${filename}`)
  return {
    async read(filename) {
      try {
        return new Uint8Array(await getBytes(objectReference(filename)))
      } catch (error) {
        if (isFirebaseObjectNotFound(error)) {
          return null
        }
        throw error
      }
    },
    async write(filename, bytes) {
      await uploadBytes(objectReference(filename), bytes, { contentType: 'application/vnd.sqlite3' })
    },
    async delete(filename) {
      try {
        await deleteObject(objectReference(filename))
      } catch (error) {
        if (!isFirebaseObjectNotFound(error)) {
          throw error
        }
      }
    },
  }
}

function firebaseVersionDocumentId(workspaceId: string, versionId: string): string {
  return `${storageKeyHash(workspaceId)}-${versionId}`.slice(0, 200)
}

function isFirebaseObjectNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'storage/object-not-found'
}

async function closeRxDatabase(database: RxDatabase<FirebaseCollections>): Promise<void> {
  await database.close()
}
