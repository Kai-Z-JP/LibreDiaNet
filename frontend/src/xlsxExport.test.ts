import ExcelJS from 'exceljs'
import { requestDiaNetXlsxInBrowser } from './xlsxExport'
import type { DiaNetXlsxCreateFromDataRequestBody } from './api'

describe('requestDiaNetXlsxInBrowser', () => {
  it('generates and downloads an xlsx blob in the browser', async () => {
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:libre-dianet-test')
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    const request: DiaNetXlsxCreateFromDataRequestBody = {
      gtfs: {
        agencyName: 'Agency',
        stops: [
          { id: 'stop-1', name: 'Stop', platformCode: '1' },
          { id: 'stop-2', name: 'Stop', platformCode: '2' },
        ],
        routes: [{ id: 'route-1', shortName: 'R1', longName: null }],
        trips: [{ tripId: 'trip-1', routeId: 'route-1', directionId: 0, serviceId: 'svc-1', tripHeadsign: null }],
        stopTimes: [
          { tripId: 'trip-1', stopId: 'stop-1', stopSequence: 1, departureTime: '08:00:00' },
          { tripId: 'trip-1', stopId: 'stop-2', stopSequence: 2, departureTime: '08:05:00' },
        ],
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
    expect(sheet?.getCell('E6').alignment.horizontal).toBe('center')
    expect(sheet?.getCell('E6').alignment.vertical).toBe('middle')
    expect(sheet?.getCell('E7').border.top?.style).toBe('thin')

    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:libre-dianet-test')
  })
})
