import { describe, expect, it } from 'vitest'
import type { ProPreset, ProVersion } from '../../../types'
import { proEditorReducer, type ProEditorState } from './use-pro-editor-model'

const preset: ProPreset = {
  id: 'preset',
  name: '編集前',
  index: 0,
  sourceIds: [],
  routes: [],
  routeDisplayOverrides: [],
  poles: [],
  excludedStopPatterns: [],
}
const version: ProVersion = {
  id: 'version',
  name: '改正',
  revisionDate: '2026-07-11',
  gtfsSources: [],
  presets: [preset],
}

const state = (draftPreset: ProPreset): ProEditorState => ({
  tab: 1,
  deletePresetConfirmOpen: false,
  draftVersion: version,
  draftPreset,
  externalPreset: preset,
  activeDraftKey: 'version:preset',
})

describe('proEditorReducer', () => {
  it('keeps preset edits when the selected version receives a GTFS-related update', () => {
    const editingPreset = { ...preset, name: '編集中' }
    const updatedVersion = { ...version, revisionDate: '2026-07-12' }

    const result = proEditorReducer(state(editingPreset), {
      type: 'reconcileDraft',
      version: updatedVersion,
      preset,
      draftKey: 'version:preset',
    })

    expect(result.draftPreset?.name).toBe('編集中')
    expect(result.draftVersion.revisionDate).toBe('2026-07-12')
    expect(result.tab).toBe(1)
  })

  it('accepts an external preset update when the draft has not changed', () => {
    const updatedPreset = { ...preset, name: '外部更新' }

    const result = proEditorReducer(state(preset), {
      type: 'reconcileDraft',
      version: { ...version, presets: [updatedPreset] },
      preset: updatedPreset,
      draftKey: 'version:preset',
    })

    expect(result.draftPreset?.name).toBe('外部更新')
  })
})
