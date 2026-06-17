import { useCallback, useReducer, type SetStateAction } from 'react'
import type { GtfsStop, ProPreset } from '../../../types'
import { type PendingPoleMerge, usePoleMergeActions } from '../model/use-pole-merge-actions'
import { type PolePatternMap, usePoleMergeDerivedData } from '../model/use-pole-merge-derived'
import type { ProConstructedRoute } from '../model/pro-types'

type PoleMergeState = {
  selectedStopMap: Record<string, number[]>
  pendingMerge: PendingPoleMerge | null
}

export type { PolePatternMap }

type PoleMergeAction =
  | { type: 'setSelectedStopMap'; value: SetStateAction<Record<string, number[]>> }
  | { type: 'setPendingMerge'; value: PendingPoleMerge | null }

function applyStateAction<T>(current: T, value: SetStateAction<T>): T {
  return typeof value === 'function' ? (value as (current: T) => T)(current) : value
}

function poleMergeReducer(state: PoleMergeState, action: PoleMergeAction): PoleMergeState {
  switch (action.type) {
    case 'setSelectedStopMap':
      return { ...state, selectedStopMap: applyStateAction(state.selectedStopMap, action.value) }
    case 'setPendingMerge':
      return { ...state, pendingMerge: action.value }
  }
}

export function usePoleMergeModel({
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
  const [state, dispatch] = useReducer(poleMergeReducer, {
    selectedStopMap: {},
    pendingMerge: null,
  })
  const { selectedStopMap, pendingMerge } = state
  const setSelectedStopMap = useCallback(
    (value: SetStateAction<Record<string, number[]>>) => dispatch({ type: 'setSelectedStopMap', value }),
    [],
  )
  const setPendingMerge = useCallback((value: PendingPoleMerge | null) => dispatch({ type: 'setPendingMerge', value }), [])

  const derived = usePoleMergeDerivedData({ preset, constructedRoutes })
  const actions = usePoleMergeActions({
    preset,
    stopMap,
    selectedStopMap,
    pendingMerge,
    patternMap: derived.patternMap,
    usedPoleStopKeys: derived.usedPoleStopKeys,
    duplicateStopIdKeys: derived.duplicateStopIdKeys,
    onUpdate,
    setSelectedStopMap,
    setPendingMerge,
  })

  return {
    state: {
      selectedStopMap,
      pendingMerge,
    },
    derived: {
      includeSourceNameInRoute: derived.includeSourceNameInRoute,
      usedPoleStopKeys: derived.usedPoleStopKeys,
      patternMap: derived.patternMap,
      routePatternMap: derived.routePatternMap,
    },
    actions: {
      updateSelectedStops: setSelectedStopMap,
      addPatternStops: actions.addPatternStops,
      addEmptyPole: actions.addEmptyPole,
      toggleExcludedPattern: actions.toggleExcludedPattern,
      mergePolesByStopId: actions.mergePolesByStopId,
      dragPole: actions.dragPole,
      confirmPendingMerge: actions.confirmPendingMerge,
      cancelPendingMerge: actions.cancelPendingMerge,
    },
    props: {
      patternList: {
        data: {
          preset,
          patternMap: derived.patternMap,
          usedPoleStopKeys: derived.usedPoleStopKeys,
          selectedStopMap,
          includeSourceNameInRoute: derived.includeSourceNameInRoute,
        },
        actions: {
          onSelectStops: setSelectedStopMap,
          onToggleExcludedPattern: actions.toggleExcludedPattern,
          onAddPatternStops: actions.addPatternStops,
        },
      },
      outputPoleList: {
        data: {
          preset,
          stopMap,
          constructedRoutes,
          routePatternMap: derived.routePatternMap,
          includeSourceNameInRoute: derived.includeSourceNameInRoute,
          pendingMerge,
        },
        actions: {
          onUpdate,
          onAddEmptyPole: actions.addEmptyPole,
          onMergePolesByStopId: actions.mergePolesByStopId,
          onConfirmPendingMerge: actions.confirmPendingMerge,
          onCancelPendingMerge: actions.cancelPendingMerge,
        },
      },
    },
  }
}
