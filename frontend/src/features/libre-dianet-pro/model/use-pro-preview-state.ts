import { useMemo, useReducer, type SetStateAction } from 'react'
import type { GtfsServiceWeekday, ProPreset } from '../../../types'
import { todayIsoDate } from '../../../utils'
import type { ProConstructedTrip } from './pro-types'

export type ProPreviewMode = 'day-type' | 'specific-date'

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
  defaultRouteName: string
  destination: string
  useTripHeadsignAsDestination: boolean
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
}

export type ProPreviewPendingPoleMerge = {
  nextPreset: ProPreset
  sourceNames: string[]
  targetNames: string[]
}

type ProPreviewState = {
  previewMode: ProPreviewMode
  weekday: GtfsServiceWeekday
  date: string
  showStaticPatterns: boolean
  showActualTimetable: boolean
  downloading: boolean
  constructedTrips: ProConstructedTrip[]
  poleNameEditor: ProPoleNameEditor | null
  routeEditor: ProRouteEditor | null
  cellEditor: ProStopCellEditor | null
  selectedPoleIds: string[]
  pendingPoleMerge: ProPreviewPendingPoleMerge | null
}

type ProPreviewAction =
  | { type: 'setPreviewMode'; value: ProPreviewMode }
  | { type: 'setWeekday'; value: GtfsServiceWeekday }
  | { type: 'setDate'; value: string }
  | { type: 'setShowStaticPatterns'; value: boolean }
  | { type: 'setShowActualTimetable'; value: boolean }
  | { type: 'setDownloading'; value: boolean }
  | { type: 'setConstructedTrips'; value: ProConstructedTrip[] }
  | { type: 'setPoleNameEditor'; value: SetStateAction<ProPoleNameEditor | null> }
  | { type: 'setRouteEditor'; value: SetStateAction<ProRouteEditor | null> }
  | { type: 'setCellEditor'; value: SetStateAction<ProStopCellEditor | null> }
  | { type: 'setSelectedPoleIds'; value: SetStateAction<string[]> }
  | { type: 'setPendingPoleMerge'; value: ProPreviewPendingPoleMerge | null }

export function useProPreviewState(revisionDate: string) {
  const [state, dispatch] = useReducer(proPreviewReducer, {
    previewMode: 'day-type',
    weekday: 'monday',
    date: revisionDate || todayIsoDate(),
    showStaticPatterns: true,
    showActualTimetable: false,
    downloading: false,
    constructedTrips: [],
    poleNameEditor: null,
    routeEditor: null,
    cellEditor: null,
    selectedPoleIds: [],
    pendingPoleMerge: null,
  })

  const setters = useMemo(
    () => ({
      setPreviewMode: (value: ProPreviewMode) => dispatch({ type: 'setPreviewMode', value }),
      setWeekday: (value: GtfsServiceWeekday) => dispatch({ type: 'setWeekday', value }),
      setDate: (value: string) => dispatch({ type: 'setDate', value }),
      setShowStaticPatterns: (value: boolean) => dispatch({ type: 'setShowStaticPatterns', value }),
      setShowActualTimetable: (value: boolean) => dispatch({ type: 'setShowActualTimetable', value }),
      setDownloading: (value: boolean) => dispatch({ type: 'setDownloading', value }),
      setConstructedTrips: (value: ProConstructedTrip[]) => dispatch({ type: 'setConstructedTrips', value }),
      setPoleNameEditor: (value: SetStateAction<ProPoleNameEditor | null>) => dispatch({ type: 'setPoleNameEditor', value }),
      setRouteEditor: (value: SetStateAction<ProRouteEditor | null>) => dispatch({ type: 'setRouteEditor', value }),
      setCellEditor: (value: SetStateAction<ProStopCellEditor | null>) => dispatch({ type: 'setCellEditor', value }),
      setSelectedPoleIds: (value: SetStateAction<string[]>) => dispatch({ type: 'setSelectedPoleIds', value }),
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
    case 'setPreviewMode':
      return { ...state, previewMode: action.value }
    case 'setWeekday':
      return { ...state, weekday: action.value }
    case 'setDate':
      return { ...state, date: action.value }
    case 'setShowStaticPatterns':
      return { ...state, showStaticPatterns: action.value }
    case 'setShowActualTimetable':
      return { ...state, showActualTimetable: action.value }
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
    case 'setSelectedPoleIds':
      return { ...state, selectedPoleIds: applyStateAction(state.selectedPoleIds, action.value) }
    case 'setPendingPoleMerge':
      return { ...state, pendingPoleMerge: action.value }
  }
}
