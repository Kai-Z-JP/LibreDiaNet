import type { DropResult } from '@hello-pangea/dnd'
import { useEffect, useMemo } from 'react'
import { buildProCreateFromDataRequest, requestDiaNetXlsx } from '../../../api'
import type { GtfsStop, ProPoleDetail, ProPreset, ProPresetContext, ProVersion } from '../../../types'
import { todayIsoDate } from '../../../utils'
import { libreDiaNetRepository } from '../../libre-dianet/lib/repository'
import { proExcludedStopPatternsForSource, proRouteDisplayLabel, sameProPoleStop } from '../model/pro-pole-stop-helpers'
import {
  isProPatternExcluded,
  normalizeProRouteDisplayOverride,
  proPatternPreviewTimes,
  proTripPreviewTimes,
  sortProConstructedTrips,
} from '../model/pro-preview-display-helpers'
import { proRouteKey } from '../model/pro-route-keys'
import type { ProConstructedRoute } from '../model/pro-types'
import { useProPreviewState } from '../model/use-pro-preview-state'
export type { ProPoleNameEditor, ProRouteEditor, ProStopCellEditor } from '../model/use-pro-preview-state'

export function useProPreviewModel({
  version,
  preset,
  context,
  constructedRoutes,
  stopMap,
  sourceNameMap,
  onUpdate,
}: {
  version: ProVersion
  preset: ProPreset
  context: ProPresetContext
  constructedRoutes: ProConstructedRoute[]
  stopMap: Record<string, GtfsStop>
  sourceNameMap: Record<string, string>
  onUpdate: (preset: ProPreset) => void
}) {
  const { state, setters } = useProPreviewState(version.revisionDate)
  const {
    previewMode,
    weekday,
    date,
    showStaticPatterns,
    showActualTimetable,
    downloading,
    constructedTrips,
    poleNameEditor,
    routeEditor,
    cellEditor,
    selectedPoleIds,
    pendingPoleMerge,
  } = state
  const {
    setPreviewMode,
    setWeekday,
    setDate,
    setShowStaticPatterns,
    setShowActualTimetable,
    setDownloading,
    setConstructedTrips,
    setPoleNameEditor,
    setRouteEditor,
    setCellEditor,
    setSelectedPoleIds,
    setPendingPoleMerge,
  } = setters

  const includeSourceNameInRoute = preset.sourceIds.length > 1
  const routeDisplayOverridesByKey = useMemo(
    () => Object.fromEntries(preset.routeDisplayOverrides.map((override) => [override.routeKey, override])),
    [preset.routeDisplayOverrides],
  )
  const previewConstructedRoutes = constructedRoutes
  const previewTimesByTripKey = useMemo(
    () =>
      Object.fromEntries(
        constructedTrips.map((trip, index) => [
          `${trip.sourceId}::${trip.stopTime[0]?.tripId ?? index}`,
          proTripPreviewTimes(trip, preset.poles),
        ]),
      ),
    [constructedTrips, preset.poles],
  )
  const previewTimesByPatternKey = useMemo(
    () =>
      Object.fromEntries(
        previewConstructedRoutes.flatMap((route) =>
          route.stopPatterns.map((pattern) => [
            proRouteKey(route, pattern),
            isProPatternExcluded(preset, route, pattern) ? [] : proPatternPreviewTimes(pattern, preset.poles, route.sourceId),
          ]),
        ),
      ),
    [previewConstructedRoutes, preset],
  )

  useEffect(() => {
    let cancelled = false
    const weekdayReferenceDate = version.revisionDate || todayIsoDate()
    const load = async () => {
      const trips = await Promise.all(
        preset.sourceIds.map(async (sourceId) => {
          const handle = context.handles[sourceId]
          if (!handle) {
            return []
          }
          const selectedRoutes = preset.routes
            .filter((route) => route.sourceId === sourceId)
            .map(({ id, direction }) => ({ id, direction }))
          if (selectedRoutes.length === 0) {
            return []
          }
          const excludedStopPatterns = proExcludedStopPatternsForSource(preset.excludedStopPatterns, sourceId)
          const sourceTrips =
            previewMode === 'day-type'
              ? await libreDiaNetRepository.listTripsForWeekday(handle, selectedRoutes, weekday, weekdayReferenceDate, excludedStopPatterns)
              : await libreDiaNetRepository.listTripsForDate(handle, selectedRoutes, date, excludedStopPatterns)
          return sourceTrips.map((trip) => ({
            ...trip,
            sourceId,
            sourceName: sourceNameMap[sourceId] ?? sourceId,
          }))
        }),
      )
      if (!cancelled) {
        setConstructedTrips(sortProConstructedTrips(trips.flat(), preset.poles, stopMap))
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [
    context.handles,
    date,
    preset.excludedStopPatterns,
    preset.poles,
    preset.routes,
    preset.sourceIds,
    previewMode,
    setConstructedTrips,
    sourceNameMap,
    stopMap,
    version.revisionDate,
    weekday,
  ])

  useEffect(() => {
    const poleIds = new Set(preset.poles.map((pole) => pole.id))
    setSelectedPoleIds((current) => current.filter((id) => poleIds.has(id)))
  }, [preset.poles, setSelectedPoleIds])

  const updateRouteDisplayOverride = (
    routeKey: string,
    transform: (current: NonNullable<ProPreset['routeDisplayOverrides'][number]>) => ProPreset['routeDisplayOverrides'][number] | null,
  ) => {
    const current = routeDisplayOverridesByKey[routeKey] ?? {
      routeKey,
      routeNameOverride: null,
      routeNameFont: null,
      destinationOverride: null,
      useTripHeadsignAsDestination: false,
      stopCellOverrides: [],
    }
    const nextOverride = normalizeProRouteDisplayOverride(transform(current))
    onUpdate({
      ...preset,
      routeDisplayOverrides: [
        ...preset.routeDisplayOverrides.filter((override) => override.routeKey !== routeKey),
        ...(nextOverride ? [nextOverride] : []),
      ].toSorted((left, right) => left.routeKey.localeCompare(right.routeKey)),
    })
  }

  const openRouteEditor = (route: ProConstructedRoute, pattern: GtfsStop[]) => {
    const routeKey = proRouteKey(route, pattern)
    openRouteEditorByRouteKey(routeKey, proRouteDisplayLabel(route, includeSourceNameInRoute), pattern.at(-1)?.name ?? '')
  }

  const openRouteEditorByRouteKey = (routeKey: string, routeLabel: string, defaultDestination: string) => {
    const override = routeDisplayOverridesByKey[routeKey]
    setRouteEditor({
      routeKey,
      routeLabel,
      routeName: override?.routeNameOverride ?? '',
      routeNameFont: override?.routeNameFont ?? 'HEISEI_MINCHO_STD_W3',
      destination: override?.destinationOverride ?? defaultDestination,
      useTripHeadsignAsDestination: override?.useTripHeadsignAsDestination ?? false,
      defaultDestination,
    })
  }

  const openPoleNameEditor = (pole: ProPoleDetail, defaultName: string, defaultLocationName: string, defaultJoko: string) => {
    setPoleNameEditor({
      poleId: pole.id,
      defaultName,
      defaultLocationName,
      defaultJoko,
      name: pole.override.nameOverride ?? '',
      locationName: pole.override.locationNameOverride ?? '',
      joko: pole.override.jokoOverride ?? '',
      rowShading: pole.override.rowShading || pole.override.majorStop,
      stopNameBold: pole.override.stopNameBold || pole.override.majorStop,
      horizontalLine: pole.override.horizontalLine,
      branchStart: pole.override.branchStart,
      branchEnd: pole.override.branchEnd,
    })
  }

  const openCellEditor = (route: ProConstructedRoute, pattern: GtfsStop[], pole: ProPoleDetail, stopLabel: string) => {
    const routeKey = proRouteKey(route, pattern)
    const routeLabel = proRouteDisplayLabel(route, includeSourceNameInRoute)
    openCellEditorByRouteKey(routeKey, routeLabel, pole, stopLabel)
  }

  const openCellEditorByRouteKey = (routeKey: string, routeLabel: string, pole: ProPoleDetail, stopLabel: string) => {
    const cellOverride = routeDisplayOverridesByKey[routeKey]?.stopCellOverrides.find((override) => override.poleId === pole.id)
    setCellEditor({
      routeKey,
      poleId: pole.id,
      routeLabel,
      stopLabel,
      text: cellOverride?.text ?? '',
      useRowSpan: (cellOverride?.rowSpan ?? 1) > 1,
      rowSpanText: String(cellOverride?.rowSpan ?? 2),
      font: cellOverride?.font ?? 'HEISEI_MINCHO_STD_W3',
    })
  }

  const exportDisabled = preset.sourceIds.length === 0 || preset.sourceIds.some((sourceId) => !context.handles[sourceId])

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

  const onPreviewPoleDragEnd = (result: DropResult) => {
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
          .map((pole) => (pole.id === targetPole.id ? { ...pole, stops: mergeUniqueStops(pole.stops, sourceStops) } : pole))
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
    const targetNames = uniqueStopNames(targetStops)
    const sourceNames = uniqueStopNames(sourceStops)
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

  const mergeUniqueStops = (targetStops: ProPoleDetail['stops'], sourceStops: ProPoleDetail['stops']) => [
    ...targetStops,
    ...sourceStops.filter((stop) => !targetStops.some((current) => sameProPoleStop(current, stop))),
  ]

  const uniqueStopNames = (stops: ProPoleDetail['stops']) =>
    Array.from(new Set(stops.map((stop) => stopMap[`${stop.sourceId}::${stop.id}`]?.name ?? stop.id))).toSorted((left, right) =>
      left.localeCompare(right, 'ja'),
    )

  const requestXlsx = async (dayMapping: [string, string][]) => {
    setDownloading(true)
    try {
      const gtfsEntries = await Promise.all(
        preset.sourceIds.map(async (sourceId) => {
          const handle = context.handles[sourceId]
          if (!handle) {
            return null
          }
          const singlePreset = {
            id: preset.id,
            name: preset.name,
            index: preset.index,
            info: {
              kind: 'raw' as const,
              id: sourceId,
              uuid: sourceId,
              name: sourceNameMap[sourceId] ?? sourceId,
              cacheState: 'ready' as const,
            },
            routes: preset.routes.filter((route) => route.sourceId === sourceId).map(({ id, direction }) => ({ id, direction })),
            poles: preset.poles.flatMap((pole) =>
              pole.stops
                .filter((stop) => stop.sourceId === sourceId)
                .map((stop) => ({
                  id: stop.id,
                  override: pole.override,
                })),
            ),
            excludedStopPatterns: proExcludedStopPatternsForSource(preset.excludedStopPatterns, sourceId),
          }
          return [sourceId, await libreDiaNetRepository.buildExportData(handle, singlePreset)] as const
        }),
      )
      const gtfsBySourceId = Object.fromEntries(
        gtfsEntries.filter((entry): entry is readonly [string, NonNullable<typeof entry>[1]] => Boolean(entry)),
      )
      await requestDiaNetXlsx(buildProCreateFromDataRequest(version, preset, gtfsBySourceId, dayMapping))
    } finally {
      setDownloading(false)
    }
  }

  return {
    state: {
      previewMode,
      weekday,
      date,
      showStaticPatterns,
      showActualTimetable,
      downloading,
      constructedTrips,
      poleNameEditor,
      routeEditor,
      cellEditor,
      selectedPoleIds,
      pendingPoleMerge,
    },
    derived: {
      routeDisplayOverridesByKey,
      previewConstructedRoutes,
      previewTimesByTripKey,
      previewTimesByPatternKey,
      exportDisabled,
    },
    actions: {
      selectPreviewMode: setPreviewMode,
      selectWeekday: setWeekday,
      changeDate: setDate,
      setShowStaticPatterns,
      setShowActualTimetable,
      selectPreviewPole,
      openRouteEditor,
      openPoleNameEditor,
      openCellEditor,
      updatePoleNameEditor: setPoleNameEditor,
      updateRouteEditor: setRouteEditor,
      updateCellEditor: setCellEditor,
      updateRouteDisplayOverride,
      dragPreviewPole: onPreviewPoleDragEnd,
      requestXlsx,
    },
    props: {
      controls: {
        previewMode,
        weekday,
        date,
        showStaticPatterns,
        showActualTimetable,
        downloading,
        exportDisabled,
        onSelectPreviewMode: setPreviewMode,
        onSelectWeekday: setWeekday,
        onChangeDate: setDate,
        onToggleStaticPatterns: setShowStaticPatterns,
        onToggleActualTimetable: setShowActualTimetable,
        onRequestXlsx: requestXlsx,
      },
      table: {
        data: {
          preset,
          stopMap,
          constructedRoutes,
          constructedTrips,
          previewConstructedRoutes,
          routeDisplayOverridesByKey,
          previewTimesByPatternKey,
          previewTimesByTripKey,
          showStaticPatterns,
          showActualTimetable,
          selectedPoleIds,
        },
        actions: {
          onDragEnd: onPreviewPoleDragEnd,
          onSelectPole: selectPreviewPole,
          onOpenRouteEditor: openRouteEditor,
          onOpenPoleNameEditor: openPoleNameEditor,
          onOpenCellEditor: openCellEditor,
        },
      },
      dialogs: {
        data: {
          preset,
          poleNameEditor,
          routeEditor,
          cellEditor,
          pendingPoleMerge,
        },
        actions: {
          updatePoleNameEditor: setPoleNameEditor,
          updateRouteEditor: setRouteEditor,
          updateCellEditor: setCellEditor,
          updateRouteDisplayOverride,
          onUpdate,
          onConfirmPendingPoleMerge: confirmPendingPoleMerge,
          onCancelPendingPoleMerge: () => setPendingPoleMerge(null),
        },
      },
    },
  }
}
