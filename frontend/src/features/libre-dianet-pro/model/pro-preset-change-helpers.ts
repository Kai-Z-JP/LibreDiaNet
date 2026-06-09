import type { ProPreset } from '../../../types'

export type ProRouteSelection = Pick<ProPreset, 'sourceIds' | 'routes'>
export type ProStopIdsBySource = Map<string, Set<string>>

export function buildProRouteSelection(
  sourceIds: ProPreset['sourceIds'] | undefined,
  routes: ProPreset['routes'] | undefined,
): ProRouteSelection | null {
  return sourceIds && routes
    ? {
        sourceIds,
        routes,
      }
    : null
}

export function buildProPoleStopIdsBySource(poles: ProPreset['poles'] | undefined): ProStopIdsBySource {
  const idsBySource: ProStopIdsBySource = new Map()
  if (!poles) {
    return idsBySource
  }

  for (const pole of poles) {
    for (const stop of pole.stops) {
      const ids = idsBySource.get(stop.sourceId) ?? new Set<string>()
      ids.add(stop.id)
      idsBySource.set(stop.sourceId, ids)
    }
  }
  return idsBySource
}

export function sameProStopIdsBySource(left: ProStopIdsBySource | null, right: ProStopIdsBySource): boolean {
  if (!left || left.size !== right.size) {
    return false
  }

  for (const [sourceId, rightIds] of right) {
    const leftIds = left.get(sourceId)
    if (!leftIds || leftIds.size !== rightIds.size) {
      return false
    }
    for (const stopId of rightIds) {
      if (!leftIds.has(stopId)) {
        return false
      }
    }
  }

  return true
}
