import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined'
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import type { FirebaseProUser, FirebaseWorkspaceMember, FirebaseWorkspaceSummary } from '../../storage/firebase-pro-workspace-access'
import type { ProWorkspaceDescriptor } from '../../storage/pro-workspace-storage'
import type { ProWorkspaceOpenMode } from '../../storage/use-pro-workspace'

type StorageTarget = ProWorkspaceDescriptor['kind']

export type StorageSettingsDialogProps = {
  open: boolean
  current: ProWorkspaceDescriptor
  currentLabel: string
  busy: boolean
  error: string | null
  supportsFileSystemAccess: boolean
  firebaseUser: FirebaseProUser | null
  firebaseAuthLoading: boolean
  firebaseAuthReturn: boolean
  pendingInviteToken: string | null
  onClose: () => void
  onUseLocal: (mode: ProWorkspaceOpenMode) => Promise<void>
  onChooseFileSystem: (mode: ProWorkspaceOpenMode) => Promise<void>
  onUseFirebase: (workspaceId: string, workspaceName: string, mode: ProWorkspaceOpenMode) => Promise<void>
  onPrepareFirebaseAuth: () => Promise<FirebaseProUser | null>
  onSignInFirebase: () => Promise<void>
  onSignOutFirebase: () => Promise<void>
  onCreateFirebaseInvite: (email: string) => Promise<string>
  onListFirebaseMembers: () => Promise<FirebaseWorkspaceMember[]>
  onListFirebaseWorkspaces: () => Promise<FirebaseWorkspaceSummary[]>
  onAcceptFirebaseInvite: () => Promise<void>
}

export function StorageSettingsDialog({
  open,
  current,
  currentLabel,
  busy,
  error,
  supportsFileSystemAccess,
  firebaseUser,
  firebaseAuthLoading,
  firebaseAuthReturn,
  pendingInviteToken,
  onClose,
  onUseLocal,
  onChooseFileSystem,
  onUseFirebase,
  onPrepareFirebaseAuth,
  onSignInFirebase,
  onSignOutFirebase,
  onCreateFirebaseInvite,
  onListFirebaseMembers,
  onListFirebaseWorkspaces,
  onAcceptFirebaseInvite,
}: StorageSettingsDialogProps) {
  const [target, setTarget] = useState<StorageTarget>(current.kind)
  const [firebaseWorkspaceId, setFirebaseWorkspaceId] = useState(() =>
    current.kind === 'firebase' ? current.workspaceId : crypto.randomUUID(),
  )
  const [firebaseWorkspaceName, setFirebaseWorkspaceName] = useState(() =>
    current.kind === 'firebase' ? (current.name ?? 'LibreDiaNet Pro') : 'LibreDiaNet Pro',
  )
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [members, setMembers] = useState<FirebaseWorkspaceMember[]>([])
  const [firebaseWorkspaces, setFirebaseWorkspaces] = useState<FirebaseWorkspaceSummary[]>([])
  const [operationError, setOperationError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (open && target === 'firebase' && firebaseUser) {
      void onListFirebaseWorkspaces()
        .then((workspaces) => {
          if (!cancelled) {
            setFirebaseWorkspaces(workspaces)
          }
        })
        .catch((workspacesError: unknown) => {
          if (!cancelled) {
            setOperationError(workspacesError instanceof Error ? workspacesError.message : 'ワークスペース一覧を取得できませんでした')
          }
        })
    } else {
      setFirebaseWorkspaces([])
    }
    return () => {
      cancelled = true
    }
  }, [firebaseUser, onListFirebaseWorkspaces, open, target])

  useEffect(() => {
    if (!open) {
      return
    }
    setTarget(pendingInviteToken || firebaseAuthReturn ? 'firebase' : current.kind)
    if (current.kind === 'firebase') {
      setFirebaseWorkspaceId(current.workspaceId)
      setFirebaseWorkspaceName(current.name ?? 'LibreDiaNet Pro')
    }
    setOperationError(null)
  }, [current, firebaseAuthReturn, open, pendingInviteToken])

  useEffect(() => {
    if (open && target === 'firebase') {
      void onPrepareFirebaseAuth().catch((prepareError: unknown) => {
        setOperationError(prepareError instanceof Error ? prepareError.message : 'Firebase Auth を初期化できませんでした')
      })
    }
  }, [onPrepareFirebaseAuth, open, target])

  useEffect(() => {
    let cancelled = false
    if (open && target === 'firebase' && current.kind === 'firebase' && firebaseUser) {
      void onListFirebaseMembers()
        .then((nextMembers) => {
          if (!cancelled) {
            setMembers(nextMembers)
          }
        })
        .catch((membersError: unknown) => {
          if (!cancelled) {
            setOperationError(membersError instanceof Error ? membersError.message : 'メンバーを取得できませんでした')
          }
        })
    } else {
      setMembers([])
    }
    return () => {
      cancelled = true
    }
  }, [current.kind, firebaseUser, onListFirebaseMembers, open, target])

  const run = async (mode: ProWorkspaceOpenMode) => {
    setOperationError(null)
    try {
      if (target === 'local') {
        await onUseLocal(mode)
      } else if (target === 'file-system') {
        await onChooseFileSystem(mode)
      } else {
        await onUseFirebase(firebaseWorkspaceId, firebaseWorkspaceName, mode)
      }
      onClose()
    } catch (runError) {
      if (!(runError instanceof DOMException && runError.name === 'AbortError')) {
        setOperationError(runError instanceof Error ? runError.message : '保存先を切り替えられませんでした')
      }
    }
  }

  const signIn = async () => {
    setOperationError(null)
    try {
      await onSignInFirebase()
    } catch (signInError) {
      setOperationError(signInError instanceof Error ? signInError.message : 'Firebase にログインできませんでした')
    }
  }

  const signOut = async () => {
    setOperationError(null)
    try {
      await onSignOutFirebase()
      onClose()
    } catch (signOutError) {
      setOperationError(signOutError instanceof Error ? signOutError.message : 'Firebase からログアウトできませんでした')
    }
  }

  const createInvite = async () => {
    setOperationError(null)
    try {
      setInviteLink(await onCreateFirebaseInvite(inviteEmail))
    } catch (inviteError) {
      setOperationError(inviteError instanceof Error ? inviteError.message : '招待を作成できませんでした')
    }
  }

  const acceptInvite = async () => {
    setOperationError(null)
    try {
      await onAcceptFirebaseInvite()
      onClose()
    } catch (inviteError) {
      setOperationError(inviteError instanceof Error ? inviteError.message : '招待を受諾できませんでした')
    }
  }

  const copyInviteLink = async () => {
    setOperationError(null)
    try {
      await navigator.clipboard.writeText(inviteLink)
    } catch (copyError) {
      setOperationError(copyError instanceof Error ? copyError.message : '招待 URL をコピーできませんでした')
    }
  }

  const unchangedTarget =
    (target === 'local' && current.kind === 'local') ||
    (target === 'firebase' && current.kind === 'firebase' && firebaseWorkspaceId.trim() === current.workspaceId)
  const targetUnavailable = target === 'file-system' && !supportsFileSystemAccess
  const firebaseIdMissing = target === 'firebase' && !firebaseWorkspaceId.trim()
  const firebaseSignedOut = target === 'firebase' && !firebaseUser
  const selectedFirebaseWorkspace = firebaseWorkspaces.find((workspace) => workspace.workspaceId === firebaseWorkspaceId.trim())
  const currentMember = members.find((member) => member.uid === firebaseUser?.uid)
  const actionDisabled = busy || unchangedTarget || targetUnavailable || firebaseIdMissing || firebaseSignedOut

  const selectFirebaseWorkspace = (workspaceId: string) => {
    const workspace = firebaseWorkspaces.find((candidate) => candidate.workspaceId === workspaceId)
    if (workspace) {
      setFirebaseWorkspaceId(workspace.workspaceId)
      setFirebaseWorkspaceName(workspace.workspaceName)
      return
    }
    setFirebaseWorkspaceId(crypto.randomUUID())
    setFirebaseWorkspaceName('LibreDiaNet Pro')
  }

  return (
    <Dialog open={open} maxWidth="sm" fullWidth onClose={busy ? undefined : onClose}>
      <DialogTitle>保存先</DialogTitle>
      <DialogContent sx={{ overflowX: 'hidden' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            使用中: {currentLabel}
          </Typography>
          {(operationError || error) && (
            <Alert severity="error" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              {operationError || error}
            </Alert>
          )}
          <Tabs
            value={target}
            variant="fullWidth"
            onChange={(_, value: StorageTarget) => setTarget(value)}
            sx={{
              width: '100%',
              minWidth: 0,
              '& .MuiTab-root': { minWidth: 0, px: 0.5, letterSpacing: 0, textTransform: 'none' },
            }}
          >
            <Tab value="local" icon={<StorageOutlinedIcon />} iconPosition="top" label="ブラウザ" />
            <Tab value="file-system" icon={<FolderOutlinedIcon />} iconPosition="top" label="フォルダ" />
            <Tab value="firebase" icon={<CloudOutlinedIcon />} iconPosition="top" label="Firebase" />
          </Tabs>
          {target === 'local' && (
            <Box sx={{ py: 1 }}>
              <Typography>localStorage / OPFS</Typography>
            </Box>
          )}
          {target === 'file-system' && (
            <Box sx={{ py: 1 }}>
              {supportsFileSystemAccess ? (
                <Typography>ワークスペース JSON / SQLite</Typography>
              ) : (
                <Alert severity="warning">File System Access API を利用できません</Alert>
              )}
            </Box>
          )}
          {target === 'firebase' && (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 2 }}>
              {firebaseUser ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                  <Avatar src={firebaseUser.photoURL ?? undefined} sx={{ width: 36, height: 36 }}>
                    <AccountCircleOutlinedIcon />
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography noWrap>{firebaseUser.displayName || firebaseUser.email}</Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {firebaseUser.email}
                    </Typography>
                  </Box>
                  <Tooltip title="Firebase からログアウト">
                    <span>
                      <IconButton aria-label="Firebase からログアウト" disabled={firebaseAuthLoading} onClick={() => void signOut()}>
                        <LogoutOutlinedIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  disabled={firebaseAuthLoading}
                  startIcon={firebaseAuthLoading ? <CircularProgress size={16} /> : <AccountCircleOutlinedIcon />}
                  sx={{ textTransform: 'none' }}
                  onClick={() => void signIn()}
                >
                  Googleでログイン
                </Button>
              )}
              {pendingInviteToken && (
                <Alert
                  severity="info"
                  action={
                    <Button color="inherit" size="small" disabled={!firebaseUser || busy} onClick={() => void acceptInvite()}>
                      参加
                    </Button>
                  }
                >
                  ワークスペースへの招待があります
                </Alert>
              )}
              {firebaseUser && firebaseWorkspaces.length > 0 && (
                <TextField
                  select
                  label="参加中のワークスペース"
                  value={selectedFirebaseWorkspace?.workspaceId ?? ''}
                  onChange={(event) => selectFirebaseWorkspace(event.target.value)}
                  fullWidth
                >
                  <MenuItem value="">新しいワークスペース</MenuItem>
                  {firebaseWorkspaces.map((workspace) => (
                    <MenuItem key={workspace.workspaceId} value={workspace.workspaceId}>
                      {workspace.workspaceName} / {workspace.role === 'owner' ? 'オーナー' : '編集者'}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <TextField
                label="ワークスペース ID"
                value={firebaseWorkspaceId}
                onChange={(event) => setFirebaseWorkspaceId(event.target.value)}
                fullWidth
                autoComplete="off"
              />
              <TextField
                label="ワークスペース名"
                value={firebaseWorkspaceName}
                onChange={(event) => setFirebaseWorkspaceName(event.target.value)}
                disabled={Boolean(selectedFirebaseWorkspace)}
                fullWidth
                autoComplete="off"
              />
              {current.kind === 'firebase' && firebaseUser && (
                <>
                  <Divider />
                  <Typography variant="subtitle2">メンバー</Typography>
                  <Box sx={{ display: 'grid', gap: 1 }}>
                    {members.map((member) => (
                      <Box key={member.uid} sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                        <AccountCircleOutlinedIcon color="action" />
                        <Typography variant="body2" noWrap sx={{ minWidth: 0, flex: 1 }}>
                          {member.displayName || member.email}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {member.role === 'owner' ? 'オーナー' : '編集者'}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  {currentMember?.role === 'owner' && (
                    <>
                      <Typography variant="subtitle2">ワークスペース招待</Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', minWidth: 0 }}>
                        <TextField
                          label="招待するメールアドレス"
                          type="email"
                          value={inviteEmail}
                          onChange={(event) => setInviteEmail(event.target.value)}
                          fullWidth
                          sx={{ minWidth: 0 }}
                        />
                        <Button
                          variant="outlined"
                          disabled={!inviteEmail.trim() || busy}
                          sx={{ flexShrink: 0 }}
                          onClick={() => void createInvite()}
                        >
                          発行
                        </Button>
                      </Box>
                      {inviteLink && (
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', minWidth: 0 }}>
                          <TextField
                            label="招待 URL"
                            value={inviteLink}
                            fullWidth
                            sx={{ minWidth: 0 }}
                            slotProps={{ input: { readOnly: true } }}
                            onFocus={(event) => event.target.select()}
                          />
                          <Tooltip title="招待 URL をコピー">
                            <IconButton aria-label="招待 URL をコピー" onClick={() => void copyInviteLink()}>
                              <ContentCopyOutlinedIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </>
                  )}
                </>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap' }}>
        <Button disabled={actionDisabled} onClick={() => void run('open')}>
          既存データを開く
        </Button>
        <Button
          variant="contained"
          disabled={actionDisabled}
          startIcon={busy ? <CircularProgress color="inherit" size={16} /> : undefined}
          onClick={() => void run('copy')}
        >
          現在のデータをコピー
        </Button>
        <Tooltip title="閉じる">
          <span>
            <IconButton aria-label="閉じる" disabled={busy} onClick={onClose}>
              <CloseOutlinedIcon />
            </IconButton>
          </span>
        </Tooltip>
      </DialogActions>
    </Dialog>
  )
}
