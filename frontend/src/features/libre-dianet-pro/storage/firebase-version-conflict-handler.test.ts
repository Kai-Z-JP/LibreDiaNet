import { describe, expect, it } from 'vitest'
import type { ProPreset, ProVersion } from '../../../types'
import { encodeFirebaseVersionDocument, type FirebaseVersionDocument } from './firebase-pro-workspace-codec'
import { firebaseVersionConflictHandler, mergeConflictingVersion } from './firebase-version-conflict-handler'

const preset = (id: string, name: string): ProPreset => ({
  id,
  name,
  index: 0,
  sourceIds: [],
  routes: [],
  routeDisplayOverrides: [],
  poles: [],
  excludedStopPatterns: [],
})
const version = (presets: ProPreset[]): ProVersion => ({
  id: 'version',
  name: '改正',
  revisionDate: '2026-07-11',
  gtfsSources: [],
  presets,
})

describe('mergeConflictingVersion', () => {
  it('treats documents with reordered object keys as equal', () => {
    const left = {
      id: 'document',
      workspaceId: 'workspace',
      position: 0,
      version: version([{ ...preset('a', 'A'), routeDisplayOverrides: [routeDisplayOverride()] }]),
      _deleted: false,
    }
    const right = {
      version: version([
        {
          ...preset('a', 'A'),
          routeDisplayOverrides: [
            {
              stopCellOverrides: [],
              useTripHeadsignAsDestination: false,
              destinationOverride: null,
              routeNameOverride: null,
              routeKey: 'route',
            },
          ],
        },
      ]),
      position: 0,
      workspaceId: 'workspace',
      id: 'document',
      _deleted: false,
    }

    expect(JSON.stringify(left)).not.toBe(JSON.stringify(right))
    expect(firebaseVersionConflictHandler.isEqual(left, right, 'test')).toBe(true)
  })

  it('treats Firestore-encoded and local documents as equal', () => {
    const local = versionDocument(version([{ ...preset('a', 'A'), excludedStopPatterns: [['source::pattern']] }]))
    const encoded = encodeFirebaseVersionDocument(local)

    expect(encoded).not.toEqual(local)
    expect(firebaseVersionConflictHandler.isEqual(local, encoded, 'test')).toBe(true)
  })

  it('returns local document shapes after resolving an encoded Firestore conflict', async () => {
    const base = versionDocument(version([{ ...preset('a', 'A'), excludedStopPatterns: [['base']] }]))
    const local = versionDocument(version([{ ...preset('a', 'ローカル'), excludedStopPatterns: [['local']] }]))
    const remote = encodeFirebaseVersionDocument(
      versionDocument(version([{ ...preset('a', 'A'), excludedStopPatterns: [['remote']] }])),
    )

    const resolved = await firebaseVersionConflictHandler.resolve(
      {
        assumedMasterState: encodeFirebaseVersionDocument(base),
        newDocumentState: encodeFirebaseVersionDocument(local),
        realMasterState: remote,
      },
      'test',
    )

    expect(resolved.version.presets[0]?.excludedStopPatterns).toEqual([['local']])
    expect(Array.isArray(resolved.version.presets[0]?.excludedStopPatterns[0])).toBe(true)
  })

  it('combines concurrent edits to different presets', () => {
    const base = version([preset('a', 'A'), preset('b', 'B')])
    const local = version([preset('a', 'Aを編集'), preset('b', 'B')])
    const remote = version([preset('a', 'A'), preset('b', 'Bを編集')])

    expect(mergeConflictingVersion(base, local, remote).presets.map(({ name }) => name)).toEqual(['Aを編集', 'Bを編集'])
  })

  it('does not restore a stale preset over a newer saved value', () => {
    const base = version([preset('a', '古いA'), preset('b', 'B')])
    const local = version([preset('a', '古いA'), preset('b', 'Bを編集')])
    const remote = version([preset('a', '新しいA'), preset('b', 'B')])

    expect(mergeConflictingVersion(base, local, remote).presets.map(({ name }) => name)).toEqual(['新しいA', 'Bを編集'])
  })
})

function routeDisplayOverride() {
  return {
    routeKey: 'route',
    routeNameOverride: null,
    destinationOverride: null,
    useTripHeadsignAsDestination: false,
    stopCellOverrides: [],
  }
}

function versionDocument(value: ProVersion): FirebaseVersionDocument & { _deleted: boolean } {
  return {
    id: 'document',
    workspaceId: 'workspace',
    position: 0,
    version: value,
    _deleted: false,
  }
}
