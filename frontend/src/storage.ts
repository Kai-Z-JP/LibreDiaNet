import {
  EMPTY_OVERRIDE,
  type OverrideConfig,
  type PoleDetail,
  type ProDisplayFont,
  type ProGtfsSource,
  type ProRouteDisplayOverride,
  type ProPoleDetail,
  type ProPreset,
  type ProPresetStore,
  type ProRouteDetail,
  type ProVersion,
  type PresetStoreV2,
  type RawInfoV2,
  type RepoInfoV2,
  type RouteDetail,
  type RoutePresetV2,
} from './types'

export const LEGACY_STORAGE_KEY = 'libre-dianet'
export const STORAGE_KEY = 'libre-dianet-v2'
export const PRO_STORAGE_KEY = 'libre-dianet-pro-v1'

const DEFAULT_STORE: PresetStoreV2 = {
  version: 2,
  presets: [],
}

export function loadPresetStore(storage: Storage = window.localStorage): PresetStoreV2 {
  const currentRaw = storage.getItem(STORAGE_KEY)
  if (currentRaw) {
    return parseCurrentStore(currentRaw)
  }

  const legacyRaw = storage.getItem(LEGACY_STORAGE_KEY)
  if (!legacyRaw) {
    return DEFAULT_STORE
  }

  const migrated = migrateLegacyStore(legacyRaw)
  storage.setItem(STORAGE_KEY, JSON.stringify(migrated))
  return migrated
}

export function savePresetStore(store: PresetStoreV2, storage: Storage = window.localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function loadProPresetStore(storage: Storage = window.localStorage): ProPresetStore {
  const raw = storage.getItem(PRO_STORAGE_KEY)
  if (!raw) {
    return { version: 1, versions: [] }
  }
  return parseProStore(raw)
}

export function saveProPresetStore(store: ProPresetStore, storage: Storage = window.localStorage): void {
  storage.setItem(PRO_STORAGE_KEY, JSON.stringify(store))
}

function parseCurrentStore(raw: string): PresetStoreV2 {
  const parsed = JSON.parse(raw) as unknown
  if (!isRecord(parsed) || parsed.version !== 2 || !Array.isArray(parsed.presets)) {
    throw new Error('Unsupported preset store format')
  }
  return {
    version: 2,
    presets: parsed.presets.map(parsePresetV2),
  }
}

function parseProStore(raw: string): ProPresetStore {
  const parsed = JSON.parse(raw) as unknown
  if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.versions)) {
    throw new Error('Unsupported Pro preset store format')
  }
  return {
    version: 1,
    versions: parsed.versions.map(parseProVersion),
  }
}

function parseProVersion(value: unknown): ProVersion {
  if (!isRecord(value)) {
    throw new Error('Pro version is not an object')
  }
  return {
    id: asString(value.id),
    name: asString(value.name),
    revisionDate: asString(value.revisionDate),
    gtfsSources: parseProGtfsSources(value.gtfsSources),
    presets: parseProPresets(value.presets),
  }
}

function parseProGtfsSources(value: unknown): ProGtfsSource[] {
  return asArray(value).map((item) => {
    const record = asRecord(item)
    return {
      sourceId: asString(record.sourceId),
      info: parseProInfoV2(record.info),
    }
  })
}

function parseProInfoV2(value: unknown): RepoInfoV2 | RawInfoV2 {
  const record = asRecord(value)
  if (record.kind === 'repo') {
    return {
      kind: 'repo',
      id: asString(record.id),
      orgId: asString(record.orgId),
      feedId: asString(record.feedId),
      fileUid: asNullableString(record.fileUid),
      fileLabel: asNullableString(record.fileLabel),
      name: asNullableString(record.name),
    }
  }

  if (record.kind === 'raw') {
    return {
      kind: 'raw',
      id: asString(record.id),
      uuid: asString(record.uuid),
      name: asNullableString(record.name),
      cacheState: asProRawCacheState(record.cacheState),
    }
  }

  throw new Error('Unknown Pro preset info kind')
}

function parseProPresets(value: unknown): ProPreset[] {
  return asArray(value).map((item) => parseProPreset(asRecord(item)))
}

function parseProPreset(value: Record<string, unknown>): ProPreset {
  return {
    id: asString(value.id),
    name: asString(value.name),
    index: asNumber(value.index),
    sourceIds: asStringArray(value.sourceIds),
    routes: parseProRouteDetails(value.routes),
    routeDisplayOverrides: parseProRouteDisplayOverrides(value.routeDisplayOverrides),
    poles: parseProPoleDetails(value.poles),
    excludedStopPatterns: parseProStopPatterns(value.excludedStopPatterns),
  }
}

function parseProRouteDetails(value: unknown): ProRouteDetail[] {
  return asArray(value).map((item) => {
    const record = asRecord(item)
    return {
      sourceId: asString(record.sourceId),
      id: asString(record.id),
      direction: asNullableNumber(record.direction),
    }
  })
}

function parseProRouteDisplayOverrides(value: unknown): ProRouteDisplayOverride[] {
  return asArray(value).map((item) => {
    const record = asRecord(item)
    return {
      routeKey: asString(record.routeKey),
      routeNameOverride: asNullableString(record.routeNameOverride),
      routeNameFont: parseNullableProDisplayFont(record.routeNameFont),
      destinationOverride: asNullableString(record.destinationOverride),
      stopCellOverrides: parseProStopCellDisplayOverrides(record.stopCellOverrides),
    }
  })
}

function parseNullableProDisplayFont(value: unknown): ProDisplayFont | null {
  return value === null ? null : parseProDisplayFont(value)
}

function parseProDisplayFont(value: unknown): ProDisplayFont {
  if (value === 'NADIA_B' || value === 'NADIA_R' || value === 'HEISEI_MINCHO_STD_W3') {
    return value
  }
  throw new Error('Invalid Pro display font')
}

function parseProStopCellDisplayOverrides(value: unknown): ProRouteDisplayOverride['stopCellOverrides'] {
  return asArray(value).map((item) => {
    const record = asRecord(item)
    return {
      poleId: asString(record.poleId),
      text: asString(record.text),
      rowSpan: asNumber(record.rowSpan),
      font: parseProDisplayFont(record.font),
    }
  })
}

function parseProPoleDetails(value: unknown): ProPoleDetail[] {
  return asArray(value).map((item) => {
    const record = asRecord(item)
    return {
      id: asString(record.id),
      stops: parseProPoleStops(record.stops),
      override: parseProOverride(record.override),
    }
  })
}

function parseProPoleStops(value: unknown) {
  return asArray(value).map((item) => {
    const record = asRecord(item)
    return {
      sourceId: asString(record.sourceId),
      id: asString(record.id),
      stopSequence: asNullableNumber(record.stopSequence),
      stopPatternKey: asString(record.stopPatternKey),
      stopIndex: asNumber(record.stopIndex),
    }
  })
}

function parseProOverride(value: unknown): OverrideConfig {
  const record = asRecord(value)
  return {
    majorStop: asBoolean(record.majorStop),
    branchStart: asBoolean(record.branchStart),
    branchEnd: asBoolean(record.branchEnd),
    nameOverride: asNullableString(record.nameOverride),
    locationNameOverride: asNullableString(record.locationNameOverride),
    jokoOverride: asNullableString(record.jokoOverride),
    rowShading: asBoolean(record.rowShading),
    stopNameBold: asBoolean(record.stopNameBold),
    horizontalLine: asBoolean(record.horizontalLine),
  }
}

function parseProStopPatterns(value: unknown): string[][] {
  return asArray(value).map((item) => asStringArray(item))
}

function asStringArray(value: unknown): string[] {
  return asArray(value).map(asString)
}

function asProRawCacheState(value: unknown): RawInfoV2['cacheState'] {
  if (value === 'ready' || value === 'missing') {
    return value
  }
  throw new Error('Invalid Pro raw cache state')
}

export function migrateLegacyStore(raw: string): PresetStoreV2 {
  const parsed = JSON.parse(raw) as unknown
  if (!Array.isArray(parsed)) {
    throw new Error('Legacy preset store must be an array')
  }
  return {
    version: 2,
    presets: parsed.map(parseLegacyPreset),
  }
}

function parsePresetV2(value: unknown): RoutePresetV2 {
  if (!isRecord(value)) {
    throw new Error('Preset is not an object')
  }
  return {
    id: asString(value.id),
    name: asOptionalString(value.name) ?? 'Default Name',
    index: asOptionalNumber(value.index) ?? 99999999,
    info: parseInfoV2(value.info),
    routes: parseRouteDetails(value.routes),
    poles: parsePoleDetails(value.poles),
    excludedStopPatterns: parseStopPatterns(value.excludedStopPatterns),
  }
}

function parseInfoV2(value: unknown): RepoInfoV2 | RawInfoV2 {
  if (!isRecord(value) || typeof value.kind !== 'string') {
    throw new Error('Preset info is invalid')
  }

  if (value.kind === 'repo') {
    const orgId = asString(value.orgId)
    const feedId = asString(value.feedId)
    const fileUid = asOptionalString(value.fileUid)
    const fileLabel = asOptionalString(value.fileLabel)
    return {
      kind: 'repo',
      id: asOptionalString(value.id) ?? repoInfoId(orgId, feedId, fileUid),
      orgId,
      feedId,
      fileUid,
      fileLabel,
      name: asOptionalString(value.name),
    }
  }

  if (value.kind === 'raw') {
    const uuid = asString(value.uuid)
    return {
      kind: 'raw',
      id: asOptionalString(value.id) ?? uuid,
      uuid,
      name: asOptionalString(value.name),
      cacheState: value.cacheState === 'ready' ? 'ready' : 'missing',
    }
  }

  throw new Error('Unknown preset info kind')
}

function parseLegacyPreset(value: unknown): RoutePresetV2 {
  if (!isRecord(value)) {
    throw new Error('Legacy preset is invalid')
  }

  return {
    id: asString(value.id),
    name: asOptionalString(value.name) ?? 'Default Name',
    index: asOptionalNumber(value.index) ?? 99999999,
    info: parseLegacyInfo(value.info),
    routes: parseRouteDetails(value.routes),
    poles: parsePoleDetails(value.poles),
    excludedStopPatterns: parseStopPatterns(value.excludedStopPatterns),
  }
}

function parseLegacyInfo(value: unknown): RepoInfoV2 | RawInfoV2 {
  if (!isRecord(value)) {
    throw new Error('Legacy preset info is invalid')
  }
  const typeName = asOptionalString(value.type) ?? ''
  if (typeName.includes('DataRepoGtfsInformation') || ('orgId' in value && 'feedId' in value)) {
    const orgId = asString(value.orgId)
    const feedId = asString(value.feedId)
    const fileUid = asOptionalString(value.fileUid)
    const fileLabel = asOptionalString(value.fileLabel)
    return {
      kind: 'repo',
      id: repoInfoId(orgId, feedId, fileUid),
      orgId,
      feedId,
      fileUid,
      fileLabel,
      name: asOptionalString(value.name),
    }
  }
  if (typeName.includes('RawGtfsInformation') || 'uuid' in value) {
    const uuid = asString(value.uuid)
    return {
      kind: 'raw',
      id: uuid,
      uuid,
      name: asOptionalString(value.name),
      cacheState: 'missing',
    }
  }
  throw new Error('Unsupported legacy preset info')
}

function parseRouteDetails(value: unknown): RouteDetail[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter(isRecord).map((item) => ({
    id: asString(item.id),
    direction: asOptionalNumber(item.direction),
  }))
}

function parsePoleDetails(value: unknown): PoleDetail[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter(isRecord).map((item) => ({
    id: asString(item.id),
    override: parseOverride(item.override),
  }))
}

function parseOverride(value: unknown) {
  if (!isRecord(value)) {
    return EMPTY_OVERRIDE
  }
  const majorStop = Boolean(value.majorStop)
  return {
    majorStop,
    branchStart: Boolean(value.branchStart),
    branchEnd: Boolean(value.branchEnd),
    nameOverride: asOptionalString(value.nameOverride),
    locationNameOverride: asOptionalString(value.locationNameOverride),
    jokoOverride: asOptionalString(value.jokoOverride),
    rowShading: typeof value.rowShading === 'boolean' ? value.rowShading : majorStop,
    stopNameBold: typeof value.stopNameBold === 'boolean' ? value.stopNameBold : majorStop,
    horizontalLine: Boolean(value.horizontalLine),
  }
}

function parseStopPatterns(value: unknown): string[][] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter(Array.isArray).map((item) => item.map((entry) => asString(entry)))
}

function asString(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('Expected string')
  }
  return value
}

function asNullableString(value: unknown): string | null {
  if (value === null) {
    return null
  }
  return asString(value)
}

function asOptionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function repoInfoId(orgId: string, feedId: string, fileUid: string | null): string {
  return fileUid ? `${feedId}_${orgId}_${fileUid}` : `${feedId}_${orgId}`
}

function asOptionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asNullableNumber(value: unknown): number | null {
  if (value === null) {
    return null
  }
  return asNumber(value)
}

function asNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Expected number')
  }
  return value
}

function asBoolean(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new Error('Expected boolean')
  }
  return value
}

function asArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error('Expected array')
  }
  return value
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error('Expected object')
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
