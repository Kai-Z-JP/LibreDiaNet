import DeleteIcon from '@mui/icons-material/Delete'
import { Box, Chip, IconButton, Typography } from '@mui/material'
import type { GtfsStop, ProPoleDetail, ProPreset } from '../../../../types'
import { proPoleStopKey, proStopDisplayLabel, sameProPoleStop, type ProRoutePatternMap } from '../../model/pro-pole-stop-helpers'
import type { ProConstructedRoute } from '../../model/pro-types'

export function OutputPoleDetails({
  preset,
  pole,
  stopMap,
  constructedRoutes,
  routePatternMap,
  includeSourceNameInRoute,
  onUpdate,
}: {
  preset: ProPreset
  pole: ProPoleDetail
  stopMap: Record<string, GtfsStop>
  constructedRoutes: ProConstructedRoute[]
  routePatternMap: ProRoutePatternMap
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
            routePatternMap={routePatternMap}
            includeSourceNameInRoute={includeSourceNameInRoute}
            onUpdate={onUpdate}
          />
        ))}
      </Box>
      <PoleTextOverrides pole={pole} />
      <PoleOverrideFlags pole={pole} />
    </Box>
  )
}

function OutputPoleStopChip({
  preset,
  pole,
  stop,
  stopMap,
  constructedRoutes,
  routePatternMap,
  includeSourceNameInRoute,
  onUpdate,
}: {
  preset: ProPreset
  pole: ProPoleDetail
  stop: ProPoleDetail['stops'][number]
  stopMap: Record<string, GtfsStop>
  constructedRoutes: ProConstructedRoute[]
  routePatternMap: ProRoutePatternMap
  includeSourceNameInRoute: boolean
  onUpdate: (preset: ProPreset) => void
}) {
  const stopKey = proPoleStopKey(stop)

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
      <Typography variant="body2">
        {proStopDisplayLabel(stop, stopMap, constructedRoutes, includeSourceNameInRoute, routePatternMap[stopKey] ?? null)}
      </Typography>
      <IconButton size="small" sx={{ p: 0.25 }} onClick={() => removeStopFromPole(preset, pole, stop, onUpdate)}>
        <DeleteIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  )
}

function PoleTextOverrides({ pole }: { pole: ProPoleDetail }) {
  const overrides = [
    { label: '標柱名', value: pole.override.nameOverride },
    { label: 'のりば名', value: pole.override.locationNameOverride },
    { label: '発着', value: pole.override.jokoOverride },
  ].filter((override): override is { label: string; value: string } => override.value !== null)

  if (overrides.length === 0) {
    return null
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
      {overrides.map((override) => (
        <Chip
          key={override.label}
          size="small"
          variant="outlined"
          color="warning"
          label={`出力${override.label}: ${override.value === '' ? '空欄' : override.value}`}
        />
      ))}
    </Box>
  )
}

function PoleOverrideFlags({ pole }: { pole: ProPoleDetail }) {
  const flags = [
    pole.override.rowShading || pole.override.majorStop ? '網掛け' : null,
    pole.override.stopNameBold || pole.override.majorStop ? '停留所名太字' : null,
    pole.override.horizontalLine ? '横線' : null,
    pole.override.branchStart ? '上付二重線' : null,
    pole.override.branchEnd ? '下付二重線' : null,
  ].filter((flag): flag is string => flag !== null)

  if (flags.length === 0) {
    return null
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
      {flags.map((flag) => (
        <Chip key={flag} size="small" variant="outlined" color="warning" label={flag} />
      ))}
    </Box>
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
  onUpdate({ ...preset, poles: nextPoles })
}
