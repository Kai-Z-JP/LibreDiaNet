import { Box, TextField, Tooltip } from '@mui/material'
import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { ConstructedRoute, GtfsHandle, GtfsStop, PoleDetail, RoutePresetV2 } from '../../../types'
import { convertToEnclosedNumber, displayRouteName, todayIsoDate } from '../../../utils'
import { libreDiaNetRepository } from '../lib/repository'
import { OutputDialog } from './output-dialog'

type Props = {
  preset: RoutePresetV2
  changed: boolean
  downloading: boolean
  canExport: boolean
  exportTooltip: string
  sortedStops: PoleDetail[]
  constructedRoutes: ConstructedRoute[]
  excludedStopPatterns: string[][]
  handle: GtfsHandle
  onRequestXlsx: (dayMapping: [string, string][]) => Promise<void>
}

type PoleRowState = {
  name: string | null
  joko: string
}

const tableStyle: CSSProperties = {
  backgroundColor: 'white',
  borderCollapse: 'collapse',
  border: '3px solid black',
  width: 'max-content',
}

const headStyle: CSSProperties = {
  border: '3px solid black',
  fontFamily: '"ヒラギノ明朝体3等幅", serif',
}

const stubCellStyle: CSSProperties = {
  textAlign: 'center',
  border: '1px solid black',
  borderInline: '3px solid black',
}

const routeHeadCellStyle: CSSProperties = {
  width: '3rem',
  textAlign: 'center',
  border: '1px solid black',
}

const destinationHeadCellStyle: CSSProperties = {
  border: '1px solid black',
}

const verticalCellBaseStyle: CSSProperties = {
  minHeight: '7rem',
  width: '1.5em',
  margin: '0 auto',
  writingMode: 'vertical-rl',
}

const bodyRowBaseStyle: CSSProperties = {
  fontWeight: 300,
  fontFamily: '"ヒラギノ明朝 ProN", serif',
}

function bodyRowStyle(detail: PoleDetail): CSSProperties {
  return {
    ...bodyRowBaseStyle,
    ...(detail.override.majorStop ? { backgroundColor: 'lightgray' } : {}),
    ...(detail.override.branchStart ? { borderTopStyle: 'double' } : {}),
    ...(detail.override.branchEnd ? { borderBottomStyle: 'double' } : {}),
  }
}

function topBorderStyle(show: boolean): CSSProperties {
  return show ? { borderTop: '1px solid black' } : {}
}

function bodyCellStyle(detail: PoleDetail, extra: CSSProperties = {}, withTopBorder = false): CSSProperties {
  return {
    ...(detail.override.majorStop ? { backgroundColor: 'lightgray' } : {}),
    ...(detail.override.branchStart ? { borderTop: '3px double black' } : {}),
    ...(detail.override.branchEnd ? { borderBottom: '3px double black' } : {}),
    ...topBorderStyle(withTopBorder),
    ...extra,
  }
}

export function PreviewPanel({
  preset,
  changed,
  downloading,
  canExport,
  exportTooltip,
  sortedStops,
  constructedRoutes,
  excludedStopPatterns,
  handle,
  onRequestXlsx,
}: Props) {
  const [date, setDate] = useState(todayIsoDate())
  const [constructedTrips, setConstructedTrips] = useState<Awaited<ReturnType<typeof libreDiaNetRepository.listTripsForDate>>>([])
  const [resolvedStops, setResolvedStops] = useState<{ detail: PoleDetail; stop: GtfsStop }[]>([])

  useEffect(() => {
    let cancelled = false
    void libreDiaNetRepository.listTripsForDate(handle, preset.routes, date, excludedStopPatterns).then((trips) => {
      if (!cancelled) {
        setConstructedTrips(trips)
      }
    })
    return () => {
      cancelled = true
    }
  }, [handle, preset.routes, date, excludedStopPatterns])

  const stops = useMemo(() => {
    const stopIdSet = Array.from(new Set(sortedStops.map((stop) => stop.id)))
    return libreDiaNetRepository
      .getStopsByIds(handle, stopIdSet)
      .then((stopMap) => sortedStops.map((stop) => ({ detail: stop, stop: stopMap[stop.id] })))
  }, [handle, sortedStops])

  useEffect(() => {
    let cancelled = false
    void stops.then((items) => {
      if (!cancelled) {
        setResolvedStops(items.filter((item): item is { detail: PoleDetail; stop: GtfsStop } => Boolean(item.stop)))
      }
    })
    return () => {
      cancelled = true
    }
  }, [stops])

  const poleRows = useMemo<PoleRowState[]>(
    () =>
      resolvedStops.map((entry, index) => ({
        name: entry.stop.name,
        joko: index === 0 ? '発' : index === resolvedStops.length - 1 ? '着' : '発',
      })),
    [resolvedStops],
  )

  const renderedPoleRows = useMemo(() => {
    const rows = poleRows.map((row) => ({ ...row }))
    return rows.map((row, index) => {
      const name = row.name
      const sameFollowing: typeof rows = []
      if (name !== null) {
        for (const candidate of rows.slice(index + 1)) {
          if (candidate.name !== name) {
            break
          }
          sameFollowing.push(candidate)
        }
      }
      if (name !== null) {
        for (const candidate of sameFollowing) {
          candidate.name = null
        }
      }

      const prev = rows[index - 1]
      const joko = prev === undefined ? '発' : prev.joko === row.joko ? '〃' : row.joko

      return {
        name,
        rowSpan: name === null ? undefined : sameFollowing.length + 1,
        joko,
      }
    })
  }, [poleRows])

  const stopPatternPoleIndexMapping = useMemo(
    () =>
      new Map(
        constructedRoutes.flatMap((route) =>
          route.stopPatterns.map((stopPattern) => [
            stopPattern,
            resolvedStops.map((entry, index) => {
              const poleIndexes = stopPattern.flatMap((stop, stopIndex) => (stop.stopId === entry.detail.id ? [stopIndex] : []))
              if (poleIndexes.length === 0) {
                return null
              }
              if (poleIndexes.length === 1 || index === 0) {
                return poleIndexes[0]
              }
              const duplicateCount = resolvedStops.filter((item) => item.detail.id === entry.detail.id).length
              if (duplicateCount === poleIndexes.length) {
                const duplicateIndex = resolvedStops.slice(0, index).filter((item) => item.detail.id === entry.detail.id).length
                return poleIndexes[duplicateIndex]
              }
              return -1
            }),
          ]),
        ),
      ),
    [constructedRoutes, resolvedStops],
  )

  return (
    <Box mt={2}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 0.5,
        }}
      >
        <TextField size="small" label="日付指定" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <Tooltip title={exportTooltip}>
          <span>
            <OutputDialog disabled={changed || downloading || !canExport} onSubmit={onRequestXlsx} />
          </span>
        </Tooltip>
      </Box>
      <Box className="preview-table-wrap">
        <table style={tableStyle}>
          <thead style={headStyle}>
            <tr>
              <td colSpan={3} style={stubCellStyle}>
                {'系\u3000\u3000統'}
              </td>
              {constructedRoutes.flatMap((route) =>
                route.stopPatterns.map((_, index) => (
                  <td key={`${route.route.routeId}-${index}`} style={routeHeadCellStyle}>
                    {displayRouteName(route.route.shortName, route.route.longName)}
                  </td>
                )),
              )}
              {constructedTrips.map((trip, index) => (
                <td key={`trip-${index}`} style={routeHeadCellStyle}>
                  {trip.routeName}
                </td>
              ))}
            </tr>
            <tr>
              <td colSpan={3} style={stubCellStyle}>
                {'担\u3000\u3000当'}
              </td>
            </tr>
            <tr>
              <td colSpan={3} style={stubCellStyle}>
                {'行\u3000\u3000先'}
              </td>
              {constructedRoutes.flatMap((route) =>
                route.stopPatterns.map((pattern, index) => (
                  <td key={`head-${route.route.routeId}-${index}`} style={destinationHeadCellStyle}>
                    <Box
                      style={{
                        ...verticalCellBaseStyle,
                        textAlign: pattern.at(-1)?.name?.length === 1 ? 'center' : 'justify',
                        textAlignLast: pattern.at(-1)?.name?.length === 1 ? 'center' : 'justify',
                      }}
                    >
                      {pattern.at(-1)?.name}
                    </Box>
                  </td>
                )),
              )}
              {constructedTrips.map((_, index) => (
                <td key={`blank-${index}`} style={destinationHeadCellStyle}>
                  <Box style={verticalCellBaseStyle} />
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {resolvedStops.map(({ detail, stop }, index) => {
              const row = renderedPoleRows[index]
              const name = row.name
              return (
                <tr key={`${stop.stopId}-${index}`} style={bodyRowStyle(detail)}>
                  {name !== null && (
                    <td
                      rowSpan={row.rowSpan}
                      style={bodyCellStyle(detail, {
                        borderLeft: '3px solid black',
                      })}
                    >
                      <Box
                        style={{
                          margin: '0 auto',
                          textAlign: name.length === 1 ? 'center' : 'justify',
                          textAlignLast: name.length === 1 ? 'center' : 'justify',
                          ...(detail.override.majorStop ||
                          index === 0 ||
                          resolvedStops.slice(index + 1).every((item) => item.stop.name === name)
                            ? { fontWeight: 600, fontFamily: '"ヒラギノ角ゴ ProN", sans-serif' }
                            : {}),
                        }}
                      >
                        {detail.override.nameOverride ?? name}
                      </Box>
                    </td>
                  )}
                  <td style={bodyCellStyle(detail, {}, name === null)}>{convertToEnclosedNumber(stop.platformCode)}</td>
                  <td
                    style={bodyCellStyle(
                      detail,
                      {
                        borderRight: '3px solid black',
                      },
                      name === null,
                    )}
                  >
                    {row.joko}
                  </td>
                  {constructedRoutes.flatMap((route) =>
                    route.stopPatterns.map((pattern, patternIndex) => {
                      const poleIndex = stopPatternPoleIndexMapping.get(pattern)?.[index]
                      return (
                        <td
                          key={`${route.route.routeId}-${patternIndex}-${index}`}
                          style={bodyCellStyle(detail, { borderInline: '1px solid black' }, name === null)}
                        >
                          {poleIndex === null ? '' : poleIndex === -1 ? '？' : String(poleIndex)}
                        </td>
                      )
                    }),
                  )}
                  {constructedTrips.map((trip, tripIndex) => {
                    const mapping = Array.from(stopPatternPoleIndexMapping.entries()).find(
                      ([pattern]) =>
                        JSON.stringify(pattern.map((item) => item.stopId)) === JSON.stringify(trip.stopTime.map((item) => item.stopId)),
                    )?.[1]
                    const poleIndex = mapping?.[index]
                    const stopTime = poleIndex === undefined || poleIndex === null || poleIndex === -1 ? null : trip.stopTime[poleIndex]
                    return (
                      <td
                        key={`trip-time-${tripIndex}-${index}`}
                        style={bodyCellStyle(detail, { borderInline: '1px solid black' }, name === null)}
                      >
                        {stopTime?.departureTime ? stopTime.departureTime.split(':').slice(0, 2).join('') : ''}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </Box>
    </Box>
  )
}
