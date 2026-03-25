import { useEffect, useMemo, useState } from 'react'
import { fetchGtfsFeeds } from '../../../api'
import { loadPresetStore, savePresetStore } from '../../../storage'
import type { FeedOption, GtfsFeedItem, PresetContext, RawInfoV2, RoutePresetV2 } from '../../../types'
import { libreDiaNetRepository } from '../lib/repository'

export function useLibreDiaNetApp() {
  const initialStore = useMemo(() => loadPresetStore(), [])
  const [presetList, setPresetList] = useState(initialStore.presets)
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(initialStore.presets[0]?.id ?? null)
  const [feedItems, setFeedItems] = useState<GtfsFeedItem[]>([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [feedError, setFeedError] = useState<string | null>(null)
  const [presetContext, setPresetContext] = useState<PresetContext>({ loading: false, handle: null, error: null })
  const [rawFiles, setRawFiles] = useState<Record<string, File>>({})

  useEffect(() => {
    void fetchGtfsFeeds()
      .then(setFeedItems)
      .catch((error: unknown) => setFeedError(error instanceof Error ? error.message : 'GTFSデータ一覧の取得に失敗しました'))
      .finally(() => setFeedLoading(false))
    return () => {
      void libreDiaNetRepository.closeAll()
    }
  }, [])

  useEffect(() => {
    savePresetStore({ version: 2, presets: presetList })
  }, [presetList])

  useEffect(() => {
    if (presetList.length === 0) {
      setSelectedPresetId(null)
      return
    }
    if (!selectedPresetId || !presetList.some((preset) => preset.id === selectedPresetId)) {
      setSelectedPresetId(presetList[0].id)
    }
  }, [presetList, selectedPresetId])

  const selectedPreset = presetList.find((preset) => preset.id === selectedPresetId) ?? null
  const selectedRawFile = selectedPreset?.info.kind === 'raw' ? (rawFiles[selectedPreset.info.uuid] ?? null) : null

  useEffect(() => {
    if (!selectedPreset) {
      setPresetContext({ loading: false, handle: null, error: null })
      return
    }

    if (selectedPreset.info.kind === 'raw' && selectedPreset.info.cacheState === 'missing') {
      setPresetContext({
        loading: false,
        handle: null,
        error: 'GTFSキャッシュが見つからないため、ZIPの再アップロードが必要です。',
      })
      return
    }

    let cancelled = false
    setPresetContext((current) => ({ ...current, loading: true, error: null }))

    const load = async () => {
      try {
        const result =
          selectedPreset.info.kind === 'repo'
            ? await libreDiaNetRepository.openRepoFeed(selectedPreset.info)
            : await libreDiaNetRepository.openRawFeed(selectedPreset.info)

        if (cancelled) {
          return
        }
        setPresetContext({ loading: false, handle: result.handle, error: null })
      } catch (error) {
        if (cancelled) {
          return
        }
        if (selectedPreset.info.kind === 'raw' && libreDiaNetRepository.isRawCacheMissing(error)) {
          setPresetContext({ loading: false, handle: null, error: 'GTFSキャッシュが見つからないため、ZIPの再アップロードが必要です。' })
          setPresetList((current) =>
            current.map((preset) =>
              preset.id === selectedPreset.id && preset.info.kind === 'raw'
                ? {
                    ...preset,
                    info: {
                      ...preset.info,
                      cacheState: 'missing',
                    },
                  }
                : preset,
            ),
          )
          return
        }
        setPresetContext({
          loading: false,
          handle: null,
          error: error instanceof Error ? error.message : 'GTFSデータの読み込みに失敗しました',
        })
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [selectedPreset])

  const feedOptions = useMemo<FeedOption[]>(
    () =>
      feedItems.map((item) => ({
        label: `${item.feed_name}<${item.organization_name}>`,
        orgId: item.organization_id,
        feedId: item.feed_id,
      })),
    [feedItems],
  )

  const updatePreset = (nextPreset: RoutePresetV2) => {
    setPresetList((current) => current.map((preset) => (preset.id === nextPreset.id ? nextPreset : preset)))
  }

  const createRepoPreset = (option: FeedOption) => {
    const preset: RoutePresetV2 = {
      id: crypto.randomUUID(),
      name: 'Default Name',
      index: 99999999,
      info: {
        kind: 'repo',
        id: `${option.feedId}_${option.orgId}`,
        orgId: option.orgId,
        feedId: option.feedId,
        name: option.label,
      },
      routes: [],
      poles: [],
      excludedStopPatterns: [],
    }
    setPresetList((current) => [...current, preset])
    setSelectedPresetId(preset.id)
  }

  const createRawPreset = async (file: File) => {
    const uuid = crypto.randomUUID()
    const info: RawInfoV2 = {
      kind: 'raw',
      id: uuid,
      uuid,
      name: file.name,
      cacheState: 'ready',
    }
    await libreDiaNetRepository.openRawFeed(info, file)
    setRawFiles((current) => ({ ...current, [uuid]: file }))
    const preset: RoutePresetV2 = {
      id: crypto.randomUUID(),
      name: 'Default Name',
      index: 99999999,
      info,
      routes: [],
      poles: [],
      excludedStopPatterns: [],
    }
    setPresetList((current) => [...current, preset])
    setSelectedPresetId(preset.id)
  }

  const updateRawPresetData = async (preset: RoutePresetV2, file: File) => {
    if (preset.info.kind !== 'raw') {
      return
    }
    const nextInfo: RawInfoV2 = {
      ...preset.info,
      name: file.name,
      cacheState: 'ready',
    }
    const result = await libreDiaNetRepository.openRawFeed(nextInfo, file)
    setRawFiles((current) => ({ ...current, [nextInfo.uuid]: file }))
    updatePreset({ ...preset, info: nextInfo })
    setPresetContext({ loading: false, handle: result.handle, error: null })
  }

  const deletePreset = async (preset: RoutePresetV2) => {
    await libreDiaNetRepository.deleteFeedCache(preset.info)
    setPresetList((current) => current.filter((item) => item.id !== preset.id))
    if (preset.info.kind === 'raw') {
      const uuid = preset.info.uuid
      setRawFiles((current) => {
        const next = { ...current }
        delete next[uuid]
        return next
      })
    }
  }

  return {
    presetList,
    selectedPresetId,
    selectedPreset,
    selectedRawFile,
    feedOptions,
    feedLoading,
    feedError,
    presetContext,
    setSelectedPresetId,
    updatePreset,
    createRepoPreset,
    createRawPreset,
    updateRawPresetData,
    deletePreset,
  }
}
