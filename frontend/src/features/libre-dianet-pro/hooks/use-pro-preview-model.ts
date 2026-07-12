import type { GtfsStop, ProPreset, ProPresetContext, ProVersion } from '../../../types'
import type { ProConstructedRoute } from '../model/pro-types'
import { useProPreviewDisplay } from '../model/use-pro-preview-display'
import { useProPreviewEditors } from '../model/use-pro-preview-editors'
import { useProPreviewPoles } from '../model/use-pro-preview-poles'
import { useProPreviewState } from '../model/use-pro-preview-state'
import { useProTrips, useSortedProTrips } from '../model/use-pro-trips'
import { useProXlsxExport } from '../model/use-pro-xlsx-export'
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
    setPoleNameEditor,
    setRouteEditor,
    setCellEditor,
    setSelectedPoleIds,
    setPendingPoleMerge,
  } = setters

  const trips = useProTrips({
    revisionDate: version.revisionDate,
    preset,
    context,
    previewMode,
    weekday,
    date,
    sourceNameMap,
  })
  const constructedTrips = useSortedProTrips(trips, preset.poles, stopMap)
  const display = useProPreviewDisplay({ preset, context, constructedRoutes, constructedTrips })
  const editors = useProPreviewEditors({
    preset,
    stopMap,
    constructedRoutes,
    includeSourceNameInRoute: display.includeSourceNameInRoute,
    routeDisplayOverridesByKey: display.routeDisplayOverridesByKey,
    onUpdate,
    setPoleNameEditor,
    setRouteEditor,
    setCellEditor,
  })
  const poles = useProPreviewPoles({
    preset,
    stopMap,
    selectedPoleIds,
    pendingPoleMerge,
    onUpdate,
    setSelectedPoleIds,
    setPendingPoleMerge,
  })
  const { downloading, requestXlsx } = useProXlsxExport({ version, preset, context, sourceNameMap })

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
      routeDisplayOverridesByKey: display.routeDisplayOverridesByKey,
      previewConstructedRoutes: display.previewConstructedRoutes,
      previewTimesByTripKey: display.previewTimesByTripKey,
      previewTimesByPatternKey: display.previewTimesByPatternKey,
      exportDisabled: display.exportDisabled,
    },
    actions: {
      selectPreviewMode: setPreviewMode,
      selectWeekday: setWeekday,
      changeDate: setDate,
      setShowStaticPatterns,
      setShowActualTimetable,
      selectPreviewPole: poles.selectPreviewPole,
      openRouteEditor: editors.openRouteEditor,
      openPoleNameEditor: editors.openPoleNameEditor,
      openCellEditor: editors.openCellEditor,
      togglePatternUsage: editors.togglePatternUsage,
      updatePoleNameEditor: setPoleNameEditor,
      updateRouteEditor: setRouteEditor,
      updateCellEditor: setCellEditor,
      updateRouteDisplayOverride: editors.updateRouteDisplayOverride,
      dragPreviewPole: poles.dragPreviewPole,
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
        exportDisabled: display.exportDisabled,
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
          previewConstructedRoutes: display.previewConstructedRoutes,
          routeDisplayOverridesByKey: display.routeDisplayOverridesByKey,
          previewTimesByPatternKey: display.previewTimesByPatternKey,
          previewTimesByTripKey: display.previewTimesByTripKey,
          showStaticPatterns,
          showActualTimetable,
          selectedPoleIds,
        },
        actions: {
          onDragEnd: poles.dragPreviewPole,
          onSelectPole: poles.selectPreviewPole,
          onOpenRouteEditor: editors.openRouteEditor,
          onOpenPoleNameEditor: editors.openPoleNameEditor,
          onOpenCellEditor: editors.openCellEditor,
          onTogglePatternUsage: editors.togglePatternUsage,
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
          updateRouteDisplayOverride: editors.updateRouteDisplayOverride,
          onUpdate,
          onConfirmPendingPoleMerge: poles.confirmPendingPoleMerge,
          onCancelPendingPoleMerge: () => setPendingPoleMerge(null),
        },
      },
    },
  }
}
