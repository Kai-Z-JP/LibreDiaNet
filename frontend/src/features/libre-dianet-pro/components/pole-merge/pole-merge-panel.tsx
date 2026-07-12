import { DragDropContext } from '@hello-pangea/dnd'
import { Box } from '@mui/material'
import type { GtfsStop, ProPreset } from '../../../../types'
import { usePoleMergeModel } from '../../hooks/use-pole-merge-model'
import type { ProConstructedRoute } from '../../model/pro-types'
import { OutputPoleList } from './output-pole-list'
import { PolePatternList } from './pole-pattern-list'

export function PoleMergePanel({
  preset,
  constructedRoutes,
  stopMap,
  onUpdate,
}: {
  preset: ProPreset
  constructedRoutes: ProConstructedRoute[]
  stopMap: Record<string, GtfsStop>
  onUpdate: (preset: ProPreset) => void
}) {
  const { actions, props } = usePoleMergeModel({ preset, constructedRoutes, stopMap, onUpdate })

  return (
    <DragDropContext onDragEnd={actions.dragPole}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1fr)' },
          gridTemplateRows: { lg: 'minmax(0, 1fr)' },
          gap: 2,
          height: { lg: '100%' },
          minHeight: 0,
          overflow: { lg: 'hidden' },
        }}
      >
        <Box sx={{ minWidth: 0, minHeight: 0, overflowY: { lg: 'auto' } }}>
          <PolePatternList {...props.patternList} />
        </Box>
        <Box sx={{ minWidth: 0, minHeight: 0, overflowY: { lg: 'auto' } }}>
          <OutputPoleList {...props.outputPoleList} />
        </Box>
      </Box>
    </DragDropContext>
  )
}
