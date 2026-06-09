import { useEffect, useState } from 'react'
import type { ProPresetContext } from '../../../types'
import { libreDiaNetRepository } from '../../libre-dianet/lib/repository'
import { useGtfsFeeds } from './use-gtfs-feeds'
import { useProSelection } from './use-pro-selection'
import { useProSourceFactory } from './use-pro-source-factory'
import { useProVersionStore } from './use-pro-version-store'

export function useLibreDiaNetProPage() {
  const [context] = useState<ProPresetContext>({ loading: false, handles: {}, errors: {} })
  const gtfsFeeds = useGtfsFeeds()
  const sourceFactory = useProSourceFactory()
  const versionStore = useProVersionStore({ onPresetCreated: (presetId) => selection.setSelectedPresetId(presetId) })
  const selection = useProSelection(versionStore.versions)

  useEffect(() => {
    return () => {
      void libreDiaNetRepository.closeAll()
    }
  }, [])

  const createVersion = () => {
    const version = versionStore.createVersion()
    selection.setSelectedVersionId(version.id)
    selection.setSelectedPresetId(null)
  }

  const actions = {
    createVersion,
    updateVersion: versionStore.updateVersion,
    deleteVersion: versionStore.deleteVersion,
    selectVersion: selection.selectVersion,
    selectPreset: selection.setSelectedPresetId,
    createPreset: versionStore.createPreset,
    deletePreset: versionStore.deletePreset,
    createRepoSource: sourceFactory.createRepoSource,
    createRawSource: sourceFactory.createRawSource,
    replaceRawSource: sourceFactory.replaceRawSource,
  }
  const selectedVersion = selection.selectedVersion
  const selectedPreset = selection.selectedPreset

  const sidebarProps = {
    data: {
      versions: versionStore.versions,
      selectedVersionId: selection.selectedVersionId,
      selectedPresetId: selection.selectedPresetId,
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
