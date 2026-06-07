import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import type { ProVersion } from '../../../../types'

export function DeleteVersionConfirmDialog({
  open,
  version,
  onClose,
  onDelete,
}: {
  open: boolean
  version: ProVersion | null
  onClose: () => void
  onDelete: () => void
}) {
  return (
    <Dialog open={open} maxWidth="xs" fullWidth onClose={onClose}>
      <DialogTitle>バージョン削除</DialogTitle>
      <DialogContent>
        <Typography>「{version?.name ?? 'このバージョン'}」を削除します。含まれるプリセットとGTFS設定も削除されます。</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button
          color="error"
          variant="contained"
          disabled={!version}
          onClick={() => {
            onDelete()
            onClose()
          }}
        >
          削除
        </Button>
      </DialogActions>
    </Dialog>
  )
}
