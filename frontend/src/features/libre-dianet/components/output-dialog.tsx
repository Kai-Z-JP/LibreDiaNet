import DeleteIcon from '@mui/icons-material/Delete'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import { useState } from 'react'
import type { DayMapping, GtfsServiceWeekday } from '../../../types'
import { todayIsoDate } from '../../../utils'

type Props = {
  disabled: boolean
  onSubmit: (dayMapping: DayMapping[]) => Promise<void>
}

const weekdays: { value: GtfsServiceWeekday; label: string }[] = [
  { value: 'monday', label: '月曜' },
  { value: 'tuesday', label: '火曜' },
  { value: 'wednesday', label: '水曜' },
  { value: 'thursday', label: '木曜' },
  { value: 'friday', label: '金曜' },
  { value: 'saturday', label: '土曜' },
  { value: 'sunday', label: '日曜' },
]

const valueFieldSx = { width: 180, flexShrink: 0 }

export function OutputDialog({ disabled, onSubmit }: Props) {
  const [open, setOpen] = useState(false)
  const [dayMapping, setDayMapping] = useState<DayMapping[]>([])

  const updateDayMapping = (index: number, nextItem: DayMapping) => {
    setDayMapping((current) => current.map((item, itemIndex) => (itemIndex === index ? nextItem : item)))
  }

  return (
    <>
      <Button variant="contained" disabled={disabled} onClick={() => setOpen(true)}>
        xlsx出力
      </Button>
      <Dialog open={open} maxWidth="md" fullWidth onClose={() => setOpen(false)}>
        <DialogTitle>出力するシートを設定してください</DialogTitle>
        <DialogContent>
          {dayMapping.map((item, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, marginBlock: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                label="シート名"
                value={item.name}
                onChange={(event) => updateDayMapping(index, { ...item, name: event.target.value })}
                sx={{ flexGrow: 1, minWidth: 160 }}
              />
              <ToggleButtonGroup
                exclusive
                size="small"
                value={item.type}
                onChange={(_, value: DayMapping['type'] | null) => {
                  if (value === 'date') {
                    updateDayMapping(index, { name: item.name, type: 'date', date: item.type === 'date' ? item.date : todayIsoDate() })
                  }
                  if (value === 'weekday') {
                    updateDayMapping(index, {
                      name: item.name,
                      type: 'weekday',
                      weekday: item.type === 'weekday' ? item.weekday : 'monday',
                    })
                  }
                }}
                sx={{
                  width: 112,
                  flexShrink: 0,
                  '& .MuiToggleButton-root': {
                    width: 56,
                  },
                }}
              >
                <ToggleButton value="weekday">日種</ToggleButton>
                <ToggleButton value="date">日付</ToggleButton>
              </ToggleButtonGroup>
              {item.type === 'weekday' ? (
                <TextField
                  select
                  label="曜日"
                  value={item.weekday}
                  onChange={(event) => updateDayMapping(index, { ...item, weekday: event.target.value as GtfsServiceWeekday })}
                  sx={valueFieldSx}
                >
                  {weekdays.map((weekday) => (
                    <MenuItem key={weekday.value} value={weekday.value}>
                      {weekday.label}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <TextField
                  label="日付"
                  type="date"
                  value={item.date}
                  onChange={(event) => updateDayMapping(index, { ...item, date: event.target.value })}
                  sx={valueFieldSx}
                />
              )}
              <IconButton onClick={() => setDayMapping((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
          <Button
            fullWidth
            variant="outlined"
            onClick={() => setDayMapping((current) => [...current, { name: '', type: 'date', date: todayIsoDate() }])}
          >
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
