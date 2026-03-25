import { Box, TextField } from '@mui/material'

export function SettingPanel({ indexValue, onChange }: { indexValue: number; onChange: (value: number) => void }) {
  return (
    <Box mt={2}>
      <TextField
        label="インデックス値"
        type="number"
        value={indexValue}
        sx={{ backgroundColor: 'white' }}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </Box>
  )
}
