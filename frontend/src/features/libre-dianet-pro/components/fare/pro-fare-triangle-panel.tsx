import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  LinearProgress,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import type { GtfsStop, ProPreset, ProPresetContext } from '../../../../types'
import {
  buildFareTrianglePresentation,
  fareTriangleCellAmounts,
  fareTriangleCellKey,
  type FareMode,
  type FareTriangleCandidate,
  type FareTriangleCell,
} from '../../model/pro-fare-triangle'
import { useProGtfsRepository } from '../../model/pro-gtfs-repository-context'
import type { ProConstructedRoute } from '../../model/pro-types'
import { useProFareTriangle } from './use-pro-fare-triangle'

const fareNumberFormatter = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 2 })
const FARE_CELL_WIDTH_EM = 3
const FARE_CELL_WIDTH = `${FARE_CELL_WIDTH_EM}em`

export function ProFareTrianglePanel({
  preset,
  context,
  constructedRoutes,
  stopMap,
  sourceNameMap,
}: {
  preset: ProPreset
  context: ProPresetContext
  constructedRoutes: ProConstructedRoute[]
  stopMap: Record<string, GtfsStop>
  sourceNameMap: Record<string, string>
}) {
  const repository = useProGtfsRepository()
  const [mode, setMode] = useState<FareMode>('cash')
  const [abbreviate, setAbbreviate] = useState(true)
  const [selectedCellCoordinates, setSelectedCellCoordinates] = useState<{ originIndex: number; destinationIndex: number } | null>(null)
  const { triangle, loadState, loading } = useProFareTriangle({
    preset,
    context,
    constructedRoutes,
    stopMap,
    sourceNameMap,
    repository,
  })
  const loadedData = Object.values(loadState.dataBySource)
  const hasFareAttributes = loadedData.some((data) => data.fareAttributesPresent && data.attributes.length > 0)
  const hasResolvedFare = Object.values(triangle.cells).some((cell) => cell.candidates.length > 0)
  const hasSourceErrors = Object.keys(loadState.errorsBySource).length > 0
  const presentation = useMemo(
    () => buildFareTrianglePresentation(triangle, mode, abbreviate && !loading && !hasSourceErrors),
    [abbreviate, hasSourceErrors, loading, mode, triangle],
  )
  const displayedAxis = useMemo(
    () =>
      presentation.items.flatMap((item) => {
        const entry = triangle.axis[item.axisIndex]
        if (!entry) {
          return []
        }
        if (item.kind === 'axis') {
          return [{ originalIndex: item.axisIndex, displayName: entry.displayName, key: entry.key }]
        }

        const firstEntry = triangle.axis[item.axisIndices[0] ?? item.axisIndex]
        const lastEntry = triangle.axis[item.axisIndices.at(-1) ?? item.axisIndex]
        return [
          {
            originalIndex: item.axisIndex,
            displayName: `${stopDisplayName(firstEntry?.displayName)}〜${stopDisplayName(lastEntry?.displayName)}`,
            key: `range:${item.axisIndices.join(':')}`,
          },
        ]
      }),
    [presentation.items, triangle.axis],
  )
  const selectedCell = selectedCellCoordinates
    ? (triangle.cells[fareTriangleCellKey(selectedCellCoordinates.originIndex, selectedCellCoordinates.destinationIndex)] ?? null)
    : null

  return (
    <Box sx={{ display: 'grid', gap: 1.5, pb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', pt: 1 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={mode}
          aria-label="運賃種別"
          onChange={(_, value: FareMode | null) => {
            if (value) {
              setMode(value)
            }
          }}
        >
          <ToggleButton value="cash">現金</ToggleButton>
          <ToggleButton value="ic">IC</ToggleButton>
        </ToggleButtonGroup>
        <FormControlLabel
          control={<Switch size="small" checked={abbreviate} onChange={(_, checked) => setAbbreviate(checked)} />}
          label="途中標柱を省略"
        />
        <Typography variant="body2" color="text.secondary">
          {mode === 'ic'
            ? 'IC運賃が未設定の場合は現金運賃で補完します。運賃セルを選択すると内訳を確認できます。'
            : '運賃セルを選択すると、適用されたGTFS運賃規則を確認できます。'}
        </Typography>
      </Box>

      {loading && (
        <Box role="status" aria-label="運賃データを読み込んでいます">
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            運賃データを読み込んでいます…
          </Typography>
        </Box>
      )}

      {Object.entries(loadState.errorsBySource).map(([sourceId, error]) => (
        <Alert key={sourceId} severity="warning">
          {sourceNameMap[sourceId] ?? sourceId}: 運賃データの読み込みに失敗しました。{error}
        </Alert>
      ))}

      {Object.entries(loadState.dataBySource)
        .filter(([, data]) => !data.fareAttributesPresent || data.attributes.length === 0)
        .map(([sourceId]) => (
          <Alert key={sourceId} severity="info">
            {sourceNameMap[sourceId] ?? sourceId}: Fare v1の運賃情報がありません。
          </Alert>
        ))}

      {!loading && Object.keys(loadState.errorsBySource).length === 0 && loadedData.length === 0 && (
        <Alert severity="info">運賃を取得できる選択路線がありません。</Alert>
      )}

      {triangle.missingZoneCount > 0 && (
        <Alert severity="warning">stops.txt の zone_id が未設定の停留所が {triangle.missingZoneCount} 件あります。</Alert>
      )}

      {triangle.unsupportedContainsRuleCount > 0 && (
        <Alert severity="warning">
          contains_id を使用する運賃規則 {triangle.unsupportedContainsRuleCount} 件は未対応のため除外しました。
        </Alert>
      )}

      {!loading && hasFareAttributes && !hasResolvedFare && <Alert severity="info">選択した路線・区間に適用できる運賃がありません。</Alert>}

      {triangle.axis.length === 0 ? (
        <Alert severity="info">運賃表に表示できる停留所がありません。</Alert>
      ) : presentation.uniformAmounts !== null ? (
        <Box
          role="status"
          aria-label={`${mode === 'cash' ? '現金' : 'IC'}均一運賃`}
          sx={{ p: 3, color: '#000', fontFamily: "'ヒラギノ明朝 ProN', serif", textAlign: 'center' }}
        >
          <Typography variant="h6" sx={{ fontWeight: 400 }}>
            均一 {presentation.uniformAmounts.map(formatFareNumber).join(' / ')}円
          </Typography>
        </Box>
      ) : (
        <Box sx={{ maxWidth: '100%', overflowX: 'auto' }}>
          <Box
            component="table"
            aria-label={`${mode === 'cash' ? '現金' : 'IC'}運賃三角表`}
            sx={{
              width: `${displayedAxis.length * FARE_CELL_WIDTH_EM}em`,
              border: '3px solid #000',
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
              backgroundColor: '#fff',
              color: '#000',
              fontFamily: "'ヒラギノ明朝 ProN', serif",
              lineHeight: 1.15,
            }}
          >
            <colgroup>
              {displayedAxis.map(({ key }) => (
                <col key={key} style={{ width: FARE_CELL_WIDTH }} />
              ))}
            </colgroup>
            <tbody>
              {displayedAxis.map((destination, destinationDisplayIndex) => (
                <tr key={destination.key}>
                  {displayedAxis.map((origin, originDisplayIndex) => {
                    if (originDisplayIndex > destinationDisplayIndex) {
                      return <UpperTriangleCell key={origin.key} />
                    }
                    if (originDisplayIndex === destinationDisplayIndex) {
                      return <DiagonalCell key={origin.key} name={origin.displayName} />
                    }
                    const cell = triangle.cells[fareTriangleCellKey(origin.originalIndex, destination.originalIndex)]
                    return (
                      <FareCell
                        key={origin.key}
                        cell={cell}
                        mode={mode}
                        originName={origin.displayName}
                        destinationName={destination.displayName}
                        onSelect={(selected) =>
                          setSelectedCellCoordinates({ originIndex: selected.originIndex, destinationIndex: selected.destinationIndex })
                        }
                      />
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      )}

      <FareDetailDialog cell={selectedCell} mode={mode} onClose={() => setSelectedCellCoordinates(null)} />
    </Box>
  )
}

function UpperTriangleCell() {
  return (
    <Box
      component="td"
      aria-hidden="true"
      sx={{
        width: FARE_CELL_WIDTH,
        minWidth: FARE_CELL_WIDTH,
        maxWidth: FARE_CELL_WIDTH,
        height: FARE_CELL_WIDTH,
        border: 0,
        backgroundColor: 'transparent',
      }}
    />
  )
}

function DiagonalCell({ name }: { name: string }) {
  return (
    <Box
      component="th"
      scope="row"
      sx={{
        boxSizing: 'border-box',
        position: 'relative',
        width: FARE_CELL_WIDTH,
        minWidth: FARE_CELL_WIDTH,
        maxWidth: FARE_CELL_WIDTH,
        height: FARE_CELL_WIDTH,
        border: '1px solid #000',
        px: 1,
        py: 0.75,
        backgroundColor: '#fff',
        color: '#000',
        fontWeight: 400,
        lineHeight: 1.15,
        textAlign: 'center',
        verticalAlign: 'middle',
        overflow: 'visible',
      }}
    >
      <Box
        component="span"
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'block',
          width: 'max-content',
          whiteSpace: 'nowrap',
        }}
      >
        {name || '名称未設定'}
      </Box>
    </Box>
  )
}

function FareCell({
  cell,
  mode,
  originName,
  destinationName,
  onSelect,
}: {
  cell: FareTriangleCell | undefined
  mode: FareMode
  originName: string
  destinationName: string
  onSelect: (cell: FareTriangleCell) => void
}) {
  const amounts = cell ? fareTriangleCellAmounts(cell, mode) : []
  const label = amounts.map(formatFareNumber).join(' / ')

  return (
    <Box
      component="td"
      sx={{
        boxSizing: 'border-box',
        width: FARE_CELL_WIDTH,
        minWidth: FARE_CELL_WIDTH,
        maxWidth: FARE_CELL_WIDTH,
        height: FARE_CELL_WIDTH,
        border: '1px solid #000',
        p: 0,
        textAlign: 'center',
        verticalAlign: 'middle',
      }}
    >
      {cell && cell.candidates.length > 0 ? (
        <Box
          component="button"
          type="button"
          aria-label={`${originName}から${destinationName}まで ${label}`}
          onClick={() => onSelect(cell)}
          sx={{
            width: '100%',
            height: '100%',
            border: 0,
            px: 0.75,
            py: 1,
            backgroundColor: 'transparent',
            color: '#000',
            font: 'inherit',
            fontWeight: 400,
            cursor: 'pointer',
            '&:hover': { backgroundColor: '#eef6ff' },
            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 },
          }}
        >
          {label}
        </Box>
      ) : (
        <Typography component="span" color="text.secondary" aria-label={`${originName}から${destinationName}まで 運賃未解決`}>
          —
        </Typography>
      )}
    </Box>
  )
}

function FareDetailDialog({ cell, mode, onClose }: { cell: FareTriangleCell | null; mode: FareMode; onClose: () => void }) {
  const firstCandidate = cell?.candidates[0]
  return (
    <Dialog open={cell !== null} maxWidth="sm" fullWidth onClose={onClose}>
      <DialogTitle>運賃詳細</DialogTitle>
      {cell && firstCandidate && (
        <DialogContent dividers>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {firstCandidate.boardName} → {firstCandidate.alightName}
          </Typography>
          <Box sx={{ display: 'grid', gap: 2 }}>
            {cell.candidates.map((candidate, index) => (
              <Box key={candidateKey(candidate, index)}>
                {index > 0 && <Divider sx={{ mb: 2 }} />}
                <FareCandidateDetails candidate={candidate} mode={mode} />
              </Box>
            ))}
          </Box>
        </DialogContent>
      )}
      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  )
}

function FareCandidateDetails({ candidate, mode }: { candidate: FareTriangleCandidate; mode: FareMode }) {
  const amount = mode === 'cash' ? candidate.cashPrice : candidate.icPrice
  const routeName = candidate.routeName || candidate.routeId
  return (
    <Box
      component="dl"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '120px minmax(0, 1fr)' },
        columnGap: 1.5,
        rowGap: 0.75,
        m: 0,
        '& dt': { color: 'text.secondary', fontSize: '0.875rem' },
        '& dd': { m: 0, overflowWrap: 'anywhere' },
      }}
    >
      <dt>金額</dt>
      <dd>
        {formatFareNumber(amount)} {candidate.currency}
        {mode === 'ic' && candidate.icFallback ? '（現金運賃で補完）' : ''}
      </dd>
      <dt>GTFS</dt>
      <dd>{candidate.sourceName}</dd>
      <dt>路線・方向</dt>
      <dd>
        {routeName}（ID: {candidate.routeId} / dir: {candidate.direction ?? '設定なし'}）
      </dd>
      <dt>乗車</dt>
      <dd>
        {candidate.boardName}（ID: {candidate.boardStopId} / zone: {candidate.boardZone ?? '未設定'}）
      </dd>
      <dt>降車</dt>
      <dd>
        {candidate.alightName}（ID: {candidate.alightStopId} / zone: {candidate.alightZone ?? '未設定'}）
      </dd>
      <dt>Fare ID</dt>
      <dd>{candidate.fareId}</dd>
      <dt>IC価格</dt>
      <dd>
        {formatFareNumber(candidate.icPrice)} {candidate.currency}
        {candidate.icFallback ? '（未設定のため現金運賃で補完）' : ''}
      </dd>
    </Box>
  )
}

function candidateKey(candidate: FareTriangleCandidate, index: number): string {
  return [
    candidate.sourceId,
    candidate.routeId,
    candidate.direction ?? 'null',
    candidate.fareId,
    candidate.boardStopId,
    candidate.alightStopId,
    index,
  ].join('::')
}

function formatFareNumber(value: number): string {
  return fareNumberFormatter.format(value)
}

function stopDisplayName(name: string | undefined): string {
  return name || '名称未設定'
}
