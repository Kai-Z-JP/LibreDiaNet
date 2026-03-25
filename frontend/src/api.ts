import type { DayMapping, GtfsFeedItem, GtfsFeedResponse, RepoInfoV2, RoutePresetV2 } from './types'
import { downloadBlob, extractFileName } from './utils'

type BackendRepoInfo = {
  type: 'jp.kaiz.shachia.dianet.DataRepoGtfsInformation'
  orgId: string
  feedId: string
  name: string | null
}

type BackendRawInfo = {
  type: 'jp.kaiz.shachia.dianet.RawGtfsInformation'
  zipByteArray: number[]
  name: string | null
  uuid: string
}

type BackendRepoSource = {
  type: 'jp.kaiz.shachia.dianet.GTFSDataSourceRepo'
  orgId: string
  feedId: string
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
  dayMapping: [string, string][]
}

export async function fetchGtfsFeeds(): Promise<GtfsFeedItem[]> {
  const response = await fetch('https://api.gtfs-data.jp/v2/files')
  if (!response.ok) {
    throw new Error(`GTFS feed list request failed: ${response.status}`)
  }
  const data = (await response.json()) as GtfsFeedResponse
  return data.body
}

export async function requestDiaNetXlsx(params: { preset: RoutePresetV2; rawFile: File | null; dayMapping: DayMapping[] }): Promise<void> {
  const request = await buildCreateRequestAsync(params.preset, params.rawFile, params.dayMapping)
  const response = await fetch('/api/poi_parser/create', {
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
    preset: {
      id: preset.id,
      name: preset.name,
      index: preset.index,
      info:
        preset.info.kind === 'repo'
          ? buildBackendRepoInfo(preset.info)
          : {
              type: 'jp.kaiz.shachia.dianet.RawGtfsInformation',
              zipByteArray: requireRawBytes(rawBytes),
              name: preset.info.name,
              uuid: preset.info.uuid,
            },
      routes: preset.routes,
      poles: preset.poles,
      excludedStopPatterns: preset.excludedStopPatterns,
    },
    dayMapping,
  }
}

function buildBackendRepoInfo(info: RepoInfoV2): BackendRepoInfo {
  return {
    type: 'jp.kaiz.shachia.dianet.DataRepoGtfsInformation',
    orgId: info.orgId,
    feedId: info.feedId,
    name: info.name,
  }
}

function buildBackendRepoSource(info: RepoInfoV2): BackendRepoSource {
  return {
    type: 'jp.kaiz.shachia.dianet.GTFSDataSourceRepo',
    orgId: info.orgId,
    feedId: info.feedId,
  }
}

function requireRawBytes(rawBytes: number[] | null): number[] {
  if (!rawBytes) {
    throw new Error('Raw GTFS export requires a ZIP file in the current session')
  }
  return rawBytes
}
