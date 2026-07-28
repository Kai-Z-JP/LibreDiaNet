import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { FareV1Data } from '../../../../gtfsRepository'
import type { ProPreset } from '../../../../types'
import { tabLabels } from '../../model/pro-ui-constants'
import type { FareTriangle, FareTriangleCandidate } from '../../model/pro-fare-triangle'
import { ProFareTrianglePanel } from './pro-fare-triangle-panel'

const { mockUseProFareTriangle } = vi.hoisted(() => ({ mockUseProFareTriangle: vi.fn() }))

vi.mock('./use-pro-fare-triangle', () => ({
  useProFareTriangle: mockUseProFareTriangle,
}))

vi.mock('../../model/pro-gtfs-repository-context', () => ({
  useProGtfsRepository: () => ({}),
}))

describe('Pro fare tab', () => {
  it('is placed between preview and debug', () => {
    expect(tabLabels).toEqual(['路線', '標柱統合', 'プレビュー', '三角表運賃', 'デバッグ'])
  })

  it('renders the lower triangle, switches cash and IC amounts, and opens candidate details', async () => {
    const highFare = candidate({ fareId: 'high', cashPrice: 240, icPrice: 240, icFallback: true })
    const lowFare = candidate({ fareId: 'low', cashPrice: 210, icPrice: 205, icFallback: false })
    const triangle = fareTriangle([highFare, lowFare])
    mockUseProFareTriangle.mockReturnValue({
      axis: triangle.axis,
      triangle,
      loadState: {
        dataBySource: { source: fareData([highFare, lowFare]) },
        errorsBySource: {},
        pendingSourceIds: [],
      },
      loading: false,
    })

    const { rerender } = render(<ProFareTrianglePanel {...panelProps()} />)

    fireEvent.click(screen.getByRole('switch', { name: '途中標柱を省略' }))

    const cashTable = screen.getByRole('table', { name: '現金運賃三角表' })
    expect(cashTable).toBeInTheDocument()
    expect(within(cashTable).getByRole('rowheader', { name: 'A' })).toBeInTheDocument()
    expect(within(cashTable).queryByRole('rowheader', { name: '1 A' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'AからBまで 210 / 240' })).toBeInTheDocument()
    expect(screen.getByLabelText('AからCまで 運賃未解決')).toHaveTextContent('—')

    fireEvent.click(screen.getByRole('button', { name: 'IC' }))

    expect(screen.getByRole('table', { name: 'IC運賃三角表' })).toBeInTheDocument()
    expect(screen.getByText(/IC運賃が未設定の場合は現金運賃で補完します/)).toBeInTheDocument()
    const fareButton = screen.getByRole('button', { name: 'AからBまで 205 / 240' })
    fireEvent.click(fareButton)

    const dialog = screen.getByRole('dialog', { name: '運賃詳細' })
    expect(within(dialog).getByText('A → B')).toBeInTheDocument()
    expect(within(dialog).getAllByText('テストGTFS')).toHaveLength(2)
    expect(within(dialog).getAllByText(/現金運賃で補完/)).toHaveLength(2)
    expect(within(dialog).getAllByText(/ID: route-1 \/ dir: 0/)).toHaveLength(2)
    expect(within(dialog).getByText('high')).toBeInTheDocument()

    const lateFare = candidate({ fareId: 'late', cashPrice: 260, icPrice: 250 })
    const updatedTriangle = fareTriangle([highFare, lowFare, lateFare])
    mockUseProFareTriangle.mockReturnValue({
      axis: updatedTriangle.axis,
      triangle: updatedTriangle,
      loadState: {
        dataBySource: { source: fareData([highFare, lowFare, lateFare]) },
        errorsBySource: {},
        pendingSourceIds: [],
      },
      loading: false,
    })
    rerender(<ProFareTrianglePanel {...panelProps()} />)

    const updatedDialog = screen.getByRole('dialog', { name: '運賃詳細' })
    expect(within(updatedDialog).getByText('late')).toBeInTheDocument()
    expect(within(updatedDialog).getAllByText('テストGTFS')).toHaveLength(3)

    fireEvent.click(within(updatedDialog).getByRole('button', { name: '閉じる' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '運賃詳細' })).not.toBeInTheDocument())
  })

  it('keeps columns fixed and lets long stop names overflow to the right', () => {
    const longStopName = 'とても長い停留所名'
    const triangle = fareTriangle([])
    triangle.axis[0] = axisEntry(longStopName)
    mockUseProFareTriangle.mockReturnValue({
      axis: triangle.axis,
      triangle,
      loadState: {
        dataBySource: {},
        errorsBySource: {},
        pendingSourceIds: [],
      },
      loading: false,
    })

    render(<ProFareTrianglePanel {...panelProps()} />)

    fireEvent.click(screen.getByRole('switch', { name: '途中標柱を省略' }))

    const table = screen.getByRole('table', { name: '現金運賃三角表' })
    expect(table).toHaveStyle({
      width: '9em',
      border: '3px solid #000',
      tableLayout: 'fixed',
      backgroundColor: '#fff',
      color: '#000',
    })
    expect(table.querySelectorAll('col')).toHaveLength(3)
    table.querySelectorAll('col').forEach((column) => expect(column).toHaveStyle({ width: '3em' }))

    const name = screen.getByText(longStopName)
    expect(name).toHaveStyle({ display: 'block', width: 'max-content', whiteSpace: 'nowrap' })
    expect(name.closest('th')).toHaveStyle({ width: '3em', minWidth: '3em', maxWidth: '3em', overflow: 'visible' })
  })

  it('combines two fare-equivalent poles into a named range and restores every pole when switched off', async () => {
    const triangle = fareTriangleWithAmounts(
      ['A', 'B', 'C'],
      {
        '0:1': 210,
        '0:2': 240,
        '1:2': 240,
      },
      {
        '0:1': 205,
        '0:2': 230,
        '1:2': 230,
      },
    )
    mockFareTriangle(triangle)

    render(<ProFareTrianglePanel {...panelProps()} />)

    const omitToggle = screen.getByRole('switch', { name: '途中標柱を省略' })
    expect(omitToggle).toBeChecked()

    const abbreviatedTable = screen.getByRole('table', { name: '現金運賃三角表' })
    expect(within(abbreviatedTable).getByRole('rowheader', { name: 'A〜B' })).toBeInTheDocument()
    expect(within(abbreviatedTable).getByText('C')).toBeInTheDocument()
    expect(within(abbreviatedTable).queryByText('A', { exact: true })).not.toBeInTheDocument()
    expect(within(abbreviatedTable).queryByText('B', { exact: true })).not.toBeInTheDocument()
    const rangeFare = within(abbreviatedTable).getByRole('button', { name: 'A〜BからCまで 240' })
    expect(abbreviatedTable.querySelectorAll('col')).toHaveLength(2)

    fireEvent.click(rangeFare)
    const dialog = screen.getByRole('dialog', { name: '運賃詳細' })
    expect(within(dialog).getByText('A → C')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: '閉じる' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '運賃詳細' })).not.toBeInTheDocument())

    fireEvent.click(omitToggle)

    expect(omitToggle).not.toBeChecked()
    const fullTable = screen.getByRole('table', { name: '現金運賃三角表' })
    expect(within(fullTable).getByText('A')).toBeInTheDocument()
    expect(within(fullTable).getByText('B')).toBeInTheDocument()
    expect(within(fullTable).getByText('C')).toBeInTheDocument()
    expect(within(fullTable).queryByText('A〜B')).not.toBeInTheDocument()
    expect(fullTable.querySelectorAll('col')).toHaveLength(3)
  })

  it('combines a fare-equivalent group of three or more poles into its full range', () => {
    const triangle = fareTriangleWithAmounts(
      ['A', 'B', 'C', 'D'],
      {
        '0:1': 210,
        '0:2': 210,
        '0:3': 240,
        '1:2': 210,
        '1:3': 240,
        '2:3': 240,
      },
      {
        '0:1': 205,
        '0:2': 205,
        '0:3': 230,
        '1:2': 205,
        '1:3': 230,
        '2:3': 230,
      },
    )
    mockFareTriangle(triangle)

    render(<ProFareTrianglePanel {...panelProps()} />)

    expect(screen.getByRole('switch', { name: '途中標柱を省略' })).toBeChecked()
    const table = screen.getByRole('table', { name: '現金運賃三角表' })
    expect(within(table).getByRole('rowheader', { name: 'A〜C' })).toBeInTheDocument()
    expect(within(table).getByText('D')).toBeInTheDocument()
    expect(within(table).queryByText('A', { exact: true })).not.toBeInTheDocument()
    expect(within(table).queryByText('B', { exact: true })).not.toBeInTheDocument()
    expect(within(table).queryByText('C', { exact: true })).not.toBeInTheDocument()
    expect(within(table).getByRole('button', { name: 'A〜CからDまで 240' })).toBeInTheDocument()
    expect(table.querySelectorAll('col')).toHaveLength(2)
  })

  it('shows a uniform-fare summary when every stop pair has the same fare', () => {
    const triangle = fareTriangleWithAmounts(
      ['A', 'B', 'C'],
      {
        '0:1': 210,
        '0:2': 210,
        '1:2': 210,
      },
      {
        '0:1': 205,
        '0:2': 205,
        '1:2': 205,
      },
    )
    mockFareTriangle(triangle)

    render(<ProFareTrianglePanel {...panelProps()} />)

    expect(screen.getByRole('switch', { name: '途中標柱を省略' })).toBeChecked()
    expect(screen.getByText('均一 210円')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: '現金運賃三角表' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'IC' }))

    expect(screen.getByText('均一 205円')).toBeInTheDocument()
    expect(screen.queryByText('均一 210円')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('switch', { name: '途中標柱を省略' }))

    expect(screen.queryByText('均一 205円')).not.toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'IC運賃三角表' }).querySelectorAll('col')).toHaveLength(3)
  })

  it('shows loading, partial source failures, missing fare data, and resolver warnings independently', () => {
    const triangle = {
      ...fareTriangle([]),
      missingZoneCount: 2,
      unsupportedContainsRuleCount: 1,
    }
    mockUseProFareTriangle.mockReturnValue({
      axis: triangle.axis,
      triangle,
      loadState: {
        dataBySource: { source: fareData([]) },
        errorsBySource: { broken: 'SQLiteを開けません。' },
        pendingSourceIds: ['source'],
      },
      loading: true,
    })

    render(<ProFareTrianglePanel {...panelProps()} />)

    expect(screen.getByRole('status', { name: '運賃データを読み込んでいます' })).toBeInTheDocument()
    expect(screen.getByText(/壊れたGTFS: 運賃データの読み込みに失敗しました。SQLiteを開けません/)).toBeInTheDocument()
    expect(screen.getByText(/テストGTFS: Fare v1の運賃情報がありません/)).toBeInTheDocument()
    expect(screen.getByText(/zone_id が未設定の停留所が 2 件/)).toBeInTheDocument()
    expect(screen.getByText(/contains_id を使用する運賃規則 1 件/)).toBeInTheDocument()
  })
})

function panelProps() {
  return {
    preset: preset(),
    context: { loading: false, handles: {}, errors: {} },
    constructedRoutes: [],
    stopMap: {},
    sourceNameMap: { source: 'テストGTFS', broken: '壊れたGTFS' },
  }
}

function preset(): ProPreset {
  return {
    id: 'preset',
    name: 'テスト',
    index: 0,
    sourceIds: ['source'],
    routes: [],
    routeDisplayOverrides: [],
    poles: [],
    excludedStopPatterns: [],
  }
}

function fareTriangle(candidates: FareTriangleCandidate[]): FareTriangle {
  return {
    axis: [axisEntry('A'), axisEntry('B'), axisEntry('C')],
    cells: {
      '0:1': { originIndex: 0, destinationIndex: 1, candidates },
      '0:2': { originIndex: 0, destinationIndex: 2, candidates: [] },
      '1:2': { originIndex: 1, destinationIndex: 2, candidates: [] },
    },
    warnings: [],
    missingZoneCount: 0,
    unsupportedContainsRuleCount: 0,
  }
}

function fareTriangleWithAmounts(
  axisNames: string[],
  cashAmounts: Record<string, number>,
  icAmounts: Record<string, number>,
): FareTriangle {
  const axis = axisNames.map(axisEntry)
  const cells: FareTriangle['cells'] = {}

  for (let destinationIndex = 1; destinationIndex < axis.length; destinationIndex += 1) {
    for (let originIndex = 0; originIndex < destinationIndex; originIndex += 1) {
      const key = `${originIndex}:${destinationIndex}`
      const cashPrice = cashAmounts[key]
      const icPrice = icAmounts[key]
      const originName = axisNames[originIndex]
      const destinationName = axisNames[destinationIndex]
      const candidates =
        cashPrice === undefined || icPrice === undefined || originName === undefined || destinationName === undefined
          ? []
          : [
              candidate({
                cashPrice,
                icPrice,
                boardName: originName,
                alightName: destinationName,
                boardStopId: `stop-${originName}`,
                alightStopId: `stop-${destinationName}`,
              }),
            ]
      cells[key] = { originIndex, destinationIndex, candidates }
    }
  }

  return {
    axis,
    cells,
    warnings: [],
    missingZoneCount: 0,
    unsupportedContainsRuleCount: 0,
  }
}

function mockFareTriangle(triangle: FareTriangle) {
  mockUseProFareTriangle.mockReturnValue({
    axis: triangle.axis,
    triangle,
    loadState: {
      dataBySource: { source: fareData(Object.values(triangle.cells).flatMap((cell) => cell.candidates)) },
      errorsBySource: {},
      pendingSourceIds: [],
    },
    loading: false,
  })
}

function axisEntry(displayName: string) {
  return { key: displayName, displayName, poleIds: [`pole-${displayName}`], stops: [] }
}

function candidate(overrides: Partial<FareTriangleCandidate>): FareTriangleCandidate {
  return {
    sourceId: 'source',
    sourceName: 'テストGTFS',
    routeId: 'route-1',
    routeName: '1系統',
    direction: 0,
    fareId: 'fare',
    cashPrice: 210,
    icPrice: 205,
    currency: 'JPY',
    icFallback: false,
    boardStopId: 'stop-a',
    boardName: 'A',
    boardZone: 'zone-a',
    alightStopId: 'stop-b',
    alightName: 'B',
    alightZone: 'zone-b',
    ...overrides,
  }
}

function fareData(candidates: FareTriangleCandidate[]): FareV1Data {
  return {
    fareAttributesPresent: candidates.length > 0,
    fareRulesPresent: candidates.length > 0,
    stopZoneById: {},
    routeAgencyById: {},
    attributes: candidates.map((item) => ({
      fareId: item.fareId,
      price: item.cashPrice,
      icPrice: item.icFallback ? null : item.icPrice,
      currencyType: item.currency,
      agencyId: null,
    })),
    rules: [],
  }
}
