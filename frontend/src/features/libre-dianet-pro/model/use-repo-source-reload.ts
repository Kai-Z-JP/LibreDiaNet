import { useState } from 'react'
import type { ProGtfsSource } from '../../../types'
import { libreDiaNetRepository } from '../../libre-dianet/lib/repository'

export function useRepoSourceReload() {
  const [reloadingSourceIds, setReloadingSourceIds] = useState<string[]>([])

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
    reloadingSourceIds,
    reloadRepoSource,
  }
}
