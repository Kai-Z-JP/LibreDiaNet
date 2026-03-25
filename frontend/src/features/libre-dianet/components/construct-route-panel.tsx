import CheckIcon from '@mui/icons-material/Check'
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DraggableProvidedDragHandleProps,
  type DraggableProvidedDraggableProps,
  type DropResult,
} from '@hello-pangea/dnd'
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Checkbox, FormControlLabel, Typography } from '@mui/material'
import type { CSSProperties, ReactNode } from 'react'
import { Fragment, useMemo, useState } from 'react'
import { EMPTY_OVERRIDE } from '../../../types'
import type { ConstructedRoute, GtfsStop, PoleDetail } from '../../../types'
import { displayRouteName, stopPatternKey } from '../../../utils'

type Props = {
  sortedStops: PoleDetail[]
  stopMap: Record<string, GtfsStop>
  constructedRoutes: ConstructedRoute[]
  excludedStopPatterns: string[][]
  onChange: (nextStops: PoleDetail[]) => void
  onChangeExcludedPatterns: (nextPatterns: string[][]) => void
}

type PoleCardProvidedProps = {
  ref: (element: HTMLElement | null) => void
  draggableProps: DraggableProvidedDraggableProps
  dragHandleProps?: DraggableProvidedDragHandleProps
  style?: CSSProperties
}

function PoleCard({
  stop,
  selected = false,
  disabled = false,
  clone = false,
  badgeCount = 0,
  providedProps,
  onClick,
  children,
}: {
  stop: GtfsStop
  selected?: boolean
  disabled?: boolean
  clone?: boolean
  badgeCount?: number
  providedProps?: PoleCardProvidedProps
  onClick?: () => void
  children?: ReactNode
}) {
  return (
    <Box
      ref={providedProps?.ref}
      {...(providedProps?.draggableProps ?? {})}
      style={providedProps?.style}
      sx={{
        backgroundColor: selected && !disabled && !clone ? 'lightblue' : 'white',
        borderRadius: '4px',
        mb: 1,
        userSelect: 'none',
        opacity: disabled || clone ? 0.5 : 1,
        transform: clone ? 'none !important' : undefined,
      }}
    >
      <Box
        onClick={onClick}
        {...(providedProps?.dragHandleProps ?? {})}
        sx={{
          p: '8px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          cursor: onClick && !disabled ? 'pointer' : 'auto',
          position: 'relative',
        }}
      >
        <Typography
          sx={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {stop.name}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: 'gray',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {stop.stopId}
        </Typography>
        {badgeCount > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              backgroundColor: 'orange',
              borderRadius: '50%',
              aspectRatio: '1 / 1',
              minWidth: 20,
              display: 'grid',
              placeItems: 'center',
              fontSize: 12,
            }}
          >
            {`+${badgeCount}`}
          </Box>
        )}
      </Box>
      {children ? <Box sx={{ cursor: 'auto' }}>{children}</Box> : null}
    </Box>
  )
}

function hasVisibleOverride(pole: PoleDetail) {
  return (
    pole.override.majorStop ||
    pole.override.branchStart ||
    pole.override.branchEnd ||
    pole.override.nameOverride !== null ||
    pole.override.locationNameOverride !== null
  )
}

function SortedPoleCard({
  pole,
  stop,
  open,
  onToggle,
  clone = false,
  providedProps,
  onChange,
}: {
  pole: PoleDetail
  stop: GtfsStop
  open: boolean
  onToggle: () => void
  clone?: boolean
  providedProps?: PoleCardProvidedProps
  onChange: (nextPole: PoleDetail) => void
}) {
  return (
    <PoleCard stop={stop} clone={clone} providedProps={providedProps} onClick={onToggle}>
      {open ? (
        <Box sx={{ px: '8px' }}>
          <FormControlLabel
            label="主要停留所"
            control={
              <Checkbox
                checked={pole.override.majorStop}
                onChange={(_, checked) =>
                  onChange({
                    ...pole,
                    override: { ...pole.override, majorStop: checked },
                  })
                }
              />
            }
          />
          <FormControlLabel
            label="分岐発停"
            control={
              <Checkbox
                checked={pole.override.branchStart}
                onChange={(_, checked) =>
                  onChange({
                    ...pole,
                    override: { ...pole.override, branchStart: checked },
                  })
                }
              />
            }
          />
          <FormControlLabel
            label="分岐着停"
            control={
              <Checkbox
                checked={pole.override.branchEnd}
                onChange={(_, checked) =>
                  onChange({
                    ...pole,
                    override: { ...pole.override, branchEnd: checked },
                  })
                }
              />
            }
          />
        </Box>
      ) : null}
    </PoleCard>
  )
}

export function ConstructRoutePanel({
  sortedStops,
  stopMap,
  constructedRoutes,
  excludedStopPatterns,
  onChange,
  onChangeExcludedPatterns,
}: Props) {
  const [selectedPoleMap, setSelectedPoleMap] = useState<Record<string, number[]>>({})
  const [sortedOpenMap, setSortedOpenMap] = useState<Record<string, boolean>>({})
  const stopPatternMap = useMemo(
    () =>
      Object.fromEntries(
        constructedRoutes.flatMap((route) =>
          route.stopPatterns.map((stopPattern, index) => [
            `${route.route.routeId}_${route.direction ?? 'null'} / ${index}`,
            { route: route.route, stopPattern },
          ]),
        ),
      ),
    [constructedRoutes],
  )

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || result.destination.droppableId !== 'sorted') {
      return
    }

    const nextStops = [...sortedStops]
    if (result.source.droppableId === 'sorted') {
      const [moved] = nextStops.splice(result.source.index, 1)
      nextStops.splice(result.destination.index, 0, moved)
      onChange(nextStops)
      return
    }

    const [rawIndex, patternKey] = result.draggableId.split('|')
    const poleIndex = Number(rawIndex)
    const selected = selectedPoleMap[result.source.droppableId] ?? []
    const stopPattern = stopPatternMap[patternKey]?.stopPattern ?? []
    if (selected.includes(poleIndex) && selected.length > 1) {
      nextStops.splice(
        result.destination.index,
        0,
        ...selected.map((index) => ({ id: stopPattern[index].stopId, override: EMPTY_OVERRIDE })),
      )
      setSelectedPoleMap((current) => {
        const next = { ...current }
        delete next[result.source.droppableId]
        return next
      })
    } else {
      nextStops.splice(result.destination.index, 0, { id: stopPattern[poleIndex].stopId, override: EMPTY_OVERRIDE })
    }
    onChange(nextStops)
  }

  const toggleExcludedPattern = (pattern: string[]) => {
    const key = stopPatternKey(pattern)
    const next = excludedStopPatterns.filter((item) => stopPatternKey(item) !== key)
    onChangeExcludedPatterns(next.length === excludedStopPatterns.length ? [...excludedStopPatterns, pattern] : next)
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Box
        sx={{
          display: 'flex',
          overflow: 'hidden',
          height: '100%',
          minHeight: 0,
          mt: 2,
          '@media (max-width: 1024px)': {
            flexDirection: 'column',
            overflowY: 'auto',
          },
        }}
      >
        <Box
          sx={{
            width: { xs: '100%', lg: '50%' },
            overflowY: 'auto',
            scrollbarGutter: 'stable',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            pr: { xs: 0, lg: 2 },
            minHeight: 0,
          }}
        >
          <Button
            fullWidth
            variant="contained"
            disabled={constructedRoutes.flatMap((route) => route.stopPatterns).length !== 1}
            onClick={() => {
              const onlyPattern = constructedRoutes[0]?.stopPatterns[0] ?? []
              onChange(onlyPattern.map((stop) => ({ id: stop.stopId, override: EMPTY_OVERRIDE })))
              setSelectedPoleMap({})
            }}
          >
            単一経路自動構成
          </Button>
          {Object.entries(stopPatternMap).map(([patternKey, { route, stopPattern }]) => {
            const selected = selectedPoleMap[patternKey] ?? []
            const excluded = excludedStopPatterns.some(
              (pattern) => stopPatternKey(pattern) === stopPatternKey(stopPattern.map((stop) => stop.stopId)),
            )
            const sortedStopIds = sortedStops.map((stop) => stop.id)
            return (
              <Accordion
                key={patternKey}
                square
                disableGutters
                elevation={0}
                sx={{
                  borderRadius: '8px',
                  backgroundColor: '#eaeef6',
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      width: '100%',
                    }}
                  >
                    <Typography>
                      {route.routeId} {displayRouteName(route.shortName, route.longName)} ({stopPattern[0]?.name}-{stopPattern.at(-1)?.name}
                      )
                    </Typography>
                    {stopPattern.every((item) => sortedStopIds.includes(item.stopId)) ? <CheckIcon /> : null}
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Checkbox checked={excluded} onChange={() => toggleExcludedPattern(stopPattern.map((stop) => stop.stopId))} />
                  </Box>
                  <Droppable
                    droppableId={patternKey}
                    isDropDisabled
                    renderClone={(provided, _snapshot, rubric) => {
                      const stop = stopPattern[rubric.source.index]
                      const isSelected = selected.includes(rubric.source.index)
                      return (
                        <PoleCard
                          stop={stop}
                          selected={isSelected}
                          clone
                          badgeCount={isSelected && selected.length > 1 ? selected.length - 1 : 0}
                          providedProps={{
                            ref: provided.innerRef,
                            draggableProps: provided.draggableProps,
                            dragHandleProps: provided.dragHandleProps ?? undefined,
                            style: provided.draggableProps.style,
                          }}
                        />
                      )
                    }}
                  >
                    {(provided) => (
                      <Box ref={provided.innerRef} {...provided.droppableProps}>
                        {stopPattern.map((stop, index) => {
                          const disabled =
                            stopPattern.filter((item) => item.stopId === stop.stopId).length ===
                            sortedStops.filter((item) => item.id === stop.stopId).length
                          const draggableId = `${index}|${patternKey}`
                          return (
                            <Fragment key={`${patternKey}-${index}`}>
                              <Draggable draggableId={draggableId} index={index} isDragDisabled={disabled}>
                                {(draggableProvided) => (
                                  <PoleCard
                                    stop={stop}
                                    selected={selected.includes(index)}
                                    disabled={disabled}
                                    providedProps={{
                                      ref: draggableProvided.innerRef,
                                      draggableProps: draggableProvided.draggableProps,
                                      dragHandleProps: disabled ? undefined : (draggableProvided.dragHandleProps ?? undefined),
                                      style: draggableProvided.draggableProps.style,
                                    }}
                                    onClick={() =>
                                      !disabled &&
                                      setSelectedPoleMap((current) => {
                                        const currentSelection = current[patternKey] ?? []
                                        const exists = currentSelection.includes(index)
                                        return {
                                          ...current,
                                          [patternKey]: exists
                                            ? currentSelection.filter((item) => item !== index)
                                            : [...currentSelection, index].sort((left, right) => left - right),
                                        }
                                      })
                                    }
                                  />
                                )}
                              </Draggable>
                            </Fragment>
                          )
                        })}
                        {provided.placeholder}
                      </Box>
                    )}
                  </Droppable>
                </AccordionDetails>
              </Accordion>
            )
          })}
        </Box>
        <Box
          sx={{
            px: { xs: 0, lg: 2 },
            width: { xs: '100%', lg: '50%' },
            height: '100%',
            overflowY: 'auto',
            scrollbarGutter: 'stable',
            minHeight: 0,
          }}
        >
          <Box
            sx={{
              borderRadius: '8px',
              backgroundColor: '#eaeef6',
            }}
          >
            <Box sx={{ py: '12px', px: '16px' }}>
              <Typography>出力用標柱順</Typography>
            </Box>
            <Droppable
              droppableId="sorted"
              renderClone={(provided, _snapshot, rubric) => {
                const pole = sortedStops[rubric.source.index]
                const draggableId = `sorted-${rubric.source.index}`
                const open = sortedOpenMap[draggableId] ?? hasVisibleOverride(pole)
                const stop = {
                  stopId: pole.id,
                  name: stopMap[pole.id]?.name ?? pole.id,
                  platformCode: stopMap[pole.id]?.platformCode ?? null,
                }
                const handleChange = (nextPole: PoleDetail) =>
                  onChange(sortedStops.map((item, itemIndex) => (itemIndex === rubric.source.index ? nextPole : item)))

                return (
                  <SortedPoleCard
                    pole={pole}
                    stop={stop}
                    open={open}
                    onToggle={() => {}}
                    providedProps={{
                      ref: provided.innerRef,
                      draggableProps: provided.draggableProps,
                      dragHandleProps: provided.dragHandleProps ?? undefined,
                      style: provided.draggableProps.style,
                    }}
                    onChange={handleChange}
                  />
                )
              }}
            >
              {(provided) => (
                <Box ref={provided.innerRef} {...provided.droppableProps} sx={{ p: '16px', pt: '8px' }}>
                  {sortedStops.map((pole, index) => {
                    const draggableId = `sorted-${index}`
                    const open = sortedOpenMap[draggableId] ?? hasVisibleOverride(pole)
                    const stop = {
                      stopId: pole.id,
                      name: stopMap[pole.id]?.name ?? pole.id,
                      platformCode: stopMap[pole.id]?.platformCode ?? null,
                    }
                    const handleChange = (nextPole: PoleDetail) =>
                      onChange(sortedStops.map((item, itemIndex) => (itemIndex === index ? nextPole : item)))
                    return (
                      <Fragment key={`${pole.id}-${index}`}>
                        <Draggable draggableId={draggableId} index={index}>
                          {(draggableProvided) => (
                            <SortedPoleCard
                              pole={pole}
                              stop={stop}
                              open={open}
                              onToggle={() =>
                                setSortedOpenMap((current) => ({
                                  ...current,
                                  [draggableId]: !open,
                                }))
                              }
                              providedProps={{
                                ref: draggableProvided.innerRef,
                                draggableProps: draggableProvided.draggableProps,
                                dragHandleProps: draggableProvided.dragHandleProps ?? undefined,
                                style: draggableProvided.draggableProps.style,
                              }}
                              onChange={handleChange}
                            />
                          )}
                        </Draggable>
                      </Fragment>
                    )
                  })}
                  {provided.placeholder}
                </Box>
              )}
            </Droppable>
          </Box>
        </Box>
      </Box>
    </DragDropContext>
  )
}
