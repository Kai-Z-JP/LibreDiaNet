import { createContext, useContext } from 'react'
import type { GtfsRepository } from '../../../gtfsRepository'

export const ProGtfsRepositoryContext = createContext<GtfsRepository | null>(null)

export function useProGtfsRepository(): GtfsRepository {
  const repository = useContext(ProGtfsRepositoryContext)
  if (!repository) {
    throw new Error('Pro GTFS repository is not available')
  }
  return repository
}
