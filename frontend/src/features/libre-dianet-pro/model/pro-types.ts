import type { ConstructedRoute, ConstructedTrip, RouteOption } from '../../../types'

export type ProRouteOption = RouteOption & {
  sourceId: string
  sourceName: string
}

export type ProConstructedRoute = ConstructedRoute & {
  sourceId: string
  sourceName: string
}

export type ProConstructedTrip = ConstructedTrip & {
  sourceId: string
  sourceName: string
}
