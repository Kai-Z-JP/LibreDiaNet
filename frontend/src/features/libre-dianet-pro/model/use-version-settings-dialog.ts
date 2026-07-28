import { useEffect, useState } from 'react'
import type { FeedOption, GtfsFeedFileOption, ProGtfsSource, ProVersion } from '../../../types'
import {
  feedLabelForSource,
  normalizeProGtfsSourceDisplayName,
  removeSourceFromPreset,
  repoInfoId,
  sourceDisplayName,
} from './pro-source-helpers'
import { useRepoFeedFileOptions } from './use-repo-feed-file-options'
import { useRepoSourceReload } from './use-repo-source-reload'
import { useProVersionInddExport } from './use-pro-version-indd-export'

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
  const repoFileOptionsByFeedKey = useRepoFeedFileOptions(draftVersion)
  const { reloadingSourceIds, reloadRepoSource } = useRepoSourceReload()
  const inddExport = useProVersionInddExport(draftVersion)

  useEffect(() => {
    setDraftVersion(selectedVersion)
    setRepoSource(null)
  }, [selectedVersion])

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

  return {
    state: {
      draftVersion,
      changed,
      repoSource,
      repoFileOptionsByFeedKey,
      reloadingSourceIds,
      inddExporting: inddExport.exporting,
      inddExportError: inddExport.error,
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
      exportInddZip: inddExport.requestInddZip,
      save: () => {
        if (draftVersion) {
          onUpdateVersion(draftVersion)
        }
      },
    },
  }
}
