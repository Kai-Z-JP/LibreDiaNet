import { useEffect, useMemo, useReducer, useRef, type SetStateAction } from 'react'
import type { ProPreset, ProPresetContext, ProVersion } from '../../../types'
import { useProEditorData } from '../model/use-pro-editor-data'

export type ProEditorState = {
  tab: number
  deletePresetConfirmOpen: boolean
  draftVersion: ProVersion
  draftPreset: ProPreset | null
  externalPreset: ProPreset | null
  activeDraftKey: string
}

export type ProEditorAction =
  | { type: 'setTab'; value: number }
  | { type: 'setDeletePresetConfirmOpen'; value: boolean }
  | { type: 'setDraftVersion'; value: SetStateAction<ProVersion> }
  | { type: 'setDraftPreset'; value: SetStateAction<ProPreset | null> }
  | { type: 'reconcileDraft'; version: ProVersion; preset: ProPreset | null; draftKey: string }

function applyStateAction<T>(current: T, value: SetStateAction<T>): T {
  return typeof value === 'function' ? (value as (current: T) => T)(current) : value
}

export function proEditorReducer(state: ProEditorState, action: ProEditorAction): ProEditorState {
  switch (action.type) {
    case 'setTab':
      return { ...state, tab: action.value }
    case 'setDeletePresetConfirmOpen':
      return { ...state, deletePresetConfirmOpen: action.value }
    case 'setDraftVersion':
      return { ...state, draftVersion: applyStateAction(state.draftVersion, action.value) }
    case 'setDraftPreset':
      return { ...state, draftPreset: applyStateAction(state.draftPreset, action.value) }
    case 'reconcileDraft': {
      const selectionChanged = action.draftKey !== state.activeDraftKey
      return {
        ...state,
        tab: selectionChanged ? 0 : state.tab,
        draftVersion: action.version,
        draftPreset: selectionChanged || sameValue(state.draftPreset, state.externalPreset) ? action.preset : state.draftPreset,
        externalPreset: action.preset,
        activeDraftKey: action.draftKey,
      }
    }
  }
}

export function useProEditorModel({
  version,
  preset,
  context,
  feedError,
  onUpdateVersion,
  onDeletePreset,
}: {
  version: ProVersion
  preset: ProPreset | null
  context: ProPresetContext
  feedError: string | null
  onUpdateVersion: (version: ProVersion) => void
  onDeletePreset?: () => void
}) {
  const [state, dispatch] = useReducer(proEditorReducer, {
    tab: 0,
    deletePresetConfirmOpen: false,
    draftVersion: version,
    draftPreset: preset,
    externalPreset: preset,
    activeDraftKey: `${version.id}:${preset?.id ?? ''}`,
  })
  const { tab, deletePresetConfirmOpen, draftVersion, draftPreset } = state
  const setDraftPreset = (value: SetStateAction<ProPreset | null>) => dispatch({ type: 'setDraftPreset', value })
  const tabContentRef = useRef<HTMLDivElement | null>(null)
  const { draftContext, sourceNameMap, routeOptions, constructedRoutes, stopMap } = useProEditorData({
    context,
    draftVersion,
    draftPreset,
  })

  useEffect(() => {
    const nextDraftKey = `${version.id}:${preset?.id ?? ''}`
    dispatch({ type: 'reconcileDraft', version, preset, draftKey: nextDraftKey })
  }, [version, preset])

  useEffect(() => {
    tabContentRef.current?.scrollTo({ top: 0, left: 0 })
  }, [tab])

  const versionForSave = useMemo(
    () =>
      draftPreset
        ? {
            ...draftVersion,
            presets: draftVersion.presets.map((item) => (item.id === draftPreset.id ? draftPreset : item)),
          }
        : draftVersion,
    [draftPreset, draftVersion],
  )

  const changed = JSON.stringify(versionForSave) !== JSON.stringify(version)
  const actions = {
    selectTab: (value: number) => dispatch({ type: 'setTab', value }),
    openDeletePresetConfirm: () => dispatch({ type: 'setDeletePresetConfirmOpen', value: true }),
    closeDeletePresetConfirm: () => dispatch({ type: 'setDeletePresetConfirmOpen', value: false }),
    replaceDraftPreset: (nextPreset: ProPreset) => setDraftPreset(nextPreset),
  }

  return {
    state: {
      tab,
      deletePresetConfirmOpen,
      routeOptions,
      constructedRoutes,
      stopMap,
      draftVersion,
      draftPreset,
      draftContext,
    },
    derived: {
      versionForSave,
      changed,
      sourceNameMap,
    },
    actions,
    props: {
      toolbar: {
        draftPreset,
        versionName: version.name,
        changed,
        canDeletePreset: Boolean(onDeletePreset),
        onRenamePreset: (name: string) => draftPreset && setDraftPreset({ ...draftPreset, name }),
        onSave: () => onUpdateVersion(versionForSave),
        onRequestDeletePreset: actions.openDeletePresetConfirm,
      },
      status: {
        loading: context.loading || draftContext.loading,
        feedError,
        draftErrors: draftContext.errors,
        sourceNameMap,
      },
      deletePresetDialog: {
        open: deletePresetConfirmOpen,
        presetName: draftPreset?.name ?? preset?.name ?? 'このプリセット',
        disabled: !onDeletePreset,
        onClose: actions.closeDeletePresetConfirm,
        onConfirm: () => {
          actions.closeDeletePresetConfirm()
          onDeletePreset?.()
        },
      },
      tabs: {
        value: tab,
        onChange: actions.selectTab,
      },
      routePanel: draftPreset
        ? {
            version: draftVersion,
            preset: draftPreset,
            routeOptions,
            onUpdate: actions.replaceDraftPreset,
            onDelete: onDeletePreset ? actions.openDeletePresetConfirm : undefined,
          }
        : null,
      poleMergePanel: draftPreset
        ? {
            preset: draftPreset,
            constructedRoutes,
            stopMap,
            onUpdate: actions.replaceDraftPreset,
          }
        : null,
      previewPanel: draftPreset
        ? {
            version: draftVersion,
            preset: draftPreset,
            context: draftContext,
            constructedRoutes,
            stopMap,
            sourceNameMap,
            onUpdate: actions.replaceDraftPreset,
          }
        : null,
      farePanel: draftPreset
        ? {
            preset: draftPreset,
            context: draftContext,
            constructedRoutes,
            stopMap,
            sourceNameMap,
          }
        : null,
      debugPanel: draftPreset
        ? {
            preset: draftPreset,
          }
        : null,
    },
    tabContentRef,
  }
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}
