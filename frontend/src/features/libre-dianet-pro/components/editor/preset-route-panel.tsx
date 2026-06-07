import { Autocomplete, Box, TextField, Typography } from '@mui/material'
import type { ProPreset, ProRouteDetail, ProVersion } from '../../../../types'
import { proRouteOptionDisplayLabel, proRouteOptionMeta } from '../../model/pro-preview-display-helpers'
import { proRouteBaseKeyFromParts } from '../../model/pro-route-keys'
import type { ProRouteOption } from '../../model/pro-types'
import { fieldLabelProps } from '../../model/pro-ui-constants'

export function PresetRoutePanel({
  version,
  preset,
  routeOptions,
  onUpdate,
}: {
  version: ProVersion
  preset: ProPreset
  routeOptions: ProRouteOption[]
  onUpdate: (preset: ProPreset) => void
  onDelete?: () => void
}) {
  const selectedSources = version.gtfsSources.filter((source) => preset.sourceIds.includes(source.sourceId))
  const includeSourceNameInRoute = preset.sourceIds.length > 1
  const selectedOptions = preset.routes
    .map((route) =>
      routeOptions.find((option) => option.sourceId === route.sourceId && option.id === route.id && option.direction === route.direction),
    )
    .filter((option): option is ProRouteOption => Boolean(option))

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Autocomplete
        multiple
        disableCloseOnSelect
        options={version.gtfsSources}
        value={selectedSources}
        getOptionLabel={(source) => source.info.name ?? source.info.id}
        isOptionEqualToValue={(option, value) => option.sourceId === value.sourceId}
        onChange={(_, nextSources) => {
          const sourceIds = nextSources.map((source) => source.sourceId)
          onUpdate({
            ...preset,
            sourceIds,
            routes: preset.routes.filter((route) => sourceIds.includes(route.sourceId)),
            poles: preset.poles
              .map((pole) => ({ ...pole, stops: pole.stops.filter((stop) => sourceIds.includes(stop.sourceId)) }))
              .filter((pole) => pole.stops.length > 0),
            excludedStopPatterns: preset.excludedStopPatterns.filter(
              (pattern) => pattern.length !== 1 || sourceIds.some((sourceId) => pattern[0]?.startsWith(`${sourceId}::`)),
            ),
          })
        }}
        renderInput={(params) => <TextField {...params} label="プリセットで使用するGTFS" slotProps={{ inputLabel: fieldLabelProps }} />}
        slotProps={{ paper: { sx: { backgroundColor: 'white' } } }}
        sx={{ backgroundColor: 'white' }}
      />
      <Autocomplete
        multiple
        disableCloseOnSelect
        options={routeOptions.filter((option) => preset.sourceIds.includes(option.sourceId))}
        value={selectedOptions}
        getOptionLabel={(option) => proRouteOptionDisplayLabel(option, includeSourceNameInRoute)}
        isOptionEqualToValue={(option, value) => option.railwayCode === value.railwayCode}
        renderOption={(props, option) => (
          <Box component="li" {...props} key={option.railwayCode}>
            <Box sx={{ minWidth: 0 }}>
              <Typography>{includeSourceNameInRoute ? `${option.sourceName} / ${option.name}` : option.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {proRouteOptionMeta(option)}
              </Typography>
            </Box>
          </Box>
        )}
        onChange={(_, nextValue) =>
          onUpdate({
            ...preset,
            routes: nextValue.map(
              (option): ProRouteDetail => ({
                sourceId: option.sourceId,
                id: option.id,
                direction: option.direction,
              }),
            ),
            routeDisplayOverrides: preset.routeDisplayOverrides.filter((override) =>
              nextValue.some((option) =>
                override.routeKey.startsWith(`${proRouteBaseKeyFromParts(option.sourceId, option.id, option.direction)}::`),
              ),
            ),
          })
        }
        renderInput={(params) => <TextField {...params} label="路線" slotProps={{ inputLabel: fieldLabelProps }} />}
        slotProps={{ paper: { sx: { backgroundColor: 'white' } } }}
        sx={{ backgroundColor: 'white' }}
      />
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', pt: 1 }}>
        <TextField
          label="並び順"
          type="number"
          value={preset.index}
          onChange={(event) => onUpdate({ ...preset, index: Number(event.target.value) })}
          slotProps={{ inputLabel: fieldLabelProps }}
          sx={{ width: 140 }}
        />
      </Box>
    </Box>
  )
}
