import { useEffect, useState } from 'react'
import { fetchGtfsFeedFiles } from '../../../api'
import type { GtfsFeedFileOption, ProGtfsSource, ProVersion, RepoInfoV2 } from '../../../types'
import { repoFeedKey } from './pro-source-helpers'

export function useRepoFeedFileOptions(draftVersion: ProVersion | null) {
  const [repoFileOptionsByFeedKey, setRepoFileOptionsByFeedKey] = useState<Record<string, GtfsFeedFileOption[]>>({})

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

  return repoFileOptionsByFeedKey
}
