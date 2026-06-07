import { useEffect, useMemo, useState } from 'react'
import { fetchGtfsFeeds, gtfsFileSourceLabel } from '../../../api'
import type { FeedOption, GtfsFeedItem } from '../../../types'

export function useGtfsFeeds() {
  const [items, setItems] = useState<GtfsFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchGtfsFeeds()
      .then(setItems)
      .catch((error: unknown) => setError(error instanceof Error ? error.message : 'GTFSデータ一覧の取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [])

  const options = useMemo<FeedOption[]>(
    () =>
      items.map((item) => ({
        label: `${item.feed_name}<${item.organization_name}>`,
        orgId: item.organization_id,
        feedId: item.feed_id,
        defaultFileUid: item.file_uid ?? null,
        defaultFileLabel: item.file_uid ? gtfsFileSourceLabel(item.file_from_date, item.file_to_date, null) : null,
      })),
    [items],
  )

  return { items, options, loading, error }
}
