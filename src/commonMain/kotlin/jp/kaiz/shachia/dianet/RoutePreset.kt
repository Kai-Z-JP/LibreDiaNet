package jp.kaiz.shachia.dianet

import kotlinx.serialization.Serializable
import kotlinx.serialization.Transient
import kotlinx.uuid.UUID

@Serializable
data class RoutePreset(
    val name: String = "Default Name",
    val info: GTFSInformation,
    val routes: List<RouteDetail> = emptyList(),
    val poles: List<PoleDetail> = emptyList(),
    val excludedStopPatterns: Set<List<String>> = emptySet(),
    val id: UUID = UUID(),
    val index: Int = 99999999
) {
    override fun equals(other: Any?) = other is RoutePreset && id == other.id
    override fun hashCode() = id.hashCode()
}

interface GTFSInformation {
    val name: String?
    val id: String
}

@Serializable
data class DataRepoGtfsInformation(
    val orgId: String,
    val feedId: String,
    override var name: String? = null,
) : GTFSInformation {
    override val id = "${feedId}_$orgId"
}

@Serializable
data class RawGtfsInformation(
    @Transient
    val zipByteArray: ByteArray = byteArrayOf(),
    override var name: String? = null,
    val uuid: UUID = UUID(),
) : GTFSInformation {
    override val id = uuid.toString()

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other == null || this::class != other::class) return false

        other as RawGtfsInformation

        if (!zipByteArray.contentEquals(other.zipByteArray)) return false
        if (name != other.name) return false
        if (uuid != other.uuid) return false

        return true
    }

    override fun hashCode(): Int {
        var result = zipByteArray.contentHashCode()
        result = 31 * result + (name?.hashCode() ?: 0)
        result = 31 * result + uuid.hashCode()
        return result
    }
}

@Serializable
data class RouteDetail(
    val id: String,
    val direction: Int?,
) {
    val sCode = "${id}_${direction ?: "null"}"
}

@Serializable
data class PoleDetail(
    val id: String,
    val override: Override = Override()
) {
    override fun equals(other: Any?) = other is PoleDetail && id == other.id && override == other.override

    override fun hashCode() = id.hashCode() + override.hashCode()
}

@Serializable
data class Override(
    val majorStop: Boolean = false,
    val branchStart: Boolean = false,
    val branchEnd: Boolean = false,
    val nameOverride: String? = null,
    val locationNameOverride: String? = null
) {
    companion object {
        val NONE = Override()
    }
}