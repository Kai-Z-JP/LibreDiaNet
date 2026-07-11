import { parseProPresetStore } from '../../../storage'
import type { ProPresetStore } from '../../../types'
import { copyArrayBuffer, createMirroredOpfsDatabaseProvider, isNotFoundError } from './sqlite-blob-store'
import { emptyProPresetStore, type ProWorkspaceStorage, type SqliteBlobStore } from './pro-workspace-storage'

const WORKSPACE_FILENAME = 'libre-dianet-pro.workspace.json'
const WORKSPACE_FORMAT = 'libre-dianet-pro-workspace'

type FileWorkspaceDocument = {
  format: typeof WORKSPACE_FORMAT
  version: 1
  workspaceId: string
  store: ProPresetStore
}

export async function createFileSystemProWorkspaceStorage(directory: FileSystemDirectoryHandle): Promise<ProWorkspaceStorage> {
  const existingDocument = await readWorkspaceDocument(directory)
  const workspaceId = existingDocument?.workspaceId ?? crypto.randomUUID()
  const databaseBlobs = createDirectorySqliteBlobStore(directory)

  return {
    descriptor: { kind: 'file-system', name: directory.name, workspaceId },
    label: directory.name,
    databaseBlobs,
    async loadStore() {
      return (await readWorkspaceDocument(directory))?.store ?? emptyProPresetStore()
    },
    async saveStore(store) {
      const document: FileWorkspaceDocument = {
        format: WORKSPACE_FORMAT,
        version: 1,
        workspaceId,
        store,
      }
      await writeFile(directory, WORKSPACE_FILENAME, new TextEncoder().encode(JSON.stringify(document, null, 2)))
    },
    createDatabaseProvider(filename) {
      return createMirroredOpfsDatabaseProvider(databaseBlobs, `file-system:${workspaceId}`, filename)
    },
  }
}

export async function queryFileSystemWorkspacePermission(directory: FileSystemDirectoryHandle): Promise<PermissionState> {
  const permissionHandle = directory as FileSystemDirectoryHandle & {
    queryPermission(options: { mode: 'readwrite' }): Promise<PermissionState>
  }
  return permissionHandle.queryPermission({ mode: 'readwrite' })
}

function createDirectorySqliteBlobStore(root: FileSystemDirectoryHandle): SqliteBlobStore {
  return {
    async read(filename) {
      try {
        const directory = await root.getDirectoryHandle('gtfs')
        const handle = await directory.getFileHandle(filename)
        return new Uint8Array(await (await handle.getFile()).arrayBuffer())
      } catch (error) {
        if (isNotFoundError(error)) {
          return null
        }
        throw error
      }
    },
    async write(filename, bytes) {
      const directory = await root.getDirectoryHandle('gtfs', { create: true })
      await writeFile(directory, filename, bytes)
    },
    async delete(filename) {
      try {
        const directory = await root.getDirectoryHandle('gtfs')
        await directory.removeEntry(filename)
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error
        }
      }
    },
  }
}

async function readWorkspaceDocument(directory: FileSystemDirectoryHandle): Promise<FileWorkspaceDocument | null> {
  try {
    const handle = await directory.getFileHandle(WORKSPACE_FILENAME)
    const raw = await (await handle.getFile()).text()
    const value = JSON.parse(raw) as unknown
    if (!isRecord(value) || value.format !== WORKSPACE_FORMAT || value.version !== 1 || typeof value.workspaceId !== 'string') {
      throw new Error('Unsupported LibreDiaNet Pro workspace file')
    }
    return {
      format: WORKSPACE_FORMAT,
      version: 1,
      workspaceId: value.workspaceId,
      store: parseProPresetStore(JSON.stringify(value.store)),
    }
  } catch (error) {
    if (isNotFoundError(error)) {
      return null
    }
    throw error
  }
}

async function writeFile(directory: FileSystemDirectoryHandle, filename: string, bytes: Uint8Array): Promise<void> {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
