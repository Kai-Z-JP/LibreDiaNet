import AddIcon from '@mui/icons-material/Add'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import type { ProVersion } from '../../../../types'

export function VersionSelectDialog({
  open,
  versions,
  selectedVersionId,
  onClose,
  onCreateVersion,
  onSelectVersion,
}: {
  open: boolean
  versions: ProVersion[]
  selectedVersionId: string | null
  onClose: () => void
  onCreateVersion: () => void
  onSelectVersion: (versionId: string) => void
}) {
  return (
    <Dialog open={open} maxWidth="sm" fullWidth onClose={onClose}>
      <DialogTitle>バージョン選択</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'grid', gap: 1, pt: 1 }}>
          {versions.map((version) => (
            <Button
              key={version.id}
              fullWidth
              variant={version.id === selectedVersionId ? 'contained' : 'text'}
              onClick={() => {
                onSelectVersion(version.id)
                onClose()
              }}
              sx={{ justifyContent: 'flex-start', p: 1 }}
            >
              <Box sx={{ textAlign: 'left' }}>
                <Typography>{version.name}</Typography>
                <Typography variant="body2" color={version.id === selectedVersionId ? 'inherit' : 'text.secondary'}>
                  {version.revisionDate} / {version.presets.length}プリセット
                </Typography>
              </Box>
            </Button>
          ))}
          {versions.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              バージョンがありません
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => {
            onCreateVersion()
            onClose()
          }}
        >
          バージョン作成
        </Button>
        <Button onClick={onClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  )
}
