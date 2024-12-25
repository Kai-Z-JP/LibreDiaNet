package jp.kaiz.shachia.dianet

import kotlinx.datetime.LocalDate
import kotlinx.serialization.Serializable

@Serializable
data class DiaNetXlsxCreateRequest(
    val dateSource: GTFSDateSource,
    val preset: RoutePreset,
    val dayMapping: List<Pair<String, LocalDate>>
)

interface GTFSDateSource

@Serializable
data class GTFSDataSourceRepo(
    val orgId: String,
    val feedId: String,
) : GTFSDateSource {
    val url = "https://api.gtfs-data.jp/v2/organizations/${orgId}/feeds/${feedId}/files/feed.zip"
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

