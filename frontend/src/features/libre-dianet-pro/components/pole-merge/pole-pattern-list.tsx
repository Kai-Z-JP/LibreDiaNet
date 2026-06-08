import { Draggable, Droppable } from '@hello-pangea/dnd'
import AddIcon from '@mui/icons-material/Add'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Checkbox, FormControlLabel, Typography } from '@mui/material'
import type { Dispatch, SetStateAction } from 'react'
import type { GtfsStop, ProPreset } from '../../../../types'
import { proExcludedPatternKey, proPoleStopFromPatternStop, proPoleStopKey, proRouteDisplayLabel } from '../../model/pro-pole-stop-helpers'
import type { PolePatternMap } from '../../hooks/use-pole-merge-model'
import type { ProConstructedRoute } from '../../model/pro-types'

type PolePatternListProps = {
  data: {
    preset: ProPreset
    patternMap: PolePatternMap
    usedPoleStopKeys: Set<string>
    selectedStopMap: Record<string, number[]>
    includeSourceNameInRoute: boolean
  }
  actions: {
    onSelectStops: Dispatch<SetStateAction<Record<string, number[]>>>
    onToggleExcludedPattern: (route: ProConstructedRoute, pattern: GtfsStop[]) => void
    onAddPatternStops: (route: ProConstructedRoute, pattern: GtfsStop[]) => void
  }
}

export function PolePatternList({ data, actions }: PolePatternListProps) {
  const { preset, patternMap, usedPoleStopKeys, selectedStopMap, includeSourceNameInRoute } = data
  const { onSelectStops, onToggleExcludedPattern, onAddPatternStops } = actions

  return (
    <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
      {Object.entries(patternMap).map(([key, { route, pattern, presetPatternIndex }]) => {
        const excluded = preset.excludedStopPatterns.some(
          (patternEntry) => patternEntry[0] === proExcludedPatternKey(route.sourceId, pattern),
        )
        const allStopsUsed = pattern.every((stop, index) =>
          usedPoleStopKeys.has(proPoleStopKey(proPoleStopFromPatternStop(route, pattern, stop, index))),
        )

        return (
          <Accordion
            key={key}
            disableGutters
            elevation={0}
            sx={{
              opacity: excluded ? 0.68 : 1,
              backgroundColor: '#eaeef6',
              '&:before': { display: 'none' },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'grid', gap: 1, width: '100%' }}>
                <Typography>
                  P{presetPatternIndex + 1}: {proRouteDisplayLabel(route, includeSourceNameInRoute)} ({pattern[0]?.name} -{' '}
                  {pattern.at(-1)?.name})
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <FormControlLabel
                    onClick={(event) => event.stopPropagation()}
                    onFocus={(event) => event.stopPropagation()}
                    control={<Checkbox checked={excluded} onChange={() => onToggleExcludedPattern(route, pattern)} />}
                    label="この停車パターンは使用しない"
                  />
                  <Button
                    component="span"
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    disabled={excluded || allStopsUsed}
                    onClick={(event) => {
                      event.stopPropagation()
                      onAddPatternStops(route, pattern)
                    }}
                  >
                    全て追加
                  </Button>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <PatternStops
                patternKey={key}
                route={route}
                pattern={pattern}
                excluded={excluded}
                usedPoleStopKeys={usedPoleStopKeys}
                selectedStopMap={selectedStopMap}
                onSelectStops={onSelectStops}
              />
            </AccordionDetails>
          </Accordion>
        )
      })}
    </Box>
  )
}

function PatternStops({
  patternKey,
  route,
  pattern,
  excluded,
  usedPoleStopKeys,
  selectedStopMap,
  onSelectStops,
}: {
  patternKey: string
  route: ProConstructedRoute
  pattern: GtfsStop[]
  excluded: boolean
  usedPoleStopKeys: Set<string>
  selectedStopMap: Record<string, number[]>
  onSelectStops: Dispatch<SetStateAction<Record<string, number[]>>>
}) {
  return (
    <Droppable droppableId={patternKey} isDropDisabled>
      {(provided) => (
        <Box ref={provided.innerRef} {...provided.droppableProps} sx={{ display: 'grid', gap: 0.5 }}>
          {pattern.map((stop, index) => {
            const stopRef = proPoleStopFromPatternStop(route, pattern, stop, index)
            const used = usedPoleStopKeys.has(proPoleStopKey(stopRef))
            const disabled = excluded || used
            const selected = selectedStopMap[patternKey]?.includes(index) ?? false
            const selectedCount = selectedStopMap[patternKey]?.length ?? 0

            return (
              <Draggable key={`${patternKey}-${index}`} draggableId={`${patternKey}@@${index}`} index={index} isDragDisabled={disabled}>
                {(draggableProvided) => (
                  <Box
                    ref={draggableProvided.innerRef}
                    {...draggableProvided.draggableProps}
                    {...(disabled ? {} : draggableProvided.dragHandleProps)}
                    onClick={() => !disabled && toggleStopSelection(onSelectStops, patternKey, index)}
                    sx={{
                      p: 1,
                      backgroundColor: used ? '#eef1f5' : selected ? 'lightblue' : 'white',
                      borderRadius: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 1,
                      color: disabled ? 'text.disabled' : undefined,
                      cursor: disabled ? 'not-allowed' : 'grab',
                    }}
                  >
                    <Typography>{stop.name}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      {selected && selectedCount > 1 && (
                        <Typography variant="body2" sx={{ color: 'primary.main' }}>
                          +{selectedCount - 1}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        {used ? '使用済み' : stop.stopId}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Draggable>
            )
          })}
          {provided.placeholder}
        </Box>
      )}
    </Droppable>
  )
}

function toggleStopSelection(onSelectStops: Dispatch<SetStateAction<Record<string, number[]>>>, patternKey: string, index: number) {
  onSelectStops((current) => {
    const currentSelection = current[patternKey] ?? []
    const exists = currentSelection.includes(index)
    return {
      ...current,
      [patternKey]: exists
        ? currentSelection.filter((item) => item !== index)
        : [...currentSelection, index].toSorted((left, right) => left - right),
    }
  })
}
