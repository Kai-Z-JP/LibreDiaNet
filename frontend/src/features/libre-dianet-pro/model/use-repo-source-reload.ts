import { useState } from 'react'
import type { ProGtfsSource } from '../../../types'
import { useProGtfsRepository } from './pro-gtfs-repository-context'

export function useRepoSourceReload() {
  const repository = useProGtfsRepository()
  const [reloadingSourceIds, setReloadingSourceIds] = useState<string[]>([])

  const reloadRepoSource = async (source: ProGtfsSource) => {
    if (source.info.kind !== 'repo') {
      return
    }
    setReloadingSourceIds((current) => [...current, source.sourceId])
    try {
      await repository.reloadRepoFeed(source.info)
    } finally {
      setReloadingSourceIds((current) => current.filter((sourceId) => sourceId !== source.sourceId))
    }
  }

  return {
    reloadingSourceIds,
    reloadRepoSource,
  }
}
