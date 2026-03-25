import {
  EMPTY_OVERRIDE,
  type PoleDetail,
  type PresetStoreV2,
  type RawInfoV2,
  type RepoInfoV2,
  type RouteDetail,
  type RoutePresetV2,
} from './types'

export const LEGACY_STORAGE_KEY = 'libre-dianet'
export const STORAGE_KEY = 'libre-dianet-v2'

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
    return {
      kind: 'repo',
      id: asOptionalString(value.id) ?? `${feedId}_${orgId}`,
      orgId,
      feedId,
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
    return {
      kind: 'repo',
      id: `${feedId}_${orgId}`,
      orgId,
      feedId,
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
  return {
    majorStop: Boolean(value.majorStop),
    branchStart: Boolean(value.branchStart),
    branchEnd: Boolean(value.branchEnd),
    nameOverride: asOptionalString(value.nameOverride),
    locationNameOverride: asOptionalString(value.locationNameOverride),
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

function asOptionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function asOptionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
