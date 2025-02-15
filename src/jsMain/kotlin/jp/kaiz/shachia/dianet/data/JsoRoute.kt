package jp.kaiz.shachia.dianet.data

import jp.kaiz.shachia.gtfs.js.data.JsRoute
import js.objects.jso


external interface JsoRoute {
    var label: String
    var railwayCode: String
    var direction: Int?
    var id: String
    var name: String
}

fun jsoRoute(route: JsRoute, direction: Int?): JsoRoute = jso {
    label = "${route.routeId}_${direction ?: "null"} ${route.name()}"
    railwayCode = "${route.routeId}_${direction ?: "null"}"

    id = route.routeId
    this.direction = direction
    name = route.name()
}

fun JsRoute.name() =
    if (this.shortName.isNullOrEmpty()) when {
        this.longName.isNullOrEmpty() -> ""
        else -> this.longName!!
    } else this.shortName!!
