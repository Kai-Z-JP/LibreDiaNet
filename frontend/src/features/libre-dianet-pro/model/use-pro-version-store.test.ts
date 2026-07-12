import { describe, expect, it } from 'vitest'
import type { ProPreset, ProVersion } from '../../../types'
import { mergeRemoteVersions } from './use-pro-version-store'

const preset = (id: string, name: string): ProPreset =>
  ({ id, name, index: 0, sourceIds: [], routes: [], poles: [], excludedStopPatterns: [], routeDisplayOverrides: [] })

const version = (presets: ProPreset[]): ProVersion =>
  ({ id: 'version', name: '改正', revisionDate: '2026-07-11', gtfsSources: [], presets })

describe('mergeRemoteVersions', () => {
  it('keeps an edited preset when Firestore updates another preset', () => {
    const previous = version([preset('editing', '編集前'), preset('other', '更新前')])
    const local = version([preset('editing', '編集中'), preset('other', '更新前')])
    const remote = version([preset('editing', '編集前'), preset('other', 'リモート更新')])

    expect(mergeRemoteVersions([previous], [local], [remote])[0]?.presets.map(({ name }) => name)).toEqual([
      '編集中',
      'リモート更新',
    ])
  })

  it('accepts a remote update when the same preset has no local changes', () => {
    const previous = version([preset('preset', '更新前')])
    const remote = version([preset('preset', '更新後')])

    expect(mergeRemoteVersions([previous], [previous], [remote])[0]?.presets[0]?.name).toBe('更新後')
  })

  it('does not preserve a local value only because object keys were reordered', () => {
    const previous = version([{ ...preset('preset', '更新前'), routeDisplayOverrides: [routeDisplayOverride()] }])
    const local = version([
      {
        ...preset('preset', '更新前'),
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
    ])
    const remote = version([{ ...preset('preset', '更新後'), routeDisplayOverrides: [routeDisplayOverride()] }])

    expect(mergeRemoteVersions([previous], [local], [remote])).toEqual([remote])
  })

  it('preserves locally created and deleted presets', () => {
    const previous = version([preset('deleted', '削除対象')])
    const local = version([preset('created', '新規')])
    const remote = version([preset('deleted', '削除対象'), preset('remote', 'リモート追加')])

    expect(mergeRemoteVersions([previous], [local], [remote])[0]?.presets.map(({ id }) => id)).toEqual(['remote', 'created'])
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
