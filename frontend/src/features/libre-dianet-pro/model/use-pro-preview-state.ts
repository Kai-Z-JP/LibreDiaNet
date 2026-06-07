import { useMemo, useReducer, type SetStateAction } from 'react'
import type { ProDisplayFont, ProPreset } from '../../../types'
import { todayIsoDate } from '../../../utils'
import type { ProConstructedTrip } from './pro-types'

export type ProPoleNameEditor = {
  poleId: string
  defaultName: string
  defaultLocationName: string
  defaultJoko: string
  name: string
  locationName: string
  joko: string
  rowShading: boolean
  stopNameBold: boolean
  horizontalLine: boolean
  branchStart: boolean
  branchEnd: boolean
}

export type ProRouteEditor = {
  routeKey: string
  routeLabel: string
  routeName: string
  routeNameFont: ProDisplayFont
  destination: string
  defaultDestination: string
}

export type ProStopCellEditor = {
  routeKey: string
  poleId: string
  routeLabel: string
  stopLabel: string
  text: string
  useRowSpan: boolean
  rowSpanText: string
  font: ProDisplayFont
}

export type ProPreviewPendingPoleMerge = {
  nextPreset: ProPreset
  sourceNames: string[]
  targetNames: string[]
}

type ProPreviewState = {
  dayName: string
  date: string
  downloading: boolean
  constructedTrips: ProConstructedTrip[]
  poleNameEditor: ProPoleNameEditor | null
  routeEditor: ProRouteEditor | null
  cellEditor: ProStopCellEditor | null
  hoveredTargetId: string | null
  pendingPoleMerge: ProPreviewPendingPoleMerge | null
}

type ProPreviewAction =
  | { type: 'setDayName'; value: string }
  | { type: 'setDate'; value: string }
  | { type: 'setDownloading'; value: boolean }
  | { type: 'setConstructedTrips'; value: ProConstructedTrip[] }
  | { type: 'setPoleNameEditor'; value: SetStateAction<ProPoleNameEditor | null> }
  | { type: 'setRouteEditor'; value: SetStateAction<ProRouteEditor | null> }
  | { type: 'setCellEditor'; value: SetStateAction<ProStopCellEditor | null> }
  | { type: 'setHoveredTargetId'; value: SetStateAction<string | null> }
  | { type: 'setPendingPoleMerge'; value: ProPreviewPendingPoleMerge | null }

export function useProPreviewState(revisionDate: string) {
  const [state, dispatch] = useReducer(proPreviewReducer, {
    dayName: '平日',
    date: revisionDate || todayIsoDate(),
    downloading: false,
    constructedTrips: [],
    poleNameEditor: null,
    routeEditor: null,
    cellEditor: null,
    hoveredTargetId: null,
    pendingPoleMerge: null,
  })

  const setters = useMemo(
    () => ({
      setDayName: (value: string) => dispatch({ type: 'setDayName', value }),
      setDate: (value: string) => dispatch({ type: 'setDate', value }),
      setDownloading: (value: boolean) => dispatch({ type: 'setDownloading', value }),
      setConstructedTrips: (value: ProConstructedTrip[]) => dispatch({ type: 'setConstructedTrips', value }),
      setPoleNameEditor: (value: SetStateAction<ProPoleNameEditor | null>) => dispatch({ type: 'setPoleNameEditor', value }),
      setRouteEditor: (value: SetStateAction<ProRouteEditor | null>) => dispatch({ type: 'setRouteEditor', value }),
      setCellEditor: (value: SetStateAction<ProStopCellEditor | null>) => dispatch({ type: 'setCellEditor', value }),
      setHoveredTargetId: (value: SetStateAction<string | null>) => dispatch({ type: 'setHoveredTargetId', value }),
      setPendingPoleMerge: (value: ProPreviewPendingPoleMerge | null) => dispatch({ type: 'setPendingPoleMerge', value }),
    }),
    [],
  )

  return { state, setters }
}

function applyStateAction<T>(current: T, value: SetStateAction<T>): T {
  return typeof value === 'function' ? (value as (current: T) => T)(current) : value
}

function proPreviewReducer(state: ProPreviewState, action: ProPreviewAction): ProPreviewState {
  switch (action.type) {
    case 'setDayName':
      return { ...state, dayName: action.value }
    case 'setDate':
      return { ...state, date: action.value }
    case 'setDownloading':
      return { ...state, downloading: action.value }
    case 'setConstructedTrips':
      return { ...state, constructedTrips: action.value }
    case 'setPoleNameEditor':
      return { ...state, poleNameEditor: applyStateAction(state.poleNameEditor, action.value) }
    case 'setRouteEditor':
      return { ...state, routeEditor: applyStateAction(state.routeEditor, action.value) }
    case 'setCellEditor':
      return { ...state, cellEditor: applyStateAction(state.cellEditor, action.value) }
    case 'setHoveredTargetId':
      return { ...state, hoveredTargetId: applyStateAction(state.hoveredTargetId, action.value) }
    case 'setPendingPoleMerge':
      return { ...state, pendingPoleMerge: action.value }
  }
}
