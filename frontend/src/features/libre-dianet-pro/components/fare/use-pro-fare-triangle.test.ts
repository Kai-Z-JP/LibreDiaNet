import { renderHook, waitFor } from '@testing-library/react'
import type { FareV1Data, GtfsRepository } from '../../../../gtfsRepository'
import { EMPTY_OVERRIDE, type GtfsHandle, type ProPreset, type ProPresetContext } from '../../../../types'
import type { ProConstructedRoute } from '../../model/pro-types'
import { buildProFareSourceRequests, selectCurrentFareRoutes, useProFareTriangle } from './use-pro-fare-triangle'

describe('buildProFareSourceRequests', () => {
  it('loads only sources used by selected routes and deduplicates route and stop IDs', () => {
    const preset: ProPreset = {
      id: 'preset',
      name: 'テスト',
      index: 0,
      sourceIds: ['source-a', 'unused-source'],
      routes: [
        { sourceId: 'source-a', id: 'route-1', direction: 0 },
        { sourceId: 'source-a', id: 'route-1', direction: 1 },
      ],
      routeDisplayOverrides: [],
      poles: [
        {
          id: 'pole-a',
          override: EMPTY_OVERRIDE,
          stops: [
            { sourceId: 'source-a', id: 'stop-a', stopSequence: 1, stopPatternKey: 'a>b', stopIndex: 0 },
            { sourceId: 'source-a', id: 'stop-a', stopSequence: 1, stopPatternKey: 'a>b', stopIndex: 0 },
            { sourceId: 'unused-source', id: 'unused-stop', stopSequence: 1, stopPatternKey: 'x', stopIndex: 0 },
          ],
        },
      ],
      excludedStopPatterns: [],
    }

    expect(buildProFareSourceRequests(preset)).toEqual([
      {
        sourceId: 'source-a',
        routeIds: ['route-1'],
        stopIds: ['stop-a'],
      },
    ])
  })
})

describe('selectCurrentFareRoutes', () => {
  it('does not expose constructed routes left over from the previous route selection', () => {
    const preset = twoSourcePreset()
    preset.routes = [{ sourceId: 'source-a', id: 'current-route', direction: 1 }]
    const currentRoute = constructedRoute('source-a', 'current-route', 1)
    const staleRoute = constructedRoute('source-a', 'stale-route', 0)

    expect(selectCurrentFareRoutes(preset, [staleRoute, currentRoute])).toEqual([currentRoute])
  })
})

describe('useProFareTriangle', () => {
  it('keeps successful source data when another source fails', async () => {
    const sourceAHandle = { filename: 'source-a.sqlite3' } as GtfsHandle
    const sourceBHandle = { filename: 'source-b.sqlite3' } as GtfsHandle
    const loadFareV1Data = vi.fn(async (handle: GtfsHandle) => {
      if (handle === sourceBHandle) {
        throw new Error('broken source')
      }
      return emptyFareData()
    })
    const context: ProPresetContext = {
      loading: false,
      handles: { 'source-a': sourceAHandle, 'source-b': sourceBHandle },
      errors: {},
    }
    const preset = twoSourcePreset()
    const repository = { loadFareV1Data } as unknown as GtfsRepository
    const constructedRoutes: ProConstructedRoute[] = []
    const stopMap = {}
    const sourceNameMap = {}

    const { result } = renderHook(() =>
      useProFareTriangle({
        preset,
        context,
        constructedRoutes,
        stopMap,
        sourceNameMap,
        repository,
      }),
    )

    await waitFor(() => expect(loadFareV1Data).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.loadState.dataBySource).toEqual({ 'source-a': emptyFareData() })
    expect(result.current.loadState.errorsBySource).toEqual({ 'source-b': 'broken source' })
  })
})

function twoSourcePreset(): ProPreset {
  return {
    id: 'preset',
    name: 'テスト',
    index: 0,
    sourceIds: ['source-a', 'source-b'],
    routes: [
      { sourceId: 'source-a', id: 'route-a', direction: 0 },
      { sourceId: 'source-b', id: 'route-b', direction: 0 },
    ],
    routeDisplayOverrides: [],
    poles: [],
    excludedStopPatterns: [],
  }
}

function emptyFareData(): FareV1Data {
  return {
    fareAttributesPresent: true,
    fareRulesPresent: false,
    stopZoneById: {},
    routeAgencyById: {},
    attributes: [],
    rules: [],
  }
}

function constructedRoute(sourceId: string, routeId: string, direction: number | null) {
  return {
    sourceId,
    sourceName: sourceId,
    route: { routeId, shortName: routeId, longName: null },
    direction,
    stopPatterns: [],
  }
}
