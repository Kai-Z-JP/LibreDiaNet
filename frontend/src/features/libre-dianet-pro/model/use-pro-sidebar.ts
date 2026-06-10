import { useMemo, useState } from 'react'
import type { FeedOption, ProGtfsSource, ProPreset, ProVersion } from '../../../types'

export type ProSidebarData = {
  versions: ProVersion[]
  selectedVersionId: string | null
  selectedPresetId: string | null
  feedOptions: FeedOption[]
  feedLoading: boolean
}

export type ProSidebarActions = {
  onCreateVersion: () => void
  onUpdateVersion: (version: ProVersion) => void
  onDeleteVersion: (version: ProVersion) => void
  onSelectVersion: (versionId: string) => void
  onSelectPreset: (presetId: string) => void
  onCreateRepoSource: (option: FeedOption) => ProGtfsSource
  onCreateRawSource: (file: File) => Promise<ProGtfsSource>
  onReplaceRawSource: (source: ProGtfsSource, file: File) => Promise<ProGtfsSource>
  onCreatePreset?: () => void
  onDuplicatePreset?: (preset: ProPreset) => void
}

export function useProSidebar(data: ProSidebarData, actions: ProSidebarActions) {
  const [versionSelectOpen, setVersionSelectOpen] = useState(true)
  const [versionSettingsOpen, setVersionSettingsOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const selectedVersion = useMemo(
    () => data.versions.find((version) => version.id === data.selectedVersionId) ?? null,
    [data.selectedVersionId, data.versions],
  )

  return {
    headerProps: {
      onOpenAbout: () => setAboutOpen(true),
    },
    versionSelectorProps: {
      selectedVersion,
      onOpenSelect: () => setVersionSelectOpen(true),
      onOpenSettings: () => setVersionSettingsOpen(true),
    },
    presetListProps: {
      selectedVersion,
      selectedPresetId: data.selectedPresetId,
      onSelectPreset: actions.onSelectPreset,
      onCreatePreset: actions.onCreatePreset,
      onDuplicatePreset: actions.onDuplicatePreset,
    },
    versionSelectDialogProps: {
      open: versionSelectOpen,
      versions: data.versions,
      selectedVersionId: data.selectedVersionId,
      onClose: () => setVersionSelectOpen(false),
      onCreateVersion: actions.onCreateVersion,
      onSelectVersion: actions.onSelectVersion,
    },
    versionSettingsDialogProps: {
      open: versionSettingsOpen,
      selectedVersion,
      feedOptions: data.feedOptions,
      feedLoading: data.feedLoading,
      onClose: () => setVersionSettingsOpen(false),
      onCreateRepoSource: actions.onCreateRepoSource,
      onCreateRawSource: actions.onCreateRawSource,
      onReplaceRawSource: actions.onReplaceRawSource,
      onUpdateVersion: actions.onUpdateVersion,
      onDeleteVersion: actions.onDeleteVersion,
    },
    aboutDialogProps: {
      open: aboutOpen,
      onClose: () => setAboutOpen(false),
    },
  }
}
