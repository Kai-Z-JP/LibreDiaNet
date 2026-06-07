import type { FeedOption, ProPreset } from '../../../types'

export function removeSourceFromPreset(preset: ProPreset, sourceId: string): ProPreset {
  return {
    ...preset,
    sourceIds: preset.sourceIds.filter((item) => item !== sourceId),
    routes: preset.routes.filter((route) => route.sourceId !== sourceId),
    routeDisplayOverrides: preset.routeDisplayOverrides.filter((override) => !override.routeKey.startsWith(`${sourceId}::`)),
    poles: preset.poles
      .map((pole) => ({
        ...pole,
        stops: pole.stops.filter((stop) => stop.sourceId !== sourceId),
      }))
      .filter((pole) => pole.stops.length > 0),
  }
}

export function repoInfoId(orgId: string, feedId: string, fileUid: string | null): string {
  return fileUid ? `${feedId}_${orgId}_${fileUid}` : `${feedId}_${orgId}`
}

export function repoFeedKey(orgId: string, feedId: string): string {
  return `${orgId}::${feedId}`
}

export function feedLabelForSource(info: { orgId: string; feedId: string; name: string | null }, feedOptions: FeedOption[]): string {
  return (
    feedOptions.find((option) => option.orgId === info.orgId && option.feedId === info.feedId)?.label ??
    info.name?.split(' / ')[0] ??
    info.feedId
  )
}

export function sourceDisplayName(feedLabel: string, fileLabel: string | null): string {
  return [feedLabel, fileLabel?.trim()].filter(Boolean).join(' / ')
}
