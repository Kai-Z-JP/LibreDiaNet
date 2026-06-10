import AddIcon from '@mui/icons-material/Add'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { Box, Button, IconButton, List, ListItem, ListItemButton, ListItemText, Tooltip, Typography } from '@mui/material'
import type { ProPreset, ProVersion } from '../../../../types'

export function PresetList({
  selectedVersion,
  selectedPresetId,
  onSelectPreset,
  onCreatePreset,
  onDuplicatePreset,
}: {
  selectedVersion: ProVersion | null
  selectedPresetId: string | null
  onSelectPreset: (presetId: string) => void
  onCreatePreset?: () => void
  onDuplicatePreset?: (preset: ProPreset) => void
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
        {selectedVersion?.presets
          .toSorted((a, b) => a.index - b.index)
          .map((preset) => (
            <ListItem
              key={preset.id}
              disablePadding
              secondaryAction={
                <Tooltip title="プリセットを複製">
                  <span>
                    <IconButton
                      edge="end"
                      size="small"
                      aria-label={`${preset.name} を複製`}
                      disabled={!onDuplicatePreset}
                      onClick={(event) => {
                        event.stopPropagation()
                        onDuplicatePreset?.(preset)
                      }}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              }
            >
              <ListItemButton
                selected={preset.id === selectedPresetId}
                onClick={() => onSelectPreset(preset.id)}
                sx={{
                  pr: 6,
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
            </ListItem>
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
