package jp.kaiz.shachia.dianet.webworkers

//https://github.com/avwie/scribbles/blob/ff779032f8afda5c862f12151612a6afaea02b9d/kotlin/web-workers/src/commonMain/kotlin/nl/avwie/webworkers/Messages.kt

import jp.kaiz.shachia.gtfs.GTFS
import kotlinx.serialization.Serializable

@Serializable
sealed interface Message

@Serializable
sealed interface Request<R : RequestResult> : Message

@Serializable
sealed interface RequestResult : Message

@Serializable
data class Response(val workerId: String, val result: RequestResult? = null, val error: String? = null) : Message

@Serializable
data class Sleep(val ms: Long) : Request<SleepResult>

@Serializable
data class SleepResult(val ms: Long) : RequestResult

@Serializable
data class PIApproximation(val iterations: Int) : Request<PIApproximationResult>

@Serializable
data class PIApproximationResult(val pi: Double) : RequestResult

@Serializable
data class GtfsUnZip(val byteArray: ByteArray) : Request<GtfsUnZipResult> {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other == null || this::class != other::class) return false

        other as GtfsUnZip

        if (!byteArray.contentEquals(other.byteArray)) return false

        return true
    }

    override fun hashCode(): Int {
        return byteArray.contentHashCode()
    }
}

@Serializable
data class GtfsUnZipResult(val gtfs: GTFS) : RequestResult