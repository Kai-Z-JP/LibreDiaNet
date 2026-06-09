import type { FeedOption, ProGtfsSource } from '../../../types'
import { libreDiaNetRepository } from '../../libre-dianet/lib/repository'
import { createRawSourceInfo, createRepoSource } from './pro-factories'

export function useProSourceFactory() {
  const createRawSource = async (file: File): Promise<ProGtfsSource> => {
    const { info, source } = createRawSourceInfo(file)
    await libreDiaNetRepository.openRawFeed(info, file)
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
    await libreDiaNetRepository.openRawFeed(nextInfo, file)
    return { ...source, info: nextInfo }
  }

  return {
    createRepoSource: (option: FeedOption) => createRepoSource(option),
    createRawSource,
    replaceRawSource,
  }
}
