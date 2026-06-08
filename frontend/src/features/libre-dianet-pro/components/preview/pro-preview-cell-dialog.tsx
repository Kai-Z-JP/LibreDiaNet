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
import { fieldLabelProps } from '../../model/pro-ui-constants'

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
              onClick={() => {
                const text = editor.text.trim()
                const rowSpan = editor.useRowSpan ? Math.max(Number(editor.rowSpanText) || 2, 2) : 1
                updateRouteDisplayOverride(editor.routeKey, (current) => ({
                  ...current,
                  stopCellOverrides: [
                    ...current.stopCellOverrides.filter((override) => override.poleId !== editor.poleId),
                    ...(text
                      ? [
                          {
                            poleId: editor.poleId,
                            text,
                            rowSpan,
                          },
                        ]
                      : []),
                  ],
                }))
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
