import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TextField,
  Typography,
} from '@mui/material'
import type { Dispatch, SetStateAction } from 'react'
import type { ProPreset } from '../../../../types'
import type { ProStopCellEditor } from '../../hooks/use-pro-preview-model'
import { proPoleStopKey } from '../../model/pro-pole-stop-helpers'
import { fieldLabelProps } from '../../model/pro-ui-constants'
import { PoleStopChip } from '../shared/pole-stop-chip'

export function ProPreviewCellDialog({
  editor,
  updateEditor,
  updateRouteDisplayOverride,
}: {
  editor: ProStopCellEditor | null
  updateEditor: Dispatch<SetStateAction<ProStopCellEditor | null>>
  updateRouteDisplayOverride: (
    routeKey: string,
    transform: (current: NonNullable<ProPreset['routeDisplayOverrides'][number]>) => ProPreset['routeDisplayOverrides'][number] | null,
    transformPreset?: (current: ProPreset) => ProPreset,
  ) => void
}) {
  return (
    <Dialog open={editor !== null} maxWidth="sm" fullWidth onClose={() => updateEditor(null)}>
      <DialogTitle>セル上書き編集</DialogTitle>
      {editor && (
        <>
          <DialogContent>
            <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
              <Typography>{editor.routeLabel}</Typography>
              <Typography color="text.secondary">{editor.stopLabel}</Typography>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  紐づく標柱
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {editor.poleStops.map((stop) => (
                    <PoleStopChip
                      key={stop.key}
                      label={stop.label}
                      onDelete={() => {
                        updateEditor((current) =>
                          current ? { ...current, poleStops: current.poleStops.filter((poleStop) => poleStop.key !== stop.key) } : current,
                        )
                      }}
                    />
                  ))}
                </Box>
              </Box>
              <TextField
                fullWidth
                label="表示文字"
                value={editor.text}
                multiline={editor.useRowSpan}
                minRows={editor.useRowSpan ? 2 : undefined}
                maxRows={editor.useRowSpan ? 2 : undefined}
                helperText={editor.useRowSpan ? '複数セル縦書き時のみ改行できます。最大2行です' : '単一セルでは1行のみ入力できます'}
                onChange={(event) => updateEditor((current) => (current ? { ...current, text: event.target.value } : current))}
                slotProps={{ inputLabel: fieldLabelProps }}
                sx={{ backgroundColor: 'white' }}
              />
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {['…', '‖', '|', 'レ', '='].map((symbol) => (
                  <Button
                    key={symbol}
                    variant="outlined"
                    onClick={() => updateEditor((current) => (current ? { ...current, text: symbol } : current))}
                  >
                    {symbol}
                  </Button>
                ))}
              </Box>
              <FormControlLabel
                label="明朝体で表示する"
                control={
                  <Checkbox
                    checked={editor.mincho}
                    onChange={(_, checked) => updateEditor((current) => (current ? { ...current, mincho: checked } : current))}
                  />
                }
              />
              <FormControlLabel
                label="複数セルを跨いで縦書きにする"
                control={
                  <Checkbox
                    checked={editor.useRowSpan}
                    onChange={(_, checked) =>
                      updateEditor((current) =>
                        current
                          ? {
                              ...current,
                              useRowSpan: checked,
                              rowSpanText: checked ? (Number(current.rowSpanText) > 1 ? current.rowSpanText : '2') : '1',
                              text: checked ? current.text : (current.text.split(/\r?\n/)[0] ?? ''),
                            }
                          : current,
                      )
                    }
                  />
                }
              />
              {editor.useRowSpan && (
                <TextField
                  fullWidth
                  label="行数"
                  value={editor.rowSpanText}
                  helperText="プレビュー表の見えている行数をそのまま指定します"
                  onChange={(event) => updateEditor((current) => (current ? { ...current, rowSpanText: event.target.value } : current))}
                  slotProps={{ inputLabel: fieldLabelProps }}
                  sx={{ backgroundColor: 'white' }}
                />
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                updateRouteDisplayOverride(editor.routeKey, (current) => ({
                  ...current,
                  stopCellOverrides: current.stopCellOverrides.filter((override) => override.poleId !== editor.poleId),
                }))
                updateEditor(null)
              }}
            >
              クリア
            </Button>
            <Button onClick={() => updateEditor(null)}>キャンセル</Button>
            <Button
              variant="contained"
              disabled={!hasCellEditorChanges(editor)}
              onClick={() => {
                const text = editor.text.trim()
                const rowSpan = editor.useRowSpan ? Math.max(Number(editor.rowSpanText) || 2, 2) : 1
                const remainingPoleStopKeys = new Set(editor.poleStops.map((stop) => stop.key))
                const deletedPoleStopKeys = new Set(editor.originalPoleStopKeys.filter((key) => !remainingPoleStopKeys.has(key)))
                updateRouteDisplayOverride(
                  editor.routeKey,
                  (current) => ({
                    ...current,
                    stopCellOverrides: [
                      ...current.stopCellOverrides.filter((override) => override.poleId !== editor.poleId),
                      ...(text
                        ? [
                            {
                              poleId: editor.poleId,
                              text,
                              rowSpan,
                              mincho: editor.mincho,
                            },
                          ]
                        : []),
                    ],
                  }),
                  (current) => ({
                    ...current,
                    poles: current.poles.map((pole) =>
                      pole.id === editor.poleId
                        ? { ...pole, stops: pole.stops.filter((stop) => !deletedPoleStopKeys.has(proPoleStopKey(stop))) }
                        : pole,
                    ),
                  }),
                )
                updateEditor(null)
              }}
            >
              適用
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}

function hasCellEditorChanges(editor: ProStopCellEditor): boolean {
  const text = editor.text.trim()
  const rowSpan = editor.useRowSpan ? Math.max(Number(editor.rowSpanText) || 2, 2) : 1
  const currentPoleStopKeys = editor.poleStops.map((stop) => stop.key)

  return (
    text !== editor.originalText ||
    rowSpan !== editor.originalRowSpan ||
    editor.mincho !== editor.originalMincho ||
    currentPoleStopKeys.length !== editor.originalPoleStopKeys.length ||
    currentPoleStopKeys.some((key, index) => key !== editor.originalPoleStopKeys[index])
  )
}
