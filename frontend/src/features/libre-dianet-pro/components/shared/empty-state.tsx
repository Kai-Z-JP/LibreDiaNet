import { Box, Typography } from '@mui/material'

export function EmptyState({ text }: { text: string }) {
  return (
    <Box sx={{ minHeight: 160, display: 'grid', placeItems: 'center', color: 'text.secondary' }}>
      <Typography>{text}</Typography>
    </Box>
  )
}
