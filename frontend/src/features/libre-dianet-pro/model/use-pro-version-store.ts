import { useEffect, useReducer, useRef, useState } from 'react'
import type { ProPreset, ProVersion } from '../../../types'
import type { ProWorkspaceStorage } from '../storage/pro-workspace-storage'
import { createProPreset, createProVersion, duplicateProPreset } from './pro-factories'
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
  const scheduledVersionsRef = useRef<ProVersion[]>([])

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | undefined
    setLoadedStorage(null)
    setWritableStorage(null)
    setError(null)

    const applyStore = (nextVersions: ProVersion[]) => {
      const serialized = JSON.stringify(nextVersions)
      scheduledVersionsRef.current = nextVersions
      if (serialized === serializedVersionsRef.current) {
        return
      }
      serializedVersionsRef.current = serialized
      skipNextSaveRef.current = true
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
