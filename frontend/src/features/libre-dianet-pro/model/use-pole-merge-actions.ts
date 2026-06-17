import type { DropResult } from '@hello-pangea/dnd'
import type { Dispatch, SetStateAction } from 'react'
import { EMPTY_OVERRIDE } from '../../../types'
import type { GtfsStop, ProPoleDetail, ProPreset } from '../../../types'
import { mergeUniqueProStops, uniqueProStopNames } from './pro-pole-merge-helpers'
import { proExcludedPatternKey, proPoleStopFromPatternStop, proPoleStopKey, proStopIdKey, sameProPoleStop } from './pro-pole-stop-helpers'
import type { ProConstructedRoute } from './pro-types'
import type { PolePatternMap } from './use-pole-merge-derived'

export type PendingPoleMerge = {
  nextPreset: ProPreset
  sourceNames: string[]
  targetNames: string[]
  clearPatternKey: string | null
}

export function usePoleMergeActions({
  preset,
  stopMap,
  selectedStopMap,
  pendingMerge,
  patternMap,
  usedPoleStopKeys,
  duplicateStopIdKeys,
  onUpdate,
  setSelectedStopMap,
  setPendingMerge,
}: {
  preset: ProPreset
  stopMap: Record<string, GtfsStop>
  selectedStopMap: Record<string, number[]>
  pendingMerge: PendingPoleMerge | null
  patternMap: PolePatternMap
  usedPoleStopKeys: Set<string>
  duplicateStopIdKeys: Set<string>
  onUpdate: (preset: ProPreset) => void
  setSelectedStopMap: Dispatch<SetStateAction<Record<string, number[]>>>
  setPendingMerge: (value: PendingPoleMerge | null) => void
}) {
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

  const addEmptyPole = () => {
    onUpdate({
      ...preset,
      poles: [
        ...preset.poles,
        {
          id: crypto.randomUUID(),
          stops: [],
          override: EMPTY_OVERRIDE,
        },
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
      if (pole.stops.length === 0) {
        nextPoles.push(pole)
        continue
      }

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

  const dragPole = (result: DropResult) => {
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
    clearSelectedPattern(patternKey)
  }

  const mergePoleStops = (sourcePole: ProPoleDetail, targetPoleId: string) => {
    if (targetPoleId === sourcePole.id) {
      return
    }
    const targetPole = preset.poles.find((pole) => pole.id === targetPoleId)
    if (!targetPole) {
      return
    }
    const mergedStops = mergeUniqueProStops(targetPole.stops, sourcePole.stops)
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
      poles: preset.poles.map((pole) =>
        pole.id === targetPole.id ? { ...pole, stops: mergeUniqueProStops(pole.stops, nextStops) } : pole,
      ),
    }
    commitOrConfirmMerge(nextPreset, targetPole.stops, nextStops, patternKey)
  }

  const commitOrConfirmMerge = (
    nextPreset: ProPreset,
    targetStops: ProPoleDetail['stops'],
    sourceStops: ProPoleDetail['stops'],
    clearPatternKey: string | null = null,
  ) => {
    const targetNames = uniqueProStopNames(targetStops, stopMap)
    const sourceNames = uniqueProStopNames(sourceStops, stopMap)
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

  return {
    addPatternStops,
    addEmptyPole,
    toggleExcludedPattern,
    mergePolesByStopId,
    dragPole,
    confirmPendingMerge,
    cancelPendingMerge: () => setPendingMerge(null),
  }
}
