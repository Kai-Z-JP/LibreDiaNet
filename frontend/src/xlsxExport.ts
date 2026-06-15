import ExcelJS from 'exceljs'
import type { Alignment, Border, Borders, Cell, Fill, Workbook, Worksheet } from 'exceljs'
import type { DiaNetXlsxCreateFromDataRequestBody } from './api'
import type { DayMapping, DiaNetCalendarData, DiaNetGtfsExportData, DiaNetStopData, DiaNetStopTimeData } from './types'
import { sortTimetableColumns } from './features/libre-dianet-pro/model/timetable-column-sort'
import { displayRouteName, downloadBlob, stopPatternKey } from './utils'

type ExportRequest = DiaNetXlsxCreateFromDataRequestBody
type ExportPreset = ExportRequest['preset']
type ExportPole = ExportPreset['poles'][number]
type ExportRouteDisplayOverride = NonNullable<ExportPreset['routeDisplayOverrides']>[number]
type ExportRoute = DiaNetGtfsExportData['routes'][number]
type ExportTrip = DiaNetGtfsExportData['trips'][number]
type WeekdayKey = Extract<keyof DiaNetCalendarData, 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'>

type GtfsIndex = {
  routeById: Map<string, ExportRoute>
  stopById: Map<string, DiaNetStopData>
  stopTimesByTripId: Map<string, DiaNetStopTimeData[]>
}

type ResolvedPole = {
  presetPole: ExportPole
  stop: DiaNetStopData
}

type StopPattern = {
  key: string
  stops: DiaNetStopData[]
}

type RoutePatterns = {
  route: ExportRoute
  direction: number | null
  stopPatterns: StopPattern[]
}

type TimetableTrip = {
  route: ExportRoute
  trip: ExportTrip
  stopTimes: DiaNetStopTimeData[]
}

type TimetableSheet = {
  name: string
  trips: TimetableTrip[]
  tripTimes: string[][]
}

type PoleRow = {
  name: string | null
  joko: string
  locationName: string
}

type CellStyle = {
  font?: Partial<ExcelJS.Font>
  alignment?: Partial<Alignment>
  border?: Partial<Borders>
  fill?: Fill
}

type SheetWriteData = {
  routePatterns: RoutePatterns[]
  poles: ResolvedPole[]
  preset: ExportPreset
  trips: TimetableTrip[]
  tripTimes: string[][]
}

const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const TIME_TEXT_PATTERN = /^\s?\d{3,4}$/
const BODY_ROW_HEIGHT = 12
const DESTINATION_ROW_HEIGHT = 64.8
const FIRST_HEADER_ROW = 2
const FIRST_BODY_ROW = 6
const LEFT_TABLE_COLUMN = 2
const FIRST_TRIP_COLUMN = 5
const FIXED_COLUMN_COUNT = 4
const TRIP_COLUMN_BLOCK_SIZE = 30
const SHEET_NAME_MAX_LENGTH = 31
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

const THIN_BORDER: Partial<Border> = { style: 'thin' }
const MEDIUM_BORDER: Partial<Border> = { style: 'medium' }
const DOUBLE_BORDER: Partial<Border> = { style: 'double' }
const MAJOR_FILL: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { theme: 2 },
}

export async function requestDiaNetXlsxInBrowser(request: ExportRequest): Promise<void> {
  const workbook = createDiaNetWorkbook(request)
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: XLSX_MIME_TYPE })

  downloadBlob(blob, diaNetWorkbookFileName(request.gtfs.agencyName, request.preset.name))
}

function createDiaNetWorkbook({ gtfs, preset, dayMapping }: ExportRequest): Workbook {
  const index = createGtfsIndex(gtfs)
  const poles = resolvePoles(preset, index.stopById)
  const routePatterns = buildRoutePatterns(gtfs.trips, preset, index)
  const poleIndexByPatternKey = buildPoleIndexByPatternKey(routePatterns, preset.poles)
  const sheets = buildTimetableSheets(gtfs, preset, dayMapping, index, poles, poleIndexByPatternKey)

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'LibreDiaNet'
  workbook.created = new Date()

  sheets.forEach((sheetData, sheetIndex) => {
    const sheet = workbook.addWorksheet(safeSheetName(sheetData.name, sheetIndex), {
      views: [{ state: 'frozen', xSplit: 4, ySplit: 0, zoomScale: 130 }],
      pageSetup: { printTitlesColumn: 'A:D' },
    })

    writeDiaNetSheet(sheet, {
      routePatterns,
      poles,
      preset,
      trips: sheetData.trips,
      tripTimes: sheetData.tripTimes,
    })
  })

  return workbook
}

function createGtfsIndex(gtfs: DiaNetGtfsExportData): GtfsIndex {
  return {
    routeById: mapBy(gtfs.routes, (route) => route.id),
    stopById: mapBy(gtfs.stops, (stop) => stop.id),
    stopTimesByTripId: groupBy(
      gtfs.stopTimes,
      (stopTime) => stopTime.tripId,
      (items) => items.toSorted((left, right) => left.stopSequence - right.stopSequence),
    ),
  }
}

function resolvePoles(preset: ExportPreset, stopById: Map<string, DiaNetStopData>): ResolvedPole[] {
  return preset.poles.map((presetPole) => ({
    presetPole,
    stop: requireFromMap(stopById, presetPole.id, 'Stop'),
  }))
}

function buildRoutePatterns(trips: ExportTrip[], preset: ExportPreset, index: GtfsIndex): RoutePatterns[] {
  return preset.routes.map((routeDetail) => {
    const routeTrips = trips.filter((trip) => trip.routeId === routeDetail.id && trip.directionId === routeDetail.direction)

    return {
      route: requireFromMap(index.routeById, routeDetail.id, 'Route'),
      direction: routeDetail.direction,
      stopPatterns: uniqueBy(
        routeTrips.map((trip) => stopPatternForTrip(trip, index)),
        (pattern) => pattern.key,
      ),
    }
  })
}

function stopPatternForTrip(trip: ExportTrip, index: GtfsIndex): StopPattern {
  const stopTimes = stopTimesForTrip(index.stopTimesByTripId, trip.tripId)
  return {
    key: stopPatternKey(stopTimes),
    stops: stopTimes.map((stopTime) => requireFromMap(index.stopById, stopTime.stopId, 'Stop')),
  }
}

function buildPoleIndexByPatternKey(routePatterns: RoutePatterns[], presetPoles: ExportPole[]): Map<string, (number | null)[]> {
  return new Map(
    routePatterns
      .flatMap((route) => route.stopPatterns)
      .map((stopPattern) => [stopPattern.key, stopPatternPoleIndexes(stopPattern, presetPoles)]),
  )
}

function stopPatternPoleIndexes(stopPattern: StopPattern, presetPoles: ExportPole[]): (number | null)[] {
  return presetPoles.map((currentPole, presetPoleIndex) => {
    const stopIndexes = stopPattern.stops.flatMap((stop, stopIndex) => (stop.id === currentPole.id ? [stopIndex] : []))

    if (stopIndexes.length === 0) {
      return null
    }
    if (stopIndexes.length === 1 || presetPoleIndex === 0) {
      return stopIndexes[0] ?? null
    }

    const duplicatedCount = presetPoles.filter((pole) => pole.id === currentPole.id).length
    if (duplicatedCount !== stopIndexes.length) {
      return -1
    }

    const duplicatedIndex = presetPoles.slice(0, presetPoleIndex).filter((pole) => pole.id === currentPole.id).length
    return stopIndexes[duplicatedIndex] ?? null
  })
}

function buildTimetableSheets(
  gtfs: DiaNetGtfsExportData,
  preset: ExportPreset,
  dayMapping: DayMapping[],
  index: GtfsIndex,
  poles: ResolvedPole[],
  poleIndexByPatternKey: Map<string, (number | null)[]>,
): TimetableSheet[] {
  const excludedPatterns = new Set(preset.excludedStopPatterns.map((pattern) => stopPatternKey(pattern)))
  const poleSpans = consecutivePoleSpans(poles)

  return dayMapping.map((mapping) => {
    const activeServiceIds =
      mapping.type === 'all-days'
        ? null
        : new Set(gtfs.calendars.filter((calendar) => calendarIsActive(calendar, mapping)).map((calendar) => calendar.id))
    const trips = preset.routes.flatMap((routeDetail) => {
      const route = requireFromMap(index.routeById, routeDetail.id, 'Route')
      return gtfs.trips
        .filter(
          (trip) =>
            trip.routeId === routeDetail.id &&
            trip.directionId === routeDetail.direction &&
            (activeServiceIds === null || activeServiceIds.has(trip.serviceId)),
        )
        .flatMap((trip): TimetableTrip[] => {
          const stopTimes = stopTimesForTrip(index.stopTimesByTripId, trip.tripId)
          return excludedPatterns.has(stopPatternKey(stopTimes)) ? [] : [{ route, trip, stopTimes }]
        })
    })
    const sortedTrips = sortTimetableTrips(trips, preset.poles, poleSpans, poleIndexByPatternKey)

    return {
      name: mapping.name,
      trips: sortedTrips,
      tripTimes: sortedTrips.map((trip) => tripTimesForPoles(trip, preset.poles, poleIndexByPatternKey)),
    }
  })
}

function sortTimetableTrips(
  trips: TimetableTrip[],
  presetPoles: ExportPole[],
  poleSpans: { colSpan: number }[],
  poleIndexByPatternKey: Map<string, (number | null)[]>,
): TimetableTrip[] {
  return sortTimetableColumns(
    trips.map((trip) => ({
      item: trip,
      compareValues: presetPoles.map((_, poleIndex) => {
        const stopTimeIndex = stopTimeIndexForPole(trip, poleIndex, poleIndexByPatternKey)
        return stopTimeIndex === null ? null : Number(departureHMM(trip.stopTimes[stopTimeIndex]).trim()) || null
      }),
    })),
    poleSpans,
  )
}

function tripTimesForPoles(
  trip: TimetableTrip,
  presetPoles: ExportPole[],
  poleIndexByPatternKey: Map<string, (number | null)[]>,
): string[] {
  const times = presetPoles.map((_, poleIndex) => {
    const stopTimeIndex = stopTimeIndexForPole(trip, poleIndex, poleIndexByPatternKey)
    return stopTimeIndex === null ? '' : departureHMM(trip.stopTimes[stopTimeIndex])
  })

  return fillMissingTimes(times)
}

function stopTimeIndexForPole(
  trip: TimetableTrip,
  poleIndex: number,
  poleIndexByPatternKey: Map<string, (number | null)[]>,
): number | null {
  const mapping = requireFromMap(poleIndexByPatternKey, stopPatternKey(trip.stopTimes), 'Stop pattern')
  const stopTimeIndex = mapping[poleIndex]
  return stopTimeIndex === undefined || stopTimeIndex === null || stopTimeIndex === -1 ? null : stopTimeIndex
}

function consecutivePoleSpans(poles: ResolvedPole[]): { colSpan: number }[] {
  return poles.map(({ stop }, index) => {
    if (poles[index - 1]?.stop.name === stop.name) {
      return { colSpan: 1 }
    }

    const colSpan = poles.slice(index).findIndex((candidate) => candidate.stop.name !== stop.name)
    return { colSpan: colSpan === -1 ? poles.length - index : colSpan }
  })
}

function writeDiaNetSheet(sheet: Worksheet, data: SheetWriteData) {
  const styles = createStyles()
  const poleRows = createPoleRows(data.poles, data.routePatterns)
  const spacing = tripColumnSpacing(data.trips.length)
  const tripColumnCount = data.trips.length + spacing

  configureSheetLayout(sheet, data.poles.length, tripColumnCount)
  writeHeaderRows(sheet, data.preset, data.trips, data.poles, spacing, styles)
  writePoleRows(sheet, data, poleRows, spacing, styles)
}

function configureSheetLayout(sheet: Worksheet, poleCount: number, tripColumnCount: number) {
  const lastColumn = FIXED_COLUMN_COUNT + tripColumnCount
  const lastRow = FIRST_BODY_ROW + poleCount - 1

  sheet.properties.defaultRowHeight = BODY_ROW_HEIGHT
  sheet.properties.defaultColWidth = 3
  sheet.getColumn(1).width = 2
  sheet.getColumn(2).width = 14.1
  sheet.getColumn(3).width = 2
  sheet.getColumn(4).width = 2
  range(tripColumnCount).forEach((index) => {
    sheet.getColumn(FIRST_TRIP_COLUMN + index).width = 3.5
  })

  applyBorder(sheet, 2, LEFT_TABLE_COLUMN, 2, lastColumn, 'top', MEDIUM_BORDER)
  applyBorder(sheet, lastRow, LEFT_TABLE_COLUMN, lastRow, lastColumn, 'bottom', MEDIUM_BORDER)
  applyBorder(sheet, 2, LEFT_TABLE_COLUMN, lastRow, LEFT_TABLE_COLUMN, 'left', MEDIUM_BORDER)
  applyBorder(sheet, 2, lastColumn, lastRow, lastColumn, 'right', MEDIUM_BORDER)
  applyBorder(sheet, 2, LEFT_TABLE_COLUMN, 2, lastColumn, 'bottom', THIN_BORDER)
  applyBorder(sheet, 3, LEFT_TABLE_COLUMN, 3, lastColumn, 'bottom', THIN_BORDER)
  applyBorder(sheet, 4, LEFT_TABLE_COLUMN, 4, lastColumn, 'bottom', THIN_BORDER)
  applyBorder(sheet, 5, LEFT_TABLE_COLUMN, 5, lastColumn, 'bottom', MEDIUM_BORDER)
  applyBorder(sheet, 2, FIXED_COLUMN_COUNT, lastRow, FIXED_COLUMN_COUNT, 'right', MEDIUM_BORDER)
}

function writeHeaderRows(
  sheet: Worksheet,
  preset: ExportPreset,
  trips: TimetableTrip[],
  poles: ResolvedPole[],
  spacing: number,
  styles: ReturnType<typeof createStyles>,
) {
  writeHeaderRow(sheet, FIRST_HEADER_ROW, '担　　当', trips, spacing, styles.headerTitleStyle, styles.headerNormalStyle)
  writeHeaderRow(
    sheet,
    FIRST_HEADER_ROW + 1,
    '系統ｺｰﾄﾞ',
    trips,
    spacing,
    styles.headerTitleStyle,
    styles.headerNormalStyle,
    (trip) => trip.route.id,
  )
  writeHeaderRow(
    sheet,
    FIRST_HEADER_ROW + 2,
    '系　　統',
    trips,
    spacing,
    styles.headerTitleStyle,
    styles.headerNormalStyle,
    (trip) => routeDisplayOverrideForTrip(preset, trip)?.routeNameOverride ?? displayRouteName(trip.route.shortName, trip.route.longName),
  )
  writeHeaderRow(sheet, FIRST_HEADER_ROW + 3, '行　　先', trips, spacing, styles.headerTitleStyle, styles.headerDestStyle, (trip) =>
    destinationName(trip, poles, routeDisplayOverrideForTrip(preset, trip)),
  )
  sheet.getRow(FIRST_HEADER_ROW + 3).height = DESTINATION_ROW_HEIGHT
}

function writePoleRows(
  sheet: Worksheet,
  { preset, poles, trips, tripTimes }: SheetWriteData,
  poleRows: PoleRow[],
  spacing: number,
  styles: ReturnType<typeof createStyles>,
) {
  const mutablePoleRows = poleRows.map((row) => ({ ...row }))
  const tripColumnCount = trips.length + spacing
  const lastColumn = FIXED_COLUMN_COUNT + tripColumnCount

  preset.poles.forEach((presetPole, index) => {
    const rowNumber = FIRST_BODY_ROW + index
    const row = sheet.getRow(rowNumber)
    row.height = BODY_ROW_HEIGHT

    const override = presetPole.override
    const rowShading = override.rowShading || override.majorStop
    const stopNameBold = override.stopNameBold || override.majorStop
    const stopNameSpan = consumePoleNameSpan(mutablePoleRows, index)

    writePoleNameCell(sheet, row, {
      rowNumber,
      index,
      poleCount: poles.length,
      stopNameSpan,
      rowShading,
      stopNameBold,
      styles,
      lastColumn,
    })

    if (override.branchStart) {
      applyBorder(sheet, rowNumber, LEFT_TABLE_COLUMN, rowNumber, lastColumn, 'top', DOUBLE_BORDER)
    }
    if (override.branchEnd) {
      applyBorder(sheet, rowNumber, LEFT_TABLE_COLUMN, rowNumber, lastColumn, 'bottom', DOUBLE_BORDER)
    }

    writePoleMetaCells(row, mutablePoleRows, index, rowShading, styles)
    writeTripTimeCells(sheet, row, preset, tripTimes, index, trips, spacing, override.horizontalLine, rowShading, styles)
  })
}

function writePoleNameCell(
  sheet: Worksheet,
  row: ExcelJS.Row,
  {
    rowNumber,
    index,
    poleCount,
    stopNameSpan,
    rowShading,
    stopNameBold,
    styles,
    lastColumn,
  }: {
    rowNumber: number
    index: number
    poleCount: number
    stopNameSpan: { name: string | null; rowSpan: number }
    rowShading: boolean
    stopNameBold: boolean
    styles: ReturnType<typeof createStyles>
    lastColumn: number
  },
) {
  if (stopNameSpan.name === null) {
    if (!row.getCell(2).isMerged) {
      applyCellStyle(row.getCell(2), styles.normalStopStyle)
    }
    applyBorder(sheet, rowNumber, 3, rowNumber, lastColumn, 'top', THIN_BORDER)
    return
  }

  const cell = row.getCell(2)
  cell.value = stopNameSpan.name
  if (stopNameSpan.rowSpan > 1) {
    sheet.mergeCells(rowNumber, 2, rowNumber + stopNameSpan.rowSpan - 1, 2)
  }
  applyCellStyle(cell, poleNameStyle(styles, { rowShading, stopNameBold, index, poleCount, rowSpan: stopNameSpan.rowSpan }))
}

function writePoleMetaCells(
  row: ExcelJS.Row,
  poleRows: PoleRow[],
  index: number,
  rowShading: boolean,
  styles: ReturnType<typeof createStyles>,
) {
  const poleRow = poleRows[index]
  const style = rowShading ? styles.majorStopStyle : styles.normalStopStyle

  row.getCell(3).value = poleRow?.locationName ?? ''
  applyCellStyle(row.getCell(3), style)

  row.getCell(4).value = jokoText(poleRows, index)
  applyCellStyle(row.getCell(4), style)
}

function writeTripTimeCells(
  sheet: Worksheet,
  row: ExcelJS.Row,
  preset: ExportPreset,
  tripTimes: string[][],
  poleIndex: number,
  trips: TimetableTrip[],
  spacing: number,
  horizontalLine: boolean,
  rowShading: boolean,
  styles: ReturnType<typeof createStyles>,
) {
  tripTimes.forEach((tripTime, tripIndex) => {
    const trip = trips[tripIndex]
    const cellDisplay = trip ? routeStopCellDisplay(routeDisplayOverrideForTrip(preset, trip), preset.poles, poleIndex) : null
    const baseText = cellDisplay?.textOverride ?? tripTime[poleIndex]
    const text = horizontalLine && !cellDisplay?.overridden && baseText === '…' ? '———' : baseText
    const cell = row.getCell(FIRST_TRIP_COLUMN + tripIndex)

    if (cellDisplay?.hidden) {
      if (!cell.isMerged) {
        applyCellStyle(cell, timeCellStyle(styles, text ?? '', rowShading))
      }
      return
    }

    cell.value = text
    if (cellDisplay && cellDisplay.rowSpan > 1) {
      const startRow = FIRST_BODY_ROW + poleIndex
      const endRow = Math.min(startRow + cellDisplay.rowSpan - 1, FIRST_BODY_ROW + preset.poles.length - 1)
      sheet.mergeCells(startRow, FIRST_TRIP_COLUMN + tripIndex, endRow, FIRST_TRIP_COLUMN + tripIndex)
    }
    applyCellStyle(cell, timeCellStyle(styles, text ?? '', rowShading, (cellDisplay?.rowSpan ?? 1) > 1))
  })

  range(spacing).forEach((spacingIndex) => {
    const cell = row.getCell(FIRST_TRIP_COLUMN + trips.length + spacingIndex)
    cell.value = '…'
    applyCellStyle(cell, rowShading ? styles.bodyMajorStyle : styles.bodyStyle)
  })
}

function createPoleRows(poles: ResolvedPole[], routePatterns: RoutePatterns[]): PoleRow[] {
  return poles.map(({ stop }, index) => ({
    name: stop.name,
    joko: stop.jokoOverride ?? rawJoko(poles, index, routePatterns),
    locationName: stop.platformCode ?? '',
  }))
}

function destinationName(trip: TimetableTrip, poles: ResolvedPole[], override: ExportRouteDisplayOverride | undefined): string {
  if (override?.destinationOverride) {
    return override.destinationOverride
  }

  const lastStopId = trip.stopTimes.at(-1)?.stopId
  const stop = poles.find(({ stop }) => stop.id === lastStopId)?.stop
  return trip.trip.tripHeadsign?.trim() || stop?.name || ''
}

function routeDisplayOverrideForTrip(preset: ExportPreset, trip: TimetableTrip): ExportRouteDisplayOverride | undefined {
  const routeKey =
    trip.trip.routeDisplayOverrideKey ?? `${trip.route.id}::${trip.trip.directionId ?? 'null'}::${stopPatternKey(trip.stopTimes)}`
  return preset.routeDisplayOverrides?.find((override) => override.routeKey === routeKey)
}

function routeStopCellDisplay(override: ExportRouteDisplayOverride | undefined, poles: ExportPole[], poleIndex: number) {
  const pole = poles[poleIndex]
  const cellOverrides = override?.stopCellOverrides ?? []
  const cellOverride = pole ? cellOverrides.find((cell) => cell.poleId === pole.id || `pole::${cell.poleId}` === pole.id) : undefined
  const hidden = cellOverrides.some((cell) => {
    const startIndex = poles.findIndex((candidate) => candidate.id === cell.poleId || candidate.id === `pole::${cell.poleId}`)
    return startIndex >= 0 && startIndex < poleIndex && poleIndex < startIndex + cell.rowSpan
  })
  return {
    textOverride: cellOverride?.text,
    rowSpan: cellOverride?.rowSpan ?? 1,
    hidden,
    overridden: Boolean(cellOverride),
  }
}

function tripColumnSpacing(tripCount: number): number {
  return TRIP_COLUMN_BLOCK_SIZE - (tripCount % TRIP_COLUMN_BLOCK_SIZE)
}

function poleNameStyle(
  styles: ReturnType<typeof createStyles>,
  {
    rowShading,
    stopNameBold,
    index,
    poleCount,
    rowSpan,
  }: {
    rowShading: boolean
    stopNameBold: boolean
    index: number
    poleCount: number
    rowSpan: number
  },
): CellStyle {
  const terminalStopName = stopNameBold || index === 0 || index === poleCount - rowSpan
  if (rowShading && terminalStopName) {
    return styles.majorStopNameStyle
  }
  if (rowShading) {
    return styles.majorStopStyle
  }
  return terminalStopName ? styles.startEndStopNameStyle : styles.normalStopStyle
}

function timeCellStyle(styles: ReturnType<typeof createStyles>, text: string, rowShading: boolean, verticalText = false): CellStyle {
  const time = TIME_TEXT_PATTERN.test(text)
  const style = time
    ? rowShading
      ? styles.bodyMajorTimeStyle
      : styles.bodyTimeStyle
    : rowShading
      ? styles.bodyMajorStyle
      : styles.bodyStyle
  if (verticalText) {
    return {
      ...style,
      alignment: {
        ...style.alignment,
        horizontal: 'center' as const,
        vertical: 'top' as const,
        textRotation: 'vertical' as const,
        wrapText: true,
      },
    }
  }
  return style
}

function createStyles() {
  const hiraginoSanSerif9 = { name: 'ヒラギノ明朝 ProN W3', size: 9 }
  const hiraginoSanSerif10 = { name: 'ヒラギノ明朝 ProN W3', size: 10 }
  const hiraginoKakugo10Bold = { name: 'ヒラギノ角ゴ ProN W6', size: 10, bold: true }
  const nadia9 = { name: 'BIZ UDゴシック', size: 9 }
  const inlineBorder = { left: THIN_BORDER, right: THIN_BORDER }

  const normalStopStyle = {
    font: hiraginoSanSerif10,
    alignment: { horizontal: 'distributed' as const, vertical: 'middle' as const },
  }
  const startEndStopNameStyle = {
    font: hiraginoKakugo10Bold,
    alignment: { horizontal: 'distributed' as const, vertical: 'middle' as const },
  }
  const bodyStyle = {
    font: nadia9,
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    border: inlineBorder,
  }
  const bodyTimeStyle = {
    ...bodyStyle,
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
  }

  return {
    normalStopStyle,
    startEndStopNameStyle,
    majorStopStyle: { ...normalStopStyle, fill: MAJOR_FILL },
    majorStopNameStyle: { ...startEndStopNameStyle, fill: MAJOR_FILL },
    headerTitleStyle: { ...normalStopStyle, alignment: { horizontal: 'center' as const, vertical: 'middle' as const } },
    headerNormalStyle: {
      font: hiraginoSanSerif9,
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: inlineBorder,
    },
    headerDestStyle: {
      font: hiraginoSanSerif9,
      alignment: { horizontal: 'center' as const, vertical: 'distributed' as const, textRotation: 'vertical' as const },
      border: inlineBorder,
    },
    bodyStyle,
    bodyTimeStyle,
    bodyMajorStyle: { ...bodyStyle, fill: MAJOR_FILL },
    bodyMajorTimeStyle: { ...bodyTimeStyle, fill: MAJOR_FILL },
  }
}

function writeHeaderRow(
  sheet: Worksheet,
  rowNumber: number,
  title: string,
  trips: TimetableTrip[],
  spacing: number,
  titleStyle: CellStyle,
  valueStyle: CellStyle,
  value?: (trip: TimetableTrip) => string,
) {
  const row = sheet.getRow(rowNumber)
  row.height = BODY_ROW_HEIGHT

  row.getCell(2).value = title
  sheet.mergeCells(rowNumber, 2, rowNumber, 4)
  applyCellStyle(row.getCell(2), titleStyle)

  trips.forEach((trip, index) => {
    const cell = row.getCell(FIRST_TRIP_COLUMN + index)
    cell.value = value?.(trip) ?? ''
    applyCellStyle(cell, valueStyle)
  })
  range(spacing).forEach((index) => {
    applyCellStyle(row.getCell(FIRST_TRIP_COLUMN + trips.length + index), valueStyle)
  })
}

function applyCellStyle(cell: Cell, style: CellStyle) {
  if (style.font) {
    cell.font = style.font
  }
  if (style.alignment) {
    cell.alignment = style.alignment
  }
  if (style.border) {
    cell.border = { ...cell.border, ...style.border }
  }
  if (style.fill) {
    cell.fill = style.fill
  }
}

function applyBorder(
  sheet: Worksheet,
  startRow: number,
  startColumn: number,
  endRow: number,
  endColumn: number,
  side: keyof Borders,
  border: Partial<Border>,
) {
  range(endRow - startRow + 1, startRow).forEach((rowNumber) => {
    const row = sheet.getRow(rowNumber)
    range(endColumn - startColumn + 1, startColumn).forEach((columnNumber) => {
      const cell = row.getCell(columnNumber)
      cell.border = { ...cell.border, [side]: border }
    })
  })
}

function calendarIsActive(calendar: DiaNetCalendarData, mapping: DayMapping): boolean {
  if (mapping.type === 'all-days') {
    return true
  }
  if (mapping.type === 'weekday') {
    return calendar[mapping.weekday] === 1
  }

  const date = mapping.date.replaceAll('-', '')
  if (calendar.startDate > date || calendar.endDate < date) {
    return false
  }

  const weekday = WEEKDAYS[new Date(`${mapping.date}T00:00:00`).getDay()] as WeekdayKey
  return calendar[weekday] === 1
}

function rawJoko(poles: ResolvedPole[], poleIndex: number, routePatterns: RoutePatterns[]): string {
  const pole = poles[poleIndex]?.stop
  if (!pole || poleIndex === 0) {
    return '発'
  }
  if (poleIndex === poles.length - 1 || pole.platformCode === '降車') {
    return '着'
  }

  const matchingPatterns = routePatterns.flatMap((route) =>
    route.stopPatterns.filter((pattern) => pattern.stops.some((patternStop) => patternStop === pole)),
  )
  if (matchingPatterns.length !== 1) {
    return '発'
  }

  const [pattern] = matchingPatterns
  return pattern?.stops.indexOf(pole) === (pattern?.stops.length ?? 0) - 1 ? '着' : '発'
}

function consumePoleNameSpan(poleRows: PoleRow[], index: number): { name: string | null; rowSpan: number } {
  const name = poleRows[index]?.name ?? null
  if (name === null) {
    return { name: null, rowSpan: 1 }
  }

  const nextDifferentIndex = poleRows.slice(index + 1).findIndex((row) => row.name !== name)
  const rowSpan = nextDifferentIndex === -1 ? poleRows.length - index : nextDifferentIndex + 1
  range(rowSpan - 1, index + 1).forEach((rowIndex) => {
    poleRows[rowIndex]!.name = null
  })
  return { name, rowSpan }
}

function jokoText(poleRows: PoleRow[], index: number): string {
  const current = poleRows[index]
  const previous = poleRows[index - 1]
  if (!current) {
    return ''
  }
  return previous?.joko === current.joko ? '〃' : current.joko
}

function stopTimesForTrip(stopTimesByTripId: Map<string, DiaNetStopTimeData[]>, tripId: string): DiaNetStopTimeData[] {
  return stopTimesByTripId.get(tripId) ?? []
}

function fillMissingTimes(times: string[]): string[] {
  const first = times.findIndex((time) => time.length > 0)
  const last = times.findLastIndex((time) => time.length > 0)

  return times.map((time, index) => {
    if (time.length > 0) {
      return time
    }
    return first >= 0 && index >= first && index <= last ? '‖' : '…'
  })
}

function departureHMM(stopTime: DiaNetStopTimeData | undefined): string {
  const parts = stopTime?.departureTime?.split(':')
  if (!parts || parts.length < 2) {
    return ''
  }

  const hour = Number(parts[0])
  const minute = parts[1]?.padStart(2, '0') ?? ''
  return Number.isFinite(hour) && minute.length > 0 ? `${hour}${minute}`.padStart(4, '\u2002') : ''
}

function safeSheetName(name: string, index: number): string {
  const sanitized = (name.trim() || `Sheet${index + 1}`).replace(/[\\/*?:[\]]/g, '_').slice(0, SHEET_NAME_MAX_LENGTH)
  return sanitized || `Sheet${index + 1}`
}

function diaNetWorkbookFileName(agencyName: string, presetName: string): string {
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, '')
  return `${agencyName}_${presetName}_${timestamp}.xlsx`
}

function requireFromMap<K, V>(map: Map<K, V>, key: K, label: string): V {
  const value = map.get(key)
  if (value === undefined) {
    throw new Error(`${label} not found: ${String(key)}`)
  }
  return value
}

function mapBy<T, K>(items: T[], getKey: (item: T) => K): Map<K, T> {
  return new Map(items.map((item) => [getKey(item), item]))
}

function groupBy<T, K>(items: T[], getKey: (item: T) => K, finalize: (items: T[]) => T[] = (grouped) => grouped): Map<K, T[]> {
  const groups = new Map<K, T[]>()
  items.forEach((item) => {
    groups.set(getKey(item), [...(groups.get(getKey(item)) ?? []), item])
  })
  return new Map(Array.from(groups, ([key, grouped]) => [key, finalize(grouped)]))
}

function uniqueBy<T, K>(items: T[], getKey: (item: T) => K): T[] {
  const seen = new Set<K>()
  return items.filter((item) => {
    const key = getKey(item)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

function range(length: number, start = 0): number[] {
  return Array.from({ length }, (_, index) => start + index)
}
