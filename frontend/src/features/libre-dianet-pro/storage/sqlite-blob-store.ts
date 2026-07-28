import { createGtfsLoader, type GtfsDatabaseProvider } from '@gtfs-jp/loader'
import type { SqliteBlobStore } from './pro-workspace-storage'

export function createOpfsSqliteBlobStore(): SqliteBlobStore {
  return {
    read: readOpfsFile,
    write: writeOpfsFile,
    delete: deleteOpfsFile,
  }
}

export function createMirroredOpfsDatabaseProvider(
  canonicalStore: SqliteBlobStore,
  workspaceKey: string,
  canonicalFilename: string,
): GtfsDatabaseProvider {
  const workingFilename = `libre-dianet-pro-${storageKeyHash(workspaceKey)}-${storageKeyHash(canonicalFilename)}.sqlite3`
  const workingStore = createOpfsSqliteBlobStore()
  const loader = createGtfsLoader({ storage: 'opfs', filename: workingFilename })
  let opened = false
  let hydrated = false

  const open = async () => {
    if (opened) {
      return
    }
    if (!hydrated) {
      const canonicalBytes = await canonicalStore.read(canonicalFilename)
      if (canonicalBytes) {
        await workingStore.write(workingFilename, canonicalBytes)
      } else {
        await workingStore.delete(workingFilename)
      }
      hydrated = true
    }
    await loader.open()
    opened = true
  }

  const closeWorkingDatabase = async (unlink = false) => {
    if (opened) {
      await loader.close({ unlink })
      opened = false
    } else if (unlink) {
      await workingStore.delete(workingFilename)
    }
  }

  return {
    open,
    async close(options = {}) {
      await closeWorkingDatabase(options.unlink)
      if (options.unlink) {
        await canonicalStore.delete(canonicalFilename)
      }
    },
    async reset() {
      await open()
      await loader.reset()
    },
    db() {
      return loader.db()
    },
    async exportBytes() {
      const shouldReopen = opened
      await closeWorkingDatabase()
      const bytes = await workingStore.read(workingFilename)
      if (shouldReopen) {
        await open()
      }
      if (!bytes) {
        throw new Error('SQLite working copy is missing')
      }
      return bytes
    },
    async importBytes(bytes) {
      await canonicalStore.write(canonicalFilename, bytes)
      const shouldReopen = opened
      await closeWorkingDatabase()
      await workingStore.write(workingFilename, bytes)
      if (shouldReopen) {
        await open()
      }
    },
  }
}

async function readOpfsFile(path: string): Promise<Uint8Array | null> {
  try {
    const { directory, filename } = await resolveOpfsParent(path, false)
    const handle = await directory.getFileHandle(filename)
    return new Uint8Array(await (await handle.getFile()).arrayBuffer())
  } catch (error) {
    if (isNotFoundError(error)) {
      return null
    }
    throw error
  }
}

async function writeOpfsFile(path: string, bytes: Uint8Array): Promise<void> {
  const { directory, filename } = await resolveOpfsParent(path, true)
  const handle = await directory.getFileHandle(filename, { create: true })
  const writable = await handle.createWritable()
  try {
    await writable.write(copyArrayBuffer(bytes))
    await writable.close()
  } catch (error) {
    await writable.abort().catch(() => undefined)
    throw error
  }
}

async function deleteOpfsFile(path: string): Promise<void> {
  try {
    const { directory, filename } = await resolveOpfsParent(path, false)
    await directory.removeEntry(filename)
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error
    }
  }
}

async function resolveOpfsParent(path: string, create: boolean): Promise<{ directory: FileSystemDirectoryHandle; filename: string }> {
  const parts = path.split('/').filter(Boolean)
  const filename = parts.pop()
  if (!filename) {
    throw new Error(`Invalid OPFS path: ${path}`)
  }
  let directory = await navigator.storage.getDirectory()
  for (const part of parts) {
    directory = await directory.getDirectoryHandle(part, { create })
  }
  return { directory, filename }
}

export function copyArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

export function isNotFoundError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'NotFoundError'
}

export function storageKeyHash(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}
