import { DragDropContext, type OnDragEndResponder } from '@hello-pangea/dnd'
import { Box } from '@mui/material'
import type { Dispatch, SetStateAction } from 'react'
import type { GtfsStop, ProPreset } from '../../../../types'
import type { ProConstructedRoute, ProConstructedTrip } from '../../model/pro-types'
import { ProPreviewTableBody } from './pro-preview-table-body'
import { ProPreviewTableHead } from './pro-preview-table-head'

type RouteDisplayOverride = ProPreset['routeDisplayOverrides'][number]

export type ProPreviewTableProps = {
  data: {
    preset: ProPreset
    stopMap: Record<string, GtfsStop>
    constructedRoutes: ProConstructedRoute[]
    constructedTrips: ProConstructedTrip[]
    previewConstructedRoutes: ProConstructedRoute[]
    routeDisplayOverridesByKey: Record<string, RouteDisplayOverride | undefined>
    previewTimesByPatternKey: Record<string, string[]>
    previewTimesByTripKey: Record<string, string[]>
    hoveredTargetId: string | null
  }
  actions: {
    onDragEnd: OnDragEndResponder
    onHoverTarget: Dispatch<SetStateAction<string | null>>
    onOpenRouteEditor: (route: ProConstructedRoute, pattern: GtfsStop[]) => void
    onOpenPoleNameEditor: (pole: ProPreset['poles'][number], defaultName: string, defaultLocationName: string, defaultJoko: string) => void
    onOpenCellEditor: (route: ProConstructedRoute, pattern: GtfsStop[], pole: ProPreset['poles'][number], name: string) => void
  }
}

export function ProPreviewTable(props: ProPreviewTableProps) {
  return (
    <Box sx={{ mt: 2, overflow: 'auto' }}>
      <DragDropContext onDragEnd={props.actions.onDragEnd}>
        <table className="pro-preview-table">
          <ProPreviewTableHead {...props} />
          <ProPreviewTableBody {...props} />
        </table>
      </DragDropContext>
    </Box>
  )
}
