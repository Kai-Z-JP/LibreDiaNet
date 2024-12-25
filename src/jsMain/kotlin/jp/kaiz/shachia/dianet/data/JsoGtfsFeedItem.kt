package jp.kaiz.shachia.dianet.data

import jp.kaiz.shachia.dianet.gtfs.feed.GTFSFeedItem
import js.objects.jso

external interface JsoGtfsFeedItem {
    var label: String
    var orgId: String
    var feedId: String
}

fun jsoGtfsFeedItem(feedItem: GTFSFeedItem): JsoGtfsFeedItem = jso {
    label = "${feedItem.feedName}<${feedItem.organizationName}>"
    orgId = feedItem.organizationId
    feedId = feedItem.feedId
}