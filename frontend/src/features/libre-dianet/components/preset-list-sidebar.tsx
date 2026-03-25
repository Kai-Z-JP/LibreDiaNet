import { Alert, Box, ButtonBase, ButtonGroup, Card, Typography } from '@mui/material'
import type { FeedOption, RoutePresetV2 } from '../../../types'
import { CreateRawPresetDialog } from './create-raw-preset-dialog'
import { CreateRepoPresetDialog } from './create-repo-preset-dialog'

type Props = {
  presetList: RoutePresetV2[]
  selectedPresetId: string | null
  feedOptions: FeedOption[]
  feedLoading: boolean
  feedError: string | null
  onSelectPreset: (presetId: string) => void
  onCreateRepoPreset: (option: FeedOption) => void
  onCreateRawPreset: (file: File) => Promise<void>
}

export function PresetListSidebar({
  presetList,
  selectedPresetId,
  feedOptions,
  feedLoading,
  feedError,
  onSelectPreset,
  onCreateRepoPreset,
  onCreateRawPreset,
}: Props) {
  return (
    <Card
      sx={{
        width: { xs: '100%', lg: '33.3333%' },
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8f9ff',
        p: '16px',
        borderRadius: '16px',
        boxShadow: '8px 8px 16px rgba(0, 0, 0, 0.25)',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <h1>LibreDiaNet</h1>
      <ButtonGroup
        sx={{
          mb: 2,
          '@media (max-width: 720px)': {
            flexDirection: 'column',
          },
        }}
      >
        <CreateRepoPresetDialog disabled={feedLoading} options={feedOptions} onCreate={onCreateRepoPreset} />
        <CreateRawPresetDialog onCreate={onCreateRawPreset} />
      </ButtonGroup>
      {feedError && <Alert severity="warning">{feedError}</Alert>}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          p: '16px',
          backgroundColor: '#eaeef6',
          borderRadius: '8px',
          overflowY: 'auto',
          flex: 1,
          minHeight: 0,
        }}
      >
        {presetList.map((preset) => (
          <ButtonBase
            key={preset.id}
            onClick={() => onSelectPreset(preset.id)}
            sx={{
              backgroundColor: preset.id === selectedPresetId ? 'lightblue' : 'white',
              p: '8px',
              borderRadius: '4px',
              justifyContent: 'flex-start',
            }}
          >
            <Box>
              <Typography sx={{ textAlign: 'left' }}>{preset.name}</Typography>
              <Typography variant="body2" sx={{ textAlign: 'left', color: 'grey' }}>
                {preset.info.name ?? ''}
              </Typography>
            </Box>
          </ButtonBase>
        ))}
        {presetList.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            プリセットがありません
          </Typography>
        )}
      </Box>
    </Card>
  )
}
