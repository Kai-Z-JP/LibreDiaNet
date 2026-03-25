import DeleteIcon from '@mui/icons-material/Delete'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField } from '@mui/material'
import { useState } from 'react'
import { todayIsoDate } from '../../../utils'

type Props = {
  disabled: boolean
  onSubmit: (dayMapping: [string, string][]) => Promise<void>
}

export function OutputDialog({ disabled, onSubmit }: Props) {
  const [open, setOpen] = useState(false)
  const [dayMapping, setDayMapping] = useState<[string, string][]>([])

  return (
    <>
      <Button variant="contained" disabled={disabled} onClick={() => setOpen(true)}>
        xlsx出力
      </Button>
      <Dialog open={open} maxWidth="md" fullWidth onClose={() => setOpen(false)}>
        <DialogTitle>出力するシートを設定してください</DialogTitle>
        <DialogContent>
          {dayMapping.map(([name, date], index) => (
            <Box key={`${name}-${index}`} className="day-mapping-row">
              <TextField
                label="シート名"
                value={name}
                onChange={(event) =>
                  setDayMapping((current) => current.map((item, itemIndex) => (itemIndex === index ? [event.target.value, item[1]] : item)))
                }
              />
              <TextField
                label="日付"
                type="date"
                value={date}
                onChange={(event) =>
                  setDayMapping((current) => current.map((item, itemIndex) => (itemIndex === index ? [item[0], event.target.value] : item)))
                }
              />
              <IconButton onClick={() => setDayMapping((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
          <Button fullWidth variant="outlined" onClick={() => setDayMapping((current) => [...current, ['', todayIsoDate()]])}>
            シートを追加
          </Button>
        </DialogContent>
        <DialogActions>
          <Button
            fullWidth
            variant="contained"
            disabled={dayMapping.length === 0}
            onClick={async () => {
              await onSubmit(dayMapping)
              setOpen(false)
            }}
          >
            作成
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
