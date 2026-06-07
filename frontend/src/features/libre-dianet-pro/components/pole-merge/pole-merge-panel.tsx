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
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, minHeight: 0 }}>
        <PolePatternList {...props.patternList} />
        <OutputPoleList {...props.outputPoleList} />
      </Box>
    </DragDropContext>
  )
}
