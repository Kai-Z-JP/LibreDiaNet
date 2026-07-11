import type { FeedOption, ProGtfsSource } from '../../../types'
import { createRawSourceInfo, createRepoSource } from './pro-factories'
import { useProGtfsRepository } from './pro-gtfs-repository-context'

export function useProSourceFactory() {
  const repository = useProGtfsRepository()
  const createRawSource = async (file: File): Promise<ProGtfsSource> => {
    const { info, source } = createRawSourceInfo(file)
    await repository.openRawFeed(info, file)
    return source
  }

  const replaceRawSource = async (source: ProGtfsSource, file: File): Promise<ProGtfsSource> => {
    if (source.info.kind !== 'raw') {
      return source
    }
    const nextInfo = {
      ...source.info,
      name: file.name,
      cacheState: 'ready' as const,
    }
    await repository.openRawFeed(nextInfo, file)
    return { ...source, info: nextInfo }
  }

  return {
    createRepoSource: (option: FeedOption) => createRepoSource(option),
    createRawSource,
    replaceRawSource,
  }
}
