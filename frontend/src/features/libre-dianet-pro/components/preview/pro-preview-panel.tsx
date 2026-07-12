import { Alert, Box, Button, FormControlLabel, MenuItem, Switch, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material'
import type { GtfsServiceWeekday, GtfsStop, ProPreset, ProPresetContext, ProVersion } from '../../../../types'
import type { ProPreviewMode } from '../../model/use-pro-preview-state'
import { useProPreviewModel } from '../../hooks/use-pro-preview-model'
import type { ProConstructedRoute } from '../../model/pro-types'
import { fieldLabelProps } from '../../model/pro-ui-constants'
import { OutputDialog } from '../../../libre-dianet/components/output-dialog'
import { ProPreviewEditorDialogs } from './pro-preview-editor-dialogs'
import { ProPreviewStyleScope } from './pro-preview-styles'
import { ProPreviewTable } from './pro-preview-table'

export function ProPreviewPanel({
  version,
  preset,
  context,
  constructedRoutes,
  stopMap,
  sourceNameMap,
  onUpdate,
}: {
  version: ProVersion
  preset: ProPreset
  context: ProPresetContext
  constructedRoutes: ProConstructedRoute[]
  stopMap: Record<string, GtfsStop>
  sourceNameMap: Record<string, string>
  onUpdate: (preset: ProPreset) => void
}) {
  const { props } = useProPreviewModel({
    version,
    preset,
    context,
    constructedRoutes,
    stopMap,
    sourceNameMap,
    onUpdate,
  })

  const previewModes: { value: ProPreviewMode; label: string }[] = [
    { value: 'day-type', label: '日種' },
    { value: 'specific-date', label: '日付' },
    { value: 'all-days', label: '全日' },
  ]
  const weekdays: { value: GtfsServiceWeekday; label: string }[] = [
    { value: 'monday', label: '月曜' },
    { value: 'tuesday', label: '火曜' },
    { value: 'wednesday', label: '水曜' },
    { value: 'thursday', label: '木曜' },
    { value: 'friday', label: '金曜' },
    { value: 'saturday', label: '土曜' },
    { value: 'sunday', label: '日曜' },
  ]

  return (
    <ProPreviewStyleScope>
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', pt: 1 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={props.controls.previewMode}
            onChange={(_, value: ProPreviewMode | null) => {
              if (value) {
                props.controls.onSelectPreviewMode(value)
              }
            }}
            sx={{ flexShrink: 0, '& .MuiToggleButton-root': { width: 56 } }}
          >
            {previewModes.map((mode) => (
              <ToggleButton key={mode.value} value={mode.value}>
                {mode.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {props.controls.previewMode === 'day-type' && (
            <TextField
              select
              size="small"
              label="曜日"
              value={props.controls.weekday}
              onChange={(event) => props.controls.onSelectWeekday(event.target.value as GtfsServiceWeekday)}
              slotProps={{ inputLabel: fieldLabelProps }}
              sx={{ minWidth: 180, backgroundColor: 'white' }}
            >
              {weekdays.map((weekday) => (
                <MenuItem key={weekday.value} value={weekday.value}>
                  {weekday.label}
                </MenuItem>
              ))}
            </TextField>
          )}
          {props.controls.previewMode === 'specific-date' && (
            <TextField
              size="small"
              label="日付"
              type="date"
              value={props.controls.date}
              onChange={(event) => props.controls.onChangeDate(event.target.value)}
              slotProps={{ inputLabel: fieldLabelProps }}
              sx={{ minWidth: 180, backgroundColor: 'white' }}
            />
          )}
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={props.controls.showStaticPatterns}
                onChange={(event) => props.controls.onToggleStaticPatterns(event.target.checked)}
              />
            }
            label="静的パターン"
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={props.controls.showActualTimetable}
                onChange={(event) => props.controls.onToggleActualTimetable(event.target.checked)}
              />
            }
            label="実時刻表"
          />
          <Box sx={{ marginLeft: 'auto', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              disabled={props.controls.exportDisabled || props.controls.inddExporting || props.controls.downloading}
              onClick={() => void props.controls.onRequestInddJson()}
            >
              InDesign用JSON出力
            </Button>
            <OutputDialog
              disabled={props.controls.exportDisabled || props.controls.downloading || props.controls.inddExporting}
              onSubmit={props.controls.onRequestXlsx}
            />
          </Box>
        </Box>
        {props.controls.inddExportError && <Alert severity="error">{props.controls.inddExportError}</Alert>}
        <ProPreviewTable {...props.table} />
        <ProPreviewEditorDialogs {...props.dialogs} />
      </Box>
    </ProPreviewStyleScope>
  )
}
