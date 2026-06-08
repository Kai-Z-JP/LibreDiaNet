import { Box, Typography } from '@mui/material'
import { displayRouteName } from '../../../../utils'
import {
  disabledPreviewCellStyle,
  hasProDestinationOverride,
  hasProRouteNameOverride,
  isProPatternExcluded,
  previewHoverClass,
  proDisplayFontCss,
  splitDestinationColumns,
} from '../../model/pro-preview-display-helpers'
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
    hoveredTargetId,
  } = data
  const { onHoverTarget, onOpenRouteEditor } = actions

  return (
    <thead>
      <tr>
        <td colSpan={4} className="pro-preview-stub">
          {'路\u3000\u3000線'}
        </td>
        {showStaticPatterns &&
          previewConstructedRoutes.flatMap((route) =>
            route.stopPatterns.map((pattern, index) => {
              const excluded = isProPatternExcluded(preset, route, pattern)
              return (
                <td
                  key={`route-${route.sourceId}-${route.route.routeId}-${index}`}
                  className="pro-preview-route-cell"
                  style={excluded ? disabledPreviewCellStyle : undefined}
                >
                  <Box sx={{ display: 'grid', gap: 0.25 }}>
                    <Typography component="span" variant="caption" sx={{ lineHeight: 1, color: 'text.secondary' }}>
                      P{index + 1}
                    </Typography>
                    <span>{displayRouteName(route.route.shortName, route.route.longName) || ' '}</span>
                  </Box>
                </td>
              )
            }),
          )}
        {showActualTimetable &&
          constructedTrips.map((trip, index) => (
            <td key={`actual-route-${trip.sourceId}-${trip.stopTime[0]?.tripId ?? index}`} className="pro-preview-route-cell">
              {trip.routeName || ' '}
            </td>
          ))}
      </tr>
      <tr>
        <td colSpan={4} className="pro-preview-stub">
          {'系\u3000\u3000統'}
        </td>
        {showStaticPatterns &&
          previewConstructedRoutes.flatMap((route) =>
            route.stopPatterns.map((pattern, index) => {
              const routeKey = proRouteKey(route, pattern)
              const excluded = isProPatternExcluded(preset, route, pattern)
              const targetId = `route-name-${routeKey}`
              const override = routeDisplayOverridesByKey[routeKey]
              const defaultRouteName = displayRouteName(route.route.shortName, route.route.longName)
              const routeName = override?.routeNameOverride ?? defaultRouteName
              return (
                <td
                  key={`name-${route.sourceId}-${route.route.routeId}-${index}`}
                  className={`pro-preview-route-cell${excluded ? '' : ` pro-preview-editable${previewHoverClass(targetId, hoveredTargetId)}`}`}
                  title={excluded ? 'この停車パターンは使用しない' : 'クリックして路線表示設定を編集'}
                  onMouseEnter={() => !excluded && onHoverTarget(targetId)}
                  onMouseLeave={() => onHoverTarget((current) => (current === targetId ? null : current))}
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
                  <span
                    className="pro-preview-route-name"
                    style={{ fontFamily: override?.routeNameFont ? proDisplayFontCss(override.routeNameFont) : undefined }}
                  >
                    {routeName || ' '}
                  </span>
                </td>
              )
            }),
          )}
        {showActualTimetable &&
          constructedTrips.map((trip, index) => {
            const routeKey = proTripRouteKey(trip)
            const override = routeDisplayOverridesByKey[routeKey]
            const routeName = override?.routeNameOverride ?? ''
            return (
              <td key={`actual-name-${trip.sourceId}-${trip.stopTime[0]?.tripId ?? index}`} className="pro-preview-route-cell">
                <span
                  className="pro-preview-route-name"
                  style={{ fontFamily: override?.routeNameFont ? proDisplayFontCss(override.routeNameFont) : undefined }}
                >
                  {routeName || ' '}
                </span>
              </td>
            )
          })}
      </tr>
      <tr>
        <td colSpan={4} className="pro-preview-stub">
          {'担\u3000\u3000当'}
        </td>
        {showStaticPatterns &&
          previewConstructedRoutes.flatMap((route) =>
            route.stopPatterns.map((pattern, index) => (
              <td
                key={`operator-${route.sourceId}-${route.route.routeId}-${index}`}
                className="pro-preview-route-cell"
                style={isProPatternExcluded(preset, route, pattern) ? disabledPreviewCellStyle : undefined}
              >
                {' '}
              </td>
            )),
          )}
        {showActualTimetable &&
          constructedTrips.map((trip, index) => (
            <td key={`actual-operator-${trip.sourceId}-${trip.stopTime[0]?.tripId ?? index}`} className="pro-preview-route-cell">
              {' '}
            </td>
          ))}
      </tr>
      <tr>
        <td colSpan={4} className="pro-preview-stub">
          {'行\u3000\u3000先'}
        </td>
        {showStaticPatterns &&
          previewConstructedRoutes.flatMap((route) =>
            route.stopPatterns.map((pattern, index) => {
              const routeKey = proRouteKey(route, pattern)
              const excluded = isProPatternExcluded(preset, route, pattern)
              const targetId = `route-destination-${routeKey}`
              const override = routeDisplayOverridesByKey[routeKey]
              const defaultDestination = pattern.at(-1)?.name ?? ''
              const destinations = splitDestinationColumns(override?.destinationOverride ?? defaultDestination)
              return (
                <td
                  key={`dest-${route.sourceId}-${route.route.routeId}-${index}`}
                  className={`pro-preview-destination-cell${excluded ? '' : ` pro-preview-editable${previewHoverClass(targetId, hoveredTargetId)}`}`}
                  title={excluded ? 'この停車パターンは使用しない' : 'クリックして路線表示設定を編集'}
                  onMouseEnter={() => !excluded && onHoverTarget(targetId)}
                  onMouseLeave={() => onHoverTarget((current) => (current === targetId ? null : current))}
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
            }),
          )}
        {showActualTimetable &&
          constructedTrips.map((trip, index) => {
            const routeKey = proTripRouteKey(trip)
            const override = routeDisplayOverridesByKey[routeKey]
            const destinationStopId = trip.stopTime.at(-1)?.stopId
            const defaultDestination = destinationStopId ? (stopMap[`${trip.sourceId}::${destinationStopId}`]?.name ?? '') : ''
            const destination = override?.destinationOverride ?? defaultDestination
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
