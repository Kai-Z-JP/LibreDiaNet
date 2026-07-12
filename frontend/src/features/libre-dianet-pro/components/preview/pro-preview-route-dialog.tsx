import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import UndoIcon from '@mui/icons-material/Undo'
import type { Dispatch, SetStateAction } from 'react'
import type { ProPreset } from '../../../../types'
import type { ProRouteEditor } from '../../hooks/use-pro-preview-model'
import { fieldLabelProps } from '../../model/pro-ui-constants'

export function ProPreviewRouteDialog({
  editor,
  updateEditor,
  updateRouteDisplayOverride,
}: {
  editor: ProRouteEditor | null
  updateEditor: Dispatch<SetStateAction<ProRouteEditor | null>>
  updateRouteDisplayOverride: (
    routeKey: string,
    transform: (current: NonNullable<ProPreset['routeDisplayOverrides'][number]>) => ProPreset['routeDisplayOverrides'][number] | null,
    transformPreset?: (current: ProPreset) => ProPreset,
  ) => void
}) {
  return (
    <Dialog open={editor !== null} maxWidth="sm" fullWidth onClose={() => updateEditor(null)}>
      <DialogTitle>路線表示設定</DialogTitle>
      {editor && (
        <>
          <DialogContent>
            <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
              <Typography>{editor.routeLabel}</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 1, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  label="系統名欄"
                  value={editor.routeName}
                  onChange={(event) => updateEditor((current) => (current ? { ...current, routeName: event.target.value } : current))}
                  slotProps={{ inputLabel: fieldLabelProps }}
                  sx={{ backgroundColor: 'white' }}
                />
                <Tooltip title="系統名欄を元に戻す">
                  <span>
                    <IconButton
                      aria-label="系統名欄を元に戻す"
                      disabled={editor.routeName.trim() === editor.defaultRouteName.trim()}
                      onClick={() =>
                        updateEditor((current) =>
                          current
                            ? {
                                ...current,
                                routeName: current.defaultRouteName,
                              }
                            : current,
                        )
                      }
                    >
                      <UndoIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 1, alignItems: 'start' }}>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  label="行先欄"
                  value={editor.destination}
                  disabled={editor.useTripHeadsignAsDestination}
                  helperText="1行は通常表示、2行入力時のみ右欄 / 左欄に分かれます"
                  onChange={(event) => updateEditor((current) => (current ? { ...current, destination: event.target.value } : current))}
                  slotProps={{ inputLabel: fieldLabelProps }}
                  sx={{ backgroundColor: 'white' }}
                />
                <Tooltip title="行先欄を元に戻す">
                  <span>
                    <IconButton
                      aria-label="行先欄を元に戻す"
                      sx={{ mt: 1 }}
                      disabled={!editor.useTripHeadsignAsDestination && editor.destination.trim() === editor.defaultDestination.trim()}
                      onClick={() =>
                        updateEditor((current) =>
                          current
                            ? {
                                ...current,
                                destination: current.defaultDestination,
                                useTripHeadsignAsDestination: false,
                              }
                            : current,
                        )
                      }
                    >
                      <UndoIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editor.useTripHeadsignAsDestination}
                    onChange={(event) =>
                      updateEditor((current) => (current ? { ...current, useTripHeadsignAsDestination: event.target.checked } : current))
                    }
                  />
                }
                label="行先欄に Trip の headsign を使う"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                updateRouteDisplayOverride(editor.routeKey, () => null)
                updateEditor(null)
              }}
            >
              クリア
            </Button>
            <Button onClick={() => updateEditor(null)}>キャンセル</Button>
            <Button
              variant="contained"
              onClick={() => {
                const destination = editor.destination.trim()
                const defaultDestination = editor.defaultDestination.trim()
                const routeName = editor.routeName.trim()
                const defaultRouteName = editor.defaultRouteName.trim()
                const routeNameOverride = routeName === defaultRouteName ? null : routeName
                updateRouteDisplayOverride(editor.routeKey, (current) => ({
                  ...current,
                  routeNameOverride,
                  destinationOverride:
                    editor.useTripHeadsignAsDestination || !destination || destination === defaultDestination ? null : destination,
                  useTripHeadsignAsDestination: editor.useTripHeadsignAsDestination,
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
