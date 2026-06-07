import AddIcon from '@mui/icons-material/Add'
import styled from '@emotion/styled'
import { Box, Button, Typography } from '@mui/material'
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
      <PresetListBody>
        {selectedVersion?.presets.map((preset) => (
          <Button
            key={preset.id}
            variant={preset.id === selectedPresetId ? 'contained' : 'text'}
            onClick={() => onSelectPreset(preset.id)}
            sx={{
              justifyContent: 'flex-start',
              backgroundColor: preset.id === selectedPresetId ? undefined : 'white',
              borderRadius: 1,
              p: 1,
            }}
          >
            {preset.name}
          </Button>
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
      </PresetListBody>
    </>
  )
}

const PresetListBody = styled.div`
  display: flex;
  min-height: 0;
  overflow-y: auto;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
`
