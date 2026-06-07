import { useEffect, useReducer, useState } from 'react'
import { loadProPresetStore, saveProPresetStore } from '../../../storage'
import type { FeedOption, ProGtfsSource, ProPreset, ProPresetContext, ProVersion } from '../../../types'
import { libreDiaNetRepository } from '../../libre-dianet/lib/repository'
import { createProPreset, createProVersion, createRawSourceInfo, createRepoSource } from './pro-factories'
import { proVersionsReducer } from './pro-versions.reducer'
import { useGtfsFeeds } from './use-gtfs-feeds'

export function useLibreDiaNetProPage() {
  const [versions, dispatchVersions] = useReducer(proVersionsReducer, [], () => loadProPresetStore().versions)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)
  const [context] = useState<ProPresetContext>({ loading: false, handles: {}, errors: {} })
  const gtfsFeeds = useGtfsFeeds()

  useEffect(() => {
    return () => {
      void libreDiaNetRepository.closeAll()
    }
  }, [])

  useEffect(() => {
    saveProPresetStore({ version: 1, versions })
  }, [versions])

  const selectedVersion = versions.find((version) => version.id === selectedVersionId) ?? null
  const selectedPreset = selectedVersion?.presets.find((preset) => preset.id === selectedPresetId) ?? null

  useEffect(() => {
    if (versions.length === 0 || selectedVersionId === null) {
      setSelectedVersionId(null)
      setSelectedPresetId(null)
      return
    }
    if (!selectedVersion) {
      setSelectedVersionId(null)
      setSelectedPresetId(null)
      return
    }
    if (!selectedPresetId || !selectedVersion.presets.some((preset) => preset.id === selectedPresetId)) {
      setSelectedPresetId(selectedVersion.presets[0]?.id ?? null)
    }
  }, [selectedPresetId, selectedVersion, selectedVersionId, versions])

  const updateVersion = (version: ProVersion) => {
    dispatchVersions({ type: 'version/update', version })
  }

  const createVersion = () => {
    const version = createProVersion()
    dispatchVersions({ type: 'version/create', version })
    setSelectedVersionId(version.id)
    setSelectedPresetId(null)
  }

  const deleteVersion = (version: ProVersion) => {
    dispatchVersions({ type: 'version/delete', versionId: version.id })
  }

  const createPreset = (version: ProVersion) => {
    const gtfsSourceIds = version.gtfsSources.map((source) => source.sourceId)
    const preset = createProPreset(gtfsSourceIds.length === 1 ? gtfsSourceIds : [])
    dispatchVersions({ type: 'preset/create', versionId: version.id, preset })
    setSelectedPresetId(preset.id)
  }

  const deletePreset = (version: ProVersion, preset: ProPreset) => {
    dispatchVersions({ type: 'preset/delete', versionId: version.id, presetId: preset.id })
  }

  const createRawSource = async (file: File): Promise<ProGtfsSource> => {
    const { info, source } = createRawSourceInfo(file)
    await libreDiaNetRepository.openRawFeed(info, file)
    return source
  }

  const replaceRawSource = async (source: ProGtfsSource, file: File): Promise<ProGtfsSource> => {
    if (source.info.kind !== 'raw') {
      return source
    }
    const nextInfo = {
      ...source.info,
      name: file.name,
      cacheState: 'ready' as const,
    }
    await libreDiaNetRepository.openRawFeed(nextInfo, file)
    return { ...source, info: nextInfo }
  }

  const actions = {
    createVersion,
    updateVersion,
    deleteVersion,
    selectVersion: (versionId: string) => {
      setSelectedVersionId(versionId)
      setSelectedPresetId(versions.find((version) => version.id === versionId)?.presets[0]?.id ?? null)
    },
    selectPreset: setSelectedPresetId,
    createPreset,
    deletePreset,
    createRepoSource: (option: FeedOption) => createRepoSource(option),
    createRawSource,
    replaceRawSource,
  }

  const sidebarProps = {
    data: {
      versions,
      selectedVersionId,
      selectedPresetId,
      feedOptions: gtfsFeeds.options,
      feedLoading: gtfsFeeds.loading,
    },
    actions: {
      onCreateVersion: actions.createVersion,
      onUpdateVersion: actions.updateVersion,
      onDeleteVersion: actions.deleteVersion,
      onSelectVersion: actions.selectVersion,
      onSelectPreset: actions.selectPreset,
      onCreateRepoSource: actions.createRepoSource,
      onCreateRawSource: actions.createRawSource,
      onReplaceRawSource: actions.replaceRawSource,
      onCreatePreset: selectedVersion ? () => actions.createPreset(selectedVersion) : undefined,
    },
  }

  const editorProps = selectedVersion
    ? {
        version: selectedVersion,
        preset: selectedPreset,
        context,
        feedError: gtfsFeeds.error,
        onUpdateVersion: actions.updateVersion,
        onDeletePreset: selectedPreset ? () => actions.deletePreset(selectedVersion, selectedPreset) : undefined,
      }
    : null

  return {
    state: {
      selectedVersion,
    },
    props: {
      sidebar: sidebarProps,
      editor: editorProps,
    },
    actions,
  }
}
