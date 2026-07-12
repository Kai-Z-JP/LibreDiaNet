import styled from '@emotion/styled'
import DownloadIcon from '@mui/icons-material/Download'
import { Button, Typography } from '@mui/material'
import { useMemo } from 'react'
import type { ProPreset } from '../../../../types'
import { downloadBlob } from '../../../../utils'
import { JsonTree, type JsonValue } from '../shared/json-tree'
import { proPresetJsonFileName, serializeProPreset } from './pro-preset-json'

export function ProPresetDebugPanel({ preset }: { preset: ProPreset }) {
  const value = useMemo(() => JSON.parse(JSON.stringify(preset)) as JsonValue, [preset])

  return (
    <DebugRoot>
      <DebugHeader>
        <DebugTitle>
          <Typography variant="h6">プリセット JSON</Typography>
          <Typography variant="body2" color="text.secondary">
            保存前のドラフト内容
          </Typography>
        </DebugTitle>
        <Button
          size="small"
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => {
            downloadBlob(
              new Blob([serializeProPreset(preset)], { type: 'application/json;charset=utf-8' }),
              proPresetJsonFileName(preset.name),
            )
          }}
        >
          JSONをダウンロード
        </Button>
      </DebugHeader>
      <JsonTree name="preset" value={value} defaultOpen />
    </DebugRoot>
  )
}

const DebugRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
`

const DebugHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
`

const DebugTitle = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 16px;
`
