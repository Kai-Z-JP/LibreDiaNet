import { createGtfsLoader, type GtfsLoader } from '@gtfs-jp/loader'
import type {
  ConstructedRoute,
  ConstructedTrip,
  DiaNetGtfsExportData,
  GtfsHandle,
  GtfsRouteSummary,
  GtfsStop,
  GtfsStopTime,
  OpenHandleResult,
  RawInfoV2,
  RepoInfoV2,
  RouteDetail,
  RouteOption,
  RoutePresetV2,
  StopMap,
} from './types'
import { displayRouteName, toNullableNumber, toNumber } from './utils'

const IMPORT_OPTIONS = {
  opfsImportMode: 'memory-stage' as const,
}

type Db = ReturnType<GtfsLoader['db']>

class RawCacheMissingError extends Error {
  constructor() {
    super('Raw GTFS cache is missing')
  }
}

export class GtfsRepository {
  private readonly handles = new Map<string, GtfsHandle>()

  async openRepoFeed(info: RepoInfoV2): Promise<OpenHandleResult> {
    const filename = `repo-${info.orgId}-${info.feedId}.sqlite3`
    const existing = this.handles.get(filename)
    if (existing) {
      return { handle: existing, imported: false }
    }
    const loader = createGtfsLoader({ storage: 'opfs', filename })
    await loader.open()
    const validation = await loader.validate()
    if (!validation.valid) {
      await loader.reset()
      const response = await fetch(`https://api.gtfs-data.jp/v2/organizations/${info.orgId}/feeds/${info.feedId}/files/feed.zip`)
      if (!response.ok) {
        throw new Error(`Failed to fetch GTFS ZIP: ${response.status}`)
      }
      await loader.importZip(await response.blob(), IMPORT_OPTIONS)
      const postValidation = await loader.validate()
      if (!postValidation.valid) {
        throw new Error(`GTFS validation failed: ${postValidation.missingRequired.join(', ')}`)
      }
      const handle = { filename, loader }
      this.handles.set(filename, handle)
      return { handle, imported: true }
    }
    const handle = { filename, loader }
    this.handles.set(filename, handle)
    return { handle, imported: false }
  }

  async openRawFeed(info: RawInfoV2, file?: File): Promise<OpenHandleResult> {
    const filename = `raw-${info.uuid}.sqlite3`
    const existing = this.handles.get(filename)
    if (existing && !file) {
      return { handle: existing, imported: false }
    }
    const loader = existing?.loader ?? createGtfsLoader({ storage: 'opfs', filename })
    if (!existing) {
      await loader.open()
    }
    if (file) {
      await loader.reset()
      await loader.importZip(file, IMPORT_OPTIONS)
      const validation = await loader.validate()
      if (!validation.valid) {
        throw new Error(`GTFS validation failed: ${validation.missingRequired.join(', ')}`)
      }
      const handle = { filename, loader }
      this.handles.set(filename, handle)
      return { handle, imported: true }
    }
    const validation = await loader.validate()
    if (!validation.valid) {
      if (!existing) {
        await loader.close()
      }
      throw new RawCacheMissingError()
    }
    const handle = { filename, loader }
    this.handles.set(filename, handle)
    return { handle, imported: false }
  }

  async deleteFeedCache(info: RepoInfoV2 | RawInfoV2): Promise<void> {
    const filename = info.kind === 'repo' ? `repo-${info.orgId}-${info.feedId}.sqlite3` : `raw-${info.uuid}.sqlite3`
    const existing = this.handles.get(filename)
    if (existing) {
      await existing.loader.close({ unlink: true })
      this.handles.delete(filename)
      return
    }
    const loader = createGtfsLoader({ storage: 'opfs', filename })
    await loader.open()
    await loader.close({ unlink: true })
  }

  async closeAll(): Promise<void> {
    const closers = Array.from(this.handles.values()).map((handle) => handle.loader.close())
    this.handles.clear()
    await Promise.all(closers)
  }

  async listRoutesWithDirections(handle: GtfsHandle): Promise<RouteOption[]> {
    const rows = await handle.loader
      .db()
      .selectFrom('routes as r')
      .innerJoin('trips as t', 't.route_id', 'r.route_id')
      .select([
        'r.route_id as route_id',
        'r.route_short_name as route_short_name',
        'r.route_long_name as route_long_name',
        't.direction_id as direction_id',
      ])
      .groupBy(['r.route_id', 'r.route_short_name', 'r.route_long_name', 't.direction_id'])
      .orderBy('r.route_id')
      .orderBy('t.direction_id')
      .execute()

    return rows.map((row) => {
      const direction = toNullableNumber(row.direction_id)
      const name = displayRouteName(asOptionalString(row.route_short_name), asOptionalString(row.route_long_name))
      return {
        railwayCode: `${row.route_id}_${direction ?? 'null'}`,
        id: String(row.route_id),
        direction,
        name,
        label: `${row.route_id}_${direction ?? 'null'} ${name}`,
      }
    })
  }

  async buildConstructedRoutes(handle: GtfsHandle, selectedRoutes: RouteDetail[]): Promise<ConstructedRoute[]> {
    const db = handle.loader.db()
    return Promise.all(
      selectedRoutes.map(async (selectedRoute) => {
        const trips = await this.loadTrips(db, selectedRoute, undefined)
        const route = await this.loadRouteSummary(db, selectedRoute.id)
        const stopPatterns = await this.loadStopPatterns(
          db,
          trips.map((trip) => String(trip.trip_id)),
        )
        return {
          route,
          direction: selectedRoute.direction,
          stopPatterns,
        }
      }),
    )
  }

  async listTripsForDate(
    handle: GtfsHandle,
    selectedRoutes: RouteDetail[],
    dateIso: string,
    excludedStopPatterns: string[][],
  ): Promise<ConstructedTrip[]> {
    const db = handle.loader.db()
    const activeServices = new Set(await this.loadActiveServiceIds(db, dateIso))
    const excludedKeys = new Set(excludedStopPatterns.map((pattern) => JSON.stringify(pattern)))
    const results: ConstructedTrip[] = []

    for (const selectedRoute of selectedRoutes) {
      const route = await this.loadRouteSummary(db, selectedRoute.id)
      const trips = await this.loadTrips(db, selectedRoute, activeServices)
      const tripIds = trips.map((trip) => String(trip.trip_id))
      if (tripIds.length === 0) {
        continue
      }
      const stopTimeRows = await db
        .selectFrom('stop_times')
        .select(['trip_id', 'stop_id', 'stop_sequence', 'departure_time'])
        .where('trip_id', 'in', tripIds)
        .orderBy('trip_id')
        .orderBy('stop_sequence')
        .execute()

      const grouped = new Map<string, GtfsStopTime[]>()
      for (const row of stopTimeRows) {
        const tripId = String(row.trip_id)
        const item: GtfsStopTime = {
          tripId,
          stopId: String(row.stop_id),
          stopSequence: toNumber(row.stop_sequence),
          departureTime: asOptionalString(row.departure_time),
        }
        const current = grouped.get(tripId)
        if (current) {
          current.push(item)
        } else {
          grouped.set(tripId, [item])
        }
      }

      for (const stopTimes of grouped.values()) {
        const stopPattern = stopTimes.map((stopTime) => stopTime.stopId)
        if (excludedKeys.has(JSON.stringify(stopPattern))) {
          continue
        }
        results.push({
          routeName: displayRouteName(route.shortName, route.longName),
          stopTime: stopTimes,
        })
      }
    }

    return results.sort((left, right) => (left.stopTime[0]?.departureTime ?? '').localeCompare(right.stopTime[0]?.departureTime ?? ''))
  }

  async getStopsByIds(handle: GtfsHandle, stopIds: string[]): Promise<StopMap> {
    return this.loadStops(handle.loader.db(), stopIds)
  }

  async buildExportData(handle: GtfsHandle, preset: RoutePresetV2): Promise<DiaNetGtfsExportData> {
    const db = handle.loader.db()
    const agencyRow = await db.selectFrom('agency').select(['agency_name']).limit(1).executeTakeFirst()
    if (!agencyRow) {
      throw new Error('Agency not found')
    }

    const routeIds = Array.from(new Set(preset.routes.map((route) => route.id)))
    const routeRows =
      routeIds.length === 0
        ? []
        : await db
            .selectFrom('routes')
            .select(['route_id', 'route_short_name', 'route_long_name'])
            .where('route_id', 'in', routeIds)
            .execute()

    const tripRows = dedupeByKey((await Promise.all(preset.routes.map((route) => this.loadTrips(db, route, undefined)))).flat(), (row) =>
      String(row.trip_id),
    )

    const tripIds = tripRows.map((row) => String(row.trip_id))
    const stopTimeRows =
      tripIds.length === 0
        ? []
        : await db
            .selectFrom('stop_times')
            .select(['trip_id', 'stop_id', 'stop_sequence', 'departure_time'])
            .where('trip_id', 'in', tripIds)
            .orderBy('trip_id')
            .orderBy('stop_sequence')
            .execute()

    const stopIds = Array.from(new Set([...preset.poles.map((pole) => pole.id), ...stopTimeRows.map((row) => String(row.stop_id))]))
    const stopMap = await this.loadStops(db, stopIds)

    const serviceIds = Array.from(new Set(tripRows.map((row) => String(row.service_id))))
    const calendarRows =
      serviceIds.length === 0
        ? []
        : await db
            .selectFrom('calendar')
            .select(['service_id', 'start_date', 'end_date', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])
            .where('service_id', 'in', serviceIds)
            .execute()

    return {
      agencyName: asOptionalString(agencyRow.agency_name) ?? '',
      stops: Object.values(stopMap).map((stop) => ({
        id: stop.stopId,
        name: stop.name,
        platformCode: stop.platformCode,
      })),
      routes: routeRows.map((row) => ({
        id: String(row.route_id),
        shortName: asOptionalString(row.route_short_name),
        longName: asOptionalString(row.route_long_name),
      })),
      trips: tripRows.map((row) => ({
        tripId: String(row.trip_id),
        routeId: String(row.route_id),
        directionId: toNullableNumber(row.direction_id),
        serviceId: String(row.service_id),
      })),
      stopTimes: stopTimeRows.map((row) => ({
        tripId: String(row.trip_id),
        stopId: String(row.stop_id),
        stopSequence: toNumber(row.stop_sequence),
        departureTime: asOptionalString(row.departure_time),
      })),
      calendars: calendarRows.map((row) => ({
        id: String(row.service_id),
        startDate: String(row.start_date),
        endDate: String(row.end_date),
        sunday: toNumber(row.sunday),
        monday: toNumber(row.monday),
        tuesday: toNumber(row.tuesday),
        wednesday: toNumber(row.wednesday),
        thursday: toNumber(row.thursday),
        friday: toNumber(row.friday),
        saturday: toNumber(row.saturday),
      })),
    }
  }

  isRawCacheMissing(error: unknown): boolean {
    return error instanceof RawCacheMissingError
  }

  private async loadTrips(db: Db, route: RouteDetail, activeServices?: Set<string>) {
    const rows = await db
      .selectFrom('trips')
      .select(['trip_id', 'route_id', 'direction_id', 'service_id'])
      .$if(route.direction === null, (qb) => qb.where('direction_id', 'is', null))
      .$if(route.direction !== null, (qb) => qb.where('direction_id', '=', route.direction!))
      .where('route_id', '=', route.id)
      .execute()
    if (!activeServices) {
      return rows
    }
    return rows.filter((row) => activeServices.has(String(row.service_id)))
  }

  private async loadRouteSummary(db: Db, routeId: string): Promise<GtfsRouteSummary> {
    const row = await db
      .selectFrom('routes')
      .select(['route_id', 'route_short_name', 'route_long_name'])
      .where('route_id', '=', routeId)
      .limit(1)
      .executeTakeFirst()

    if (!row) {
      throw new Error(`Route not found: ${routeId}`)
    }

    return {
      routeId: String(row.route_id),
      shortName: asOptionalString(row.route_short_name),
      longName: asOptionalString(row.route_long_name),
    }
  }

  private async loadStopPatterns(db: Db, tripIds: string[]): Promise<GtfsStop[][]> {
    if (tripIds.length === 0) {
      return []
    }
    const stopTimeRows = await db
      .selectFrom('stop_times')
      .select(['trip_id', 'stop_id', 'stop_sequence'])
      .where('trip_id', 'in', tripIds)
      .orderBy('trip_id')
      .orderBy('stop_sequence')
      .execute()

    const stopIds = Array.from(new Set(stopTimeRows.map((row) => String(row.stop_id))))
    const stopMap = await this.loadStops(db, stopIds)
    const grouped = new Map<string, GtfsStop[]>()
    for (const row of stopTimeRows) {
      const tripId = String(row.trip_id)
      const stop = stopMap[String(row.stop_id)]
      if (!stop) {
        continue
      }
      const current = grouped.get(tripId)
      if (current) {
        current.push(stop)
      } else {
        grouped.set(tripId, [stop])
      }
    }

    const seen = new Set<string>()
    const patterns: GtfsStop[][] = []
    for (const pattern of grouped.values()) {
      const key = JSON.stringify(pattern.map((stop) => stop.stopId))
      if (!seen.has(key)) {
        seen.add(key)
        patterns.push(pattern)
      }
    }
    return patterns
  }

  private async loadStops(db: Db, stopIds: string[]): Promise<StopMap> {
    if (stopIds.length === 0) {
      return {}
    }
    const rows = await db.selectFrom('stops').select(['stop_id', 'stop_name', 'platform_code']).where('stop_id', 'in', stopIds).execute()

    return Object.fromEntries(
      rows.map((row) => [
        String(row.stop_id),
        {
          stopId: String(row.stop_id),
          name: asOptionalString(row.stop_name) ?? '',
          platformCode: asOptionalString(row.platform_code),
        },
      ]),
    )
  }

  private async loadActiveServiceIds(db: Db, dateIso: string): Promise<string[]> {
    const date = new Date(`${dateIso}T00:00:00`)
    const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()] as
      | 'sunday'
      | 'monday'
      | 'tuesday'
      | 'wednesday'
      | 'thursday'
      | 'friday'
      | 'saturday'

    const rows = await db
      .selectFrom('calendar')
      .select(['service_id', 'start_date', 'end_date', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])
      .execute()

    return rows
      .filter((row) => {
        const start = normalizeGtfsDate(asOptionalString(row.start_date))
        const end = normalizeGtfsDate(asOptionalString(row.end_date))
        if (start && start > dateIso) {
          return false
        }
        if (end && end < dateIso) {
          return false
        }
        return toNumber(row[weekday]) === 1
      })
      .map((row) => String(row.service_id))
  }
}

function asOptionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : value == null ? null : String(value)
}

function normalizeGtfsDate(value: string | null): string | null {
  if (!value || value.length !== 8) {
    return null
  }
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
}

function dedupeByKey<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = getKey(item)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}
