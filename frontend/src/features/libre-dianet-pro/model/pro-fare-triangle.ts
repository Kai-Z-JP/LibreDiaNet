import type { FareV1Attribute, FareV1Data, FareV1Rule } from '../../../gtfsRepository'
import type { GtfsStop, ProPoleDetail, ProPoleStop } from '../../../types'
import { displayRouteName, stopPatternKey } from '../../../utils'
import { proPoleDisplayName, proPoleStopKey } from './pro-pole-stop-helpers'
import type { ProConstructedRoute } from './pro-types'

export type FareMode = 'cash' | 'ic'

export type FareTriangleAxisEntry = {
  key: string
  displayName: string
  poleIds: string[]
  stops: ProPoleStop[]
}

export type FareTriangleCandidate = {
  sourceId: string
  sourceName: string
  routeId: string
  routeName: string
  direction: number | null
  fareId: string
  cashPrice: number
  icPrice: number
  currency: string
  icFallback: boolean
  boardStopId: string
  boardName: string
  boardZone: string | null
  alightStopId: string
  alightName: string
  alightZone: string | null
}

export type FareTriangleCell = {
  originIndex: number
  destinationIndex: number
  candidates: FareTriangleCandidate[]
}

export type FareTriangleWarning =
  | {
      kind: 'missing-zone'
      sourceId: string
      stopId: string
      stopName: string
    }
  | {
      kind: 'unsupported-contains-rule'
      sourceId: string
      fareId: string
      containsId: string
    }

export type FareTriangle = {
  axis: FareTriangleAxisEntry[]
  cells: Record<string, FareTriangleCell>
  warnings: FareTriangleWarning[]
  missingZoneCount: number
  unsupportedContainsRuleCount: number
}

export type FareTrianglePresentationItem =
  | {
      kind: 'axis'
      /** Index into the unabridged triangle axis. */
      axisIndex: number
    }
  | {
      kind: 'range'
      /** First axis in the range, used as the representative fare row/column. */
      axisIndex: number
      /** Every consecutive original axis represented by this range, including both endpoints. */
      axisIndices: number[]
    }

export type FareTrianglePresentation = {
  items: FareTrianglePresentationItem[]
  /** Shared fare amounts when every origin/destination pair resolves to the same amounts. */
  uniformAmounts: number[] | null
}

export type BuildFareTriangleInput = {
  axis: FareTriangleAxisEntry[]
  constructedRoutes: ProConstructedRoute[]
  fareDataBySource: Record<string, FareV1Data>
  sourceNameMap: Record<string, string>
  stopMap: Record<string, GtfsStop>
  excludedStopPatterns?: string[][]
}

type PatternStopPair = {
  boardStop: ProPoleStop
  alightStop: ProPoleStop
}

type FarePatternContext = {
  sourceId: string
  sourceName: string
  routeId: string
  routeName: string
  direction: number | null
  fareData: FareV1Data
  routeAgencyId: string | null
  pattern: GtfsStop[]
  matchingStopsByAxis: ProPoleStop[][]
}

type FareResolutionCache = Map<string, Map<string, Map<string | null, Map<string | null, FareV1Attribute[]>>>>

/** Builds the fare-table axis, omitting empty poles and merging adjacent equal display names. */
export function buildFareTriangleAxis(poles: ProPoleDetail[], stopMap: Record<string, GtfsStop>): FareTriangleAxisEntry[] {
  const axis: FareTriangleAxisEntry[] = []

  for (const pole of poles) {
    if (pole.stops.length === 0) {
      continue
    }

    const displayName = proPoleDisplayName(pole, stopMap) || pole.stops[0]?.id || pole.id
    const previous = axis.at(-1)
    if (previous?.displayName === displayName) {
      previous.poleIds.push(pole.id)
      previous.key = previous.poleIds.join('::')
      previous.stops = distinctPoleStops([...previous.stops, ...pole.stops])
      continue
    }

    axis.push({
      key: pole.id,
      displayName,
      poleIds: [pole.id],
      stops: distinctPoleStops(pole.stops),
    })
  }

  return axis
}

export function fareTriangleCellKey(originIndex: number, destinationIndex: number): string {
  return `${originIndex}:${destinationIndex}`
}

/**
 * Resolves every lower-triangle cell against selected route patterns and GTFS Fares v1 data.
 * A pattern is eligible only when it contains the boarding pole before the alighting pole.
 */
export function buildFareTriangle({
  axis,
  constructedRoutes,
  fareDataBySource,
  sourceNameMap,
  stopMap,
  excludedStopPatterns = [],
}: BuildFareTriangleInput): FareTriangle {
  const cells: Record<string, FareTriangleCell> = {}
  const warnings = collectContainsRuleWarnings(fareDataBySource, selectedRouteIdsBySource(constructedRoutes))
  const warningKeys = new Set(warnings.map(fareTriangleWarningKey))
  const excludedPatternKeys = new Set(excludedStopPatterns.flatMap((entry) => (entry.length === 1 && entry[0] ? [entry[0]] : [])))
  const patternContexts = buildFarePatternContexts(axis, constructedRoutes, fareDataBySource, sourceNameMap, excludedPatternKeys)
  const fareResolutionCache: FareResolutionCache = new Map()

  for (let destinationIndex = 1; destinationIndex < axis.length; destinationIndex += 1) {
    for (let originIndex = 0; originIndex < destinationIndex; originIndex += 1) {
      const origin = axis[originIndex]
      const destination = axis[destinationIndex]
      const candidates: FareTriangleCandidate[] = []

      if (origin && destination) {
        for (const patternContext of patternContexts) {
          const boardStops = patternContext.matchingStopsByAxis[originIndex]
          const alightStops = patternContext.matchingStopsByAxis[destinationIndex]
          if (!boardStops || boardStops.length === 0 || !alightStops || alightStops.length === 0) {
            continue
          }

          const stopPairs = findForwardPatternStopPairs(boardStops, alightStops)
          for (const pair of stopPairs) {
            const boardPatternStop = patternContext.pattern[pair.boardStop.stopIndex]
            const alightPatternStop = patternContext.pattern[pair.alightStop.stopIndex]
            if (!boardPatternStop || !alightPatternStop) {
              continue
            }

            const boardZone = patternContext.fareData.stopZoneById[pair.boardStop.id] ?? null
            const alightZone = patternContext.fareData.stopZoneById[pair.alightStop.id] ?? null
            const boardName =
              stopMap[stopMapKey(patternContext.sourceId, pair.boardStop.id)]?.name ?? boardPatternStop.name ?? origin.displayName
            const alightName =
              stopMap[stopMapKey(patternContext.sourceId, pair.alightStop.id)]?.name ?? alightPatternStop.name ?? destination.displayName

            if (boardZone === null) {
              addWarning(warnings, warningKeys, {
                kind: 'missing-zone',
                sourceId: patternContext.sourceId,
                stopId: pair.boardStop.id,
                stopName: boardName,
              })
            }
            if (alightZone === null) {
              addWarning(warnings, warningKeys, {
                kind: 'missing-zone',
                sourceId: patternContext.sourceId,
                stopId: pair.alightStop.id,
                stopName: alightName,
              })
            }

            const attributes = cachedMatchingFareAttributes(fareResolutionCache, patternContext, boardZone, alightZone)
            for (const attribute of attributes) {
              candidates.push({
                sourceId: patternContext.sourceId,
                sourceName: patternContext.sourceName,
                routeId: patternContext.routeId,
                routeName: patternContext.routeName,
                direction: patternContext.direction,
                fareId: attribute.fareId,
                cashPrice: attribute.price,
                icPrice: attribute.icPrice ?? attribute.price,
                currency: attribute.currencyType,
                icFallback: attribute.icPrice === null,
                boardStopId: pair.boardStop.id,
                boardName,
                boardZone,
                alightStopId: pair.alightStop.id,
                alightName,
                alightZone,
              })
            }
          }
        }
      }

      cells[fareTriangleCellKey(originIndex, destinationIndex)] = {
        originIndex,
        destinationIndex,
        candidates: distinctCandidates(candidates),
      }
    }
  }

  return {
    axis,
    cells,
    warnings,
    missingZoneCount: warnings.filter((warning) => warning.kind === 'missing-zone').length,
    unsupportedContainsRuleCount: warnings.filter((warning) => warning.kind === 'unsupported-contains-rule').length,
  }
}

export function fareTriangleCellAmounts(cell: FareTriangleCell, mode: FareMode): number[] {
  const amounts = cell.candidates.map((candidate) => (mode === 'ic' ? candidate.icPrice : candidate.cashPrice))
  return Array.from(new Set(amounts.filter(Number.isFinite))).sort((left, right) => left - right)
}

/**
 * Builds the axis used to present a fare triangle.
 *
 * In abbreviated mode, two or more adjacent stops with the same fare profile are
 * represented by one range. The first stop supplies that range's fare row/column.
 * A profile consists only of the final displayed amount lists for the selected mode;
 * source, route, fare ID, zone and rule metadata do not participate in comparison.
 * Two unresolved cells are treated as equal for profile comparison, but unresolved
 * cells never produce a uniform fare.
 */
export function buildFareTrianglePresentation(triangle: FareTriangle, mode: FareMode, abbreviate: boolean): FareTrianglePresentation {
  const allAxisIndices = triangle.axis.map((_, index) => index)
  const allItems = allAxisIndices.map(axisPresentationItem)
  if (!abbreviate || triangle.axis.length < 2) {
    return { items: allItems, uniformAmounts: null }
  }

  const amountMatrix = buildFareAmountMatrix(triangle, mode)
  const uniformAmounts = uniformAmountsFromMatrix(amountMatrix)
  if (uniformAmounts !== null) {
    return { items: allItems, uniformAmounts }
  }

  const groups: number[][] = []
  for (const axisIndex of allAxisIndices) {
    const currentGroup = groups.at(-1)
    const representativeIndex = currentGroup?.[0]
    if (currentGroup && representativeIndex !== undefined && fareTriangleAxisProfilesEqual(amountMatrix, representativeIndex, axisIndex)) {
      currentGroup.push(axisIndex)
    } else {
      groups.push([axisIndex])
    }
  }

  return {
    items: groups.flatMap((group): FareTrianglePresentationItem[] => {
      const firstAxisIndex = group[0]
      if (group.length < 2 || firstAxisIndex === undefined) {
        return group.map(axisPresentationItem)
      }
      return [{ kind: 'range', axisIndex: firstAxisIndex, axisIndices: group }]
    }),
    uniformAmounts: null,
  }
}

function axisPresentationItem(axisIndex: number): FareTrianglePresentationItem {
  return { kind: 'axis', axisIndex }
}

/** Returns the common displayed amounts only when every pair is resolved and identical. */
export function fareTriangleUniformAmounts(triangle: FareTriangle, mode: FareMode): number[] | null {
  if (triangle.axis.length < 2) {
    return null
  }
  return uniformAmountsFromMatrix(buildFareAmountMatrix(triangle, mode))
}

function uniformAmountsFromMatrix(amountMatrix: FareAmountMatrix): number[] | null {
  let uniformAmounts: number[] | null = null
  for (let destinationIndex = 1; destinationIndex < amountMatrix.length; destinationIndex += 1) {
    for (let originIndex = 0; originIndex < destinationIndex; originIndex += 1) {
      const amounts = amountMatrix[originIndex]?.[destinationIndex] ?? null
      if (amounts === null) {
        return null
      }
      if (uniformAmounts === null) {
        uniformAmounts = amounts
      } else if (!fareAmountListsEqual(uniformAmounts, amounts)) {
        return null
      }
    }
  }
  return uniformAmounts
}

type FareAmountMatrix = Array<Array<number[] | null>>

function buildFareAmountMatrix(triangle: FareTriangle, mode: FareMode): FareAmountMatrix {
  const amountMatrix: FareAmountMatrix = Array.from({ length: triangle.axis.length }, () =>
    Array<number[] | null>(triangle.axis.length).fill(null),
  )
  for (let destinationIndex = 1; destinationIndex < triangle.axis.length; destinationIndex += 1) {
    for (let originIndex = 0; originIndex < destinationIndex; originIndex += 1) {
      const cell = triangle.cells[fareTriangleCellKey(originIndex, destinationIndex)]
      if (!cell) {
        continue
      }
      const amounts = fareTriangleCellAmounts(cell, mode)
      if (amounts.length === 0) {
        continue
      }
      const originAmounts = amountMatrix[originIndex]
      const destinationAmounts = amountMatrix[destinationIndex]
      if (originAmounts && destinationAmounts) {
        originAmounts[destinationIndex] = amounts
        destinationAmounts[originIndex] = amounts
      }
    }
  }
  return amountMatrix
}

function fareTriangleAxisProfilesEqual(amountMatrix: FareAmountMatrix, leftIndex: number, rightIndex: number): boolean {
  if (leftIndex === rightIndex) {
    return true
  }

  for (let otherIndex = 0; otherIndex < amountMatrix.length; otherIndex += 1) {
    if (otherIndex === leftIndex || otherIndex === rightIndex) {
      continue
    }
    const leftAmounts = amountMatrix[leftIndex]?.[otherIndex] ?? null
    const rightAmounts = amountMatrix[rightIndex]?.[otherIndex] ?? null
    if (leftAmounts === null || rightAmounts === null) {
      if (leftAmounts !== rightAmounts) {
        return false
      }
      continue
    }
    if (!fareAmountListsEqual(leftAmounts, rightAmounts)) {
      return false
    }
  }
  return true
}

function fareAmountListsEqual(left: number[], right: number[]): boolean {
  return left.length === right.length && left.every((amount, index) => amount === right[index])
}

function matchingFareAttributes(
  fareData: FareV1Data,
  routeId: string,
  boardZone: string | null,
  alightZone: string | null,
): FareV1Attribute[] {
  if (fareData.rules.length === 0) {
    return fareData.attributes
  }

  const unsupportedFareIds = new Set(
    fareData.rules
      .filter((rule) => rule.containsId !== null && fareRuleMatches(rule, routeId, boardZone, alightZone))
      .map((rule) => rule.fareId),
  )
  const matchingFareIds = new Set(
    fareData.rules
      .filter((rule) => rule.containsId === null && !unsupportedFareIds.has(rule.fareId))
      .filter((rule) => fareRuleMatches(rule, routeId, boardZone, alightZone))
      .map((rule) => rule.fareId),
  )
  return fareData.attributes.filter((attribute) => matchingFareIds.has(attribute.fareId))
}

function fareRuleMatches(rule: FareV1Rule, routeId: string, boardZone: string | null, alightZone: string | null): boolean {
  return (
    nullableFieldMatches(rule.routeId, routeId) &&
    nullableFieldMatches(rule.originId, boardZone) &&
    nullableFieldMatches(rule.destinationId, alightZone)
  )
}

function nullableFieldMatches(ruleValue: string | null, actualValue: string | null): boolean {
  return ruleValue === null || ruleValue === actualValue
}

function fareAgencyMatches(fareAgencyId: string | null, routeAgencyId: string | null): boolean {
  return fareAgencyId === null || fareAgencyId === routeAgencyId
}

function buildFarePatternContexts(
  axis: FareTriangleAxisEntry[],
  constructedRoutes: ProConstructedRoute[],
  fareDataBySource: Record<string, FareV1Data>,
  sourceNameMap: Record<string, string>,
  excludedPatternKeys: Set<string>,
): FarePatternContext[] {
  const patternKeyCache = new WeakMap<GtfsStop[], string>()
  const contexts: FarePatternContext[] = []

  for (const route of constructedRoutes) {
    const fareData = fareDataBySource[route.sourceId]
    if (!fareData) {
      continue
    }
    const routeId = route.route.routeId
    const sourceName = sourceNameMap[route.sourceId] ?? route.sourceName ?? route.sourceId
    const routeName = displayRouteName(route.route.shortName, route.route.longName)
    const routeAgencyId = fareData.routeAgencyById[routeId] ?? null
    for (const pattern of route.stopPatterns) {
      const patternKey = cachedPatternKey(patternKeyCache, pattern)
      if (excludedPatternKeys.has(`${route.sourceId}::${patternKey}`)) {
        continue
      }
      contexts.push({
        sourceId: route.sourceId,
        sourceName,
        routeId,
        routeName,
        direction: route.direction,
        fareData,
        routeAgencyId,
        pattern,
        matchingStopsByAxis: axis.map((entry) =>
          entry.stops.filter((stop) => poleStopMatchesPattern(stop, route.sourceId, patternKey, pattern)),
        ),
      })
    }
  }

  return contexts
}

function cachedPatternKey(cache: WeakMap<GtfsStop[], string>, pattern: GtfsStop[]): string {
  const cached = cache.get(pattern)
  if (cached !== undefined) {
    return cached
  }
  const key = stopPatternKey(pattern)
  cache.set(pattern, key)
  return key
}

function cachedMatchingFareAttributes(
  cache: FareResolutionCache,
  context: FarePatternContext,
  boardZone: string | null,
  alightZone: string | null,
): FareV1Attribute[] {
  let routesBySource = cache.get(context.sourceId)
  if (!routesBySource) {
    routesBySource = new Map()
    cache.set(context.sourceId, routesBySource)
  }
  let boardZonesByRoute = routesBySource.get(context.routeId)
  if (!boardZonesByRoute) {
    boardZonesByRoute = new Map()
    routesBySource.set(context.routeId, boardZonesByRoute)
  }
  let alightZonesByBoardZone = boardZonesByRoute.get(boardZone)
  if (!alightZonesByBoardZone) {
    alightZonesByBoardZone = new Map()
    boardZonesByRoute.set(boardZone, alightZonesByBoardZone)
  }
  const cached = alightZonesByBoardZone.get(alightZone)
  if (cached !== undefined) {
    return cached
  }

  const attributes = matchingFareAttributes(context.fareData, context.routeId, boardZone, alightZone).filter((attribute) =>
    fareAgencyMatches(attribute.agencyId, context.routeAgencyId),
  )
  alightZonesByBoardZone.set(alightZone, attributes)
  return attributes
}

function findForwardPatternStopPairs(boardStops: ProPoleStop[], alightStops: ProPoleStop[]): PatternStopPair[] {
  const pairs: PatternStopPair[] = []

  for (const boardStop of boardStops) {
    for (const alightStop of alightStops) {
      if (boardStop.stopIndex < alightStop.stopIndex) {
        pairs.push({ boardStop, alightStop })
      }
    }
  }

  return pairs
}

function poleStopMatchesPattern(stop: ProPoleStop, sourceId: string, patternKey: string, pattern: GtfsStop[]): boolean {
  return stop.sourceId === sourceId && stop.stopPatternKey === patternKey && pattern[stop.stopIndex]?.stopId === stop.id
}

function distinctPoleStops(stops: ProPoleStop[]): ProPoleStop[] {
  const seen = new Set<string>()
  return stops.filter((stop) => {
    const key = proPoleStopKey(stop)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

function distinctCandidates(candidates: FareTriangleCandidate[]): FareTriangleCandidate[] {
  const seen = new Set<string>()
  return candidates.filter((candidate) => {
    const key = JSON.stringify(candidate)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

function selectedRouteIdsBySource(routes: ProConstructedRoute[]): Map<string, Set<string>> {
  const routeIdsBySource = new Map<string, Set<string>>()
  for (const route of routes) {
    const routeIds = routeIdsBySource.get(route.sourceId) ?? new Set<string>()
    routeIds.add(route.route.routeId)
    routeIdsBySource.set(route.sourceId, routeIds)
  }
  return routeIdsBySource
}

function collectContainsRuleWarnings(
  fareDataBySource: Record<string, FareV1Data>,
  routeIdsBySource: Map<string, Set<string>>,
): FareTriangleWarning[] {
  const warnings: FareTriangleWarning[] = []
  const warningKeys = new Set<string>()
  for (const [sourceId, fareData] of Object.entries(fareDataBySource)) {
    const selectedRouteIds = routeIdsBySource.get(sourceId)
    if (!selectedRouteIds) {
      continue
    }
    for (const rule of fareData.rules) {
      if (rule.containsId !== null && (rule.routeId === null || selectedRouteIds.has(rule.routeId))) {
        addWarning(warnings, warningKeys, {
          kind: 'unsupported-contains-rule',
          sourceId,
          fareId: rule.fareId,
          containsId: rule.containsId,
        })
      }
    }
  }
  return warnings
}

function addWarning(warnings: FareTriangleWarning[], warningKeys: Set<string>, warning: FareTriangleWarning): void {
  const key = fareTriangleWarningKey(warning)
  if (warningKeys.has(key)) {
    return
  }
  warningKeys.add(key)
  warnings.push(warning)
}

function fareTriangleWarningKey(warning: FareTriangleWarning): string {
  if (warning.kind === 'missing-zone') {
    return `${warning.kind}::${warning.sourceId}::${warning.stopId}`
  }
  return `${warning.kind}::${warning.sourceId}::${warning.fareId}::${warning.containsId}`
}

function stopMapKey(sourceId: string, stopId: string): string {
  return `${sourceId}::${stopId}`
}
