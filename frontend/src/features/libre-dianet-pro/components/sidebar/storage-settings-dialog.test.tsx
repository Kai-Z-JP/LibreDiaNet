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

  it('confirms replacement and shows copy progress before closing', async () => {
    let copyLog: Parameters<StorageSettingsDialogProps['onUseFirebase']>[3]
    const onUseFirebase = vi.fn(async (_workspaceId, _workspaceName, _mode, nextCopyLog) => {
      copyLog = nextCopyLog
      copyLog?.({ level: 'info', message: 'SQLiteデータを確認しています（1件）' })
      copyLog?.({ level: 'success', message: 'コピーが完了しました' })
    })
    const onClose = vi.fn()

    render(
      <StorageSettingsDialog
        open
        current={{ kind: 'local' }}
        currentLabel="このブラウザ"
        busy={false}
        error={null}
        supportsFileSystemAccess
        firebaseUser={{
          uid: 'user-1',
          displayName: 'Test User',
          email: 'test@example.com',
          photoURL: null,
        }}
        firebaseAuthLoading={false}
        firebaseAuthReturn
        pendingInviteToken={null}
        onClose={onClose}
        onUseLocal={vi.fn()}
        onChooseFileSystem={vi.fn()}
        onUseFirebase={onUseFirebase}
        onPrepareFirebaseAuth={vi.fn().mockResolvedValue(null)}
        onSignInFirebase={vi.fn()}
        onSignOutFirebase={vi.fn()}
        onCreateFirebaseInvite={vi.fn()}
        onListFirebaseMembers={vi.fn().mockResolvedValue([])}
        onListFirebaseWorkspaces={vi.fn().mockResolvedValue([])}
        onAcceptFirebaseInvite={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '現在のデータをコピー' }))

    expect(onUseFirebase).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: '現在のデータをコピーしますか？' })).toBeInTheDocument()
    expect(screen.getByText(/コピー先のワークスペースデータは現在の内容で置き換えられます/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'コピーを開始' }))

    await waitFor(() => expect(onUseFirebase).toHaveBeenCalledOnce())
    expect(await screen.findByRole('log')).toHaveTextContent('SQLiteデータを確認しています（1件）')
    expect(screen.getByRole('log')).toHaveTextContent('コピーが完了しました')
    expect(screen.getByText('完了')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(copyLog).toBeTypeOf('function')
  })
})
