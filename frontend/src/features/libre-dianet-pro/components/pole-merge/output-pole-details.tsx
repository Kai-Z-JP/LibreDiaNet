import DeleteIcon from '@mui/icons-material/Delete'
import { Box, Checkbox, FormControlLabel, IconButton, Typography } from '@mui/material'
import type { GtfsStop, ProPoleDetail, ProPreset } from '../../../../types'
import { proPoleStopKey, proStopDisplayLabel, sameProPoleStop } from '../../model/pro-pole-stop-helpers'
import type { ProConstructedRoute } from '../../model/pro-types'

export function OutputPoleDetails({
  preset,
  pole,
  stopMap,
  constructedRoutes,
  includeSourceNameInRoute,
  onUpdate,
}: {
  preset: ProPreset
  pole: ProPoleDetail
  stopMap: Record<string, GtfsStop>
  constructedRoutes: ProConstructedRoute[]
  includeSourceNameInRoute: boolean
  onUpdate: (preset: ProPreset) => void
}) {
  return (
    <Box onClick={(event) => event.stopPropagation()}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
        {pole.stops.map((stop) => (
          <OutputPoleStopChip
            key={proPoleStopKey(stop)}
            preset={preset}
            pole={pole}
            stop={stop}
            stopMap={stopMap}
            constructedRoutes={constructedRoutes}
            includeSourceNameInRoute={includeSourceNameInRoute}
            onUpdate={onUpdate}
          />
        ))}
      </Box>
      <PoleOverrideFlags preset={preset} pole={pole} onUpdate={onUpdate} />
    </Box>
  )
}

function OutputPoleStopChip({
  preset,
  pole,
  stop,
  stopMap,
  constructedRoutes,
  includeSourceNameInRoute,
  onUpdate,
}: {
  preset: ProPreset
  pole: ProPoleDetail
  stop: ProPoleDetail['stops'][number]
  stopMap: Record<string, GtfsStop>
  constructedRoutes: ProConstructedRoute[]
  includeSourceNameInRoute: boolean
  onUpdate: (preset: ProPreset) => void
}) {
  return (
    <Box
      sx={{
        px: 1,
        py: 0.25,
        backgroundColor: '#eaeef6',
        borderRadius: 1,
        display: 'flex',
        gap: 0.5,
        alignItems: 'center',
      }}
    >
      <Typography variant="body2">{proStopDisplayLabel(stop, stopMap, constructedRoutes, includeSourceNameInRoute)}</Typography>
      <IconButton size="small" sx={{ p: 0.25 }} onClick={() => removeStopFromPole(preset, pole, stop, onUpdate)}>
        <DeleteIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  )
}

function PoleOverrideFlags({ preset, pole, onUpdate }: { preset: ProPreset; pole: ProPoleDetail; onUpdate: (preset: ProPreset) => void }) {
  return (
    <>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
        <FormControlLabel
          label="網掛け"
          control={
            <Checkbox
              checked={pole.override.rowShading || pole.override.majorStop}
              onChange={(_, checked) => updatePoleFlags(preset, pole.id, { majorStop: false, rowShading: checked }, onUpdate)}
            />
          }
        />
        <FormControlLabel
          label="停留所名太字"
          control={
            <Checkbox
              checked={pole.override.stopNameBold || pole.override.majorStop}
              onChange={(_, checked) => updatePoleFlags(preset, pole.id, { majorStop: false, stopNameBold: checked }, onUpdate)}
            />
          }
        />
        <FormControlLabel
          label="横線"
          control={
            <Checkbox
              checked={pole.override.horizontalLine}
              onChange={(_, checked) => updatePoleFlag(preset, pole.id, 'horizontalLine', checked, onUpdate)}
            />
          }
        />
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
        <FormControlLabel
          label="上付二重線"
          control={
            <Checkbox
              checked={pole.override.branchStart}
              onChange={(_, checked) => updatePoleFlag(preset, pole.id, 'branchStart', checked, onUpdate)}
            />
          }
        />
        <FormControlLabel
          label="下付二重線"
          control={
            <Checkbox
              checked={pole.override.branchEnd}
              onChange={(_, checked) => updatePoleFlag(preset, pole.id, 'branchEnd', checked, onUpdate)}
            />
          }
        />
      </Box>
    </>
  )
}

function removeStopFromPole(
  preset: ProPreset,
  pole: ProPoleDetail,
  stop: ProPoleDetail['stops'][number],
  onUpdate: (preset: ProPreset) => void,
) {
  const nextPoles = preset.poles
    .map((item) =>
      item.id === pole.id
        ? {
            ...item,
            stops: item.stops.filter((current) => !sameProPoleStop(current, stop)),
          }
        : item,
    )
    .filter((item) => item.stops.length > 0)
  onUpdate({ ...preset, poles: nextPoles })
}

function updatePoleFlag(
  preset: ProPreset,
  poleId: string,
  flag: 'majorStop' | 'rowShading' | 'stopNameBold' | 'horizontalLine' | 'branchStart' | 'branchEnd',
  checked: boolean,
  onUpdate: (preset: ProPreset) => void,
) {
  updatePoleFlags(preset, poleId, { [flag]: checked }, onUpdate)
}

function updatePoleFlags(
  preset: ProPreset,
  poleId: string,
  flags: Partial<ProPoleDetail['override']>,
  onUpdate: (preset: ProPreset) => void,
) {
  onUpdate({
    ...preset,
    poles: preset.poles.map((item) => (item.id === poleId ? { ...item, override: { ...item.override, ...flags } } : item)),
  })
}
