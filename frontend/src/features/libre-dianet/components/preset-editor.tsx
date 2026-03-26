import { Alert, Box, Button, LinearProgress, Tab, Tabs, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { buildCreateFromDataRequest, requestDiaNetXlsx } from '../../../api'
import type { PoleDetail, PresetContext, RouteDetail, RoutePresetV2 } from '../../../types'
import { sameStringMatrix } from '../../../utils'
import { useGtfsDerivedData } from '../hooks/use-gtfs-derived-data'
import { libreDiaNetRepository } from '../lib/repository'
import { ConstructRoutePanel } from './construct-route-panel'
import { DeleteButton, EditableTitle, UpdateRawDataSection } from './shared'
import { PreviewPanel } from './preview-panel'
import { RouteSelectionPanel } from './route-selection-panel'
import { SettingPanel } from './setting-panel'

const tabLabels = ['路線選択', '停留所並順', 'プレビュー', '設定']

type Props = {
  preset: RoutePresetV2
  context: PresetContext
  onUpdate: (preset: RoutePresetV2) => void
  onDelete: () => void
  onUpdateRawData: (file: File) => void
}

export function PresetEditor({ preset, context, onUpdate, onDelete, onUpdateRawData }: Props) {
  const [tab, setTab] = useState(0)
  const [name, setName] = useState(preset.name)
  const [routes, setRoutes] = useState<RouteDetail[]>(preset.routes)
  const [sortedStops, setSortedStops] = useState<PoleDetail[]>(preset.poles)
  const [presetIndex, setPresetIndex] = useState(preset.index)
  const [excludedStopPatterns, setExcludedStopPatterns] = useState<string[][]>(preset.excludedStopPatterns)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    setName(preset.name)
    setRoutes(preset.routes)
    setSortedStops(preset.poles)
    setPresetIndex(preset.index)
    setExcludedStopPatterns(preset.excludedStopPatterns)
    setTab(0)
  }, [preset])

  const changed =
    name !== preset.name ||
    JSON.stringify(routes) !== JSON.stringify(preset.routes) ||
    JSON.stringify(sortedStops) !== JSON.stringify(preset.poles) ||
    presetIndex !== preset.index ||
    !sameStringMatrix(excludedStopPatterns, preset.excludedStopPatterns)

  const [routeOptions, constructedRoutes, stopMap] = useGtfsDerivedData(context.handle, routes)

  const currentPreset = useMemo<RoutePresetV2>(
    () => ({
      ...preset,
      name,
      routes,
      poles: sortedStops,
      index: presetIndex,
      excludedStopPatterns,
    }),
    [preset, name, routes, sortedStops, presetIndex, excludedStopPatterns],
  )

  const canExport = Boolean(context.handle)
  const exportTooltip = changed
    ? '先に変更結果を保存してください'
    : canExport
      ? ''
      : 'raw GTFS の xlsx 出力には、このセッションでの ZIP 再アップロードが必要です'

  const requestXlsx = async (dayMapping: [string, string][]) => {
    if (!context.handle) {
      return
    }
    setDownloading(true)
    try {
      const gtfs = await libreDiaNetRepository.buildExportData(context.handle, preset)
      const request = await buildCreateFromDataRequest(preset, gtfs, dayMapping)
      await requestDiaNetXlsx(request)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          '@media (max-width: 1024px)': {
            flexDirection: 'column',
            alignItems: 'stretch',
          },
        }}
      >
        <EditableTitle value={name} onChange={setName} />
        <Button sx={{ my: 'auto' }} variant="contained" disabled={!changed} onClick={() => onUpdate(currentPreset)}>
          保存
        </Button>
        <DeleteButton onDelete={onDelete} />
      </Box>
      <Box>{`データ: ${preset.info.name ?? ''}`}</Box>
      {preset.info.kind === 'raw' && preset.info.cacheState === 'missing' && <UpdateRawDataSection onSubmit={onUpdateRawData} />}
      {context.loading && (
        <Box>
          <LinearProgress />
          <Typography variant="body2">GTFSデータをロードしています...</Typography>
        </Box>
      )}
      {context.error && <Alert severity="warning">{context.error}</Alert>}
      {context.handle && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              mb: '16px',
              flexShrink: 0,
            }}
          >
            <Tabs value={tab} onChange={(_, next) => setTab(next)}>
              {tabLabels.map((label) => (
                <Tab key={label} label={label} />
              ))}
            </Tabs>
          </Box>
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: tab === 1 ? 'hidden' : 'auto',
            }}
          >
            {tab === 0 && <RouteSelectionPanel routeOptions={routeOptions} value={routes} onChange={setRoutes} />}
            {tab === 1 && (
              <ConstructRoutePanel
                sortedStops={sortedStops}
                stopMap={stopMap}
                constructedRoutes={constructedRoutes}
                excludedStopPatterns={excludedStopPatterns}
                onChange={setSortedStops}
                onChangeExcludedPatterns={setExcludedStopPatterns}
              />
            )}
            {tab === 2 && (
              <PreviewPanel
                preset={preset}
                changed={changed}
                downloading={downloading}
                canExport={canExport}
                exportTooltip={exportTooltip}
                sortedStops={sortedStops}
                constructedRoutes={constructedRoutes}
                excludedStopPatterns={excludedStopPatterns}
                handle={context.handle}
                onRequestXlsx={requestXlsx}
              />
            )}
            {tab === 3 && <SettingPanel indexValue={presetIndex} onChange={setPresetIndex} />}
          </Box>
        </Box>
      )}
    </Box>
  )
}
