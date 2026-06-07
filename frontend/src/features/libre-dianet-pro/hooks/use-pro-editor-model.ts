import { useEffect, useMemo, useReducer, useRef, type SetStateAction } from 'react'
import type { GtfsStop, ProPreset, ProPresetContext, ProVersion } from '../../../types'
import { libreDiaNetRepository } from '../../libre-dianet/lib/repository'
import type { ProConstructedRoute, ProRouteOption } from '../model/pro-types'

type ProEditorState = {
  tab: number
  deletePresetConfirmOpen: boolean
  routeOptions: ProRouteOption[]
  constructedRoutes: ProConstructedRoute[]
  stopMap: Record<string, GtfsStop>
  draftVersion: ProVersion
  draftPreset: ProPreset | null
  draftContext: ProPresetContext
  activeDraftKey: string
}

type ProEditorAction =
  | { type: 'setTab'; value: number }
  | { type: 'setDeletePresetConfirmOpen'; value: boolean }
  | { type: 'setRouteOptions'; value: ProRouteOption[] }
  | { type: 'setConstructedRoutes'; value: ProConstructedRoute[] }
  | { type: 'setStopMap'; value: Record<string, GtfsStop> }
  | { type: 'setDraftVersion'; value: SetStateAction<ProVersion> }
  | { type: 'setDraftPreset'; value: SetStateAction<ProPreset | null> }
  | { type: 'setDraftContext'; value: SetStateAction<ProPresetContext> }
  | { type: 'resetDraft'; version: ProVersion; preset: ProPreset | null; draftKey: string; resetTab: boolean }

function applyStateAction<T>(current: T, value: SetStateAction<T>): T {
  return typeof value === 'function' ? (value as (current: T) => T)(current) : value
}

function proEditorReducer(state: ProEditorState, action: ProEditorAction): ProEditorState {
  switch (action.type) {
    case 'setTab':
      return { ...state, tab: action.value }
    case 'setDeletePresetConfirmOpen':
      return { ...state, deletePresetConfirmOpen: action.value }
    case 'setRouteOptions':
      return { ...state, routeOptions: action.value }
    case 'setConstructedRoutes':
      return { ...state, constructedRoutes: action.value }
    case 'setStopMap':
      return { ...state, stopMap: action.value }
    case 'setDraftVersion':
      return { ...state, draftVersion: applyStateAction(state.draftVersion, action.value) }
    case 'setDraftPreset':
      return { ...state, draftPreset: applyStateAction(state.draftPreset, action.value) }
    case 'setDraftContext':
      return { ...state, draftContext: applyStateAction(state.draftContext, action.value) }
    case 'resetDraft':
      return {
        ...state,
        tab: action.resetTab ? 0 : state.tab,
        draftVersion: action.version,
        draftPreset: action.preset,
        activeDraftKey: action.draftKey,
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
    routeOptions: [],
    constructedRoutes: [],
    stopMap: {},
    draftVersion: version,
    draftPreset: preset,
    draftContext: { loading: false, handles: {}, errors: {} },
    activeDraftKey: `${version.id}:${preset?.id ?? ''}`,
  })
  const {
    tab,
    deletePresetConfirmOpen,
    routeOptions,
    constructedRoutes,
    stopMap,
    draftVersion,
    draftPreset,
    draftContext,
    activeDraftKey,
  } = state
  const setRouteOptions = (value: ProRouteOption[]) => dispatch({ type: 'setRouteOptions', value })
  const setConstructedRoutes = (value: ProConstructedRoute[]) => dispatch({ type: 'setConstructedRoutes', value })
  const setStopMap = (value: Record<string, GtfsStop>) => dispatch({ type: 'setStopMap', value })
  const setDraftPreset = (value: SetStateAction<ProPreset | null>) => dispatch({ type: 'setDraftPreset', value })
  const setDraftContext = (value: SetStateAction<ProPresetContext>) => dispatch({ type: 'setDraftContext', value })
  const tabContentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const nextDraftKey = `${version.id}:${preset?.id ?? ''}`
    dispatch({ type: 'resetDraft', version, preset, draftKey: nextDraftKey, resetTab: nextDraftKey !== activeDraftKey })
  }, [activeDraftKey, version, preset])

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
  const sourceNameMap = useMemo(
    () => Object.fromEntries(draftVersion.gtfsSources.map((source) => [source.sourceId, source.info.name ?? source.info.id])),
    [draftVersion.gtfsSources],
  )

  useEffect(() => {
    let cancelled = false
    setDraftContext((current) => ({ ...current, loading: true }))
    const load = async () => {
      const entries = await Promise.all(
        draftVersion.gtfsSources.map(async (source) => {
          const existing = context.handles[source.sourceId]
          if (existing) {
            return [source.sourceId, existing, null] as const
          }
          try {
            if (source.info.kind === 'raw' && source.info.cacheState === 'missing') {
              throw new Error('GTFSキャッシュが見つからないため、ZIPの再アップロードが必要です。')
            }
            const result =
              source.info.kind === 'repo'
                ? await libreDiaNetRepository.openRepoFeed(source.info)
                : await libreDiaNetRepository.openRawFeed(source.info)
            return [source.sourceId, result.handle, null] as const
          } catch (error) {
            return [source.sourceId, null, error instanceof Error ? error.message : 'GTFSデータの読み込みに失敗しました'] as const
          }
        }),
      )
      if (cancelled) {
        return
      }
      setDraftContext({
        loading: false,
        handles: Object.fromEntries(entries.flatMap(([sourceId, handle]) => (handle ? [[sourceId, handle]] : []))),
        errors: Object.fromEntries(entries.flatMap(([sourceId, , error]) => (error ? [[sourceId, error]] : []))),
      })
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [context.handles, draftVersion.gtfsSources])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const options = await Promise.all(
        draftVersion.gtfsSources.map(async (source) => {
          const handle = draftContext.handles[source.sourceId]
          if (!handle) {
            return []
          }
          const sourceName = source.info.name ?? source.info.id
          const routes = await libreDiaNetRepository.listRoutesWithDirections(handle)
          return routes.map((route) => ({
            ...route,
            railwayCode: `${source.sourceId}::${route.railwayCode}`,
            sourceId: source.sourceId,
            sourceName,
            label: `${sourceName} / ${route.label}`,
          }))
        }),
      )
      if (!cancelled) {
        setRouteOptions(options.flat())
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [draftContext.handles, draftVersion.gtfsSources])

  useEffect(() => {
    if (!draftPreset) {
      setConstructedRoutes([])
      setStopMap({})
      return
    }
    let cancelled = false
    const load = async () => {
      const routes = await Promise.all(
        draftPreset.sourceIds.map(async (sourceId) => {
          const handle = draftContext.handles[sourceId]
          if (!handle) {
            return []
          }
          const selectedRoutes = draftPreset.routes.filter((route) => route.sourceId === sourceId)
          const built = await libreDiaNetRepository.buildConstructedRoutes(handle, selectedRoutes)
          return built.map((route) => ({
            ...route,
            sourceId,
            sourceName: sourceNameMap[sourceId] ?? sourceId,
          }))
        }),
      )
      const nextConstructedRoutes = routes.flat()
      const sourceStopIds = new Map<string, Set<string>>()
      for (const route of nextConstructedRoutes) {
        const ids = sourceStopIds.get(route.sourceId) ?? new Set<string>()
        for (const stop of route.stopPatterns.flat()) {
          ids.add(stop.stopId)
        }
        sourceStopIds.set(route.sourceId, ids)
      }
      for (const pole of draftPreset.poles) {
        for (const stop of pole.stops) {
          const ids = sourceStopIds.get(stop.sourceId) ?? new Set<string>()
          ids.add(stop.id)
          sourceStopIds.set(stop.sourceId, ids)
        }
      }
      const stopEntries = await Promise.all(
        Array.from(sourceStopIds.entries()).map(async ([sourceId, stopIds]) => {
          const handle = draftContext.handles[sourceId]
          if (!handle) {
            return {}
          }
          const stops = await libreDiaNetRepository.getStopsByIds(handle, Array.from(stopIds))
          return Object.fromEntries(Object.entries(stops).map(([id, stop]) => [`${sourceId}::${id}`, stop]))
        }),
      )
      if (!cancelled) {
        setConstructedRoutes(nextConstructedRoutes)
        setStopMap(Object.assign({}, ...stopEntries))
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [draftContext.handles, draftPreset, sourceNameMap])

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
      debugPanel: draftPreset
        ? {
            preset: draftPreset,
          }
        : null,
    },
    tabContentRef,
  }
}
