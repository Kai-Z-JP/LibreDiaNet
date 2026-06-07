import type { FeedOption, ProGtfsSource, ProPreset, ProVersion, RawInfoV2 } from '../../../types'
import { todayIsoDate } from '../../../utils'
import { repoInfoId, sourceDisplayName } from './pro-source-helpers'

export function createProVersion(): ProVersion {
  return {
    id: crypto.randomUUID(),
    name: '新しい改正',
    revisionDate: todayIsoDate(),
    gtfsSources: [],
    presets: [],
  }
}

export function createProPreset(sourceIds: string[]): ProPreset {
  return {
    id: crypto.randomUUID(),
    name: 'Default Name',
    index: 99999999,
    sourceIds,
    routes: [],
    routeDisplayOverrides: [],
    poles: [],
    excludedStopPatterns: [],
  }
}

export function createRepoSource(option: FeedOption): ProGtfsSource {
  return {
    sourceId: crypto.randomUUID(),
    info: {
      kind: 'repo',
      id: repoInfoId(option.orgId, option.feedId, option.defaultFileUid),
      orgId: option.orgId,
      feedId: option.feedId,
      fileUid: option.defaultFileUid,
      fileLabel: option.defaultFileLabel,
      name: sourceDisplayName(option.label, option.defaultFileLabel),
    },
  }
}

export function createRawSourceInfo(file: File): { info: RawInfoV2; source: ProGtfsSource } {
  const uuid = crypto.randomUUID()
  const info: RawInfoV2 = {
    kind: 'raw',
    id: uuid,
    uuid,
    name: file.name,
    cacheState: 'ready',
  }
  return {
    info,
    source: {
      sourceId: crypto.randomUUID(),
      info,
    },
  }
}
