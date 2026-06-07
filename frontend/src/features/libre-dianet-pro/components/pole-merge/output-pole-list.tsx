import { Droppable } from '@hello-pangea/dnd'
import MergeIcon from '@mui/icons-material/Merge'
import { Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import type { Dispatch, SetStateAction } from 'react'
import type { GtfsStop, ProPreset } from '../../../../types'
import type { ProConstructedRoute } from '../../model/pro-types'
import { OutputPoleCard } from './output-pole-card'

type OutputPoleListProps = {
  data: {
    preset: ProPreset
    stopMap: Record<string, GtfsStop>
    constructedRoutes: ProConstructedRoute[]
    includeSourceNameInRoute: boolean
    poleOpenMap: Record<string, boolean>
    pendingMerge: {
      sourceNames: string[]
      targetNames: string[]
    } | null
  }
  actions: {
    onUpdate: (preset: ProPreset) => void
    onUpdatePoleOpenMap: Dispatch<SetStateAction<Record<string, boolean>>>
    onMergePolesByStopId: () => void
    onConfirmPendingMerge: () => void
    onCancelPendingMerge: () => void
  }
}

export function OutputPoleList({ data, actions }: OutputPoleListProps) {
  const { preset, stopMap, constructedRoutes, includeSourceNameInRoute, poleOpenMap, pendingMerge } = data
  const { onUpdate, onUpdatePoleOpenMap, onMergePolesByStopId, onConfirmPendingMerge, onCancelPendingMerge } = actions

  return (
    <Card variant="outlined" sx={{ p: 1, minHeight: 400 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography>出力標柱</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<MergeIcon />} onClick={onMergePolesByStopId}>
            自動統合
          </Button>
        </Box>
      </Box>
      <Droppable droppableId="pro-poles" isCombineEnabled>
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            sx={{
              display: 'grid',
              alignContent: 'start',
              gap: 1,
              minHeight: 320,
              p: 1,
              borderRadius: 1,
              backgroundColor: snapshot.isDraggingOver ? '#d8ecff' : '#f7f8fb',
              border: '1px dashed',
              borderColor: snapshot.isDraggingOver ? 'primary.main' : '#c4cad6',
            }}
          >
            {preset.poles.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                左の停留所をここへドラッグ
              </Typography>
            )}
            {preset.poles.map((pole, index) => (
              <OutputPoleCard
                key={pole.id}
                preset={preset}
                pole={pole}
                index={index}
                stopMap={stopMap}
                constructedRoutes={constructedRoutes}
                includeSourceNameInRoute={includeSourceNameInRoute}
                poleOpenMap={poleOpenMap}
                onUpdate={onUpdate}
                onUpdatePoleOpenMap={onUpdatePoleOpenMap}
              />
            ))}
            {provided.placeholder}
          </Box>
        )}
      </Droppable>
      <Dialog open={Boolean(pendingMerge)} maxWidth="xs" fullWidth onClose={onCancelPendingMerge}>
        <DialogTitle>異なる停留所名を統合</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1 }}>停留所名が異なる標柱を統合します。</Typography>
          <Typography variant="body2" color="text.secondary">
            統合先: {pendingMerge?.targetNames.join('、') || '-'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            追加: {pendingMerge?.sourceNames.join('、') || '-'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancelPendingMerge}>キャンセル</Button>
          <Button variant="contained" onClick={onConfirmPendingMerge}>
            統合
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}
