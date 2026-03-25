import { Box, Card, CssBaseline, Typography } from '@mui/material'
import { PresetEditor } from './components/preset-editor'
import { PresetListSidebar } from './components/preset-list-sidebar'
import { useLibreDiaNetApp } from './hooks/use-libre-dianet-app'

export default function LibreDiaNetPage() {
  const app = useLibreDiaNetApp()
  const selectedPreset = app.selectedPreset

  return (
    <>
      <CssBaseline />
      <Box
        sx={{
          backgroundColor: '#f0f0f0',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: '16px',
            p: '16px',
            height: '100%',
            minHeight: 0,
            boxSizing: 'border-box',
            '@media (max-width: 1024px)': {
              flexDirection: 'column',
              overflowY: 'auto',
            },
          }}
        >
          <PresetListSidebar
            presetList={app.presetList}
            selectedPresetId={app.selectedPresetId}
            feedOptions={app.feedOptions}
            feedLoading={app.feedLoading}
            feedError={app.feedError}
            onSelectPreset={app.setSelectedPresetId}
            onCreateRepoPreset={app.createRepoPreset}
            onCreateRawPreset={app.createRawPreset}
          />
          <Card
            sx={{
              width: { xs: '100%', lg: '66.6667%' },
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
            {!selectedPreset ? (
              <Box
                sx={{
                  display: 'grid',
                  placeItems: 'center',
                  minHeight: '40vh',
                }}
              >
                <Typography>左側からプリセットを選択してください。</Typography>
              </Box>
            ) : (
              <PresetEditor
                preset={selectedPreset}
                context={app.presetContext}
                rawFile={app.selectedRawFile}
                onUpdate={app.updatePreset}
                onDelete={() => void app.deletePreset(selectedPreset)}
                onUpdateRawData={(file) => void app.updateRawPresetData(selectedPreset, file)}
              />
            )}
          </Card>
        </Box>
      </Box>
    </>
  )
}
