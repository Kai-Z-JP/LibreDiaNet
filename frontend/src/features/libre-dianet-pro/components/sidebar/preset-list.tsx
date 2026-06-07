import AddIcon from '@mui/icons-material/Add'
import { Box, Button, List, ListItemButton, ListItemText, Typography } from '@mui/material'
import type { ProVersion } from '../../../../types'

export function PresetList({
  selectedVersion,
  selectedPresetId,
  onSelectPreset,
  onCreatePreset,
}: {
  selectedVersion: ProVersion | null
  selectedPresetId: string | null
  onSelectPreset: (presetId: string) => void
  onCreatePreset?: () => void
}) {
  return (
    <>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center' }}>
        <Typography variant="h6">プリセット</Typography>
        <Button size="small" startIcon={<AddIcon />} disabled={!onCreatePreset} onClick={onCreatePreset}>
          作成
        </Button>
      </Box>
      <List
        dense
        disablePadding
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          mt: 1,
          bgcolor: '#fff',
          borderRadius: 1,
        }}
      >
        {selectedVersion?.presets.map((preset) => (
          <ListItemButton
            key={preset.id}
            selected={preset.id === selectedPresetId}
            onClick={() => onSelectPreset(preset.id)}
            sx={{
              '&.Mui-selected': {
                bgcolor: 'lightblue',
              },
              '&.Mui-selected:hover': {
                bgcolor: 'lightblue',
              },
            }}
          >
            <ListItemText primary={preset.name} />
          </ListItemButton>
        ))}
        {selectedVersion && selectedVersion.presets.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
            このバージョンにはプリセットがありません
          </Typography>
        )}
        {!selectedVersion && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
            バージョンを選択してください
          </Typography>
        )}
      </List>
    </>
  )
}
