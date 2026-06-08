import { Draggable, Droppable } from '@hello-pangea/dnd'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import { Box } from '@mui/material'
import {
  buildProPreviewCellDisplay,
  disabledPreviewCellStyle,
  isProPatternExcluded,
  justifyTextClass,
  previewHoverClass,
  proDisplayFontCss,
} from '../../model/pro-preview-display-helpers'
import { proPoleDefaultLocationName, proPoleDisplayLocationName, proPoleDisplayName } from '../../model/pro-pole-stop-helpers'
import { proRouteKey, proTripRouteKey } from '../../model/pro-route-keys'
import { countConsecutivePoleNames, proPoleRawJoko } from '../../model/pro-preview-table-helpers'
import { PreviewCellText } from './pro-preview-parts'
import type { ProPreviewTableProps } from './pro-preview-table'

export function ProPreviewTableBody({ data, actions }: ProPreviewTableProps) {
  const {
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
    hoveredTargetId,
    selectedPoleIds,
  } = data
  const { onHoverTarget, onSelectPole, onOpenPoleNameEditor, onOpenCellEditor } = actions

  return (
    <Droppable
      droppableId="pro-preview-poles"
      isCombineEnabled
      renderClone={(provided, snapshot, rubric) => {
        const pole = preset.poles[rubric.source.index]
        const name = pole ? proPoleDisplayName(pole, stopMap) : ''
        const locationName = pole ? proPoleDisplayLocationName(pole, stopMap) : ''
        const selected = pole ? selectedPoleIds.includes(pole.id) : false
        const selectedCount = selected ? selectedPoleIds.length : 0

        return (
          <table className="pro-preview-table pro-preview-drag-table">
            <tbody>
              <tr
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                className={`pro-preview-body-row${selected ? ' pro-preview-row-selected' : ''}${
                  snapshot.isDragging ? ' pro-preview-row-dragging' : ''
                }`}
              >
                <td className={`pro-preview-dnd-handle${selected ? ' pro-preview-dnd-handle-selected' : ''}`}>
                  <DragIndicatorIcon fontSize="small" />
                  {selectedCount > 1 && (
                    <Box component="span" className="pro-preview-selection-count">
                      {selectedCount}
                    </Box>
                  )}
                </td>
                <td className="pro-preview-pole-name">
                  <Box component="span" className={`pro-preview-pole-name-text ${justifyTextClass(name)}`}>
                    {name}
                  </Box>
                </td>
                <td className="pro-preview-platform">{locationName}</td>
                <td className="pro-preview-joko"> </td>
              </tr>
            </tbody>
          </table>
        )
      }}
    >
      {(provided) => (
        <tbody ref={provided.innerRef} {...provided.droppableProps}>
          {preset.poles.map((pole, poleIndex) => {
            const primaryStop = pole.stops[0]
            const primary = primaryStop ? stopMap[`${primaryStop.sourceId}::${primaryStop.id}`] : null
            const defaultName = primary?.name ?? pole.id
            const name = proPoleDisplayName(pole, stopMap)
            const defaultLocationName = proPoleDefaultLocationName(pole, stopMap)
            const locationName = proPoleDisplayLocationName(pole, stopMap)
            const poleNameMergedIntoPrevious = poleIndex > 0 && proPoleDisplayName(preset.poles[poleIndex - 1], stopMap) === name
            const poleNameRowSpan = poleNameMergedIntoPrevious ? 1 : countConsecutivePoleNames(preset.poles, poleIndex, stopMap)
            const terminalName = preset.poles.slice(poleIndex + 1).every((candidate) => proPoleDisplayName(candidate, stopMap) === name)
            const poleNameTargetId = `pole-name-${pole.id}`
            const rawJoko = proPoleRawJoko(preset.poles, poleIndex, constructedRoutes, stopMap)
            const previousRawJoko = poleIndex > 0 ? proPoleRawJoko(preset.poles, poleIndex - 1, constructedRoutes, stopMap) : null
            const joko = previousRawJoko === null ? rawJoko : previousRawJoko === rawJoko ? '〃' : rawJoko
            const openPoleEditor = () => onOpenPoleNameEditor(pole, defaultName, defaultLocationName, rawJoko)
            const sectionLineClass = poleNameMergedIntoPrevious ? ' pro-preview-section-line' : ''
            const selected = selectedPoleIds.includes(pole.id)
            const rowClasses = [
              'pro-preview-body-row',
              selected ? 'pro-preview-row-selected' : '',
              pole.override.rowShading || pole.override.majorStop ? 'pro-preview-row-shaded' : '',
              pole.override.stopNameBold || pole.override.majorStop ? 'pro-preview-stop-name-bold' : '',
              poleNameMergedIntoPrevious ? 'pro-preview-merged-stop-row' : '',
              terminalName ? 'pro-preview-terminal-row' : '',
              pole.override.branchStart ? 'pro-preview-branch-start-row' : '',
              pole.override.branchEnd ? 'pro-preview-branch-end-row' : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <Draggable key={pole.id} draggableId={`preview-pole-${pole.id}`} index={poleIndex}>
                {(draggableProvided, snapshot) => (
                  <tr
                    ref={draggableProvided.innerRef}
                    {...draggableProvided.draggableProps}
                    className={`${rowClasses}${snapshot.isDragging ? ' pro-preview-row-dragging' : ''}${
                      snapshot.combineTargetFor ? ' pro-preview-row-combine-target' : ''
                    }`}
                  >
                    <td
                      className={`pro-preview-dnd-handle${selected ? ' pro-preview-dnd-handle-selected' : ''}${sectionLineClass}`}
                      {...draggableProvided.dragHandleProps}
                      title="クリックで単独選択、⌘/Ctrl+クリックで複数選択、Shift+クリックで範囲選択"
                      onClick={(event) =>
                        onSelectPole(pole.id, poleIndex, event.shiftKey ? 'range' : event.metaKey || event.ctrlKey ? 'multiple' : 'single')
                      }
                    >
                      <DragIndicatorIcon fontSize="small" />
                    </td>
                    {!poleNameMergedIntoPrevious && (
                      <td
                        className={`pro-preview-pole-name pro-preview-editable${previewHoverClass(poleNameTargetId, hoveredTargetId)}`}
                        rowSpan={poleNameRowSpan > 1 ? poleNameRowSpan : undefined}
                        title="クリックして標柱設定を編集"
                        onMouseEnter={() => onHoverTarget(poleNameTargetId)}
                        onMouseLeave={() => onHoverTarget((current) => (current === poleNameTargetId ? null : current))}
                        onClick={openPoleEditor}
                        style={{ backgroundColor: pole.override.nameOverride ? '#fff3cd' : undefined }}
                      >
                        <Box component="span" className={`pro-preview-pole-name-text ${justifyTextClass(name)}`}>
                          {name}
                        </Box>
                      </td>
                    )}
                    <td
                      className={`pro-preview-platform pro-preview-editable${sectionLineClass}${previewHoverClass(`pole-location-${pole.id}`, hoveredTargetId)}`}
                      title="クリックして標柱設定を編集"
                      onMouseEnter={() => onHoverTarget(`pole-location-${pole.id}`)}
                      onMouseLeave={() => onHoverTarget((current) => (current === `pole-location-${pole.id}` ? null : current))}
                      onClick={openPoleEditor}
                      style={{ backgroundColor: pole.override.locationNameOverride ? '#fff3cd' : undefined }}
                    >
                      {locationName}
                    </td>
                    <td
                      className={`pro-preview-joko pro-preview-editable${sectionLineClass}${previewHoverClass(`pole-joko-${pole.id}`, hoveredTargetId)}`}
                      title="クリックして標柱設定を編集"
                      onMouseEnter={() => onHoverTarget(`pole-joko-${pole.id}`)}
                      onMouseLeave={() => onHoverTarget((current) => (current === `pole-joko-${pole.id}` ? null : current))}
                      onClick={openPoleEditor}
                      style={{ backgroundColor: pole.override.jokoOverride ? '#fff3cd' : undefined }}
                    >
                      {joko}
                    </td>
                    {showStaticPatterns &&
                      previewConstructedRoutes.flatMap((route) =>
                        route.stopPatterns.map((pattern, index) => {
                          const routeKey = proRouteKey(route, pattern)
                          const excluded = isProPatternExcluded(preset, route, pattern)
                          const cellDisplay = buildProPreviewCellDisplay(routeDisplayOverridesByKey[routeKey], preset.poles, poleIndex)

                          if (cellDisplay.hidden) return null

                          const targetId = `cell-${routeKey}-${pole.id}`
                          const text = cellDisplay.textOverride ?? previewTimesByPatternKey[routeKey]?.[poleIndex] ?? ''
                          const displayText = pole.override.horizontalLine && !cellDisplay.overridden && text === '…' ? '——' : text

                          return (
                            <td
                              key={`${route.sourceId}-${route.route.routeId}-${index}-${pole.id}`}
                              className={`pro-preview-time-cell${
                                excluded
                                  ? sectionLineClass
                                  : `${sectionLineClass} pro-preview-editable${previewHoverClass(targetId, hoveredTargetId)}`
                              }`}
                              rowSpan={cellDisplay.rowSpan > 1 ? cellDisplay.rowSpan : undefined}
                              title={excluded ? 'この停車パターンは使用しない' : 'クリックしてセル上書きを編集'}
                              onMouseEnter={() => !excluded && onHoverTarget(targetId)}
                              onMouseLeave={() => onHoverTarget((current) => (current === targetId ? null : current))}
                              onClick={() => !excluded && onOpenCellEditor(route, pattern, pole, name)}
                              style={{
                                ...(excluded ? disabledPreviewCellStyle : {}),
                                backgroundColor: excluded
                                  ? disabledPreviewCellStyle.backgroundColor
                                  : cellDisplay.overridden
                                    ? '#fff3cd'
                                    : undefined,
                                fontFamily: cellDisplay.font ? proDisplayFontCss(cellDisplay.font) : undefined,
                              }}
                            >
                              <PreviewCellText text={displayText} rowSpan={cellDisplay.rowSpan} />
                            </td>
                          )
                        }),
                      )}
                    {showActualTimetable &&
                      constructedTrips.map((trip, index) => {
                        const routeKey = proTripRouteKey(trip)
                        const cellDisplay = buildProPreviewCellDisplay(routeDisplayOverridesByKey[routeKey], preset.poles, poleIndex)

                        if (cellDisplay.hidden) return null

                        const tripKey = `${trip.sourceId}::${trip.stopTime[0]?.tripId ?? index}`
                        const text = cellDisplay.textOverride ?? previewTimesByTripKey[tripKey]?.[poleIndex] ?? ''
                        const displayText = pole.override.horizontalLine && !cellDisplay.overridden && text === '…' ? '——' : text

                        return (
                          <td
                            key={`actual-time-${trip.sourceId}-${trip.stopTime[0]?.tripId ?? index}-${pole.id}`}
                            className={`pro-preview-time-cell${sectionLineClass}`}
                            rowSpan={cellDisplay.rowSpan > 1 ? cellDisplay.rowSpan : undefined}
                            style={{ fontFamily: cellDisplay.font ? proDisplayFontCss(cellDisplay.font) : undefined }}
                          >
                            <PreviewCellText text={displayText} rowSpan={cellDisplay.rowSpan} />
                          </td>
                        )
                      })}
                  </tr>
                )}
              </Draggable>
            )
          })}
          {provided.placeholder}
        </tbody>
      )}
    </Droppable>
  )
}
