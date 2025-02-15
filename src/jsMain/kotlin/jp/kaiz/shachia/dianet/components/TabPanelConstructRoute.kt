package jp.kaiz.shachia.dianet.components

import jp.kaiz.shachia.dianet.PoleDetail
import jp.kaiz.shachia.dianet.data.JsConstructedPreviewRoute
import jp.kaiz.shachia.dianet.data.name
import jp.kaiz.shachia.dianet.xor
import jp.kaiz.shachia.gtfs.js.data.JsGTFS
import jp.kaiz.shachia.gtfs.js.data.JsRoute
import jp.kaiz.shachia.gtfs.js.data.JsStop
import mui.icons.material.Check
import mui.material.*
import mui.system.sx
import react.*
import react.beautiful.dnd.*
import web.cssom.*
import web.cssom.Position


external interface TabPanelConstructRouteProps : TabPanelProps {
    var sortedStops: List<PoleDetail>
    var onChange: (List<PoleDetail>) -> Unit
    var excludedStopPatterns: Set<List<String>>
    var onChangeExcludedPatterns: (Set<List<String>>) -> Unit
    var gtfs: JsGTFS
    var constructedRoutes: List<JsConstructedPreviewRoute>
}

val TabPanelConstructRoute = FC<TabPanelConstructRouteProps> { props ->
    val constructedRoutes = props.constructedRoutes

    val stopPatternMap = useMemo(constructedRoutes) {
        constructedRoutes.flatMap { cr ->
            val direction = cr.direction
            val routeId = cr.route.routeId
            cr.stopPatterns.mapIndexed { index, stopPattern ->
                val sCode = "${routeId}_${direction ?: "null"} / $index"
                sCode to Pair(cr.route, stopPattern)
            }
        }.toMap()
    }

    val sortedStops = props.sortedStops
    var selectedPoleMap by useState(mutableMapOf<String, Set<Int>>())

    val onDragEnd: (DropResult, ResponderProvided) -> Unit = { dropResult, _ ->
        val source = dropResult.source
        val dest = dropResult.destination

        if (dest?.droppableId == "droppabledest") {
            val newSortedStops = sortedStops.toMutableList()
            val selectedPoles = selectedPoleMap[source.droppableId]

            if (source.droppableId == "droppabledest") {
                val poleDetail = newSortedStops.removeAt(source.index)
                newSortedStops.add(dest.index, poleDetail)
            } else {
                val poleIndex = dropResult.draggableId.split(" SCode:")[0].toInt()
                val sCode = dropResult.draggableId.replace("$poleIndex SCode:", "")
                val (_, stopPattern) = stopPatternMap[sCode]!!

                if (!selectedPoles.isNullOrEmpty() && poleIndex in selectedPoles) {
                    val poleDetails = selectedPoles.map { stopPattern[it].toPoleDetail() }
                    newSortedStops.addAll(dest.index, poleDetails)
                    selectedPoleMap = selectedPoleMap.toMutableMap().apply { remove(source.droppableId) }
                } else {
                    val poleDetail = stopPattern[poleIndex].toPoleDetail()
                    newSortedStops.add(dest.index, poleDetail)
                }
            }

            props.onChange(newSortedStops)
        }
    }


    TabPanel {
        +props

        Box {
            sx {
                display = Display.flex
                overflowY = Auto.auto
                height = 100.pct
            }

            DragDropContext {
                Box {
                    sx {
                        width = 50.pct
                        overflowY = Auto.auto
                        scrollbarGutter = ScrollbarGutter.stable
                        display = Display.flex
                        flexDirection = FlexDirection.column
                        gap = 16.px
                        paddingRight = 16.px
                    }
                    Button {
                        fullWidth = true
                        variant = ButtonVariant.contained
                        color = ButtonColor.primary
                        disabled = constructedRoutes.flatMap { it.stopPatterns }.size != 1
                        onClick = {
                            val constructedRoute = constructedRoutes.first()
                            val newSortedStops = constructedRoute.stopPatterns.first().map { it.toPoleDetail() }
                            props.onChange(newSortedStops)
                            selectedPoleMap = mutableMapOf()
                        }
                        +"単一経路自動構成"

                    }
                    stopPatternMap.map { (sCode, routeStopPattern) ->
                        val (route, stopPattern) = routeStopPattern
                        AccordionRouteStops {
                            this.route = route
                            this.sCode = sCode
                            this.stops = stopPattern
                            this.excluded = stopPattern.map { it.stopId } in props.excludedStopPatterns
                            this.onChangeExcluded = {
                                props.onChangeExcludedPatterns(props.excludedStopPatterns xor setOf(it))
                            }
                            this.key = sCode
                            this.sortedStops = sortedStops
                            this.selectedPoles = selectedPoleMap[sCode] ?: emptySet()
                            this.onChangeSelect = {
                                selectedPoleMap = selectedPoleMap
                                    .toMutableMap()
                                    .apply { this[sCode] = it }
                            }
                        }
                    }
                }
                Box {
                    sx {
                        paddingInline = 16.px
                        width = 50.pct
                        height = 100.pct
                        overflowY = Auto.auto
                        scrollbarGutter = ScrollbarGutter.stable
                    }
                    DroppableSortedStops {
                        this.sortedStops = sortedStops
                        this.poleCache = props.gtfs.stops.associateBy(JsStop::stopId)
                        this.onChange = props.onChange
                    }
                }

                this.onDragEnd = onDragEnd
            }
        }
    }
}

external interface DroppableSortedStopsProps : Props {
    var sortedStops: List<PoleDetail>
    var poleCache: Map<String, JsStop>
    var onChange: (List<PoleDetail>) -> Unit
}

val DroppableSortedStops = FC<DroppableSortedStopsProps> { props ->
    val sortedStops = props.sortedStops
    Box {
        sx {
            borderRadius = 8.px
            backgroundColor = Color("#eaeef6")
        }

        Box {
            sx {
                paddingBlock = 12.px
                paddingInline = 16.px
            }
            Typography { +"出力用標柱順" }
        }

        Droppable {
            droppableId = "droppabledest"
            children = { provided, _ ->
                Box.create {
                    ref = provided.innerRef
                    +provided.droppableProps

                    sx {
                        padding = 16.px
                        paddingTop = 8.px
                    }

                    sortedStops.mapIndexed { index, pole ->
                        DraggableStyledSortedPole {
                            this.override = pole.override
                            this.pole = props.poleCache[pole.id]!!
                            this.index = index
                            this.onChangeOverride = { override ->
                                val newSortedStops = sortedStops.toMutableList()
                                newSortedStops[index] = PoleDetail(pole.id, override)
                                props.onChange(newSortedStops)
                            }
                        }
                    }
                    +provided.placeholder
                }
            }
        }
    }
}

external interface AccordionRouteStopsProps : Props {
    var route: JsRoute
    var sCode: String
    var stops: List<JsStop>
    var sortedStops: List<PoleDetail>
    var selectedPoles: Set<Int>
    var onChangeSelect: (Set<Int>) -> Unit
    var excluded: Boolean
    var onChangeExcluded: (List<String>) -> Unit
}

val AccordionRouteStops = FC<AccordionRouteStopsProps> { props ->
    val route = props.route
    val railwayCode = props.sCode
    val stops = props.stops

    val selectedPoles = props.selectedPoles

    val sortedStopsCode = props.sortedStops.map(PoleDetail::id)
    var lastSelectedPoleIndex by useState(-1)

    Accordion {
        sx {
            borderRadius = 8.px
            backgroundColor = Color("#eaeef6")
        }
        square = true
        elevation = 0
        disableGutters = true

        AccordionSummary {
            Typography { +"${route.routeId} ${route.name()} (${stops.first().name}-${stops.last().name})" }
            if (sortedStopsCode.containsAll(stops.map(JsStop::stopId))) {
                Check {}
            }
        }

        AccordionDetails {
            Checkbox {
                checked = props.excluded
                onChange = { event, checked ->
                    props.onChangeExcluded(stops.map(JsStop::stopId))
                }
            }
            Droppable {
                droppableId = railwayCode
                isDropDisabled = true
                renderClone = { provided, snapshot, rubric ->
                    val pole = stops[rubric.source.index]
                    val selected = rubric.source.index in selectedPoles

                    StyledPole.create {
                        this.pole = pole
                        this.provided = provided
                        this.snapshot = snapshot
                        this.selected = selected

                        if (selected && selectedPoles.size > 1) {
                            Box {
                                sx {
                                    position = Position.absolute
                                    top = -3.px
                                    right = -3.px
                                    backgroundColor = Color("orange")
                                    borderRadius = 50.pct
                                    aspectRatio = number(1.0)
                                }
                                +"+${selectedPoles.size - 1}"
                            }
                        }
                    }
                }
                children = { provided, snapshot ->
                    Box.create {
                        ref = provided.innerRef
                        stops.mapIndexed { index, pole ->
                            val poleCode = pole.stopId
                            val draggableId = "$index SCode:$railwayCode"
                            val shouldRenderClone = draggableId == snapshot.draggingFromThisWith
                            val disabled =
                                stops.count { it.stopId == poleCode } == sortedStopsCode.count { it == poleCode }
                            Box {
                                key = index.toString()
                                if (shouldRenderClone) {
                                    StyledPole {
                                        this.clone = true
                                        this.pole = pole
                                    }
                                }
                                Draggable {
                                    key = index.toString()
                                    this.draggableId = draggableId
                                    this.index = index
                                    if (disabled) {
                                        this.isDragDisabled = true
                                    }
                                    children = { provided, snapshot, _ ->
                                        StyledPole.create {
                                            this.onSelectPole = { shiftKey ->
                                                val newSelected = selectedPoles xor setOf(index)

                                                newSelected.sorted().toSet().also(props.onChangeSelect)
                                                lastSelectedPoleIndex = index
                                            }

                                            this.provided = provided
                                            this.snapshot = snapshot
                                            this.pole = pole
                                            this.disabled = disabled
                                            this.selected = index in selectedPoles
                                        }
                                    }
                                }
                            }
                        }
//                        +provided.placeholder
                    }
                }
            }
        }
    }
}

external interface PoleItemProps : Props {
    var pole: JsStop
}

val PoleItem = FC<PoleItemProps> {
    val pole = it.pole
    Typography {
        +"${pole.name}"
    }
    Typography {
        sx { color = Color("gray") }
        +pole.stopId
    }
}