import type { RxConflictHandler } from 'rxdb/plugins/core'
import type { ProPreset, ProVersion } from '../../../types'
import type { FirebaseVersionDocument } from './firebase-pro-workspace-codec'

export const firebaseVersionConflictHandler: RxConflictHandler<FirebaseVersionDocument> = {
  isEqual: (left, right) => sameValue(left, right),
  resolve: async ({ assumedMasterState, realMasterState, newDocumentState }) => {
    if (!assumedMasterState || assumedMasterState._deleted || realMasterState._deleted || newDocumentState._deleted) {
      return newDocumentState
    }
    return {
      ...newDocumentState,
      position: mergeValue(assumedMasterState.position, newDocumentState.position, realMasterState.position),
      version: mergeConflictingVersion(assumedMasterState.version, newDocumentState.version, realMasterState.version),
    }
  },
}

export function mergeConflictingVersion(base: ProVersion, local: ProVersion, remote: ProVersion): ProVersion {
  return {
    ...remote,
    name: mergeValue(base.name, local.name, remote.name),
    revisionDate: mergeValue(base.revisionDate, local.revisionDate, remote.revisionDate),
    gtfsSources: mergeValue(base.gtfsSources, local.gtfsSources, remote.gtfsSources),
    presets: mergePresets(base.presets, local.presets, remote.presets),
  }
}

function mergePresets(base: ProPreset[], local: ProPreset[], remote: ProPreset[]): ProPreset[] {
  const baseById = new Map(base.map((preset) => [preset.id, preset]))
  const localById = new Map(local.map((preset) => [preset.id, preset]))
  const remoteById = new Map(remote.map((preset) => [preset.id, preset]))
  const ids = [...new Set([...remote.map(({ id }) => id), ...local.map(({ id }) => id)])]

  return ids.flatMap((id) => {
    const basePreset = baseById.get(id)
    const localPreset = localById.get(id)
    const remotePreset = remoteById.get(id)
    if (!basePreset) {
      return localPreset ? [localPreset] : remotePreset ? [remotePreset] : []
    }
    if (!localPreset) {
      return remotePreset && !sameValue(remotePreset, basePreset) ? [remotePreset] : []
    }
    if (!remotePreset) {
      return !sameValue(localPreset, basePreset) ? [localPreset] : []
    }
    return [mergeValue(basePreset, localPreset, remotePreset)]
  })
}

function mergeValue<T>(base: T, local: T, remote: T): T {
  if (sameValue(local, base)) {
    return remote
  }
  if (sameValue(remote, base)) {
    return local
  }
  return local
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}
