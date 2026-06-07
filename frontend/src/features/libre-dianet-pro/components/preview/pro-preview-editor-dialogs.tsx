import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import type { Dispatch, SetStateAction } from 'react'
import type { ProPreset } from '../../../../types'
import type { ProPoleNameEditor, ProPreviewPendingPoleMerge, ProRouteEditor, ProStopCellEditor } from '../../model/use-pro-preview-state'
import { ProPreviewCellDialog } from './pro-preview-cell-dialog'
import { ProPreviewPoleNameDialog } from './pro-preview-pole-name-dialog'
import { ProPreviewRouteDialog } from './pro-preview-route-dialog'

export function ProPreviewEditorDialogs({
  data,
  actions,
}: {
  data: {
    preset: ProPreset
    poleNameEditor: ProPoleNameEditor | null
    routeEditor: ProRouteEditor | null
    cellEditor: ProStopCellEditor | null
    pendingPoleMerge: ProPreviewPendingPoleMerge | null
  }
  actions: {
    updatePoleNameEditor: Dispatch<SetStateAction<ProPoleNameEditor | null>>
    updateRouteEditor: Dispatch<SetStateAction<ProRouteEditor | null>>
    updateCellEditor: Dispatch<SetStateAction<ProStopCellEditor | null>>
    updateRouteDisplayOverride: (
      routeKey: string,
      transform: (current: NonNullable<ProPreset['routeDisplayOverrides'][number]>) => ProPreset['routeDisplayOverrides'][number] | null,
    ) => void
    onUpdate: (preset: ProPreset) => void
    onConfirmPendingPoleMerge: () => void
    onCancelPendingPoleMerge: () => void
  }
}) {
  return (
    <>
      <ProPreviewPoleNameDialog
        preset={data.preset}
        editor={data.poleNameEditor}
        updateEditor={actions.updatePoleNameEditor}
        onUpdate={actions.onUpdate}
      />
      <ProPreviewRouteDialog
        editor={data.routeEditor}
        updateEditor={actions.updateRouteEditor}
        updateRouteDisplayOverride={actions.updateRouteDisplayOverride}
      />
      <ProPreviewCellDialog
        editor={data.cellEditor}
        updateEditor={actions.updateCellEditor}
        updateRouteDisplayOverride={actions.updateRouteDisplayOverride}
      />
      <Dialog open={Boolean(data.pendingPoleMerge)} onClose={actions.onCancelPendingPoleMerge} maxWidth="xs" fullWidth>
        <DialogTitle>異なる停留所名を統合</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1 }}>停留所名が異なる標柱を統合します。</Typography>
          <Typography variant="body2" color="text.secondary">
            統合先: {data.pendingPoleMerge?.targetNames.join('、') || '-'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            追加: {data.pendingPoleMerge?.sourceNames.join('、') || '-'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={actions.onCancelPendingPoleMerge}>キャンセル</Button>
          <Button variant="contained" onClick={actions.onConfirmPendingPoleMerge}>
            統合
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
