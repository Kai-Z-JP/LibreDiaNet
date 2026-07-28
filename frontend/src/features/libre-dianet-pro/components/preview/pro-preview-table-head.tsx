import { Box, Typography } from '@mui/material'
import { displayRouteName } from '../../../../utils'
import {
  disabledPreviewCellStyle,
  hasProDestinationOverride,
  hasProRouteNameOverride,
  isProPatternExcluded,
  proDestinationDisplay,
  splitDestinationColumns,
} from '../../model/pro-preview-display-helpers'
import { proRoutePatternEntries } from '../../model/pro-pole-stop-helpers'
import { proRouteKey, proTripRouteKey } from '../../model/pro-route-keys'
import { DestinationPreview } from './pro-preview-parts'
import type { ProPreviewTableProps } from './pro-preview-table'

export function ProPreviewTableHead({ data, actions }: ProPreviewTableProps) {
  const {
    preset,
    stopMap,
    constructedTrips,
    previewConstructedRoutes,
    routeDisplayOverridesByKey,
    showStaticPatterns,
    showActualTimetable,
  } = data
  const { onOpenRouteEditor, onTogglePatternUsage } = actions

  return (
    <thead>
      <tr>
        <td colSpan={4} className="pro-preview-stub">
          {'パターン'}
        </td>
        {showStaticPatterns &&
          proRoutePatternEntries(previewConstructedRoutes).map(({ route, pattern, presetPatternIndex }) => {
            const excluded = isProPatternExcluded(preset, route, pattern)
            return (
              <td
                key={`route-${presetPatternIndex}`}
                className="pro-preview-route-cell pro-preview-editable"
                title={excluded ? 'クリックしてこの停車パターンを使用する' : 'クリックしてこの停車パターンを使用しない'}
                onClick={() => onTogglePatternUsage(route, pattern)}
                style={{
                  ...(excluded ? disabledPreviewCellStyle : {}),
                  cursor: 'pointer',
                }}
              >
                <Box sx={{ display: 'grid', gap: 0.25 }}>
                  <Typography component="span" variant="caption" sx={{ lineHeight: 1, color: 'text.secondary' }}>
                    P{presetPatternIndex + 1}
                  </Typography>
                </Box>
              </td>
            )
          })}
        {showActualTimetable &&
          constructedTrips.map((trip, index) => (
            <td key={`actual-route-${trip.sourceId}-${trip.stopTime[0]?.tripId ?? index}`} className="pro-preview-route-cell"></td>
          ))}
      </tr>
      <tr>
        <td colSpan={4} className="pro-preview-stub">
          {'系\u3000\u3000統'}
        </td>
        {showStaticPatterns &&
          proRoutePatternEntries(previewConstructedRoutes).map(({ route, pattern, presetPatternIndex }) => {
            const routeKey = proRouteKey(route, pattern)
            const excluded = isProPatternExcluded(preset, route, pattern)
            const override = routeDisplayOverridesByKey[routeKey]
            const defaultRouteName = displayRouteName(route.route.shortName, route.route.longName)
            const routeName = override?.routeNameOverride ?? defaultRouteName
            return (
              <td
                key={`name-${presetPatternIndex}`}
                className={`pro-preview-route-cell${excluded ? '' : ' pro-preview-editable'}`}
                title={excluded ? 'この停車パターンは使用しない' : 'クリックして路線表示設定を編集'}
                onClick={() => !excluded && onOpenRouteEditor(route, pattern)}
                style={{
                  ...(excluded ? disabledPreviewCellStyle : {}),
                  backgroundColor: excluded
                    ? disabledPreviewCellStyle.backgroundColor
                    : hasProRouteNameOverride(override, defaultRouteName)
                      ? '#fff3cd'
                      : undefined,
                }}
              >
                <span className="pro-preview-route-name">{routeName || ' '}</span>
              </td>
            )
          })}
        {showActualTimetable &&
          constructedTrips.map((trip, index) => {
            const routeKey = proTripRouteKey(trip)
            const override = routeDisplayOverridesByKey[routeKey]
            const routeName = override?.routeNameOverride ?? trip.routeName
            return (
              <td key={`actual-name-${trip.sourceId}-${trip.stopTime[0]?.tripId ?? index}`} className="pro-preview-route-cell">
                <span className="pro-preview-route-name">{routeName || ' '}</span>
              </td>
            )
          })}
      </tr>
      <tr>
        <td colSpan={4} className="pro-preview-stub">
          {'行\u3000\u3000先'}
        </td>
        {showStaticPatterns &&
          proRoutePatternEntries(previewConstructedRoutes).map(({ route, pattern, presetPatternIndex }) => {
            const routeKey = proRouteKey(route, pattern)
            const excluded = isProPatternExcluded(preset, route, pattern)
            const override = routeDisplayOverridesByKey[routeKey]
            const defaultDestination = pattern.at(-1)?.name ?? ''
            const destinations = splitDestinationColumns(
              override?.useTripHeadsignAsDestination ? '※' : proDestinationDisplay(override, defaultDestination),
            )
            return (
              <td
                key={`dest-${presetPatternIndex}`}
                className={`pro-preview-destination-cell${excluded ? '' : ' pro-preview-editable'}`}
                title={excluded ? 'この停車パターンは使用しない' : 'クリックして路線表示設定を編集'}
                onClick={() => !excluded && onOpenRouteEditor(route, pattern)}
                style={{
                  ...(excluded ? disabledPreviewCellStyle : {}),
                  backgroundColor: excluded
                    ? disabledPreviewCellStyle.backgroundColor
                    : hasProDestinationOverride(override, defaultDestination)
                      ? '#fff3cd'
                      : undefined,
                }}
              >
                <DestinationPreview destinations={destinations} />
              </td>
            )
          })}
        {showActualTimetable &&
          constructedTrips.map((trip, index) => {
            const routeKey = proTripRouteKey(trip)
            const override = routeDisplayOverridesByKey[routeKey]
            const destinationStopId = trip.stopTime.at(-1)?.stopId
            const defaultDestination = destinationStopId ? (stopMap[`${trip.sourceId}::${destinationStopId}`]?.name ?? '') : ''
            const destination = proDestinationDisplay(override, defaultDestination, trip.tripHeadsign)
            return (
              <td key={`actual-dest-${trip.sourceId}-${trip.stopTime[0]?.tripId ?? index}`} className="pro-preview-destination-cell">
                <DestinationPreview destinations={splitDestinationColumns(destination)} />
              </td>
            )
          })}
      </tr>
    </thead>
  )
}
