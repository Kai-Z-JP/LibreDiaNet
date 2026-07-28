import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined'
import styled from '@emotion/styled'
import { IconButton, Tooltip, Typography } from '@mui/material'

export function SidebarHeader({
  storageLabel,
  storageError,
  onOpenStorage,
  onOpenAbout,
}: {
  storageLabel: string
  storageError: boolean
  onOpenStorage: () => void
  onOpenAbout: () => void
}) {
  return (
    <HeaderRow>
      <Typography component="h1" variant="h5" sx={{ fontWeight: 700 }}>
        LibreDiaNet Pro
      </Typography>
      <HeaderActions>
        <Tooltip title={`保存先: ${storageLabel}`}>
          <IconButton aria-label="保存先" size="small" color={storageError ? 'error' : 'default'} onClick={onOpenStorage}>
            <StorageOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="LibreDiaNetについて">
          <IconButton aria-label="LibreDiaNetについて" size="small" onClick={onOpenAbout}>
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </HeaderActions>
    </HeaderRow>
  )
}

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 16px;
`

const HeaderActions = styled.div`
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
`
