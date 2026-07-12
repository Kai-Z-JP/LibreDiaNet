import { describe, expect, it } from 'vitest'
import { EMPTY_OVERRIDE, type ProPreset } from '../../../types'
import { duplicateProPole, duplicateProPreset, importProPreset } from './pro-factories'

describe('importProPreset', () => {
  it('changes only the preset id', () => {
    const preset: ProPreset = {
      id: 'preset-a',
      name: 'Preset A',
      index: 1,
      sourceIds: ['source-a'],
      routes: [{ sourceId: 'source-a', id: 'route-a', direction: null }],
      routeDisplayOverrides: [],
      poles: [{ id: 'pole-a', stops: [], override: EMPTY_OVERRIDE }],
      excludedStopPatterns: [],
    }

    const importedPreset = importProPreset(preset)

    expect(importedPreset.id).not.toBe(preset.id)
    expect({ ...importedPreset, id: preset.id }).toEqual(preset)
  })
})

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

describe('duplicateProPole', () => {
  it('inserts a copy after the source pole and copies its cell overrides', () => {
    const preset: ProPreset = {
      id: 'preset-a',
      name: 'Preset A',
      index: 1,
      sourceIds: [],
      routes: [],
      routeDisplayOverrides: [
        {
          routeKey: 'route-a',
          routeNameOverride: null,
          destinationOverride: null,
          useTripHeadsignAsDestination: false,
          stopCellOverrides: [{ poleId: 'pole-a', text: 'override', rowSpan: 2 }],
        },
      ],
      poles: [
        { id: 'pole-a', stops: [], override: { ...EMPTY_OVERRIDE, nameOverride: '標柱A' } },
        { id: 'pole-b', stops: [], override: EMPTY_OVERRIDE },
      ],
      excludedStopPatterns: [],
    }

    const duplicatedPreset = duplicateProPole(preset, 'pole-a')
    const duplicatedPole = duplicatedPreset.poles[1]

    expect(duplicatedPole?.id).not.toBe('pole-a')
    expect(duplicatedPole?.override.nameOverride).toBe('標柱A')
    expect(duplicatedPreset.poles[2]?.id).toBe('pole-b')
    expect(duplicatedPreset.routeDisplayOverrides[0]?.stopCellOverrides).toContainEqual({
      poleId: duplicatedPole?.id,
      text: 'override',
      rowSpan: 2,
    })
  })
})
