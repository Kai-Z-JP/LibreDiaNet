import DeleteIcon from '@mui/icons-material/Delete'
import { Box, IconButton, Typography } from '@mui/material'

export function PoleStopChip({ label, onDelete }: { label: string; onDelete?: () => void }) {
  return (
    <Box
      sx={{
        px: 1,
        py: 0.25,
        backgroundColor: '#eaeef6',
        borderRadius: 1,
        display: 'flex',
        gap: 0.5,
        alignItems: 'center',
      }}
    >
      <Typography variant="body2">{label}</Typography>
      {onDelete && (
        <IconButton size="small" aria-label={`${label}を削除`} sx={{ p: 0.25 }} onClick={onDelete}>
          <DeleteIcon sx={{ fontSize: 16 }} />
        </IconButton>
      )}
    </Box>
  )
}
