import type { DropResult } from '@hello-pangea/dnd'
import { useMemo, useReducer, type SetStateAction } from 'react'
import { EMPTY_OVERRIDE } from '../../../types'
import type { GtfsStop, ProPoleDetail, ProPreset } from '../../../types'
import {
  proExcludedPatternKey,
  proPoleStopFromPatternStop,
  proPoleStopKey,
  proStopIdKey,
  sameProPoleStop,
} from '../model/pro-pole-stop-helpers'
import type { ProConstructedRoute } from '../model/pro-types'

type PoleMergeState = {
  selectedStopMap: Record<string, number[]>
  poleOpenMap: Record<string, boolean>
  pendingMerge: PendingPoleMerge | null
}

type PendingPoleMerge = {
  nextPreset: ProPreset
  sourceNames: string[]
  targetNames: string[]
  clearPatternKey: string | null
}

export type PolePatternMap = Record<
  string,
  {
    route: ProConstructedRoute
    pattern: GtfsStop[]
    patternIndex: number
  }
>

type PoleMergeAction =
  | { type: 'setSelectedStopMap'; value: SetStateAction<Record<string, number[]>> }
  | { type: 'setPoleOpenMap'; value: SetStateAction<Record<string, boolean>> }
  | { type: 'setPendingMerge'; value: PendingPoleMerge | null }

function applyStateAction<T>(current: T, value: SetStateAction<T>): T {
  return typeof value === 'function' ? (value as (current: T) => T)(current) : value
}

function poleMergeReducer(state: PoleMergeState, action: PoleMergeAction): PoleMergeState {
  switch (action.type) {
    case 'setSelectedStopMap':
      return { ...state, selectedStopMap: applyStateAction(state.selectedStopMap, action.value) }
    case 'setPoleOpenMap':
      return { ...state, poleOpenMap: applyStateAction(state.poleOpenMap, action.value) }
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
    poleOpenMap: {},
    pendingMerge: null,
  })
  const { selectedStopMap, poleOpenMap, pendingMerge } = state
  const setSelectedStopMap = (value: SetStateAction<Record<string, number[]>>) => dispatch({ type: 'setSelectedStopMap', value })
  const setPoleOpenMap = (value: SetStateAction<Record<string, boolean>>) => dispatch({ type: 'setPoleOpenMap', value })
  const setPendingMerge = (value: PendingPoleMerge | null) => dispatch({ type: 'setPendingMerge', value })

  const includeSourceNameInRoute = preset.sourceIds.length > 1
  const usedPoleStopKeys = useMemo(
    () => new Set(preset.poles.flatMap((pole) => pole.stops.map((stop) => proPoleStopKey(stop)))),
    [preset.poles],
  )
  const patternMap: PolePatternMap = useMemo(
    () =>
      Object.fromEntries(
        constructedRoutes.flatMap((route) =>
          route.stopPatterns.map((pattern, patternIndex) => [
            `${route.sourceId}|${route.route.routeId}|${route.direction ?? 'null'}|${patternIndex}`,
            { route, pattern, patternIndex },
          ]),
        ),
      ),
    [constructedRoutes],
  )

  const duplicateStopIdKeys = useMemo(() => {
    const duplicateKeys = new Set<string>()
    for (const route of constructedRoutes) {
      for (const pattern of route.stopPatterns) {
        const counts = new Map<string, number>()
        for (const stop of pattern) {
          const key = proStopIdKey(route.sourceId, stop.stopId)
          counts.set(key, (counts.get(key) ?? 0) + 1)
        }
        for (const [key, count] of counts) {
          if (count >= 2) {
            duplicateKeys.add(key)
          }
        }
      }
    }
    return duplicateKeys
  }, [constructedRoutes])

  const addPatternStops = (route: ProConstructedRoute, pattern: GtfsStop[]) => {
    const nextStops = pattern
      .map((stop, index) => proPoleStopFromPatternStop(route, pattern, stop, index))
      .filter((stop) => !usedPoleStopKeys.has(proPoleStopKey(stop)))
    onUpdate({
      ...preset,
      poles: [
        ...preset.poles,
        ...nextStops.map(
          (stop): ProPoleDetail => ({
            id: crypto.randomUUID(),
            stops: [stop],
            override: EMPTY_OVERRIDE,
          }),
        ),
      ],
    })
  }

  const toggleExcludedPattern = (route: ProConstructedRoute, pattern: GtfsStop[]) => {
    const key = proExcludedPatternKey(route.sourceId, pattern)
    const nextPatterns = preset.excludedStopPatterns.filter((patternEntry) => patternEntry[0] !== key)
    onUpdate({
      ...preset,
      excludedStopPatterns: nextPatterns.length === preset.excludedStopPatterns.length ? [...nextPatterns, [key]] : nextPatterns,
    })
  }

  const mergePolesByStopId = () => {
    const nextPoles: ProPoleDetail[] = []
    const targetIndexByStopId = new Map<string, number>()

    for (const pole of preset.poles) {
      const eligibleStops = pole.stops.filter((stop) => !duplicateStopIdKeys.has(proStopIdKey(stop.sourceId, stop.id)))
      const ineligibleStops = pole.stops.filter((stop) => duplicateStopIdKeys.has(proStopIdKey(stop.sourceId, stop.id)))

      for (const stop of eligibleStops) {
        const stopIdKey = proStopIdKey(stop.sourceId, stop.id)
        const targetIndex = targetIndexByStopId.get(stopIdKey)
        if (targetIndex === undefined) {
          targetIndexByStopId.set(stopIdKey, nextPoles.length)
          nextPoles.push({
            ...pole,
            id: crypto.randomUUID(),
            stops: [stop],
          })
          continue
        }
        const targetPole = nextPoles[targetIndex]
        if (!targetPole) {
          continue
        }
        nextPoles[targetIndex] = {
          ...targetPole,
          stops: targetPole.stops.some((current) => sameProPoleStop(current, stop)) ? targetPole.stops : [...targetPole.stops, stop],
        }
      }

      if (ineligibleStops.length > 0) {
        nextPoles.push({
          ...pole,
          id: crypto.randomUUID(),
          stops: ineligibleStops,
        })
      }
    }

    onUpdate({ ...preset, poles: nextPoles })
  }

  const onDragEnd = (result: DropResult) => {
    if (result.source.droppableId === 'pro-poles') {
      const sourcePole = preset.poles[result.source.index]
      if (!sourcePole) {
        return
      }
      if (result.combine) {
        mergePoleStops(sourcePole, result.combine.draggableId.replace(/^pole-/, ''))
        return
      }
      if (!result.destination || result.destination.droppableId !== 'pro-poles') {
        return
      }
      const nextPoles = [...preset.poles]
      const [moved] = nextPoles.splice(result.source.index, 1)
      if (!moved) {
        return
      }
      nextPoles.splice(result.destination.index, 0, moved)
      onUpdate({ ...preset, poles: nextPoles })
      return
    }

    if (!result.destination && !result.combine) {
      return
    }
    const [patternKey, rawIndex] = result.draggableId.split('@@')
    const entry = patternMap[patternKey]
    const stop = entry?.pattern[Number(rawIndex)]
    if (!entry || !stop) {
      return
    }
    const selected = selectedStopMap[patternKey] ?? []
    const selectedIndexes = selected.includes(Number(rawIndex)) && selected.length > 1 ? selected : [Number(rawIndex)]
    const nextStops = selectedIndexes
      .map((index) => entry.pattern[index])
      .map((item, selectedIndex) => ({ item, index: selectedIndexes[selectedIndex] }))
      .filter((entry): entry is { item: GtfsStop; index: number } => Boolean(entry.item) && entry.index !== undefined)
      .map(({ item, index }) => proPoleStopFromPatternStop(entry.route, entry.pattern, item, index))
      .filter((stop) => !usedPoleStopKeys.has(proPoleStopKey(stop)))
    if (nextStops.length === 0) {
      return
    }

    if (result.combine) {
      mergeStopsIntoPole(nextStops, result.combine.draggableId.replace(/^pole-/, ''), patternKey)
      return
    }
    if (!result.destination || result.destination.droppableId !== 'pro-poles') {
      return
    }
    const nextPoles = [...preset.poles]
    nextPoles.splice(
      result.destination.index,
      0,
      ...nextStops.map((nextStop) => ({
        id: crypto.randomUUID(),
        stops: [nextStop],
        override: EMPTY_OVERRIDE,
      })),
    )
    onUpdate({ ...preset, poles: nextPoles })
    setSelectedStopMap((current) => {
      const next = { ...current }
      delete next[patternKey]
      return next
    })
  }

  const mergePoleStops = (sourcePole: ProPoleDetail, targetPoleId: string) => {
    if (targetPoleId === sourcePole.id) {
      return
    }
    const targetPole = preset.poles.find((pole) => pole.id === targetPoleId)
    if (!targetPole) {
      return
    }
    const mergedStops = mergeUniqueStops(targetPole.stops, sourcePole.stops)
    const nextPreset = {
      ...preset,
      poles: preset.poles
        .map((pole) => (pole.id === targetPole.id ? { ...pole, stops: mergedStops } : pole))
        .filter((pole) => pole.id !== sourcePole.id),
    }
    commitOrConfirmMerge(nextPreset, targetPole.stops, sourcePole.stops)
  }

  const mergeStopsIntoPole = (nextStops: ProPoleDetail['stops'], targetPoleId: string, patternKey: string) => {
    const targetPole = preset.poles.find((pole) => pole.id === targetPoleId)
    if (!targetPole) {
      return
    }
    const nextPreset = {
      ...preset,
      poles: preset.poles.map((pole) => (pole.id === targetPole.id ? { ...pole, stops: mergeUniqueStops(pole.stops, nextStops) } : pole)),
    }
    commitOrConfirmMerge(nextPreset, targetPole.stops, nextStops, patternKey)
  }

  const commitOrConfirmMerge = (
    nextPreset: ProPreset,
    targetStops: ProPoleDetail['stops'],
    sourceStops: ProPoleDetail['stops'],
    clearPatternKey: string | null = null,
  ) => {
    const targetNames = uniqueStopNames(targetStops)
    const sourceNames = uniqueStopNames(sourceStops)
    if (new Set([...targetNames, ...sourceNames]).size <= 1) {
      onUpdate(nextPreset)
      clearSelectedPattern(clearPatternKey)
      return
    }
    setPendingMerge({
      nextPreset,
      targetNames,
      sourceNames,
      clearPatternKey,
    })
  }

  const confirmPendingMerge = () => {
    if (!pendingMerge) {
      return
    }
    onUpdate(pendingMerge.nextPreset)
    clearSelectedPattern(pendingMerge.clearPatternKey)
    setPendingMerge(null)
  }

  const clearSelectedPattern = (patternKey: string | null) => {
    if (!patternKey) {
      return
    }
    setSelectedStopMap((current) => {
      const next = { ...current }
      delete next[patternKey]
      return next
    })
  }

  const mergeUniqueStops = (targetStops: ProPoleDetail['stops'], sourceStops: ProPoleDetail['stops']) => [
    ...targetStops,
    ...sourceStops.filter((stop) => !targetStops.some((current) => sameProPoleStop(current, stop))),
  ]

  const uniqueStopNames = (stops: ProPoleDetail['stops']) =>
    Array.from(new Set(stops.map((stop) => stopMap[`${stop.sourceId}::${stop.id}`]?.name ?? stop.id))).toSorted((left, right) =>
      left.localeCompare(right, 'ja'),
    )

  return {
    state: {
      selectedStopMap,
      poleOpenMap,
      pendingMerge,
    },
    derived: {
      includeSourceNameInRoute,
      usedPoleStopKeys,
      patternMap,
    },
    actions: {
      updateSelectedStops: setSelectedStopMap,
      updatePoleOpenMap: setPoleOpenMap,
      addPatternStops,
      toggleExcludedPattern,
      mergePolesByStopId,
      dragPole: onDragEnd,
      confirmPendingMerge,
      cancelPendingMerge: () => setPendingMerge(null),
    },
    props: {
      patternList: {
        data: {
          preset,
          patternMap,
          usedPoleStopKeys,
          selectedStopMap,
          includeSourceNameInRoute,
        },
        actions: {
          onSelectStops: setSelectedStopMap,
          onToggleExcludedPattern: toggleExcludedPattern,
          onAddPatternStops: addPatternStops,
        },
      },
      outputPoleList: {
        data: {
          preset,
          stopMap,
          constructedRoutes,
          includeSourceNameInRoute,
          poleOpenMap,
          pendingMerge,
        },
        actions: {
          onUpdate,
          onUpdatePoleOpenMap: setPoleOpenMap,
          onMergePolesByStopId: mergePolesByStopId,
          onConfirmPendingMerge: confirmPendingMerge,
          onCancelPendingMerge: () => setPendingMerge(null),
        },
      },
    },
  }
}
