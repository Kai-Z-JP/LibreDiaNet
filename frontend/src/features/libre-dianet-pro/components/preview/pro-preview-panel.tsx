import DownloadIcon from '@mui/icons-material/Download'
import { Box, Button, MenuItem, TextField } from '@mui/material'
import type { GtfsStop, ProPreset, ProPresetContext, ProVersion } from '../../../../types'
import { useProPreviewModel } from '../../hooks/use-pro-preview-model'
import type { ProConstructedRoute } from '../../model/pro-types'
import { fieldLabelProps } from '../../model/pro-ui-constants'
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

  return (
    <ProPreviewStyleScope>
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', pt: 1 }}>
          <TextField
            select
            size="small"
            label="日種"
            value={props.controls.dayName}
            onChange={(event) => props.controls.onSelectDayName(event.target.value)}
            slotProps={{ inputLabel: fieldLabelProps }}
            sx={{ minWidth: 120, backgroundColor: 'white' }}
          >
            {['平日', '土曜', '休日'].map((name) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="日付"
            type="date"
            value={props.controls.date}
            onChange={(event) => props.controls.onChangeDate(event.target.value)}
            slotProps={{ inputLabel: fieldLabelProps }}
            sx={{ minWidth: 180, backgroundColor: 'white' }}
          />
          <Button
            startIcon={<DownloadIcon />}
            variant="contained"
            disabled={props.controls.exportDisabled || props.controls.downloading}
            onClick={() => void props.controls.onRequestXlsx()}
          >
            xlsx出力
          </Button>
        </Box>
        <ProPreviewTable {...props.table} />
        <ProPreviewEditorDialogs {...props.dialogs} />
      </Box>
    </ProPreviewStyleScope>
  )
}
