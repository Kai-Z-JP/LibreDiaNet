package jp.kaiz.shachia.dianet

import kotlinx.serialization.Serializable

@Serializable
data class DiaNetXlsxCreateRequest(
    val dateSource: GTFSDateSource,
    val preset: RoutePreset,
    @Serializable(with = DayMappingListSerializer::class)
    val dayMapping: List<DayMapping>
)

interface GTFSDateSource

@Serializable
data class GTFSDataSourceRepo(
    val orgId: String,
    val feedId: String,
    val fileUid: String? = null,
) : GTFSDateSource {
    val url = if (fileUid != null) {
        "https://api.gtfs-data.jp/v2/organizations/${orgId}/feeds/${feedId}/files/feed.zip?uid=${fileUid}"
    } else {
        "https://api.gtfs-data.jp/v2/organizations/${orgId}/feeds/${feedId}/files/feed.zip?rid=current"
    }
}

@Serializable
data class GTFSRawSource(
    val zipByteArray: ByteArray?
) : GTFSDateSource {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other == null || this::class != other::class) return false

        other as GTFSRawSource

        if (!zipByteArray.contentEquals(other.zipByteArray)) return false

        return true
    }

    override fun hashCode(): Int {
        return zipByteArray?.contentHashCode() ?: 0
    }
}
