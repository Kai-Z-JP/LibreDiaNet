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

export function duplicateProPreset(preset: ProPreset): ProPreset {
  const clonedPreset = structuredClone(preset)
  const poleIdMap = new Map(clonedPreset.poles.map((pole) => [pole.id, crypto.randomUUID()]))

  return {
    ...clonedPreset,
    id: crypto.randomUUID(),
    name: `${preset.name} のコピー`,
    routeDisplayOverrides: clonedPreset.routeDisplayOverrides.map((override) => ({
      ...override,
      stopCellOverrides: override.stopCellOverrides.map((cellOverride) => ({
        ...cellOverride,
        poleId: poleIdMap.get(cellOverride.poleId) ?? cellOverride.poleId,
      })),
    })),
    poles: clonedPreset.poles.map((pole) => ({
      ...pole,
      id: poleIdMap.get(pole.id) ?? crypto.randomUUID(),
    })),
  }
}

export function duplicateProPole(preset: ProPreset, poleId: string): ProPreset {
  const poleIndex = preset.poles.findIndex((pole) => pole.id === poleId)
  const pole = preset.poles[poleIndex]
  if (!pole) {
    return preset
  }

  const duplicatedPoleId = crypto.randomUUID()
  const duplicatedPole = {
    ...structuredClone(pole),
    id: duplicatedPoleId,
  }
  const poles = [...preset.poles]
  poles.splice(poleIndex + 1, 0, duplicatedPole)

  return {
    ...preset,
    poles,
    routeDisplayOverrides: preset.routeDisplayOverrides.map((override) => ({
      ...override,
      stopCellOverrides: [
        ...override.stopCellOverrides,
        ...override.stopCellOverrides
          .filter((cellOverride) => cellOverride.poleId === poleId)
          .map((cellOverride) => ({ ...cellOverride, poleId: duplicatedPoleId })),
      ],
    })),
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
