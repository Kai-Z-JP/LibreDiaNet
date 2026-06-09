import type { DropResult } from '@hello-pangea/dnd'
import { useEffect, type SetStateAction } from 'react'
import type { GtfsStop, ProPoleDetail, ProPreset } from '../../../types'
import { mergeUniqueProStops, uniqueProStopNames } from './pro-pole-merge-helpers'
import type { ProPreviewPendingPoleMerge } from './use-pro-preview-state'

export function useProPreviewPoles({
  preset,
  stopMap,
  selectedPoleIds,
  pendingPoleMerge,
  onUpdate,
  setSelectedPoleIds,
  setPendingPoleMerge,
}: {
  preset: ProPreset
  stopMap: Record<string, GtfsStop>
  selectedPoleIds: string[]
  pendingPoleMerge: ProPreviewPendingPoleMerge | null
  onUpdate: (preset: ProPreset) => void
  setSelectedPoleIds: (value: SetStateAction<string[]>) => void
  setPendingPoleMerge: (value: ProPreviewPendingPoleMerge | null) => void
}) {
  useEffect(() => {
    const poleIds = new Set(preset.poles.map((pole) => pole.id))
    setSelectedPoleIds((current) => current.filter((id) => poleIds.has(id)))
  }, [preset.poles, setSelectedPoleIds])

  const selectPreviewPole = (poleId: string, poleIndex: number, mode: 'single' | 'multiple' | 'range') => {
    setSelectedPoleIds((current) => {
      if (mode === 'single') {
        return [poleId]
      }

      if (mode === 'range' && current.length > 0) {
        const anchorIndex = preset.poles.findIndex((pole) => pole.id === current.at(-1))
        if (anchorIndex >= 0) {
          const [start, end] = [anchorIndex, poleIndex].toSorted((left, right) => left - right)
          const rangeIds = preset.poles.slice(start, end + 1).map((pole) => pole.id)
          return preset.poles.map((pole) => pole.id).filter((id) => current.includes(id) || rangeIds.includes(id))
        }
      }

      return current.includes(poleId) ? current.filter((id) => id !== poleId) : [...current, poleId]
    })
  }

  const dragPreviewPole = (result: DropResult) => {
    if (result.source.droppableId !== 'pro-preview-poles') {
      return
    }

    const sourcePole = preset.poles[result.source.index]
    if (!sourcePole) {
      return
    }
    const selectedPoleIdSet = new Set(selectedPoleIds)
    const draggingSelection = selectedPoleIds.length > 1 && selectedPoleIdSet.has(sourcePole.id)
    const movingPoles = draggingSelection ? preset.poles.filter((pole) => selectedPoleIdSet.has(pole.id)) : [sourcePole]
    const movingPoleIdSet = new Set(movingPoles.map((pole) => pole.id))

    if (result.combine) {
      const targetPoleId = result.combine.draggableId.replace(/^preview-pole-/, '')
      if (movingPoleIdSet.has(targetPoleId)) {
        return
      }
      const targetPole = preset.poles.find((pole) => pole.id === targetPoleId)
      if (!targetPole) {
        return
      }
      const sourceStops = movingPoles.flatMap((pole) => pole.stops)
      const nextPreset = {
        ...preset,
        poles: preset.poles
          .map((pole) => (pole.id === targetPole.id ? { ...pole, stops: mergeUniqueProStops(pole.stops, sourceStops) } : pole))
          .filter((pole) => !movingPoleIdSet.has(pole.id)),
      }
      setSelectedPoleIds([])
      commitOrConfirmPoleMerge(nextPreset, targetPole.stops, sourceStops)
      return
    }

    if (!result.destination || result.destination.droppableId !== 'pro-preview-poles') {
      return
    }
    const extraRemovedBeforeDestination = preset.poles
      .slice(0, result.destination.index)
      .filter((pole) => pole.id !== sourcePole.id && movingPoleIdSet.has(pole.id)).length
    const destinationIndex = Math.max(0, result.destination.index - extraRemovedBeforeDestination)
    const nextPoles = preset.poles.filter((pole) => !movingPoleIdSet.has(pole.id))
    nextPoles.splice(destinationIndex, 0, ...movingPoles)
    setSelectedPoleIds(draggingSelection ? movingPoles.map((pole) => pole.id) : [])
    onUpdate({ ...preset, poles: nextPoles })
  }

  const commitOrConfirmPoleMerge = (nextPreset: ProPreset, targetStops: ProPoleDetail['stops'], sourceStops: ProPoleDetail['stops']) => {
    const targetNames = uniqueProStopNames(targetStops, stopMap)
    const sourceNames = uniqueProStopNames(sourceStops, stopMap)
    if (new Set([...targetNames, ...sourceNames]).size <= 1) {
      onUpdate(nextPreset)
      return
    }
    setPendingPoleMerge({
      nextPreset,
      targetNames,
      sourceNames,
    })
  }

  const confirmPendingPoleMerge = () => {
    if (!pendingPoleMerge) {
      return
    }
    onUpdate(pendingPoleMerge.nextPreset)
    setPendingPoleMerge(null)
  }

  return {
    selectPreviewPole,
    dragPreviewPole,
    confirmPendingPoleMerge,
  }
}
