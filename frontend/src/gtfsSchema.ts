import { defineGtfsSchema, type GtfsLoader } from '@gtfs-jp/loader'

export const GTFS_SCHEMA = defineGtfsSchema({
  sources: 'gtfs-jp-v4',
})

export type AppGtfsSchema = typeof GTFS_SCHEMA
export type AppGtfsLoader = GtfsLoader<AppGtfsSchema>
