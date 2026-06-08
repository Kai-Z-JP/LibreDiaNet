import { useEffect, useState } from 'react'
import { fetchGtfsFeedFiles } from '../../../api'
import type { FeedOption, GtfsFeedFileOption, ProGtfsSource, ProVersion, RepoInfoV2 } from '../../../types'
import { libreDiaNetRepository } from '../../libre-dianet/lib/repository'
import {
  feedLabelForSource,
  normalizeProGtfsSourceDisplayName,
  removeSourceFromPreset,
  repoFeedKey,
  repoInfoId,
  sourceDisplayName,
} from './pro-source-helpers'

export function useVersionSettingsDialog({
  selectedVersion,
  feedOptions,
  onCreateRepoSource,
  onCreateRawSource,
  onReplaceRawSource,
  onUpdateVersion,
}: {
  selectedVersion: ProVersion | null
  feedOptions: FeedOption[]
  onCreateRepoSource: (option: FeedOption) => ProGtfsSource
  onCreateRawSource: (file: File) => Promise<ProGtfsSource>
  onReplaceRawSource: (source: ProGtfsSource, file: File) => Promise<ProGtfsSource>
  onUpdateVersion: (version: ProVersion) => void
}) {
  const [draftVersion, setDraftVersion] = useState<ProVersion | null>(selectedVersion)
  const [repoSource, setRepoSource] = useState<FeedOption | null>(null)
  const [repoFileOptionsByFeedKey, setRepoFileOptionsByFeedKey] = useState<Record<string, GtfsFeedFileOption[]>>({})
  const [reloadingSourceIds, setReloadingSourceIds] = useState<string[]>([])

  useEffect(() => {
    setDraftVersion(selectedVersion)
    setRepoSource(null)
  }, [selectedVersion])

  useEffect(() => {
    if (!draftVersion) {
      return
    }
    const repoSources = draftVersion.gtfsSources.filter(
      (source): source is ProGtfsSource & { info: RepoInfoV2 } => source.info.kind === 'repo',
    )
    const missingSources = repoSources.filter((source) => !repoFileOptionsByFeedKey[repoFeedKey(source.info.orgId, source.info.feedId)])
    if (missingSources.length === 0) {
      return
    }
    let cancelled = false
    const load = async () => {
      const entries = await Promise.all(
        missingSources.map(async (source) => {
          const key = repoFeedKey(source.info.orgId, source.info.feedId)
          try {
            return [key, await fetchGtfsFeedFiles(source.info.orgId, source.info.feedId)] as const
          } catch {
            return [key, []] as const
          }
        }),
      )
      if (!cancelled) {
        setRepoFileOptionsByFeedKey((current) => ({ ...current, ...Object.fromEntries(entries) }))
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [draftVersion, repoFileOptionsByFeedKey])

  const changed = Boolean(draftVersion && selectedVersion && JSON.stringify(draftVersion) !== JSON.stringify(selectedVersion))

  const replaceRepoFile = async (source: ProGtfsSource, file: GtfsFeedFileOption) => {
    if (source.info.kind !== 'repo') {
      return
    }
    const nextSource: ProGtfsSource = {
      ...source,
      info: {
        ...source.info,
        id: repoInfoId(source.info.orgId, source.info.feedId, file.uid),
        fileUid: file.uid,
        fileLabel: file.sourceLabel,
        name: sourceDisplayName(feedLabelForSource(source.info, feedOptions), file.sourceLabel),
      },
    }
    setDraftVersion((current) =>
      current
        ? {
            ...current,
            gtfsSources: current.gtfsSources.map((item) => (item.sourceId === source.sourceId ? nextSource : item)),
          }
        : current,
    )
    await reloadRepoSource(nextSource)
  }

  const reloadRepoSource = async (source: ProGtfsSource) => {
    if (source.info.kind !== 'repo') {
      return
    }
    setReloadingSourceIds((current) => [...current, source.sourceId])
    try {
      await libreDiaNetRepository.reloadRepoFeed(source.info)
    } finally {
      setReloadingSourceIds((current) => current.filter((sourceId) => sourceId !== source.sourceId))
    }
  }

  return {
    state: {
      draftVersion,
      changed,
      repoSource,
      repoFileOptionsByFeedKey,
      reloadingSourceIds,
    },
    actions: {
      renameVersion: (name: string) => setDraftVersion((current) => (current ? { ...current, name } : current)),
      changeRevisionDate: (revisionDate: string) => setDraftVersion((current) => (current ? { ...current, revisionDate } : current)),
      selectRepoSource: setRepoSource,
      renameSource: (source: ProGtfsSource, displayName: string) =>
        setDraftVersion((current) =>
          current
            ? {
                ...current,
                gtfsSources: current.gtfsSources.map((item) =>
                  item.sourceId === source.sourceId ? { ...item, displayName: normalizeProGtfsSourceDisplayName(displayName) } : item,
                ),
              }
            : current,
        ),
      addRepoSource: () => {
        if (!repoSource) {
          return
        }
        const source = onCreateRepoSource(repoSource)
        setDraftVersion((current) => (current ? { ...current, gtfsSources: [...current.gtfsSources, source] } : current))
        setRepoSource(null)
      },
      addRawSource: (file: File) =>
        void onCreateRawSource(file).then((source) => {
          setDraftVersion((current) => (current ? { ...current, gtfsSources: [...current.gtfsSources, source] } : current))
        }),
      removeSource: (source: ProGtfsSource) => {
        setDraftVersion((current) =>
          current
            ? {
                ...current,
                gtfsSources: current.gtfsSources.filter((item) => item.sourceId !== source.sourceId),
                presets: current.presets.map((preset) => removeSourceFromPreset(preset, source.sourceId)),
              }
            : current,
        )
      },
      replaceRepoFile,
      replaceRawSource: (source: ProGtfsSource, file: File) =>
        void onReplaceRawSource(source, file).then((nextSource) => {
          setDraftVersion((current) =>
            current
              ? {
                  ...current,
                  gtfsSources: current.gtfsSources.map((item) => (item.sourceId === nextSource.sourceId ? nextSource : item)),
                }
              : current,
          )
        }),
      reloadRepoSource,
      save: () => {
        if (draftVersion) {
          onUpdateVersion(draftVersion)
        }
      },
    },
  }
}
