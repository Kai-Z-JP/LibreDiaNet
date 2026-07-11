import type { ProWorkspaceDescriptor } from './pro-workspace-storage'

const ACTIVE_WORKSPACE_KEY = 'libre-dianet-pro-active-workspace-v1'
const HANDLE_DATABASE_NAME = 'libre-dianet-pro-handles'
const HANDLE_STORE_NAME = 'handles'
const ACTIVE_FILE_HANDLE_KEY = 'active-file-workspace'

export function loadActiveProWorkspaceDescriptor(storage: Storage = window.localStorage): ProWorkspaceDescriptor {
  const raw = storage.getItem(ACTIVE_WORKSPACE_KEY)
  if (!raw) {
    return { kind: 'local' }
  }
  const value = JSON.parse(raw) as unknown
  if (!isRecord(value)) {
    return { kind: 'local' }
  }
  if (value.kind === 'file-system' && typeof value.name === 'string' && typeof value.workspaceId === 'string') {
    return { kind: 'file-system', name: value.name, workspaceId: value.workspaceId }
  }
  if (value.kind === 'firebase' && typeof value.workspaceId === 'string') {
    return {
      kind: 'firebase',
      workspaceId: value.workspaceId,
      ...(typeof value.name === 'string' ? { name: value.name } : {}),
    }
  }
  return { kind: 'local' }
}

export function saveActiveProWorkspaceDescriptor(descriptor: ProWorkspaceDescriptor, storage: Storage = window.localStorage): void {
  storage.setItem(ACTIVE_WORKSPACE_KEY, JSON.stringify(descriptor))
}

export async function saveActiveFileSystemHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const database = await openHandleDatabase()
  try {
    await runRequest(
      database.transaction(HANDLE_STORE_NAME, 'readwrite').objectStore(HANDLE_STORE_NAME).put(handle, ACTIVE_FILE_HANDLE_KEY),
    )
  } finally {
    database.close()
  }
}

export async function loadActiveFileSystemHandle(): Promise<FileSystemDirectoryHandle | null> {
  const database = await openHandleDatabase()
  try {
    const value = await runRequest(database.transaction(HANDLE_STORE_NAME).objectStore(HANDLE_STORE_NAME).get(ACTIVE_FILE_HANDLE_KEY))
    return isDirectoryHandle(value) ? value : null
  } finally {
    database.close()
  }
}

function openHandleDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(HANDLE_DATABASE_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(HANDLE_STORE_NAME)) {
        request.result.createObjectStore(HANDLE_STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open workspace handle database'))
  })
}

function runRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Workspace handle operation failed'))
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDirectoryHandle(value: unknown): value is FileSystemDirectoryHandle {
  return isRecord(value) && value.kind === 'directory' && typeof value.name === 'string'
}
