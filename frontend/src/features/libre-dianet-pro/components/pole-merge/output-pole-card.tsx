import { Draggable } from '@hello-pangea/dnd'
import DeleteIcon from '@mui/icons-material/Delete'
import { Box, Card, IconButton, Typography } from '@mui/material'
import type { Dispatch, SetStateAction } from 'react'
import type { GtfsStop, ProPoleDetail, ProPreset } from '../../../../types'
import { hasVisibleProOverride } from '../../model/pro-pole-stop-helpers'
import type { ProConstructedRoute } from '../../model/pro-types'
import { OutputPoleDetails } from './output-pole-details'

export function OutputPoleCard({
  preset,
  pole,
  index,
  stopMap,
  constructedRoutes,
  includeSourceNameInRoute,
  poleOpenMap,
  onUpdate,
  onUpdatePoleOpenMap,
}: {
  preset: ProPreset
  pole: ProPoleDetail
  index: number
  stopMap: Record<string, GtfsStop>
  constructedRoutes: ProConstructedRoute[]
  includeSourceNameInRoute: boolean
  poleOpenMap: Record<string, boolean>
  onUpdate: (preset: ProPreset) => void
  onUpdatePoleOpenMap: Dispatch<SetStateAction<Record<string, boolean>>>
}) {
  const primaryStop = pole.stops[0]
  const primary = primaryStop ? stopMap[`${primaryStop.sourceId}::${primaryStop.id}`] : null
  const open = poleOpenMap[pole.id] ?? (hasVisibleProOverride(pole) || pole.stops.length > 1)

  return (
    <Draggable draggableId={`pole-${pole.id}`} index={index}>
      {(draggableProvided, snapshot) => (
        <Card
          ref={draggableProvided.innerRef}
          {...draggableProvided.draggableProps}
          {...draggableProvided.dragHandleProps}
          variant="outlined"
          onClick={() => onUpdatePoleOpenMap((current) => ({ ...current, [pole.id]: !open }))}
          sx={{
            p: 1,
            backgroundColor: snapshot.combineTargetFor ? '#d8ecff' : 'white',
            boxShadow: snapshot.combineTargetFor ? 'inset 0 0 0 2px #1976d2' : undefined,
            cursor: 'pointer',
          }}
        >
          <OutputPoleSummary
            pole={pole}
            name={pole.override.nameOverride ?? primary?.name ?? pole.id}
            open={open}
            onUpdate={onUpdate}
            preset={preset}
          />
          {open && (
            <OutputPoleDetails
              pole={pole}
              preset={preset}
              stopMap={stopMap}
              constructedRoutes={constructedRoutes}
              includeSourceNameInRoute={includeSourceNameInRoute}
              onUpdate={onUpdate}
            />
          )}
        </Card>
      )}
    </Draggable>
  )
}

function OutputPoleSummary({
  preset,
  pole,
  name,
  open,
  onUpdate,
}: {
  preset: ProPreset
  pole: ProPoleDetail
  name: string
  open: boolean
  onUpdate: (preset: ProPreset) => void
}) {
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography sx={{ flex: 1 }}>{name}</Typography>
      {!open && pole.stops.length > 1 && (
        <Typography variant="body2" color="text.secondary">
          {pole.stops.length}件
        </Typography>
      )}
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
