import type { GtfsStop } from '../../../types'
import { stopPatternKey } from '../../../utils'
import { proRoutePatternEntries, proStopDisplayLabel } from './pro-pole-stop-helpers'
import type { ProConstructedRoute } from './pro-types'

describe('proRoutePatternEntries', () => {
  it('numbers patterns consecutively across routes in a preset', () => {
    const routes = [
      route('source-a', 'route-a', [pattern('a-1'), pattern('a-2')]),
      route('source-a', 'route-b', [pattern('b-1')]),
    ]

    expect(proRoutePatternEntries(routes).map((entry) => entry.presetPatternIndex)).toEqual([0, 1, 2])
  })
})

describe('proStopDisplayLabel', () => {
  it('uses the preset-wide pattern number', () => {
    const secondPattern = pattern('b-1')
    const routes = [route('source-a', 'route-a', [pattern('a-1')]), route('source-a', 'route-b', [secondPattern])]

    const label = proStopDisplayLabel(
      {
        sourceId: 'source-a',
        id: 'b-1-origin',
        stopSequence: 1,
        stopPatternKey: stopPatternKey(secondPattern),
        stopIndex: 0,
      },
      { 'source-a::b-1-origin': stop('b-1-origin', 'B Origin') },
      routes,
      false,
    )

    expect(label).toContain('P2')
  })
})

function route(sourceId: string, routeId: string, stopPatterns: GtfsStop[][]): ProConstructedRoute {
  return {
    sourceId,
    sourceName: sourceId,
    route: {
      routeId,
      shortName: routeId,
      longName: null,
    },
    direction: null,
    stopPatterns,
  }
}

function pattern(id: string): GtfsStop[] {
  return [stop(`${id}-origin`, `${id} origin`), stop(`${id}-destination`, `${id} destination`)]
}

function stop(stopId: string, name: string): GtfsStop {
  return {
    stopId,
    name,
    platformCode: null,
  }
}
