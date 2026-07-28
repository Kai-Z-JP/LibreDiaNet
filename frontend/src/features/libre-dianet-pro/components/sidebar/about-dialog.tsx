import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import { aboutLibreDiaNetText } from '../../model/pro-ui-constants'

export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} maxWidth="sm" fullWidth onClose={onClose}>
      <DialogTitle>LibreDiaNetについて</DialogTitle>
      <DialogContent>
        <Typography
          component="div"
          color="text.secondary"
          sx={{ pt: 1, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.7 }}
          dangerouslySetInnerHTML={{ __html: aboutLibreDiaNetText.replace(/\n/g, '<br>') }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  )
}
