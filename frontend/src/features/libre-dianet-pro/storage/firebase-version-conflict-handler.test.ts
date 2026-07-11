import { describe, expect, it } from 'vitest'
import type { ProPreset, ProVersion } from '../../../types'
import { mergeConflictingVersion } from './firebase-version-conflict-handler'

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
