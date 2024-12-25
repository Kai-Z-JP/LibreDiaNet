package jp.kaiz.shachia.dianet.data

import jp.kaiz.shachia.dianet.PoleDetail
import jp.kaiz.shachia.gtfs.Route
import jp.kaiz.shachia.gtfs.Stop
import jp.kaiz.shachia.gtfs.StopTime

fun Route.displayName() = this.shortName ?: this.longName ?: ""

data class ConstructedPreviewRoute(
    val route: Route,
    val direction: Int?,
    val stopPatterns: List<List<Stop>>,
) {
    fun toPoleDetail() = PoleDetail
}


data class ConstructedPreviewTrip(
    val route: Route,
    val stopTime: List<StopTime>
)
