import { useEffect, useState } from 'react'
import type { ConstructedRoute, GtfsHandle, GtfsStop, RouteDetail, RouteOption } from '../../../types'
import { libreDiaNetRepository } from '../lib/repository'

export function useGtfsDerivedData(handle: GtfsHandle | null, routes: RouteDetail[]) {
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([])
  const [constructedRoutes, setConstructedRoutes] = useState<ConstructedRoute[]>([])
  const [stopMap, setStopMap] = useState<Record<string, GtfsStop>>({})

  useEffect(() => {
    if (!handle) {
      setRouteOptions([])
      return
    }
    let cancelled = false
    void libreDiaNetRepository.listRoutesWithDirections(handle).then((options) => {
      if (!cancelled) {
        setRouteOptions(options)
      }
    })
    return () => {
      cancelled = true
    }
  }, [handle])

  useEffect(() => {
    if (!handle) {
      setConstructedRoutes([])
      setStopMap({})
      return
    }
    let cancelled = false
    void libreDiaNetRepository.buildConstructedRoutes(handle, routes).then(async (nextConstructedRoutes) => {
      if (cancelled) {
        return
      }
      setConstructedRoutes(nextConstructedRoutes)
      const stopIds = Array.from(new Set(nextConstructedRoutes.flatMap((route) => route.stopPatterns.flat().map((stop) => stop.stopId))))
      const nextStopMap = await libreDiaNetRepository.getStopsByIds(handle, stopIds)
      if (!cancelled) {
        setStopMap(nextStopMap)
      }
    })
    return () => {
      cancelled = true
    }
  }, [handle, routes])

  return [routeOptions, constructedRoutes, stopMap] as const
}
