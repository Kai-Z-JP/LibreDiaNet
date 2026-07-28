import { GtfsRepository, missingRequiredGtfsTables, selectActiveServiceIdsForWeekday } from './gtfsRepository'
import type { GtfsHandle } from './types'

type CalendarRows = Parameters<typeof selectActiveServiceIdsForWeekday>[0]

const calendarRows: CalendarRows = [
  {
    service_id: 'weekday-only',
    start_date: '20260401',
    end_date: '20270331',
    sunday: 0,
    monday: 1,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 0,
  },
  {
    service_id: 'outside-range',
    start_date: '20270401',
    end_date: '20280331',
    sunday: 0,
    monday: 1,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 0,
  },
  {
    service_id: 'sunday-only',
    start_date: '20260401',
    end_date: '20270331',
    sunday: 1,
    monday: 0,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 0,
  },
]

describe('selectActiveServiceIdsForWeekday', () => {
  it('selects services by weekday flag within the reference date range', () => {
    expect(selectActiveServiceIdsForWeekday(calendarRows, 'monday', '2026-04-01')).toEqual(['weekday-only'])
    expect(selectActiveServiceIdsForWeekday(calendarRows, 'tuesday', '2026-04-01')).toEqual([])
    expect(selectActiveServiceIdsForWeekday(calendarRows, 'sunday', '2026-04-01')).toEqual(['sunday-only'])
  })

  it('excludes services outside the reference date range', () => {
    expect(selectActiveServiceIdsForWeekday(calendarRows, 'monday', '2027-04-01')).toEqual(['outside-range'])
  })
})

describe('missingRequiredGtfsTables', () => {
  it('allows fare_attributes to be absent while retaining core validation failures', () => {
    expect(missingRequiredGtfsTables({ missingRequired: ['fare_attributes'] })).toEqual([])
    expect(missingRequiredGtfsTables({ missingRequired: ['fare_attributes', 'routes'] })).toEqual(['routes'])
  })
})

describe('GtfsRepository.loadFareV1Data', () => {
  it('loads and normalizes fare, zone, and agency data for the requested routes and stops', async () => {
    const { handle } = createFareHandle(
      {
        stops: [
          { stop_id: 'stop-1', zone_id: 'zone-1' },
          { stop_id: 'stop-2', zone_id: '  ' },
          { stop_id: 'other-stop', zone_id: 'other-zone' },
        ],
        routes: [
          { route_id: 'route-1', agency_id: 'agency-1' },
          { route_id: 'other-route', agency_id: 'other-agency' },
        ],
        fare_attributes: [
          {
            fare_id: 'cash-fare',
            price: '210',
            ic_price: '205',
            currency_type: 'JPY',
            agency_id: 'agency-1',
          },
          {
            fare_id: 'no-ic-fare',
            price: 240,
            ic_price: null,
            currency_type: 'JPY',
            agency_id: '',
          },
        ],
        fare_rules: [
          {
            fare_id: 'cash-fare',
            route_id: 'route-1',
            origin_id: 'zone-1',
            destination_id: 'zone-2',
            contains_id: null,
          },
          {
            fare_id: 'no-ic-fare',
            route_id: '',
            origin_id: ' ',
            destination_id: null,
            contains_id: 'zone-via',
          },
        ],
      },
      ['fare_attributes', 'fare_rules'],
    )

    const result = await new GtfsRepository().loadFareV1Data(handle, ['route-1', 'route-1'], ['stop-1', 'stop-2'])

    expect(result).toEqual({
      fareAttributesPresent: true,
      fareRulesPresent: true,
      stopZoneById: {
        'stop-1': 'zone-1',
        'stop-2': null,
      },
      routeAgencyById: {
        'route-1': 'agency-1',
      },
      attributes: [
        {
          fareId: 'cash-fare',
          price: 210,
          icPrice: 205,
          currencyType: 'JPY',
          agencyId: 'agency-1',
        },
        {
          fareId: 'no-ic-fare',
          price: 240,
          icPrice: null,
          currencyType: 'JPY',
          agencyId: null,
        },
      ],
      rules: [
        {
          fareId: 'cash-fare',
          routeId: 'route-1',
          originId: 'zone-1',
          destinationId: 'zone-2',
          containsId: null,
        },
        {
          fareId: 'no-ic-fare',
          routeId: null,
          originId: null,
          destinationId: null,
          containsId: 'zone-via',
        },
      ],
    })
  })

  it('does not query optional fare tables when they are absent', async () => {
    const { handle, selectFrom } = createFareHandle(
      {
        stops: [{ stop_id: 'stop-1', zone_id: null }],
        routes: [{ route_id: 'route-1', agency_id: null }],
      },
      [],
    )

    const result = await new GtfsRepository().loadFareV1Data(handle, ['route-1'], ['stop-1'])

    expect(result).toEqual({
      fareAttributesPresent: false,
      fareRulesPresent: false,
      stopZoneById: { 'stop-1': null },
      routeAgencyById: { 'route-1': null },
      attributes: [],
      rules: [],
    })
    expect(selectFrom).toHaveBeenCalledWith('stops')
    expect(selectFrom).toHaveBeenCalledWith('routes')
    expect(selectFrom).not.toHaveBeenCalledWith('fare_attributes')
    expect(selectFrom).not.toHaveBeenCalledWith('fare_rules')
  })

  it('loads old caches that omit optional Fare v1 and route/stop columns', async () => {
    const { handle } = createFareHandle(
      {
        stops: [{ stop_id: 'stop-1' }],
        routes: [{ route_id: 'route-1' }],
        fare_attributes: [{ fare_id: 'fare-1', price: 210, currency_type: 'JPY' }],
        fare_rules: [{ fare_id: 'fare-1' }],
      },
      ['fare_attributes', 'fare_rules'],
      {
        columnsByTable: {
          stops: ['stop_id'],
          routes: ['route_id'],
          fare_attributes: ['fare_id', 'price', 'currency_type'],
          fare_rules: ['fare_id'],
        },
      },
    )

    await expect(new GtfsRepository().loadFareV1Data(handle, ['route-1'], ['stop-1'])).resolves.toEqual({
      fareAttributesPresent: true,
      fareRulesPresent: true,
      stopZoneById: { 'stop-1': null },
      routeAgencyById: { 'route-1': null },
      attributes: [
        {
          fareId: 'fare-1',
          price: 210,
          icPrice: null,
          currencyType: 'JPY',
          agencyId: null,
        },
      ],
      rules: [
        {
          fareId: 'fare-1',
          routeId: null,
          originId: null,
          destinationId: null,
          containsId: null,
        },
      ],
    })
  })

  it('does not hide genuine database errors', async () => {
    const databaseError = new Error('database is locked')
    const { handle } = createFareHandle(
      {
        fare_attributes: [{ fare_id: 'fare-1', price: 210, currency_type: 'JPY' }],
      },
      ['fare_attributes'],
      { errorsByTable: { fare_attributes: databaseError } },
    )

    await expect(new GtfsRepository().loadFareV1Data(handle, [], [])).rejects.toBe(databaseError)
  })
})

type FakeRowsByTable = Record<string, Record<string, unknown>[]>
type FakeFareDatabaseOptions = {
  columnsByTable?: Record<string, string[]>
  errorsByTable?: Record<string, Error>
}

function createFareHandle(rowsByTable: FakeRowsByTable, presentTables: string[], options: FakeFareDatabaseOptions = {}) {
  const columnsByTable = Object.fromEntries(
    Object.entries(rowsByTable).map(([tableName, rows]) => [
      tableName,
      options.columnsByTable?.[tableName] ?? Array.from(new Set(rows.flatMap((row) => Object.keys(row)))),
    ]),
  )
  const selectFrom = vi.fn((tableName: string) => {
    let rows = [...(rowsByTable[tableName] ?? [])]
    let selectedColumns: readonly string[] = []
    const query = {
      select: (columns: readonly string[]) => {
        selectedColumns = columns
        return query
      },
      where: (column: string, operator: string, values: unknown[]) => {
        if (operator === 'in') {
          rows = rows.filter((row) => values.includes(row[column]))
        }
        return query
      },
      execute: async () => {
        const error = options.errorsByTable?.[tableName]
        if (error) {
          throw error
        }
        return rows.map((row) =>
          Object.fromEntries(selectedColumns.flatMap((column) => (Object.hasOwn(row, column) ? [[column, row[column]]] : []))),
        )
      },
    }
    return query
  })
  const tableNames = new Set([...Object.keys(rowsByTable), ...Object.keys(options.columnsByTable ?? {})])
  const loader = {
    db: () => ({
      selectFrom,
      introspection: {
        getTables: async () =>
          Array.from(tableNames, (tableName) => ({
            name: tableName,
            isView: false,
            columns: (columnsByTable[tableName] ?? []).map((name) => ({
              name,
              dataType: 'TEXT',
              isAutoIncrementing: false,
              isNullable: true,
              hasDefaultValue: false,
            })),
          })),
      },
    }),
    hasTable: async (tableName: string) => presentTables.includes(tableName),
  }
  return {
    handle: { filename: 'test.sqlite3', loader } as unknown as GtfsHandle,
    selectFrom,
  }
}
