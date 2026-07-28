import type { Dispatch, SetStateAction } from 'react'
import type { GtfsStop, ProPoleDetail, ProPreset } from '../../../types'
import { displayRouteName, stopPatternKey } from '../../../utils'
import { proExcludedPatternKey, proPoleStopKey, proRouteDisplayLabel, proStopDisplayLabel } from './pro-pole-stop-helpers'
import { normalizeProRouteDisplayOverride } from './pro-preview-display-helpers'
import { proRouteKey } from './pro-route-keys'
import type { ProConstructedRoute } from './pro-types'
import type { ProPoleNameEditor, ProRouteEditor, ProStopCellEditor } from './use-pro-preview-state'

type RouteDisplayOverride = ProPreset['routeDisplayOverrides'][number]
type RouteDisplayOverrideByKey = Record<string, RouteDisplayOverride>

export function useProPreviewEditors({
  preset,
  stopMap,
  constructedRoutes,
  includeSourceNameInRoute,
  routeDisplayOverridesByKey,
  onUpdate,
  setPoleNameEditor,
  setRouteEditor,
  setCellEditor,
}: {
  preset: ProPreset
  stopMap: Record<string, GtfsStop>
  constructedRoutes: ProConstructedRoute[]
  includeSourceNameInRoute: boolean
  routeDisplayOverridesByKey: RouteDisplayOverrideByKey
  onUpdate: (preset: ProPreset) => void
  setPoleNameEditor: Dispatch<SetStateAction<ProPoleNameEditor | null>>
  setRouteEditor: Dispatch<SetStateAction<ProRouteEditor | null>>
  setCellEditor: Dispatch<SetStateAction<ProStopCellEditor | null>>
}) {
  const updateRouteDisplayOverride = (
    routeKey: string,
    transform: (current: NonNullable<RouteDisplayOverride>) => RouteDisplayOverride | null,
    transformPreset: (current: ProPreset) => ProPreset = (current) => current,
  ) => {
    const current = routeDisplayOverridesByKey[routeKey] ?? {
      routeKey,
      routeNameOverride: null,
      destinationOverride: null,
      useTripHeadsignAsDestination: false,
      stopCellOverrides: [],
    }
    const nextOverride = normalizeProRouteDisplayOverride(transform(current))
    onUpdate(
      transformPreset({
        ...preset,
        routeDisplayOverrides: [
          ...preset.routeDisplayOverrides.filter((override) => override.routeKey !== routeKey),
          ...(nextOverride ? [nextOverride] : []),
        ].toSorted((left, right) => left.routeKey.localeCompare(right.routeKey)),
      }),
    )
  }

  const openRouteEditor = (route: ProConstructedRoute, pattern: GtfsStop[]) => {
    const routeKey = proRouteKey(route, pattern)
    openRouteEditorByRouteKey(
      routeKey,
      proRouteDisplayLabel(route, includeSourceNameInRoute),
      displayRouteName(route.route.shortName, route.route.longName),
      pattern.at(-1)?.name ?? '',
    )
  }

  const openRouteEditorByRouteKey = (routeKey: string, routeLabel: string, defaultRouteName: string, defaultDestination: string) => {
    const override = routeDisplayOverridesByKey[routeKey]
    setRouteEditor({
      routeKey,
      routeLabel,
      routeName: override?.routeNameOverride ?? defaultRouteName,
      defaultRouteName,
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
      name: pole.override.nameOverride ?? defaultName,
      locationName: pole.override.locationNameOverride ?? defaultLocationName,
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
    const cellOverride = routeDisplayOverridesByKey[routeKey]?.stopCellOverrides.find((override) => override.poleId === pole.id)
    const patternKey = stopPatternKey(pattern)
    const relatedStops = pole.stops.filter((stop) => stop.sourceId === route.sourceId && stop.stopPatternKey === patternKey)
    setCellEditor({
      routeKey,
      poleId: pole.id,
      routeLabel,
      stopLabel,
      poleStops: relatedStops.map((stop) => ({
        key: proPoleStopKey(stop),
        label: proStopDisplayLabel(stop, stopMap, constructedRoutes, includeSourceNameInRoute),
      })),
      originalPoleStopKeys: relatedStops.map(proPoleStopKey),
      originalText: cellOverride?.text ?? '',
      originalRowSpan: cellOverride?.rowSpan ?? 1,
      originalMincho: cellOverride?.mincho ?? false,
      text: cellOverride?.text ?? '',
      useRowSpan: (cellOverride?.rowSpan ?? 1) > 1,
      rowSpanText: String(cellOverride?.rowSpan ?? 2),
      mincho: cellOverride?.mincho ?? false,
    })
  }

  const togglePatternUsage = (route: ProConstructedRoute, pattern: GtfsStop[]) => {
    const patternKey = proExcludedPatternKey(route.sourceId, pattern)
    const excluded = preset.excludedStopPatterns.some((patternEntry) => patternEntry[0] === patternKey)
    onUpdate({
      ...preset,
      excludedStopPatterns: excluded
        ? preset.excludedStopPatterns.filter((patternEntry) => patternEntry[0] !== patternKey)
        : [...preset.excludedStopPatterns, [patternKey]].toSorted((left, right) => (left[0] ?? '').localeCompare(right[0] ?? '')),
    })
  }

  return {
    updateRouteDisplayOverride,
    openRouteEditor,
    openPoleNameEditor,
    openCellEditor,
    togglePatternUsage,
  }
}
