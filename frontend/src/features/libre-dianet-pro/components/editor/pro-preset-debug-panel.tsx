import styled from '@emotion/styled'
import { Typography } from '@mui/material'
import { useMemo } from 'react'
import type { ProPreset } from '../../../../types'
import { JsonTree, type JsonValue } from '../shared/json-tree'

export function ProPresetDebugPanel({ preset }: { preset: ProPreset }) {
  const value = useMemo(() => JSON.parse(JSON.stringify(preset)) as JsonValue, [preset])

  return (
    <DebugRoot>
      <DebugHeader>
        <Typography variant="h6">プリセット JSON</Typography>
        <Typography variant="body2" color="text.secondary">
          保存前のドラフト内容
        </Typography>
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
  align-items: baseline;
  gap: 8px 16px;
`
