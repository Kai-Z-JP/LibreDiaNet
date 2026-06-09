import { Draggable } from '@hello-pangea/dnd'
import DeleteIcon from '@mui/icons-material/Delete'
import { Box, Card, IconButton, Typography } from '@mui/material'
import { memo, useState } from 'react'
import type { GtfsStop, ProPoleDetail, ProPreset } from '../../../../types'
import { hasVisibleProOverride, type ProRoutePatternMap } from '../../model/pro-pole-stop-helpers'
import type { ProConstructedRoute } from '../../model/pro-types'
import { OutputPoleDetails } from './output-pole-details'

export const OutputPoleCard = memo(function OutputPoleCard({
  preset,
  pole,
  index,
  stopMap,
  constructedRoutes,
  routePatternMap,
  includeSourceNameInRoute,
  onUpdate,
}: {
  preset: ProPreset
  pole: ProPoleDetail
  index: number
  stopMap: Record<string, GtfsStop>
  constructedRoutes: ProConstructedRoute[]
  routePatternMap: ProRoutePatternMap
  includeSourceNameInRoute: boolean
  onUpdate: (preset: ProPreset) => void
}) {
  const [manualOpen, setManualOpen] = useState<boolean | null>(null)
  const open = manualOpen ?? hasVisibleProOverride(pole)
  const primaryStop = pole.stops[0]
  const primary = primaryStop ? stopMap[`${primaryStop.sourceId}::${primaryStop.id}`] : null

  return (
    <Draggable draggableId={`pole-${pole.id}`} index={index}>
      {(draggableProvided, snapshot) => (
        <Card
          ref={draggableProvided.innerRef}
          {...draggableProvided.draggableProps}
          {...draggableProvided.dragHandleProps}
          variant="outlined"
          onClick={() => setManualOpen(!open)}
          sx={{
            p: 1,
            backgroundColor: snapshot.combineTargetFor ? '#d8ecff' : 'white',
            boxShadow: snapshot.combineTargetFor ? 'inset 0 0 0 2px #1976d2' : undefined,
            cursor: 'pointer',
          }}
        >
          <OutputPoleSummary pole={pole} name={primary?.name ?? pole.id} onUpdate={onUpdate} preset={preset} />
          {open && (
            <OutputPoleDetails
              pole={pole}
              preset={preset}
              stopMap={stopMap}
              constructedRoutes={constructedRoutes}
              routePatternMap={routePatternMap}
              includeSourceNameInRoute={includeSourceNameInRoute}
              onUpdate={onUpdate}
            />
          )}
        </Card>
      )}
    </Draggable>
  )
})

function OutputPoleSummary({
  preset,
  pole,
  name,
  onUpdate,
}: {
  preset: ProPreset
  pole: ProPoleDetail
  name: string
  onUpdate: (preset: ProPreset) => void
}) {
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography sx={{ flex: 1 }}>{name}</Typography>
      <Typography variant="body2" color="text.secondary">
        {pole.stops.length}標柱
      </Typography>
      <IconButton
        size="small"
        onClick={(event) => {
          event.stopPropagation()
          onUpdate({ ...preset, poles: preset.poles.filter((item) => item.id !== pole.id) })
        }}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  )
}
