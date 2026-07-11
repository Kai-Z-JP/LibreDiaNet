import { useState } from 'react'
import type { ProPreset, ProPresetContext } from '../../../types'
import type { ProWorkspaceCopyLogger } from '../storage/pro-workspace-storage'
import type { ProWorkspaceController, ProWorkspaceOpenMode } from '../storage/use-pro-workspace'
import { useGtfsFeeds } from './use-gtfs-feeds'
import { useProSelection } from './use-pro-selection'
import { useProSourceFactory } from './use-pro-source-factory'
import { useProVersionStore } from './use-pro-version-store'

export function useLibreDiaNetProPage(workspace: ProWorkspaceController) {
  const [context] = useState<ProPresetContext>({ loading: false, handles: {}, errors: {} })
  const gtfsFeeds = useGtfsFeeds()
  const sourceFactory = useProSourceFactory()
  const versionStore = useProVersionStore({
    storage: workspace.storage,
    onPresetCreated: (presetId) => selection.setSelectedPresetId(presetId),
  })
  const selection = useProSelection(versionStore.versions)

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
    duplicatePreset: versionStore.duplicatePreset,
    deletePreset: versionStore.deletePreset,
    createRepoSource: sourceFactory.createRepoSource,
    createRawSource: sourceFactory.createRawSource,
    replaceRawSource: sourceFactory.replaceRawSource,
  }
  const selectedVersion = selection.selectedVersion
  const selectedPreset = selection.selectedPreset
  const currentStore = { version: 1 as const, versions: versionStore.versions }
  const useLocalWorkspace = (mode: ProWorkspaceOpenMode, copyLog?: ProWorkspaceCopyLogger) =>
    workspace.useLocalWorkspace(mode, currentStore, copyLog)
  const chooseFileSystemWorkspace = (mode: ProWorkspaceOpenMode, copyLog?: ProWorkspaceCopyLogger) =>
    workspace.chooseFileSystemWorkspace(mode, currentStore, copyLog)
  const useFirebaseWorkspace = (workspaceId: string, workspaceName: string, mode: ProWorkspaceOpenMode, copyLog?: ProWorkspaceCopyLogger) =>
    workspace.useFirebaseWorkspace(workspaceId, workspaceName, mode, currentStore, copyLog)

  const sidebarProps = {
    data: {
      versions: versionStore.versions,
      selectedVersionId: selection.selectedVersionId,
      selectedPresetId: selection.selectedPresetId,
      feedOptions: gtfsFeeds.options,
      feedLoading: gtfsFeeds.loading,
      workspace: {
        descriptor: workspace.descriptor,
        label: workspace.label,
        busy: workspace.restoring || workspace.switching || versionStore.loading,
        error: workspace.error ?? versionStore.error,
        supportsFileSystemAccess: workspace.supportsFileSystemAccess,
        firebaseUser: workspace.firebaseUser,
        firebaseAuthLoading: workspace.firebaseAuthLoading,
        firebaseAuthReturn: workspace.firebaseAuthReturn,
        pendingInviteToken: workspace.pendingInviteToken,
      },
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
      onDuplicatePreset: selectedVersion ? (preset: ProPreset) => actions.duplicatePreset(selectedVersion, preset) : undefined,
      onUseLocalWorkspace: useLocalWorkspace,
      onChooseFileSystemWorkspace: chooseFileSystemWorkspace,
      onUseFirebaseWorkspace: useFirebaseWorkspace,
      onPrepareFirebaseAuth: workspace.prepareFirebaseAuth,
      onSignInFirebase: workspace.signInFirebase,
      onSignOutFirebase: workspace.signOutFirebase,
      onCreateFirebaseInvite: workspace.createFirebaseInvite,
      onListFirebaseMembers: workspace.listFirebaseMembers,
      onListFirebaseWorkspaces: workspace.listFirebaseWorkspaces,
      onAcceptFirebaseInvite: () => workspace.acceptFirebaseInvite(currentStore),
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
      loading: workspace.restoring || versionStore.loading,
    },
    props: {
      sidebar: sidebarProps,
      editor: editorProps,
    },
    actions,
  }
}
