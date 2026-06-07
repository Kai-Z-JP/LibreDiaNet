import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import styled from '@emotion/styled'
import { IconButton, Tooltip, Typography } from '@mui/material'

export function SidebarHeader({ onOpenAbout }: { onOpenAbout: () => void }) {
  return (
    <HeaderRow>
      <Typography component="h1" variant="h5" sx={{ fontWeight: 700 }}>
        LibreDiaNet Pro
      </Typography>
      <Tooltip title="LibreDiaNetについて">
        <IconButton aria-label="LibreDiaNetについて" size="small" onClick={onOpenAbout} sx={{ flex: '0 0 auto' }}>
          <InfoOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
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
