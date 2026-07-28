import type { ReactNode } from 'react'
import type { GtfsRepository } from '../../../gtfsRepository'
import { ProGtfsRepositoryContext } from './pro-gtfs-repository-context'

export function ProGtfsRepositoryProvider({ repository, children }: { repository: GtfsRepository; children: ReactNode }) {
  return <ProGtfsRepositoryContext.Provider value={repository}>{children}</ProGtfsRepositoryContext.Provider>
}
