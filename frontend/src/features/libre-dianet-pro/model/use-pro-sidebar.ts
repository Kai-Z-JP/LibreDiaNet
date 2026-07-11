import { useEffect, useMemo, useState } from 'react'
import type { FeedOption, ProGtfsSource, ProPreset, ProVersion } from '../../../types'
import type { FirebaseProUser, FirebaseWorkspaceMember, FirebaseWorkspaceSummary } from '../storage/firebase-pro-workspace-access'
import type { ProWorkspaceDescriptor } from '../storage/pro-workspace-storage'
import type { ProWorkspaceOpenMode } from '../storage/use-pro-workspace'

export type ProSidebarData = {
  versions: ProVersion[]
  selectedVersionId: string | null
  selectedPresetId: string | null
  feedOptions: FeedOption[]
  feedLoading: boolean
  workspace: {
    descriptor: ProWorkspaceDescriptor
    label: string
    busy: boolean
    error: string | null
    supportsFileSystemAccess: boolean
    firebaseUser: FirebaseProUser | null
    firebaseAuthLoading: boolean
    firebaseAuthReturn: boolean
    pendingInviteToken: string | null
  }
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
  onUseLocalWorkspace: (mode: ProWorkspaceOpenMode) => Promise<void>
  onChooseFileSystemWorkspace: (mode: ProWorkspaceOpenMode) => Promise<void>
  onUseFirebaseWorkspace: (workspaceId: string, workspaceName: string, mode: ProWorkspaceOpenMode) => Promise<void>
  onPrepareFirebaseAuth: () => Promise<FirebaseProUser | null>
  onSignInFirebase: () => Promise<void>
  onSignOutFirebase: () => Promise<void>
  onCreateFirebaseInvite: (email: string) => Promise<string>
  onListFirebaseMembers: () => Promise<FirebaseWorkspaceMember[]>
  onListFirebaseWorkspaces: () => Promise<FirebaseWorkspaceSummary[]>
  onAcceptFirebaseInvite: () => Promise<void>
}

export function useProSidebar(data: ProSidebarData, actions: ProSidebarActions) {
  const [versionSelectOpen, setVersionSelectOpen] = useState(true)
  const [versionSettingsOpen, setVersionSettingsOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [storageSettingsOpen, setStorageSettingsOpen] = useState(false)
  const selectedVersion = useMemo(
    () => data.versions.find((version) => version.id === data.selectedVersionId) ?? null,
    [data.selectedVersionId, data.versions],
  )

  useEffect(() => {
    if (data.workspace.pendingInviteToken || data.workspace.firebaseAuthReturn) {
      setStorageSettingsOpen(true)
    }
  }, [data.workspace.firebaseAuthReturn, data.workspace.pendingInviteToken])

  return {
    headerProps: {
      storageLabel: data.workspace.label,
      storageError: Boolean(data.workspace.error),
      onOpenStorage: () => setStorageSettingsOpen(true),
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
      open: versionSelectOpen && !data.workspace.busy && !storageSettingsOpen,
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
    storageSettingsDialogProps: {
      open: storageSettingsOpen,
      current: data.workspace.descriptor,
      currentLabel: data.workspace.label,
      busy: data.workspace.busy,
      error: data.workspace.error,
      supportsFileSystemAccess: data.workspace.supportsFileSystemAccess,
      firebaseUser: data.workspace.firebaseUser,
      firebaseAuthLoading: data.workspace.firebaseAuthLoading,
      firebaseAuthReturn: data.workspace.firebaseAuthReturn,
      pendingInviteToken: data.workspace.pendingInviteToken,
      onClose: () => setStorageSettingsOpen(false),
      onUseLocal: actions.onUseLocalWorkspace,
      onChooseFileSystem: actions.onChooseFileSystemWorkspace,
      onUseFirebase: actions.onUseFirebaseWorkspace,
      onPrepareFirebaseAuth: actions.onPrepareFirebaseAuth,
      onSignInFirebase: actions.onSignInFirebase,
      onSignOutFirebase: actions.onSignOutFirebase,
      onCreateFirebaseInvite: actions.onCreateFirebaseInvite,
      onListFirebaseMembers: actions.onListFirebaseMembers,
      onListFirebaseWorkspaces: actions.onListFirebaseWorkspaces,
      onAcceptFirebaseInvite: actions.onAcceptFirebaseInvite,
    },
  }
}
