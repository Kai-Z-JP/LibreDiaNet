import ExcelJS from 'exceljs'
import { requestDiaNetXlsxInBrowser } from './xlsxExport'
import type { DiaNetXlsxCreateFromDataRequestBody } from './api'

describe('requestDiaNetXlsxInBrowser', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('generates and downloads an xlsx blob in the browser', async () => {
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:libre-dianet-test')
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const tripStopTimes = [
      { tripId: 'trip-1', stopId: 'stop-1', stopSequence: 1, departureTime: '08:00:00' },
      { tripId: 'trip-1', stopId: 'stop-2', stopSequence: 2, departureTime: '08:05:00' },
      { tripId: 'trip-1', stopId: 'stop-3', stopSequence: 3, departureTime: '08:10:00' },
    ]
    const defaultRouteTripStopTimes = [
      { tripId: 'trip-2', stopId: 'stop-1', stopSequence: 1, departureTime: '09:00:00' },
      { tripId: 'trip-2', stopId: 'stop-2', stopSequence: 2, departureTime: '09:05:00' },
      { tripId: 'trip-2', stopId: 'stop-3', stopSequence: 3, departureTime: '09:10:00' },
    ]

    const request: DiaNetXlsxCreateFromDataRequestBody = {
      gtfs: {
        agencyName: 'Agency',
        stops: [
          { id: 'stop-1', name: 'Stop', platformCode: '1' },
          { id: 'stop-2', name: 'Stop', platformCode: '2' },
          { id: 'stop-3', name: 'Stop', platformCode: '3' },
        ],
        routes: [
          { id: 'route-1', shortName: 'R1', longName: null },
          { id: 'route-2', shortName: 'R2', longName: null },
        ],
        trips: [
          {
            tripId: 'trip-1',
            routeId: 'route-1',
            directionId: 0,
            serviceId: 'svc-1',
            tripHeadsign: null,
            routeDisplayOverrideKey: 'saved-route-display-key',
          },
          { tripId: 'trip-2', routeId: 'route-2', directionId: 0, serviceId: 'svc-1', tripHeadsign: null },
        ],
        stopTimes: [...tripStopTimes, ...defaultRouteTripStopTimes],
        calendars: [
          {
            id: 'svc-1',
            startDate: '20260101',
            endDate: '20261231',
            sunday: 0,
            monday: 1,
            tuesday: 1,
            wednesday: 1,
            thursday: 1,
            friday: 1,
            saturday: 0,
          },
        ],
      },
      preset: {
        id: 'preset-1',
        name: 'Preset',
        index: 1,
        info: {
          type: 'jp.kaiz.shachia.dianet.RawGtfsInformation',
          name: 'raw.zip',
          uuid: 'raw-uuid',
        },
        routes: [
          { id: 'route-1', direction: 0 },
          { id: 'route-2', direction: 0 },
        ],
        poles: [
          {
            id: 'stop-1',
            override: {
              majorStop: false,
              branchStart: false,
              branchEnd: false,
              nameOverride: null,
              locationNameOverride: null,
              jokoOverride: null,
              rowShading: false,
              stopNameBold: false,
              horizontalLine: false,
            },
          },
          {
            id: 'stop-2',
            override: {
              majorStop: false,
              branchStart: false,
              branchEnd: false,
              nameOverride: null,
              locationNameOverride: null,
              jokoOverride: null,
              rowShading: false,
              stopNameBold: false,
              horizontalLine: false,
            },
          },
          {
            id: 'stop-3',
            override: {
              majorStop: false,
              branchStart: false,
              branchEnd: false,
              nameOverride: null,
              locationNameOverride: null,
              jokoOverride: null,
              rowShading: false,
              stopNameBold: false,
              horizontalLine: false,
            },
          },
        ],
        excludedStopPatterns: [],
        routeDisplayOverrides: [
          {
            routeKey: 'saved-route-display-key',
            routeNameOverride: '急行',
            destinationOverride: '上書き行先',
            useTripHeadsignAsDestination: false,
            stopCellOverrides: [{ poleId: 'stop-2', text: '止', rowSpan: 2 }],
          },
        ],
      },
      dayMapping: [{ name: '平日', type: 'date', date: '2026-03-02' }],
    }

    await requestDiaNetXlsxInBrowser(request)

    const blob = createObjectUrl.mock.calls[0]?.[0]
    expect(blob).toBeInstanceOf(Blob)
    expect((blob as Blob).type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect((blob as Blob).size).toBeGreaterThan(0)

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await (blob as Blob).arrayBuffer())
    const sheet = workbook.getWorksheet('平日')
    expect(sheet).toBeDefined()
    expect(sheet?.getRow(6).height).toBe(12)
    expect(sheet?.getRow(7).height).toBe(12)
    expect(sheet?.getCell('B6').font.bold).toBe(true)
    expect(sheet?.getCell('B7').font.bold).toBe(true)
    expect(sheet?.getCell('E4').value).toBe('急行')
    expect(sheet?.getCell('F4').value).toBe('R2')
    expect(sheet?.getCell('E5').value).toBe('上書き行先')
    expect(sheet?.getCell('E6').alignment.horizontal).toBe('center')
    expect(sheet?.getCell('E6').alignment.vertical).toBe('middle')
    expect(sheet?.getCell('E7').value).toBe('止')
    expect(sheet?.getCell('E7').alignment.textRotation).toBe('vertical')
    expect(sheet?.getCell('E7').alignment.wrapText).toBe(true)
    expect(sheet?.getCell('E7').alignment.vertical).toBe('top')
    expect(sheet?.getCell('E8').isMerged).toBe(true)
    expect(sheet?.getCell('E7').border.top?.style).toBe('thin')

    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:libre-dianet-test')
  })

  it('includes every trip in an all-days sheet', async () => {
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:libre-dianet-all-days-test')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    const request: DiaNetXlsxCreateFromDataRequestBody = {
      gtfs: {
        agencyName: 'Agency',
        stops: [
          { id: 'stop-1', name: 'Stop 1', platformCode: '1' },
          { id: 'stop-2', name: 'Stop 2', platformCode: '2' },
        ],
        routes: [{ id: 'route-1', shortName: 'R1', longName: null }],
        trips: [
          { tripId: 'trip-weekday', routeId: 'route-1', directionId: 0, serviceId: 'svc-weekday' },
          { tripId: 'trip-sunday', routeId: 'route-1', directionId: 0, serviceId: 'svc-sunday' },
          { tripId: 'trip-calendar-date-only', routeId: 'route-1', directionId: 0, serviceId: 'svc-calendar-date-only' },
        ],
        stopTimes: [
          { tripId: 'trip-weekday', stopId: 'stop-1', stopSequence: 1, departureTime: '10:00:00' },
          { tripId: 'trip-weekday', stopId: 'stop-2', stopSequence: 2, departureTime: '10:05:00' },
          { tripId: 'trip-sunday', stopId: 'stop-1', stopSequence: 1, departureTime: '11:00:00' },
          { tripId: 'trip-sunday', stopId: 'stop-2', stopSequence: 2, departureTime: '11:05:00' },
          { tripId: 'trip-calendar-date-only', stopId: 'stop-1', stopSequence: 1, departureTime: '12:00:00' },
          { tripId: 'trip-calendar-date-only', stopId: 'stop-2', stopSequence: 2, departureTime: '12:05:00' },
        ],
        calendars: [
          {
            id: 'svc-weekday',
            startDate: '20260101',
            endDate: '20261231',
            sunday: 0,
            monday: 1,
            tuesday: 1,
            wednesday: 1,
            thursday: 1,
            friday: 1,
            saturday: 0,
          },
          {
            id: 'svc-sunday',
            startDate: '20260101',
            endDate: '20261231',
            sunday: 1,
            monday: 0,
            tuesday: 0,
            wednesday: 0,
            thursday: 0,
            friday: 0,
            saturday: 0,
          },
        ],
      },
      preset: {
        id: 'preset-1',
        name: 'Preset',
        index: 1,
        info: {
          type: 'jp.kaiz.shachia.dianet.RawGtfsInformation',
          name: 'raw.zip',
          uuid: 'raw-uuid',
        },
        routes: [{ id: 'route-1', direction: 0 }],
        poles: [
          {
            id: 'stop-1',
            override: {
              majorStop: false,
              branchStart: false,
              branchEnd: false,
              nameOverride: null,
              locationNameOverride: null,
              jokoOverride: null,
              rowShading: false,
              stopNameBold: false,
              horizontalLine: false,
            },
          },
          {
            id: 'stop-2',
            override: {
              majorStop: false,
              branchStart: false,
              branchEnd: false,
              nameOverride: null,
              locationNameOverride: null,
              jokoOverride: null,
              rowShading: false,
              stopNameBold: false,
              horizontalLine: false,
            },
          },
        ],
        excludedStopPatterns: [],
      },
      dayMapping: [{ name: '全日', type: 'all-days' }],
    }

    await requestDiaNetXlsxInBrowser(request)

    const blob = createObjectUrl.mock.calls[0]?.[0]
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await (blob as Blob).arrayBuffer())
    const sheet = workbook.getWorksheet('全日')

    expect(sheet?.getCell('E6').value).toBe('1000')
    expect(sheet?.getCell('F6').value).toBe('1100')
    expect(sheet?.getCell('G6').value).toBe('1200')
  })

  it('uses resolved service ids for date sheets', async () => {
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:libre-dianet-date-service-test')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    const request: DiaNetXlsxCreateFromDataRequestBody = {
      gtfs: {
        agencyName: 'Agency',
        stops: [
          { id: 'stop-1', name: 'Stop 1', platformCode: '1' },
          { id: 'stop-2', name: 'Stop 2', platformCode: '2' },
        ],
        routes: [{ id: 'route-1', shortName: 'R1', longName: null }],
        trips: [
          { tripId: 'trip-calendar', routeId: 'route-1', directionId: 0, serviceId: 'svc-calendar' },
          { tripId: 'trip-added', routeId: 'route-1', directionId: 0, serviceId: 'svc-added' },
        ],
        stopTimes: [
          { tripId: 'trip-calendar', stopId: 'stop-1', stopSequence: 1, departureTime: '09:00:00' },
          { tripId: 'trip-calendar', stopId: 'stop-2', stopSequence: 2, departureTime: '09:05:00' },
          { tripId: 'trip-added', stopId: 'stop-1', stopSequence: 1, departureTime: '10:00:00' },
          { tripId: 'trip-added', stopId: 'stop-2', stopSequence: 2, departureTime: '10:05:00' },
        ],
        calendars: [
          {
            id: 'svc-calendar',
            startDate: '20260101',
            endDate: '20261231',
            sunday: 0,
            monday: 1,
            tuesday: 1,
            wednesday: 1,
            thursday: 1,
            friday: 1,
            saturday: 0,
          },
        ],
      },
      preset: {
        id: 'preset-1',
        name: 'Preset',
        index: 1,
        info: {
          type: 'jp.kaiz.shachia.dianet.RawGtfsInformation',
          name: 'raw.zip',
          uuid: 'raw-uuid',
        },
        routes: [{ id: 'route-1', direction: 0 }],
        poles: [
          {
            id: 'stop-1',
            override: {
              majorStop: false,
              branchStart: false,
              branchEnd: false,
              nameOverride: null,
              locationNameOverride: null,
              jokoOverride: null,
              rowShading: false,
              stopNameBold: false,
              horizontalLine: false,
            },
          },
          {
            id: 'stop-2',
            override: {
              majorStop: false,
              branchStart: false,
              branchEnd: false,
              nameOverride: null,
              locationNameOverride: null,
              jokoOverride: null,
              rowShading: false,
              stopNameBold: false,
              horizontalLine: false,
            },
          },
        ],
        excludedStopPatterns: [],
      },
      dayMapping: [{ name: '特定日', type: 'date', date: '2026-03-02', serviceIds: ['svc-added'] }],
    }

    await requestDiaNetXlsxInBrowser(request)

    const blob = createObjectUrl.mock.calls[0]?.[0]
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await (blob as Blob).arrayBuffer())
    const sheet = workbook.getWorksheet('特定日')

    expect(sheet?.getCell('E6').value).toBe('1000')
  })
})
