import { Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material'
import { useState } from 'react'
import type { FeedOption } from '../../../types'

type Props = {
  disabled: boolean
  options: FeedOption[]
  onCreate: (option: FeedOption) => void
}

export function CreateRepoPresetDialog({ disabled, options, onCreate }: Props) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<FeedOption | null>(null)

  return (
    <>
      <Button fullWidth variant="contained" disabled={disabled} onClick={() => setOpen(true)}>
        GTFSデータレポジトリから新しいプリセットを作成
      </Button>
      <Dialog open={open} maxWidth="sm" fullWidth onClose={() => setOpen(false)}>
        <DialogTitle>GTFSデータを選択してください</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={options}
            value={selected}
            onChange={(_, value) => setSelected(value)}
            isOptionEqualToValue={(option, value) => option.feedId === value.feedId && option.orgId === value.orgId}
            renderInput={(params) => <TextField {...params} label="GTFSデータ" margin="normal" sx={{ backgroundColor: 'white' }} />}
          />
        </DialogContent>
        <DialogActions>
          <Button
            fullWidth
            variant="contained"
            disabled={!selected}
            onClick={() => {
              if (!selected) {
                return
              }
              onCreate(selected)
              setSelected(null)
              setOpen(false)
            }}
          >
            新しいプリセットを作成
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
