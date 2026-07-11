import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StorageSettingsDialog, type StorageSettingsDialogProps } from './storage-settings-dialog'

describe('StorageSettingsDialog', () => {
  it('shows invitations and the signed-in users workspaces', async () => {
    const onListFirebaseWorkspaces = vi.fn().mockResolvedValue([
      {
        workspaceId: 'shared-workspace',
        workspaceName: 'Shared timetable',
        role: 'editor',
      },
    ])
    const props: StorageSettingsDialogProps = {
      open: true,
      current: { kind: 'local' },
      currentLabel: 'このブラウザ',
      busy: false,
      error: null,
      supportsFileSystemAccess: true,
      firebaseUser: {
        uid: 'user-1',
        displayName: 'Test User',
        email: 'test@example.com',
        photoURL: null,
      },
      firebaseAuthLoading: false,
      firebaseAuthReturn: false,
      pendingInviteToken: 'invite-token',
      onClose: vi.fn(),
      onUseLocal: vi.fn(),
      onChooseFileSystem: vi.fn(),
      onUseFirebase: vi.fn(),
      onPrepareFirebaseAuth: vi.fn().mockResolvedValue(null),
      onSignInFirebase: vi.fn(),
      onSignOutFirebase: vi.fn(),
      onCreateFirebaseInvite: vi.fn(),
      onListFirebaseMembers: vi.fn().mockResolvedValue([]),
      onListFirebaseWorkspaces,
      onAcceptFirebaseInvite: vi.fn(),
    }

    render(<StorageSettingsDialog {...props} />)

    expect(await screen.findByRole('button', { name: '参加' })).toBeEnabled()
    expect(await screen.findByRole('combobox', { name: '参加中のワークスペース' })).toBeInTheDocument()
    await waitFor(() => expect(onListFirebaseWorkspaces).toHaveBeenCalledOnce())

    fireEvent.mouseDown(screen.getByRole('combobox', { name: '参加中のワークスペース' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Shared timetable / 編集者' }))
    expect(screen.getByRole('textbox', { name: 'ワークスペース ID' })).toHaveValue('shared-workspace')
  })
})
