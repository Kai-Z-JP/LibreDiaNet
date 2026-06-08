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
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import UndoIcon from '@mui/icons-material/Undo'
import type { Dispatch, SetStateAction } from 'react'
import type { ProPreset } from '../../../../types'
import type { ProPoleNameEditor } from '../../hooks/use-pro-preview-model'
import { fieldLabelProps } from '../../model/pro-ui-constants'

export function ProPreviewPoleNameDialog({
  preset,
  editor,
  updateEditor,
  onUpdate,
}: {
  preset: ProPreset
  editor: ProPoleNameEditor | null
  updateEditor: Dispatch<SetStateAction<ProPoleNameEditor | null>>
  onUpdate: (preset: ProPreset) => void
}) {
  return (
    <Dialog open={editor !== null} maxWidth="xs" fullWidth onClose={() => updateEditor(null)}>
      <DialogTitle>標柱設定</DialogTitle>
      {editor && (
        <>
          <DialogContent>
            <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                既定: {editor.defaultName}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 1, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  label="停留所名称"
                  value={editor.name}
                  onChange={(event) => updateEditor((current) => (current ? { ...current, name: event.target.value } : current))}
                  slotProps={{ inputLabel: fieldLabelProps }}
                  sx={{ backgroundColor: 'white' }}
                />
                <Tooltip title="停留所名称を元に戻す">
                  <span>
                    <IconButton
                      aria-label="停留所名称を元に戻す"
                      disabled={editor.name.trim() === editor.defaultName.trim()}
                      onClick={() =>
                        updateEditor((current) =>
                          current
                            ? {
                                ...current,
                                name: current.defaultName,
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
              <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 1, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  label="乗り場"
                  value={editor.locationName}
                  onChange={(event) => updateEditor((current) => (current ? { ...current, locationName: event.target.value } : current))}
                  slotProps={{ inputLabel: fieldLabelProps }}
                  sx={{ backgroundColor: 'white' }}
                />
                <Tooltip title="乗り場を元に戻す">
                  <span>
                    <IconButton
                      aria-label="乗り場を元に戻す"
                      disabled={editor.locationName.trim() === editor.defaultLocationName.trim()}
                      onClick={() =>
                        updateEditor((current) =>
                          current
                            ? {
                                ...current,
                                locationName: current.defaultLocationName,
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
              <TextField
                fullWidth
                select
                label="発着"
                value={editor.joko}
                onChange={(event) => updateEditor((current) => (current ? { ...current, joko: event.target.value } : current))}
                slotProps={{ inputLabel: fieldLabelProps }}
                sx={{ backgroundColor: 'white' }}
              >
                <MenuItem value="">自動</MenuItem>
                <MenuItem value="発">発</MenuItem>
                <MenuItem value="着">着</MenuItem>
              </TextField>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <FormControlLabel
                  label="網掛け"
                  control={
                    <Checkbox
                      checked={editor.rowShading}
                      onChange={(_, checked) => updateEditor((current) => (current ? { ...current, rowShading: checked } : current))}
                    />
                  }
                />
                <FormControlLabel
                  label="停留所名太字"
                  control={
                    <Checkbox
                      checked={editor.stopNameBold}
                      onChange={(_, checked) => updateEditor((current) => (current ? { ...current, stopNameBold: checked } : current))}
                    />
                  }
                />
                <FormControlLabel
                  label="横線"
                  control={
                    <Checkbox
                      checked={editor.horizontalLine}
                      onChange={(_, checked) => updateEditor((current) => (current ? { ...current, horizontalLine: checked } : current))}
                    />
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <FormControlLabel
                  label="上付二重線"
                  control={
                    <Checkbox
                      checked={editor.branchStart}
                      onChange={(_, checked) => updateEditor((current) => (current ? { ...current, branchStart: checked } : current))}
                    />
                  }
                />
                <FormControlLabel
                  label="下付二重線"
                  control={
                    <Checkbox
                      checked={editor.branchEnd}
                      onChange={(_, checked) => updateEditor((current) => (current ? { ...current, branchEnd: checked } : current))}
                    />
                  }
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                onUpdate({
                  ...preset,
                  poles: preset.poles.map((pole) =>
                    pole.id === editor.poleId
                      ? { ...pole, override: { ...pole.override, nameOverride: null, locationNameOverride: null, jokoOverride: null } }
                      : pole,
                  ),
                })
                updateEditor(null)
              }}
            >
              クリア
            </Button>
            <Button onClick={() => updateEditor(null)}>キャンセル</Button>
            <Button
              variant="contained"
              onClick={() => {
                const nextName = editor.name.trim()
                const defaultName = editor.defaultName.trim()
                const nextLocationName = editor.locationName.trim()
                const defaultLocationName = editor.defaultLocationName.trim()
                const nameOverride = nextName === defaultName ? null : nextName
                const locationNameOverride = nextLocationName === defaultLocationName ? null : nextLocationName
                onUpdate({
                  ...preset,
                  poles: preset.poles.map((pole) =>
                    pole.id === editor.poleId
                      ? {
                          ...pole,
                          override: {
                            ...pole.override,
                            nameOverride,
                            locationNameOverride,
                            jokoOverride: editor.joko === '発' || editor.joko === '着' ? editor.joko : null,
                            majorStop: false,
                            rowShading: editor.rowShading,
                            stopNameBold: editor.stopNameBold,
                            horizontalLine: editor.horizontalLine,
                            branchStart: editor.branchStart,
                            branchEnd: editor.branchEnd,
                          },
                        }
                      : pole,
                  ),
                })
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
