import type { GtfsLoader } from '@gtfs-jp/loader'

export type OverrideConfig = {
  majorStop: boolean
  branchStart: boolean
  branchEnd: boolean
  nameOverride: string | null
  locationNameOverride: string | null
}

export const EMPTY_OVERRIDE: OverrideConfig = {
  majorStop: false,
  branchStart: false,
  branchEnd: false,
  nameOverride: null,
  locationNameOverride: null,
}

export type RouteDetail = {
  id: string
  direction: number | null
}

export type PoleDetail = {
  id: string
  override: OverrideConfig
}

export type RepoInfoV2 = {
  kind: 'repo'
  id: string
  orgId: string
  feedId: string
  name: string | null
}

export type RawInfoV2 = {
  kind: 'raw'
  id: string
  uuid: string
  name: string | null
  cacheState: 'ready' | 'missing'
}

export type RoutePresetV2 = {
  id: string
  name: string
  index: number
  info: RepoInfoV2 | RawInfoV2
  routes: RouteDetail[]
  poles: PoleDetail[]
  excludedStopPatterns: string[][]
}

export type PresetStoreV2 = {
  version: 2
  presets: RoutePresetV2[]
}

export type GtfsFeedResponse = {
  code: number
  message: string
  body: GtfsFeedItem[]
}

export type GtfsFeedItem = {
  organization_id: string
  organization_name: string
  feed_id: string
  feed_name: string
}

export type FeedOption = {
  label: string
  orgId: string
  feedId: string
}

export type RouteOption = {
  railwayCode: string
  id: string
  direction: number | null
  name: string
  label: string
}

export type GtfsStop = {
  stopId: string
  name: string
  platformCode: string | null
}

export type GtfsStopTime = {
  tripId: string
  stopId: string
  stopSequence: number
  departureTime: string | null
}

export type GtfsRouteSummary = {
  routeId: string
  shortName: string | null
  longName: string | null
}

export type ConstructedRoute = {
  route: GtfsRouteSummary
  direction: number | null
  stopPatterns: GtfsStop[][]
}

export type ConstructedTrip = {
  routeName: string
  stopTime: GtfsStopTime[]
}

export type StopMap = Record<string, GtfsStop>

export type DayMapping = [string, string]

export type OpenHandleResult = {
  handle: GtfsHandle
  imported: boolean
}

export type GtfsHandle = {
  filename: string
  loader: GtfsLoader
}

export type PresetContext = {
  loading: boolean
  handle: GtfsHandle | null
  error: string | null
}
