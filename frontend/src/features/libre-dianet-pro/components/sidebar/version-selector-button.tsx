import SettingsIcon from '@mui/icons-material/Settings'
import { Box, Button, ButtonGroup, Tooltip, Typography } from '@mui/material'
import type { ProVersion } from '../../../../types'

export function VersionSelectorButton({
  selectedVersion,
  onOpenSelect,
  onOpenSettings,
}: {
  selectedVersion: ProVersion | null
  onOpenSelect: () => void
  onOpenSettings: () => void
}) {
  return (
    <ButtonGroup variant="contained" fullWidth>
      <Button onClick={onOpenSelect} sx={{ flex: 1, justifyContent: 'flex-start' }}>
        <Box sx={{ textAlign: 'left' }}>
          <Typography>{selectedVersion?.name ?? 'バージョン未選択'}</Typography>
          <Typography variant="body2">{selectedVersion?.revisionDate ?? 'バージョンを選択してください'}</Typography>
        </Box>
      </Button>
      <Tooltip title="バージョン設定">
        <span>
          <Button aria-label="バージョン設定" disabled={!selectedVersion} onClick={onOpenSettings} sx={{ height: '100%', minWidth: 48 }}>
            <SettingsIcon fontSize="small" />
          </Button>
        </span>
      </Tooltip>
    </ButtonGroup>
  )
}
