import type { AppGtfsLoader } from './gtfsSchema'

export type OverrideConfig = {
  majorStop: boolean
  branchStart: boolean
  branchEnd: boolean
  nameOverride: string | null
  locationNameOverride: string | null
  jokoOverride: string | null
  rowShading: boolean
  stopNameBold: boolean
  horizontalLine: boolean
}

export const EMPTY_OVERRIDE: OverrideConfig = {
  majorStop: false,
  branchStart: false,
  branchEnd: false,
  nameOverride: null,
  locationNameOverride: null,
  jokoOverride: null,
  rowShading: false,
  stopNameBold: false,
  horizontalLine: false,
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
  fileUid: string | null
  fileLabel: string | null
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
  file_uid?: string
  file_rid?: string
  file_from_date?: string
  file_to_date?: string
  file_last_updated_at?: string
}

export type FeedOption = {
  label: string
  orgId: string
  feedId: string
  defaultFileUid: string | null
  defaultFileLabel: string | null
}

export type GtfsFeedDetailResponse = {
  code: number
  message: string
  body: GtfsFeedDetail
}

export type GtfsFeedDetail = {
  organization_id: string
  organization_name: string
  feed_id: string
  feed_name: string
  gtfs_files: GtfsFeedFileItem[]
}

export type GtfsFeedFileItem = {
  gtfs_file_uid: string
  rid: string
  from_date: string
  to_date: string
  update_type?: string | null
  memo?: string | null
  created_at?: string | null
}

export type GtfsFeedFileOption = {
  uid: string
  label: string
  sourceLabel: string
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
  stopSequence?: number
  stopPatternId?: string | null
}

export type GtfsStopTime = {
  tripId: string
  stopId: string
  stopSequence: number
  departureTime: string | null
  stopPatternId?: string | null
}

export type DiaNetGtfsExportData = {
  agencyName: string
  stops: DiaNetStopData[]
  routes: DiaNetRouteData[]
  trips: DiaNetTripData[]
  stopTimes: DiaNetStopTimeData[]
  calendars: DiaNetCalendarData[]
}

export type DiaNetStopData = {
  id: string
  name: string
  platformCode: string | null
  jokoOverride?: string | null
}

export type DiaNetRouteData = {
  id: string
  shortName: string | null
  longName: string | null
}

export type DiaNetTripData = {
  tripId: string
  routeId: string
  directionId: number | null
  serviceId: string
}

export type DiaNetStopTimeData = {
  tripId: string
  stopId: string
  stopSequence: number
  departureTime: string | null
  stopPatternId?: string | null
}

export type DiaNetCalendarData = {
  id: string
  startDate: string
  endDate: string
  sunday: number
  monday: number
  tuesday: number
  wednesday: number
  thursday: number
  friday: number
  saturday: number
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
  routeId: string
  direction: number | null
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
  loader: AppGtfsLoader
}

export type PresetContext = {
  loading: boolean
  handle: GtfsHandle | null
  error: string | null
}

export type ProGtfsSource = {
  sourceId: string
  info: RepoInfoV2 | RawInfoV2
}

export type ProRouteDetail = RouteDetail & {
  sourceId: string
}

export type ProDisplayFont = 'NADIA_B' | 'NADIA_R' | 'HEISEI_MINCHO_STD_W3'

export type ProRouteDisplayOverride = {
  routeKey: string
  routeNameOverride: string | null
  routeNameFont: ProDisplayFont | null
  destinationOverride: string | null
  stopCellOverrides: ProStopCellDisplayOverride[]
}

export type ProStopCellDisplayOverride = {
  poleId: string
  text: string
  rowSpan: number
  font: ProDisplayFont
}

export type ProPoleStop = {
  sourceId: string
  id: string
  stopSequence: number | null
  stopPatternKey: string
  stopIndex: number
}

export type ProPoleDetail = {
  id: string
  stops: ProPoleStop[]
  override: OverrideConfig
}

export type ProPreset = {
  id: string
  name: string
  index: number
  sourceIds: string[]
  routes: ProRouteDetail[]
  routeDisplayOverrides: ProRouteDisplayOverride[]
  poles: ProPoleDetail[]
  excludedStopPatterns: string[][]
}

export type ProVersion = {
  id: string
  name: string
  revisionDate: string
  gtfsSources: ProGtfsSource[]
  presets: ProPreset[]
}

export type ProPresetStore = {
  version: 1
  versions: ProVersion[]
}

export type ProPresetContext = {
  loading: boolean
  handles: Record<string, GtfsHandle>
  errors: Record<string, string>
}
