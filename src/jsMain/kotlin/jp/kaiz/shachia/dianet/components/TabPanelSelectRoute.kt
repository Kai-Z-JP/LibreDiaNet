package jp.kaiz.shachia.dianet.components

import emotion.react.css
import jp.kaiz.shachia.dianet.RouteDetail
import jp.kaiz.shachia.dianet.data.JsoRoute
import jp.kaiz.shachia.dianet.data.jsoRoute
import jp.kaiz.shachia.gtfs.js.data.JsGTFS
import jp.kaiz.shachia.gtfs.js.data.JsRoute
import mui.material.Autocomplete
import mui.material.AutocompleteProps
import mui.material.TextField
import mui.system.sx
import react.FC
import react.ReactNode
import react.create
import react.dom.html.ReactHTML.div
import react.dom.html.ReactHTML.li
import web.cssom.Color
import web.cssom.em

external interface TabPanelSelectRouteProps : TabPanelProps {
    var gtfs: JsGTFS
    var routes: List<RouteDetail>
    var onChange: (List<RouteDetail>) -> Unit
}

val TabPanelSelectRoute = FC<TabPanelSelectRouteProps> { props ->
    val gtfs = props.gtfs

    val allRoutes = gtfs.routes.distinctBy(JsRoute::routeId).flatMap { route ->
        gtfs.trips
            .filter { it.routeId == route.routeId }
            .distinctBy { it.directionId }
            .map { jsoRoute(route, it.directionId) }
    }.sortedBy { "${it.railwayCode}_${it.direction}" }

    TabPanel {
        +props

        Autocomplete<AutocompleteProps<JsoRoute>> {
            disableCloseOnSelect = true
            multiple = true
            value = props.routes
                .sortedBy(RouteDetail::sCode)
                .mapNotNull { rd -> allRoutes.find { it.id == rd.id && it.direction == rd.direction } }
                .toTypedArray()
            options = allRoutes.toTypedArray()
            renderInput = { params ->
                TextField.create {
                    sx { backgroundColor = Color("white") }
                    +params
                    label = ReactNode("路線")
                }
            }
            renderOption = { props, option, _, _ ->
                li.create {
                    key = props.key
                    +props
                    div {
                        div {
                            css {
                                color = Color("grey")
                                fontSize = 0.75.em
                            }
                            +"ID: ${option.id} Dir: ${option.direction ?: "(none)"}"
                        }
                        div {
                            +option.name
                        }
                    }
                }
            }
            isOptionEqualToValue = { option, value -> option.railwayCode == value.railwayCode }
            onChange = { _, value, _, _ ->
                (value.unsafeCast<Array<JsoRoute>>()).map {
                    RouteDetail(
                        id = it.id,
                        direction = it.direction
                    )
                }.also(props.onChange)
            }
        }
    }
}