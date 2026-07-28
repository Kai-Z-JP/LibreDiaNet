import { describe, expect, it, vi } from 'vitest'
import type { GtfsRepository } from '../../../gtfsRepository'
import { EMPTY_OVERRIDE, type GtfsHandle, type GtfsServiceWeekday, type ProPreset, type ProPresetContext } from '../../../types'
import { loadProInddTripsByDay } from './pro-indd-export-data'
import { PRO_INDD_WEEKDAYS } from './pro-indd-export'

describe('loadProInddTripsByDay', () => {
  it('loads every selected source for all seven weekdays', async () => {
    const sourceAHandle = { filename: 'source-a.sqlite3' } as GtfsHandle
    const sourceBHandle = { filename: 'source-b.sqlite3' } as GtfsHandle
    const listTripsForWeekday = vi.fn(
      async (handle: GtfsHandle, _selectedRoutes: { id: string; direction: number | null }[], weekday: GtfsServiceWeekday) => [
        {
          serviceId: `${handle.filename}-${weekday}`,
          routeId: 'route',
          direction: 0,
          routeName: 'Route',
          stopTime: [],
        },
      ],
    )
    const repository = { listTripsForWeekday } as unknown as GtfsRepository
    const preset: ProPreset = {
      id: 'preset',
      name: 'Preset',
      index: 0,
      sourceIds: ['source-a', 'source-b'],
      routes: [
        { sourceId: 'source-a', id: 'route-a', direction: 0 },
        { sourceId: 'source-b', id: 'route-b', direction: 1 },
      ],
      routeDisplayOverrides: [],
      poles: [{ id: 'pole', stops: [], override: EMPTY_OVERRIDE }],
      excludedStopPatterns: [],
    }
    const context: ProPresetContext = {
      loading: false,
      handles: { 'source-a': sourceAHandle, 'source-b': sourceBHandle },
      errors: {},
    }

    const tripsByWeekday = await loadProInddTripsByDay({
      repository,
      preset,
      context,
      sourceNameMap: { 'source-a': 'Source A', 'source-b': 'Source B' },
      referenceDate: '2026-04-01',
    })

    expect(listTripsForWeekday).toHaveBeenCalledTimes(PRO_INDD_WEEKDAYS.length * 2)
    for (const weekday of PRO_INDD_WEEKDAYS) {
      expect(listTripsForWeekday).toHaveBeenCalledWith(sourceAHandle, [{ id: 'route-a', direction: 0 }], weekday, '2026-04-01', [])
      expect(listTripsForWeekday).toHaveBeenCalledWith(sourceBHandle, [{ id: 'route-b', direction: 1 }], weekday, '2026-04-01', [])
      expect(tripsByWeekday[weekday].map(({ sourceId, sourceName }) => ({ sourceId, sourceName }))).toEqual([
        { sourceId: 'source-a', sourceName: 'Source A' },
        { sourceId: 'source-b', sourceName: 'Source B' },
      ])
    }
  })
})
