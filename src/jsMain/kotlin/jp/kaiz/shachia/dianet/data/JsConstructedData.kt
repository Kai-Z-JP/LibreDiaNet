package jp.kaiz.shachia.dianet.data

import jp.kaiz.shachia.dianet.PoleDetail
import jp.kaiz.shachia.gtfs.js.data.JsRoute
import jp.kaiz.shachia.gtfs.js.data.JsStop
import jp.kaiz.shachia.gtfs.js.data.JsStopTime

fun JsRoute.displayName() = this.shortName ?: this.longName ?: ""

data class JsConstructedPreviewRoute(
    val route: JsRoute,
    val direction: Int?,
    val stopPatterns: List<List<JsStop>>,
) {
    fun toPoleDetail() = PoleDetail
}


data class JsConstructedPreviewTrip(
    val routeName: String,
    val stopTime: List<JsStopTime>
)
