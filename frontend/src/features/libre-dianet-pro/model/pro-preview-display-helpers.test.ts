import { describe, expect, it } from 'vitest'
import { EMPTY_OVERRIDE, type ProPoleDetail, type ProRouteDisplayOverride } from '../../../types'
import { stopPatternKey } from '../../../utils'
import { hasProRouteNameOverride, normalizeProRouteDisplayOverride, proTripPreviewTimes } from './pro-preview-display-helpers'
import type { ProConstructedTrip } from './pro-types'

const baseOverride: ProRouteDisplayOverride = {
  routeKey: 'source::route::0::pattern',
  routeNameOverride: null,
  destinationOverride: null,
  useTripHeadsignAsDestination: false,
  stopCellOverrides: [],
}

describe('normalizeProRouteDisplayOverride', () => {
  it('keeps an empty route name override as an explicit blank display', () => {
    expect(
      normalizeProRouteDisplayOverride({
        ...baseOverride,
        routeNameOverride: '',
      }),
    ).toEqual({
      ...baseOverride,
      routeNameOverride: '',
    })
  })

  it('drops a null route name override when no display overrides remain', () => {
    expect(normalizeProRouteDisplayOverride(baseOverride)).toBeNull()
  })
})

describe('hasProRouteNameOverride', () => {
  it('treats an empty route name override as different from the default route name', () => {
    expect(hasProRouteNameOverride({ ...baseOverride, routeNameOverride: '' }, 'A1')).toBe(true)
  })

  it('does not treat null as a route name override', () => {
    expect(hasProRouteNameOverride(baseOverride, 'A1')).toBe(false)
  })
})

describe('proTripPreviewTimes', () => {
  it('keeps empty pole time cells blank instead of filling pass markers', () => {
    const stopTime = [
      { tripId: 'trip-1', stopId: 'stop-a', stopSequence: 1, departureTime: '08:00:00' },
      { tripId: 'trip-1', stopId: 'stop-b', stopSequence: 2, departureTime: '08:10:00' },
    ]
    const patternKey = stopPatternKey(stopTime)
    const trip: ProConstructedTrip = {
      sourceId: 'source-a',
      sourceName: 'Source A',
      routeId: 'route-a',
      direction: 0,
      routeName: 'Route A',
      stopTime,
    }
    const poles: ProPoleDetail[] = [
      pole('pole-a', 'stop-a', patternKey, 0),
      { id: 'empty-pole', stops: [], override: EMPTY_OVERRIDE },
      pole('pole-b', 'stop-b', patternKey, 1),
    ]

    expect(proTripPreviewTimes(trip, poles)[1]).toBe('')
  })
})

function pole(id: string, stopId: string, stopPattern: string, stopIndex: number): ProPoleDetail {
  return {
    id,
    stops: [
      {
        sourceId: 'source-a',
        id: stopId,
        stopSequence: stopIndex + 1,
        stopPatternKey: stopPattern,
        stopIndex,
      },
    ],
    override: EMPTY_OVERRIDE,
  }
}
