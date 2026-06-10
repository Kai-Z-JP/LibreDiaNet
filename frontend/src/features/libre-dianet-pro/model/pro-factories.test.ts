import { describe, expect, it } from 'vitest'
import { EMPTY_OVERRIDE, type ProPreset } from '../../../types'
import { duplicateProPreset } from './pro-factories'

describe('duplicateProPreset', () => {
  it('duplicates preset-managed ids and remaps pole references', () => {
    const preset: ProPreset = {
      id: 'preset-a',
      name: 'Preset A',
      index: 1,
      sourceIds: ['source-a'],
      routes: [{ sourceId: 'source-a', id: 'route-a', direction: null }],
      routeDisplayOverrides: [
        {
          routeKey: 'source-a::route-a::none::pattern-a',
          routeNameOverride: null,
          destinationOverride: null,
          useTripHeadsignAsDestination: false,
          stopCellOverrides: [{ poleId: 'pole-a', text: 'override', rowSpan: 2 }],
        },
      ],
      poles: [
        {
          id: 'pole-a',
          stops: [
            {
              sourceId: 'source-a',
              id: 'stop-a',
              stopSequence: 1,
              stopPatternKey: 'pattern-a',
              stopIndex: 0,
            },
          ],
          override: EMPTY_OVERRIDE,
        },
      ],
      excludedStopPatterns: [['stop-a']],
    }

    const duplicatedPreset = duplicateProPreset(preset)

    expect(duplicatedPreset.id).not.toBe(preset.id)
    expect(duplicatedPreset.name).toBe('Preset A のコピー')
    expect(duplicatedPreset.poles[0]?.id).not.toBe('pole-a')
    expect(duplicatedPreset.poles[0]?.stops[0]?.id).toBe('stop-a')
    expect(duplicatedPreset.routeDisplayOverrides[0]?.stopCellOverrides[0]?.poleId).toBe(duplicatedPreset.poles[0]?.id)
    expect(duplicatedPreset.routeDisplayOverrides[0]?.routeKey).toBe(preset.routeDisplayOverrides[0]?.routeKey)
  })
})
