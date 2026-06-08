import { describe, expect, it } from 'vitest'
import type { ProRouteDisplayOverride } from '../../../types'
import { hasProRouteNameOverride, normalizeProRouteDisplayOverride } from './pro-preview-display-helpers'

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
