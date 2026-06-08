import type {
  DayMapping,
  DiaNetGtfsExportData,
  GtfsFeedDetailResponse,
  GtfsFeedFileOption,
  GtfsFeedItem,
  GtfsFeedResponse,
  ProPoleDetail,
  ProPreset,
  ProVersion,
  RepoInfoV2,
  RoutePresetV2,
} from './types'
import { downloadBlob, extractFileName, stopPatternKey } from './utils'

type BackendRepoInfo = {
  type: 'jp.kaiz.shachia.dianet.DataRepoGtfsInformation'
  orgId: string
  feedId: string
  fileUid: string | null
  name: string | null
}

type BackendRawInfo = {
  type: 'jp.kaiz.shachia.dianet.RawGtfsInformation'
  name: string | null
  uuid: string
}

type BackendRepoSource = {
  type: 'jp.kaiz.shachia.dianet.GTFSDataSourceRepo'
  orgId: string
  feedId: string
  fileUid: string | null
}

type BackendRawSource = {
  type: 'jp.kaiz.shachia.dianet.GTFSRawSource'
  zipByteArray: number[]
}

type BackendPreset = {
  id: string
  name: string
  index: number
  info: BackendRepoInfo | BackendRawInfo
  routes: { id: string; direction: number | null }[]
  poles: {
    id: string
    override: RoutePresetV2['poles'][number]['override']
  }[]
  excludedStopPatterns: string[][]
}

type BackendCreateRequest = {
  dateSource: BackendRepoSource | BackendRawSource
  preset: BackendPreset
  dayMapping: DayMapping[]
}

export type DiaNetXlsxCreateFromDataRequestBody = {
  gtfs: DiaNetGtfsExportData
  preset: BackendPreset
  dayMapping: DayMapping[]
}

export async function fetchGtfsFeeds(): Promise<GtfsFeedItem[]> {
  const response = await fetch('https://api.gtfs-data.jp/v2/files')
  if (!response.ok) {
    throw new Error(`GTFS feed list request failed: ${response.status}`)
  }
  const data = (await response.json()) as GtfsFeedResponse
  return data.body
}

export async function fetchGtfsFeedFiles(orgId: string, feedId: string): Promise<GtfsFeedFileOption[]> {
  const params = new URLSearchParams({ max_prev: '3', max_next: '3' })
  const response = await fetch(`https://api.gtfs-data.jp/v2/organizations/${orgId}/feeds/${feedId}?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`GTFS feed detail request failed: ${response.status}`)
  }
  const data = (await response.json()) as GtfsFeedDetailResponse
  return data.body.gtfs_files.map((file) => ({
    uid: file.gtfs_file_uid,
    label: gtfsFileLabel(file.rid, file.from_date, file.to_date, file.memo ?? file.update_type ?? null, file.gtfs_file_uid),
    sourceLabel: gtfsFileSourceLabel(file.from_date, file.to_date, file.memo ?? file.update_type ?? null),
    fromDate: file.from_date ?? null,
    toDate: file.to_date ?? null,
    updateType: file.update_type ?? null,
    memo: file.memo ?? null,
    createdAt: file.created_at ?? null,
  }))
}

export async function requestDiaNetXlsx(request: DiaNetXlsxCreateFromDataRequestBody): Promise<void> {
  const response = await fetch('/api/poi_parser/create_from_data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    throw new Error(`xlsx export failed: ${response.status}`)
  }
  const blob = await response.blob()
  downloadBlob(blob, extractFileName(response.headers.get('content-disposition')))
}

export async function buildCreateFromDataRequest(
  preset: RoutePresetV2,
  gtfs: DiaNetGtfsExportData,
  dayMapping: DayMapping[],
): Promise<DiaNetXlsxCreateFromDataRequestBody> {
  return {
    gtfs,
    preset: buildBackendPreset(preset),
    dayMapping,
  }
}

export function buildProCreateFromDataRequest(
  version: ProVersion,
  preset: ProPreset,
  gtfsBySourceId: Record<string, DiaNetGtfsExportData>,
  dayMapping: DayMapping[],
): DiaNetXlsxCreateFromDataRequestBody {
  const merged = mergeProGtfsExportData(preset, gtfsBySourceId)
  return {
    gtfs: merged.gtfs,
    preset: {
      id: preset.id,
      name: preset.name,
      index: preset.index,
      info: {
        type: 'jp.kaiz.shachia.dianet.RawGtfsInformation',
        name: version.name,
        uuid: preset.id,
      },
      routes: preset.routes.map((route) => ({
        id: namespaceId(route.sourceId, route.id),
        direction: route.direction,
      })),
      poles: preset.poles.map((pole) => ({
        id: proPoleExportId(pole),
        override: pole.override,
      })),
      excludedStopPatterns: preset.excludedStopPatterns,
    },
    dayMapping,
  }
}

export async function buildCreateRequestAsync(
  preset: RoutePresetV2,
  rawFile: File | null,
  dayMapping: DayMapping[],
): Promise<BackendCreateRequest> {
  const rawBytes = rawFile ? Array.from(new Uint8Array(await rawFile.arrayBuffer())) : null
  return {
    dateSource:
      preset.info.kind === 'repo'
        ? buildBackendRepoSource(preset.info)
        : {
            type: 'jp.kaiz.shachia.dianet.GTFSRawSource',
            zipByteArray: requireRawBytes(rawBytes),
          },
    preset: buildBackendPreset(preset),
    dayMapping,
  }
}

function buildBackendPreset(preset: RoutePresetV2): BackendPreset {
  return {
    id: preset.id,
    name: preset.name,
    index: preset.index,
    info:
      preset.info.kind === 'repo'
        ? buildBackendRepoInfo(preset.info)
        : {
            type: 'jp.kaiz.shachia.dianet.RawGtfsInformation',
            name: preset.info.name,
            uuid: preset.info.uuid,
          },
    routes: preset.routes,
    poles: preset.poles,
    excludedStopPatterns: preset.excludedStopPatterns,
  }
}

function mergeProGtfsExportData(preset: ProPreset, gtfsBySourceId: Record<string, DiaNetGtfsExportData>) {
  const poleIdByPatternStopRef = new Map<string, string>()
  for (const pole of preset.poles) {
    for (const stop of pole.stops) {
      const poleId = proPoleExportId(pole)
      poleIdByPatternStopRef.set(proPatternStopRefKey(stop.sourceId, stop.stopPatternKey, stop.stopIndex, stop.id), poleId)
    }
  }

  const stopsById = new Map<string, DiaNetGtfsExportData['stops'][number]>()
  const routes: DiaNetGtfsExportData['routes'] = []
  const trips: DiaNetGtfsExportData['trips'] = []
  const stopTimes: DiaNetGtfsExportData['stopTimes'] = []
  const calendars: DiaNetGtfsExportData['calendars'] = []
  const agencyNames: string[] = []
  const routeDisplayOverridesByKey = new Map(preset.routeDisplayOverrides.map((override) => [override.routeKey, override]))

  for (const sourceId of preset.sourceIds) {
    const gtfs = gtfsBySourceId[sourceId]
    if (!gtfs) {
      continue
    }
    agencyNames.push(gtfs.agencyName)
    for (const stop of gtfs.stops) {
      const namespacedId = namespaceId(sourceId, stop.id)
      stopsById.set(namespacedId, {
        ...stop,
        id: namespacedId,
      })
    }
    routes.push(
      ...gtfs.routes.map((route) => ({
        ...route,
        id: namespaceId(sourceId, route.id),
      })),
    )
    const stopTimesByTripId = groupStopTimesByTripId(gtfs.stopTimes)
    trips.push(
      ...gtfs.trips.map((trip) => {
        const tripStopTimes = stopTimesByTripId.get(trip.tripId) ?? []
        const routeKey = proRouteExportKey(sourceId, trip.routeId, trip.directionId, stopPatternKey(tripStopTimes))
        const useTripHeadsignAsDestination = routeDisplayOverridesByKey.get(routeKey)?.useTripHeadsignAsDestination ?? false
        return {
          ...trip,
          tripId: namespaceId(sourceId, trip.tripId),
          routeId: namespaceId(sourceId, trip.routeId),
          serviceId: namespaceId(sourceId, trip.serviceId),
          tripHeadsign: useTripHeadsignAsDestination ? (trip.tripHeadsign ?? null) : null,
        }
      }),
    )
    stopTimes.push(
      ...gtfs.stopTimes.map((stopTime) => {
        const namespacedStopId = namespaceId(sourceId, stopTime.stopId)
        const tripStopTimes = stopTimesByTripId.get(stopTime.tripId) ?? []
        const stopIndex = tripStopTimes.indexOf(stopTime)
        const patternKey = stopPatternKey(tripStopTimes)
        const poleId = poleIdByPatternStopRef.get(proPatternStopRefKey(sourceId, patternKey, stopIndex, stopTime.stopId))
        return {
          ...stopTime,
          tripId: namespaceId(sourceId, stopTime.tripId),
          stopId: poleId ?? namespacedStopId,
          stopPatternId: stopTime.stopPatternId ? namespaceId(sourceId, stopTime.stopPatternId) : stopTime.stopPatternId,
        }
      }),
    )
    calendars.push(
      ...gtfs.calendars.map((calendar) => ({
        ...calendar,
        id: namespaceId(sourceId, calendar.id),
      })),
    )
  }

  for (const pole of preset.poles) {
    const firstStop = pole.stops.map((stop) => stopsById.get(namespaceId(stop.sourceId, stop.id))).find(Boolean)
    if (!firstStop) {
      continue
    }
    stopsById.set(proPoleExportId(pole), {
      id: proPoleExportId(pole),
      name: pole.override.nameOverride ?? firstStop.name,
      platformCode: pole.override.locationNameOverride ?? firstStop.platformCode,
      jokoOverride: pole.override.jokoOverride,
    })
  }

  return {
    gtfs: {
      agencyName: Array.from(new Set(agencyNames.filter(Boolean))).join(' + '),
      stops: Array.from(stopsById.values()),
      routes,
      trips,
      stopTimes,
      calendars,
    },
  }
}

export function namespaceId(sourceId: string, id: string): string {
  return `${sourceId}::${id}`
}

function proPoleExportId(pole: ProPoleDetail): string {
  return `pole::${pole.id}`
}

function proPatternStopRefKey(sourceId: string, patternKey: string, stopIndex: number, stopId: string): string {
  return `${sourceId}::${patternKey}::${stopIndex}::${stopId}`
}

function proRouteExportKey(sourceId: string, routeId: string, direction: number | null, patternKey: string): string {
  return `${namespaceId(sourceId, routeId)}::${direction ?? 'null'}::${patternKey}`
}

function groupStopTimesByTripId(stopTimes: DiaNetGtfsExportData['stopTimes']): Map<string, DiaNetGtfsExportData['stopTimes']> {
  const grouped = new Map<string, DiaNetGtfsExportData['stopTimes']>()
  for (const stopTime of stopTimes) {
    const current = grouped.get(stopTime.tripId)
    if (current) {
      current.push(stopTime)
    } else {
      grouped.set(stopTime.tripId, [stopTime])
    }
  }
  return grouped
}

function buildBackendRepoInfo(info: RepoInfoV2): BackendRepoInfo {
  return {
    type: 'jp.kaiz.shachia.dianet.DataRepoGtfsInformation',
    orgId: info.orgId,
    feedId: info.feedId,
    fileUid: info.fileUid,
    name: info.name,
  }
}

function buildBackendRepoSource(info: RepoInfoV2): BackendRepoSource {
  return {
    type: 'jp.kaiz.shachia.dianet.GTFSDataSourceRepo',
    orgId: info.orgId,
    feedId: info.feedId,
    fileUid: info.fileUid,
  }
}

export function gtfsFileLabel(
  _rid: string | null | undefined,
  fromDate: string | null | undefined,
  toDate: string | null | undefined,
  title: string | null | undefined,
  uid: string | null | undefined,
): string {
  void uid
  const dateRange = fromDate || toDate ? `${fromDate ?? '?'} - ${toDate ?? '?'}` : ''
  const titleText = title?.trim()
  return [titleText, dateRange].filter(Boolean).join(' / ') || 'GTFSファイル'
}

export function gtfsFileSourceLabel(
  fromDate: string | null | undefined,
  toDate: string | null | undefined,
  title: string | null | undefined,
): string {
  const dateRange = fromDate || toDate ? `${fromDate ?? '?'} - ${toDate ?? '?'}` : ''
  const titleText = title?.trim()
  return dateRange || titleText || 'GTFSファイル'
}

function requireRawBytes(rawBytes: number[] | null): number[] {
  if (!rawBytes) {
    throw new Error('Raw GTFS export requires a ZIP file in the current session')
  }
  return rawBytes
}
