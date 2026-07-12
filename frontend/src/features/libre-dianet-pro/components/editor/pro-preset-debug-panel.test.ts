import { describe, expect, it } from 'vitest'
import { EMPTY_OVERRIDE, type ProPreset } from '../../../../types'
import { proPresetJsonFileName, serializeProPreset } from './pro-preset-json'

const preset: ProPreset = {
  id: 'preset-a',
  name: 'Preset/A',
  index: 1,
  sourceIds: ['source-a'],
  routes: [{ sourceId: 'source-a', id: 'route-a', direction: null }],
  routeDisplayOverrides: [],
  poles: [{ id: 'pole-a', stops: [], override: EMPTY_OVERRIDE }],
  excludedStopPatterns: [],
}

describe('Pro preset JSON download', () => {
  it('serializes the standalone preset in an importable form', () => {
    expect(JSON.parse(serializeProPreset(preset))).toEqual(preset)
  })

  it('creates a filesystem-safe JSON file name', () => {
    expect(proPresetJsonFileName(preset.name)).toBe('Preset_A.json')
    expect(proPresetJsonFileName('   ')).toBe('preset.json')
    expect(proPresetJsonFileName('Preset\u0000A')).toBe('Preset_A.json')
  })
})
