import { useCallback, useEffect, useRef, useState } from 'react'
import { GtfsRepository } from '../../../gtfsRepository'
import type { ProPresetStore } from '../../../types'
import type { FirebaseProUser, FirebaseWorkspaceMember, FirebaseWorkspaceSummary } from './firebase-pro-workspace-access'
import {
  loadActiveFileSystemHandle,
  loadActiveProWorkspaceDescriptor,
  saveActiveFileSystemHandle,
  saveActiveProWorkspaceDescriptor,
} from './active-pro-workspace'
import { createFileSystemProWorkspaceStorage, queryFileSystemWorkspacePermission } from './file-system-pro-workspace-storage'
import { createFirebaseAuthStartUrl, FIREBASE_AUTH_RETURN_PARAM } from './firebase-auth-navigation'
import {
  copyProWorkspace,
  createLocalProWorkspaceStorage,
  type ProWorkspaceCopyLogger,
  type ProWorkspaceDescriptor,
  type ProWorkspaceStorage,
} from './pro-workspace-storage'

export type ProWorkspaceOpenMode = 'open' | 'copy'

type ProWorkspaceRuntime = {
  storage: ProWorkspaceStorage
  repository: GtfsRepository
}

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: { id?: string; mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>
}

export function useProWorkspace() {
  const [runtime, setRuntime] = useState<ProWorkspaceRuntime>(() => createRuntime(createLocalProWorkspaceStorage()))
  const runtimeRef = useRef(runtime)
  const [restoring, setRestoring] = useState(true)
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseProUser | null>(null)
  const [firebaseAuthReady, setFirebaseAuthReady] = useState(false)
  const [firebaseAuthLoading, setFirebaseAuthLoading] = useState(false)
  const firebaseAuthUnsubscribeRef = useRef<(() => void) | null>(null)
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('workspaceInvite'),
  )
  const [firebaseAuthReturn] = useState(() => new URLSearchParams(window.location.search).has(FIREBASE_AUTH_RETURN_PARAM))

  const replaceRuntime = useCallback((nextRuntime: ProWorkspaceRuntime) => {
    runtimeRef.current = nextRuntime
    setRuntime(nextRuntime)
  }, [])

  const observeFirebaseUser = useCallback((user: FirebaseProUser | null) => {
    setFirebaseUser(user)
    setFirebaseAuthReady(true)
    if (user) {
      setError(null)
    }
  }, [])

  const prepareFirebaseAuth = useCallback(async () => {
    setFirebaseAuthLoading(true)
    try {
      const access = await loadFirebaseWorkspaceAccess()
      firebaseAuthUnsubscribeRef.current ??= access.subscribeFirebaseProUser(observeFirebaseUser)
      const user = await access.getCurrentFirebaseProUser()
      observeFirebaseUser(user)
      return user
    } catch (authError) {
      setError(errorMessage(authError, 'Firebase Auth を初期化できませんでした'))
      return null
    } finally {
      if (firebaseAuthReturn) {
        removeFirebaseAuthReturnMarker()
      }
      setFirebaseAuthLoading(false)
    }
  }, [firebaseAuthReturn, observeFirebaseUser])

  useEffect(() => {
    let cancelled = false
    const restore = async () => {
      const descriptor = loadActiveProWorkspaceDescriptor()
      if (descriptor.kind === 'local') {
        setRestoring(false)
        return
      }
      let restoredStorage: ProWorkspaceStorage | null = null
      let previousStorage: ProWorkspaceStorage | null = null
      try {
        restoredStorage = await restoreWorkspaceStorage(descriptor)
        if (descriptor.kind === 'firebase') {
          await prepareFirebaseAuth()
        }
        await restoredStorage.loadStore()
        if (cancelled) {
          await restoredStorage.dispose?.()
          return
        }
        const current = runtimeRef.current
        await current.repository.closeAll()
        replaceRuntime(createRuntime(restoredStorage))
        previousStorage = current.storage
      } catch (restoreError) {
        await safelyDisposeStorage(restoredStorage)
        if (!cancelled) {
          setError(errorMessage(restoreError, '保存先を復元できませんでした'))
        }
      } finally {
        await safelyDisposeStorage(previousStorage)
        if (!cancelled) {
          setRestoring(false)
        }
      }
    }
    void restore()
    return () => {
      cancelled = true
    }
  }, [prepareFirebaseAuth, replaceRuntime])

  useEffect(() => {
    if (!firebaseAuthReady || firebaseUser || restoring) {
      return
    }
    const current = runtimeRef.current
    if (current.storage.descriptor.kind !== 'firebase') {
      return
    }

    let cancelled = false
    setSwitching(true)
    const localRuntime = createRuntime(createLocalProWorkspaceStorage())
    saveActiveProWorkspaceDescriptor(localRuntime.storage.descriptor)
    replaceRuntime(localRuntime)
    void (async () => {
      try {
        await current.repository.closeAll()
      } finally {
        await safelyDisposeStorage(current.storage)
        if (!cancelled) {
          setSwitching(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [firebaseAuthReady, firebaseUser, replaceRuntime, restoring])

  useEffect(() => {
    return () => {
      firebaseAuthUnsubscribeRef.current?.()
      const current = runtimeRef.current
      void (async () => {
        try {
          await current.repository.closeAll()
        } finally {
          await safelyDisposeStorage(current.storage)
        }
      })()
    }
  }, [])

  const activateStorage = useCallback(
    async (
      target: ProWorkspaceStorage,
      mode: ProWorkspaceOpenMode,
      currentStore: ProPresetStore,
      beforeActivate?: () => Promise<void>,
      copyLog?: ProWorkspaceCopyLogger,
    ) => {
      const current = runtimeRef.current
      if (sameDescriptor(current.storage.descriptor, target.descriptor) && current.storage.descriptor.kind !== 'file-system') {
        await target.dispose?.()
        return
      }

      setSwitching(true)
      setError(null)
      let switched = false
      try {
        if (mode === 'copy') {
          copyLog?.({ level: 'info', message: 'コピー元のデータを確定しています' })
        }
        await current.repository.closeAll()
        if (mode === 'copy') {
          copyLog?.({ level: 'info', message: 'コピー先の既存データを確認しています' })
          await target.awaitInitialSync?.()
          await copyProWorkspace(current.storage, target, currentStore, copyLog)
        } else {
          await target.loadStore()
        }
        await beforeActivate?.()
        saveActiveProWorkspaceDescriptor(target.descriptor)
        replaceRuntime(createRuntime(target))
        switched = true
      } catch (switchError) {
        await safelyDisposeStorage(target)
        replaceRuntime(createRuntime(current.storage))
        const message = errorMessage(switchError, '保存先を切り替えられませんでした')
        setError(message)
        if (mode === 'copy') {
          copyLog?.({ level: 'error', message: `コピーに失敗しました: ${message}` })
        }
        throw switchError
      } finally {
        if (switched) {
          await safelyDisposeStorage(current.storage)
        }
        setSwitching(false)
      }
    },
    [replaceRuntime],
  )

  const useLocalWorkspace = useCallback(
    async (mode: ProWorkspaceOpenMode, currentStore: ProPresetStore, copyLog?: ProWorkspaceCopyLogger) => {
      await activateStorage(createLocalProWorkspaceStorage(), mode, currentStore, undefined, copyLog)
    },
    [activateStorage],
  )

  const chooseFileSystemWorkspace = useCallback(
    async (mode: ProWorkspaceOpenMode, currentStore: ProPresetStore, copyLog?: ProWorkspaceCopyLogger) => {
      const picker = (window as DirectoryPickerWindow).showDirectoryPicker
      if (!picker) {
        throw new Error('このブラウザは File System Access API に対応していません')
      }
      const handle = await picker.call(window, { id: 'libre-dianet-pro-workspace', mode: 'readwrite' })
      if (mode === 'copy') {
        copyLog?.({ level: 'info', message: `コピー先フォルダを選択しました: ${handle.name}` })
      }
      const target = await createFileSystemProWorkspaceStorage(handle)
      await activateStorage(target, mode, currentStore, () => saveActiveFileSystemHandle(handle), copyLog)
    },
    [activateStorage],
  )

  const useFirebaseWorkspace = useCallback(
    async (
      workspaceId: string,
      workspaceName: string,
      mode: ProWorkspaceOpenMode,
      currentStore: ProPresetStore,
      copyLog?: ProWorkspaceCopyLogger,
    ) => {
      if (mode === 'copy') {
        copyLog?.({ level: 'info', message: 'Firebaseワークスペースを準備しています' })
        const access = await loadFirebaseWorkspaceAccess()
        await access.ensureFirebaseWorkspace(workspaceId.trim(), workspaceName)
      }
      const target = await createFirebaseWorkspaceStorage(workspaceId)
      await activateStorage(target, mode, currentStore, undefined, copyLog)
    },
    [activateStorage],
  )

  const signInFirebase = useCallback(async () => {
    setFirebaseAuthLoading(true)
    setError(null)
    try {
      window.location.assign(createFirebaseAuthStartUrl().toString())
    } catch (signInError) {
      setError(errorMessage(signInError, 'Firebase にログインできませんでした'))
      throw signInError
    } finally {
      setFirebaseAuthLoading(false)
    }
  }, [])

  const signOutFirebase = useCallback(async () => {
    setFirebaseAuthLoading(true)
    setError(null)
    try {
      const current = runtimeRef.current
      if (current.storage.descriptor.kind === 'firebase') {
        await current.repository.closeAll()
        await safelyDisposeStorage(current.storage)
        const localRuntime = createRuntime(createLocalProWorkspaceStorage())
        saveActiveProWorkspaceDescriptor(localRuntime.storage.descriptor)
        replaceRuntime(localRuntime)
      }
      const access = await loadFirebaseWorkspaceAccess()
      await access.signOutFirebaseProUser()
      setFirebaseUser(null)
    } catch (signOutError) {
      setError(errorMessage(signOutError, 'Firebase からログアウトできませんでした'))
      throw signOutError
    } finally {
      setFirebaseAuthLoading(false)
    }
  }, [replaceRuntime])

  const createFirebaseInvite = useCallback(async (email: string) => {
    const descriptor = runtimeRef.current.storage.descriptor
    if (descriptor.kind !== 'firebase') {
      throw new Error('Firebase ワークスペースを開いてください')
    }
    const access = await loadFirebaseWorkspaceAccess()
    const token = await access.createFirebaseWorkspaceInvite(descriptor.workspaceId, email)
    const inviteUrl = new URL(window.location.href)
    inviteUrl.search = ''
    inviteUrl.hash = ''
    inviteUrl.searchParams.set('workspaceInvite', token)
    return inviteUrl.toString()
  }, [])

  const listFirebaseMembers = useCallback(async (): Promise<FirebaseWorkspaceMember[]> => {
    const descriptor = runtimeRef.current.storage.descriptor
    if (descriptor.kind !== 'firebase') {
      return []
    }
    const access = await loadFirebaseWorkspaceAccess()
    return access.listFirebaseWorkspaceMembers(descriptor.workspaceId)
  }, [])

  const listFirebaseWorkspaces = useCallback(async (): Promise<FirebaseWorkspaceSummary[]> => {
    const access = await loadFirebaseWorkspaceAccess()
    return access.listFirebaseWorkspaces()
  }, [])

  const acceptFirebaseInvite = useCallback(
    async (currentStore: ProPresetStore) => {
      if (!pendingInviteToken) {
        throw new Error('招待 token がありません')
      }
      const access = await loadFirebaseWorkspaceAccess()
      const workspaceAccess = await access.acceptFirebaseWorkspaceInvite(pendingInviteToken)
      const target = await createFirebaseWorkspaceStorage(workspaceAccess.workspaceId)
      await activateStorage(target, 'open', currentStore)
      setPendingInviteToken(null)
      const nextUrl = new URL(window.location.href)
      nextUrl.searchParams.delete('workspaceInvite')
      window.history.replaceState(null, '', nextUrl)
    },
    [activateStorage, pendingInviteToken],
  )

  return {
    storage: runtime.storage,
    repository: runtime.repository,
    descriptor: runtime.storage.descriptor,
    label: runtime.storage.label,
    restoring,
    switching,
    error,
    firebaseUser,
    firebaseAuthLoading,
    firebaseAuthReturn,
    pendingInviteToken,
    supportsFileSystemAccess: typeof (window as DirectoryPickerWindow).showDirectoryPicker === 'function',
    useLocalWorkspace,
    chooseFileSystemWorkspace,
    useFirebaseWorkspace,
    prepareFirebaseAuth,
    signInFirebase,
    signOutFirebase,
    createFirebaseInvite,
    listFirebaseMembers,
    listFirebaseWorkspaces,
    acceptFirebaseInvite,
  }
}

export type ProWorkspaceController = ReturnType<typeof useProWorkspace>

function createRuntime(storage: ProWorkspaceStorage): ProWorkspaceRuntime {
  return {
    storage,
    repository:
      storage.descriptor.kind === 'local'
        ? new GtfsRepository()
        : new GtfsRepository({
            createDatabaseProvider: (filename) => {
              const provider = storage.createDatabaseProvider(filename)
              if (!provider) {
                throw new Error('The active workspace does not use a custom database provider')
              }
              return provider
            },
          }),
  }
}

async function restoreWorkspaceStorage(descriptor: ProWorkspaceDescriptor): Promise<ProWorkspaceStorage> {
  if (descriptor.kind === 'firebase') {
    return createFirebaseWorkspaceStorage(descriptor.workspaceId)
  }
  if (descriptor.kind === 'file-system') {
    const handle = await loadActiveFileSystemHandle()
    if (!handle || (await queryFileSystemWorkspacePermission(handle)) !== 'granted') {
      throw new Error('保存フォルダへのアクセス許可が必要です')
    }
    const storage = await createFileSystemProWorkspaceStorage(handle)
    if (storage.descriptor.kind !== 'file-system' || storage.descriptor.workspaceId !== descriptor.workspaceId) {
      throw new Error('保存フォルダが前回と異なります')
    }
    return storage
  }
  return createLocalProWorkspaceStorage()
}

async function createFirebaseWorkspaceStorage(workspaceId: string): Promise<ProWorkspaceStorage> {
  const { createFirebaseProWorkspaceStorage } = await import('./firebase-pro-workspace-storage')
  return createFirebaseProWorkspaceStorage(workspaceId)
}

async function loadFirebaseWorkspaceAccess() {
  return import('./firebase-pro-workspace-access')
}

function sameDescriptor(left: ProWorkspaceDescriptor, right: ProWorkspaceDescriptor): boolean {
  if (left.kind !== right.kind) {
    return false
  }
  if (left.kind === 'local' || right.kind === 'local') {
    return true
  }
  return left.workspaceId === right.workspaceId
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function removeFirebaseAuthReturnMarker(): void {
  const nextUrl = new URL(window.location.href)
  nextUrl.searchParams.delete(FIREBASE_AUTH_RETURN_PARAM)
  window.history.replaceState(null, '', nextUrl)
}

async function safelyDisposeStorage(storage: ProWorkspaceStorage | null): Promise<void> {
  try {
    await storage?.dispose?.()
  } catch {
    // The active runtime has already changed; cleanup failure must not roll it back.
  }
}
