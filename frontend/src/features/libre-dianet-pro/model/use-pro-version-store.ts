import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { deepEqual } from 'rxdb/plugins/utils'
import type { ProPreset, ProVersion } from '../../../types'
import type { ProWorkspaceStorage } from '../storage/pro-workspace-storage'
import { createProPreset, createProVersion, duplicateProPreset, importProPreset } from './pro-factories'
import { proVersionsReducer } from './pro-versions.reducer'

export function useProVersionStore({
  storage,
  onPresetCreated,
}: {
  storage: ProWorkspaceStorage
  onPresetCreated: (presetId: string) => void
}) {
  const [versions, dispatchVersions] = useReducer(proVersionsReducer, [])
  const [loadedStorage, setLoadedStorage] = useState<ProWorkspaceStorage | null>(null)
  const [writableStorage, setWritableStorage] = useState<ProWorkspaceStorage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const skipNextSaveRef = useRef(false)
  const serializedVersionsRef = useRef(JSON.stringify(versions))
  const versionsRef = useRef(versions)
  const remoteVersionsRef = useRef<ProVersion[]>([])
  const scheduledVersionsRef = useRef<ProVersion[]>([])

  useLayoutEffect(() => {
    versionsRef.current = versions
  }, [versions])

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | undefined
    setLoadedStorage(null)
    setWritableStorage(null)
    setError(null)

    const applyStore = (remoteVersions: ProVersion[]) => {
      const previousRemoteVersions = remoteVersionsRef.current
      const localVersions = versionsRef.current
      const nextVersions = mergeRemoteVersions(previousRemoteVersions, localVersions, remoteVersions)
      const hasLocalChanges = !sameValue(localVersions, previousRemoteVersions)
      remoteVersionsRef.current = remoteVersions
      const serialized = JSON.stringify(nextVersions)
      scheduledVersionsRef.current = nextVersions
      if (serialized === serializedVersionsRef.current) {
        return
      }
      serializedVersionsRef.current = serialized
      skipNextSaveRef.current = !hasLocalChanges
      dispatchVersions({ type: 'store/replace', versions: nextVersions })
    }

    void storage
      .loadStore()
      .then((store) => {
        if (cancelled) {
          return
        }
        skipNextSaveRef.current = true
        applyStore(store.versions)
        setLoadedStorage(storage)
        setWritableStorage(storage)
        unsubscribe = storage.subscribeStore?.((nextStore) => {
          if (!cancelled) {
            applyStore(nextStore.versions)
          }
        })
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'ワークスペースを読み込めませんでした')
          setLoadedStorage(storage)
        }
      })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [storage])

  useEffect(() => {
    serializedVersionsRef.current = JSON.stringify(versions)
    if (writableStorage !== storage) {
      return
    }
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      return
    }
    const changes = diffVersions(scheduledVersionsRef.current, versions)
    if (changes.changedVersionIds.length === 0 && changes.removedVersionIds.length === 0) {
      return
    }
    scheduledVersionsRef.current = versions
    void storage.saveStore({ version: 1, versions }, changes).catch((saveError: unknown) => {
      setError(saveError instanceof Error ? saveError.message : 'ワークスペースを保存できませんでした')
    })
  }, [storage, versions, writableStorage])

  const updateVersion = (version: ProVersion) => {
    dispatchVersions({ type: 'version/update', version })
  }

  const createVersion = (): ProVersion => {
    const version = createProVersion()
    dispatchVersions({ type: 'version/create', version })
    return version
  }

  const deleteVersion = (version: ProVersion) => {
    dispatchVersions({ type: 'version/delete', versionId: version.id })
  }

  const createPreset = (version: ProVersion) => {
    const gtfsSourceIds = version.gtfsSources.map((source) => source.sourceId)
    const preset = createProPreset(gtfsSourceIds.length === 1 ? gtfsSourceIds : [])
    dispatchVersions({ type: 'preset/create', versionId: version.id, preset })
    onPresetCreated(preset.id)
  }

  const duplicatePreset = (version: ProVersion, preset: ProPreset) => {
    const duplicatedPreset = duplicateProPreset(preset)
    dispatchVersions({ type: 'preset/create', versionId: version.id, preset: duplicatedPreset })
    onPresetCreated(duplicatedPreset.id)
  }

  const importPreset = (version: ProVersion, preset: ProPreset) => {
    const importedPreset = importProPreset(preset)
    dispatchVersions({ type: 'preset/create', versionId: version.id, preset: importedPreset })
    onPresetCreated(importedPreset.id)
  }

  const deletePreset = (version: ProVersion, preset: ProPreset) => {
    dispatchVersions({ type: 'preset/delete', versionId: version.id, presetId: preset.id })
  }

  return {
    versions,
    loading: loadedStorage !== storage,
    error,
    updateVersion,
    createVersion,
    deleteVersion,
    createPreset,
    duplicatePreset,
    importPreset,
    deletePreset,
  }
}

function diffVersions(previous: ProVersion[], next: ProVersion[]) {
  const previousById = new Map(previous.map((version, position) => [version.id, { position, version }]))
  const nextIds = new Set(next.map((version) => version.id))
  return {
    changedVersionIds: next
      .filter((version, position) => {
        const previousVersion = previousById.get(version.id)
        return (
          !previousVersion || previousVersion.position !== position || JSON.stringify(previousVersion.version) !== JSON.stringify(version)
        )
      })
      .map((version) => version.id),
    removedVersionIds: previous.filter((version) => !nextIds.has(version.id)).map((version) => version.id),
  }
}

export function mergeRemoteVersions(previousRemote: ProVersion[], local: ProVersion[], nextRemote: ProVersion[]): ProVersion[] {
  const previousRemoteById = new Map(previousRemote.map((version) => [version.id, version]))
  const localById = new Map(local.map((version) => [version.id, version]))
  const nextRemoteIds = new Set(nextRemote.map((version) => version.id))

  const merged = nextRemote.flatMap((remoteVersion) => {
    const previousVersion = previousRemoteById.get(remoteVersion.id)
    const localVersion = localById.get(remoteVersion.id)
    if (previousVersion && !localVersion) {
      return []
    }
    if (!previousVersion || !localVersion) {
      return [remoteVersion]
    }
    return [mergeRemoteVersion(previousVersion, localVersion, remoteVersion)]
  })

  return [
    ...merged,
    ...local.filter((version) => !previousRemoteById.has(version.id) && !nextRemoteIds.has(version.id)),
  ]
}

function mergeRemoteVersion(previousRemote: ProVersion, local: ProVersion, nextRemote: ProVersion): ProVersion {
  const merged = { ...nextRemote } as ProVersion
  for (const key of Object.keys(local) as (keyof ProVersion)[]) {
    if (key !== 'presets' && !sameValue(local[key], previousRemote[key])) {
      ;(merged as unknown as Record<keyof ProVersion, unknown>)[key] = local[key]
    }
  }
  merged.presets = mergeRemotePresets(previousRemote.presets, local.presets, nextRemote.presets)
  return merged
}

function mergeRemotePresets(previousRemote: ProPreset[], local: ProPreset[], nextRemote: ProPreset[]): ProPreset[] {
  const previousRemoteById = new Map(previousRemote.map((preset) => [preset.id, preset]))
  const localById = new Map(local.map((preset) => [preset.id, preset]))
  const nextRemoteIds = new Set(nextRemote.map((preset) => preset.id))

  return [
    ...nextRemote.flatMap((remotePreset) => {
      const previousPreset = previousRemoteById.get(remotePreset.id)
      const localPreset = localById.get(remotePreset.id)
      if (previousPreset && !localPreset) {
        return []
      }
      return [previousPreset && localPreset && !sameValue(localPreset, previousPreset) ? localPreset : remotePreset]
    }),
    ...local.filter((preset) => !previousRemoteById.has(preset.id) && !nextRemoteIds.has(preset.id)),
  ]
}

function sameValue(left: unknown, right: unknown): boolean {
  return deepEqual(left, right)
}
