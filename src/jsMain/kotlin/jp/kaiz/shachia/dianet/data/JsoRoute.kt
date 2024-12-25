package jp.kaiz.shachia.dianet.data

import jp.kaiz.shachia.gtfs.Route
import js.objects.jso


external interface JsoRoute {
    var label: String
    var railwayCode: String
    var direction: Int?
    var id: String
    var name: String
}

fun jsoRoute(route: Route, direction: Int?): JsoRoute = jso {
    label = "${route.id}_${direction ?: "null"} ${route.name()}"
    railwayCode = "${route.id}_${direction ?: "null"}"

    id = route.id
    this.direction = direction
    name = route.name()
}

fun Route.name() = this.shortName ?: this.longName ?: ""
