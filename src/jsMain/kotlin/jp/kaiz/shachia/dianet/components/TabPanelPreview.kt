package jp.kaiz.shachia.dianet.components

import emotion.react.css
import jp.kaiz.shachia.dianet.PoleDetail
import jp.kaiz.shachia.dianet.RouteDetail
import jp.kaiz.shachia.dianet.data.*
import jp.kaiz.shachia.gtfs.js.data.JsGTFS
import kotlinx.datetime.*
import mui.icons.material.Delete
import mui.material.*
import mui.material.Size
import mui.system.sx
import react.*
import react.dom.html.ReactHTML.span
import react.dom.html.ReactHTML.table
import react.dom.html.ReactHTML.tbody
import react.dom.html.ReactHTML.td
import react.dom.html.ReactHTML.thead
import react.dom.html.ReactHTML.tr
import react.dom.onChange
import web.cssom.*
import web.html.InputType

external interface TabPanelPreviewProps : TabPanelProps {
    var onRequestCreateDiaNetXlsx: (List<Pair<String, LocalDate>>) -> Unit
    var isChanged: Boolean
    var isDownloading: Boolean
    var gtfs: JsGTFS
    var routes: List<RouteDetail>
    var sortedStops: List<PoleDetail>
    var constructedRoutes: List<JsConstructedPreviewRoute>
    var excludedStopPatterns: Set<List<String>>
}

val TabPanelPreview = FC<TabPanelPreviewProps> { props ->
    var date by useState(Clock.System.todayIn(TimeZone.currentSystemDefault()))

    val calendars = useMemo(date) {
        props.gtfs.calendar.filter { cal ->
            val startInt = cal.startDate.toString()
            val startDate =
                LocalDate(startInt.take(4).toInt(), startInt.drop(4).take(2).toInt(), startInt.takeLast(2).toInt())
            val endInt = cal.endDate.toString()
            val endDate = LocalDate(endInt.take(4).toInt(), endInt.drop(4).take(2).toInt(), endInt.takeLast(2).toInt())

            if (startDate > date || endDate < date) {
                false
            }
            when (date.dayOfWeek) {
                DayOfWeek.SUNDAY -> cal.sunday == 1
                DayOfWeek.MONDAY -> cal.monday == 1
                DayOfWeek.TUESDAY -> cal.tuesday == 1
                DayOfWeek.WEDNESDAY -> cal.wednesday == 1
                DayOfWeek.THURSDAY -> cal.thursday == 1
                DayOfWeek.FRIDAY -> cal.friday == 1
                DayOfWeek.SATURDAY -> cal.saturday == 1
                else -> false
            }
        }.map { it.id }
    }

    val stops = useMemo(props.gtfs, props.sortedStops) {
        props.sortedStops.map { it to props.gtfs.stops.find { pole -> pole.stopId == it.id }!! }
    }

    val constructedRoutes = props.constructedRoutes

    val constructedTrips = useMemo(props.gtfs, props.routes, calendars, props.excludedStopPatterns) {
        props.routes.flatMap { route ->
            val direction = route.direction
            val routeId = route.id
            val jsRoute = props.gtfs.routes.first { it.routeId == routeId }
            val routeName = jsRoute.name()
            props.gtfs.trips
                .filter { it.routeId == routeId && it.directionId == direction && it.serviceId in calendars }
                .map { trip ->
                    props.gtfs.stopTimes
                        .filter { it.tripId == trip.tripId }
                        .sortedBy { it.stopSequence }
                }.filter { stopTimes ->
                    stopTimes.map { it.stopId } !in props.excludedStopPatterns
                }.map { tripStopTimes ->
                    JsConstructedPreviewTrip(
                        routeName = routeName,
                        stopTime = tripStopTimes
                    )
                }
        }.sortedBy { it.stopTime.first().departureTime }
    }

    val poleRows = stops.map {
        val pole = it.second
        val last = stops.size
        val index = stops.map { it.second }.indexOf(pole)
        val joko = when (index) {
            0 -> "発"

            last - 1 -> "着"
            else -> "発"
        }

        PoleRow(pole.name, joko, "")
    }

    val stopPatternPoleIndexMapping = useMemo(constructedRoutes, stops) {
        constructedRoutes.flatMap { it.stopPatterns }.associateWith { stopPattern ->
            stops.mapIndexed { index, (pole) ->
                val poleIndexes = stopPattern.mapIndexedNotNull { index, stop ->
                    if (stop.stopId == pole.id) index else null
                }

                when {
                    poleIndexes.isEmpty() -> null
                    poleIndexes.size == 1 || index == 0 -> poleIndexes.first()
                    else -> {
                        val sortedDuplicated =
                            stops.count { (poleDetail, _) -> poleDetail.id == pole.id }

                        if (sortedDuplicated == poleIndexes.size) {
                            val dIndex = stops.take(index)
                                .count { (poleDetail, _) -> poleDetail.id == pole.id }
                            poleIndexes[dIndex]
                        } else {
                            -1
                        }
                    }
                }
            }
        }
    }

    TabPanel {
        +props

        Box {
            sx {
                display = Display.flex
                justifyContent = JustifyContent.spaceBetween
                gap = 4.px
            }
            TextField {
                size = Size.small
                label = ReactNode("日付指定")
                variant = FormControlVariant.outlined
                type = InputType.date
                value = date.format(LocalDate.Formats.ISO)
                onChange = {
                    val text = it.target.asDynamic().value as String
                    date = LocalDate.parse(text)
                }
            }

            Tooltip {
                if (props.isChanged) {
                    title = ReactNode("先に変更結果を保存してください")
                }

                span {
                    OutputRequestButtonWithSelectDateDialog {
                        buttonDisabled = props.isChanged || props.isDownloading
                        onRequestCreateDiaNetXlsx = props.onRequestCreateDiaNetXlsx
                    }
                }
            }
        }

        Box {
            sx {
                overflow = Auto.auto
            }
            table {
                css {
                    backgroundColor = NamedColor.white
                    borderCollapse = BorderCollapse.collapse
                    border = Border(3.px, LineStyle.solid)
                    width = Length.maxContent
                }
                thead {
                    css {
                        border = Border(3.px, LineStyle.solid)
                        fontFamily = string("\"ヒラギノ明朝体3等幅\", serif")
                    }
                    tr {
                        td {
                            css {
                                textAlign = TextAlign.center
                                border = Border(1.px, LineStyle.solid)
                                borderInline = Border(3.px, LineStyle.solid)
                            }
                            colSpan = 3
                            +"系　　統"
                        }
                        constructedRoutes.flatMap { cr -> List(cr.stopPatterns.size) { cr } }.forEach {
                            td {
                                css {
                                    width = 3.rem
                                    textAlign = TextAlign.center
                                    border = Border(1.px, LineStyle.solid)
                                }
                                +it.route.name()
                            }
                        }
                        constructedTrips.forEach {
                            td {
                                css {
                                    width = 3.rem
                                    textAlign = TextAlign.center
                                    border = Border(1.px, LineStyle.solid)
                                }
                                +it.routeName
                            }
                        }
                    }
                    tr {
                        td {
                            css {
                                textAlign = TextAlign.center
                                border = Border(1.px, LineStyle.solid)
                                borderInline = Border(3.px, LineStyle.solid)
                            }
                            colSpan = 3
                            +"担　　当"
                        }
                    }
                    tr {
                        td {
                            css {
                                textAlign = TextAlign.center
                                border = Border(1.px, LineStyle.solid)
                                borderInline = Border(3.px, LineStyle.solid)
                            }
                            colSpan = 3
                            +"行　　先"
                        }

                        constructedRoutes.flatMap { it.stopPatterns }.forEach { stops ->
                            td {
                                css {
                                    border = Border(1.px, LineStyle.solid)
                                }
                                Box {
                                    sx {
                                        minHeight = 7.rem
                                        width = 1.5.em
                                        textAlignLast =
                                            if (stops.last().name?.length == 1) TextAlignLast.center
                                            else TextAlignLast.justify
                                        margin = Margin(0.px, Auto.auto)
                                        writingMode = WritingMode.verticalRl
                                    }
                                    +stops.last().name
                                }
                            }
                        }
                        constructedTrips.forEach {
                            td {
                                css {
                                    border = Border(1.px, LineStyle.solid)
                                }
                                Box {
                                    sx {
                                        minHeight = 7.rem
                                        width = 1.5.em
                                        margin = Margin(0.px, Auto.auto)
                                        writingMode = WritingMode.verticalRl
                                    }
                                }
                            }
                        }
                    }
                }

                tbody {
                    stops.forEachIndexed { index, (detail, pole) ->
                        tr {
                            val (name, rowSpan) = poleRows.name(index)
                            val joko = poleRows.joko(index)
                            val override = detail.override

                            css {
                                if (override.majorStop) {
                                    backgroundColor = NamedColor.lightgray
                                }
                                if (override.branchStart) {
                                    borderTopStyle = LineStyle.double
                                }
                                if (override.branchEnd) {
                                    borderBottomStyle = LineStyle.double
                                }
                                fontWeight = integer(300)
                                fontFamily = string("\"ヒラギノ明朝 ProN\", serif")
                            }

                            name?.let {
                                td {
                                    css {
                                        borderLeft = Border(3.px, LineStyle.solid)
                                    }
                                    if (rowSpan != null) {
                                        this.rowSpan = rowSpan
                                    }
                                    Box {
                                        sx {
                                            textAlignLast =
                                                if (name.length == 1) TextAlignLast.center
                                                else TextAlignLast.justify

                                            if (override.majorStop || index == 0 || stops.map { it.second }
                                                    .drop(index + 1)
                                                    .all { it.name == name }
                                            ) {
                                                fontWeight = integer(600)
                                                fontFamily = string("\"ヒラギノ角ゴ ProN\", sans-serif")
                                            }
                                        }
                                        +name
                                    }
                                }
                            }

                            td {
                                if (name == null) {
                                    css {
                                        borderTop = Border(1.px, LineStyle.solid, NamedColor.black)
                                    }
                                }
                                +pole.platformCode.convertToEnclosedNumber()
                            }
                            td {
                                css {
                                    if (name == null) {
                                        borderTop = Border(1.px, LineStyle.solid, NamedColor.black)
                                    }
                                    borderRight = Border(3.px, LineStyle.solid)
                                }
                                +joko
                            }

                            constructedRoutes.flatMap { it.stopPatterns }.forEach { stopPattern ->
                                val poleIndex = stopPatternPoleIndexMapping[stopPattern]!![index]

                                td {
                                    css {
                                        if (name == null) {
                                            borderTop = Border(1.px, LineStyle.solid, NamedColor.black)
                                        }
                                        borderInline = Border(1.px, LineStyle.solid)
                                    }
                                    +when (poleIndex) {
                                        null -> ""
                                        -1 -> "？"
                                        else -> poleIndex.toString()
                                    }
                                }
                            }

                            constructedTrips.forEach { trip ->
                                val stopIdPattern = trip.stopTime.map { it.stopId }
                                val poleIndex = stopPatternPoleIndexMapping.entries.first { (stopPattern) ->
                                    stopPattern.map { it.stopId } == stopIdPattern
                                }.value[index]

                                val poleStopTime = if (poleIndex != null && poleIndex != -1) trip.stopTime[poleIndex]
                                else null

                                td {
                                    css {
                                        if (name == null) {
                                            borderTop = Border(1.px, LineStyle.solid, NamedColor.black)
                                        }
                                        borderInline = Border(1.px, LineStyle.solid)
                                    }
                                    +(poleStopTime?.departureTime?.split(":")?.let {
                                        val hh = it[0].toInt()
                                        val mm = it[1].padStart(2, '0')
                                        "$hh$mm"
                                    } ?: "")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

external interface OutputRequestButtonWithSelectDateDialogProps : Props {
    var buttonDisabled: Boolean
    var onRequestCreateDiaNetXlsx: (List<Pair<String, LocalDate>>) -> Unit
}

val OutputRequestButtonWithSelectDateDialog = FC<OutputRequestButtonWithSelectDateDialogProps> { props ->
    var open by useState(false)

    var dayMapping by useState<List<Pair<String, LocalDate>>>(listOf())

    Button {
        +("xlsx出力")
        disabled = props.buttonDisabled


        variant = ButtonVariant.contained
        onClick = { open = true }
    }

    Dialog {
        this.open = open
        onClose = { _, _ -> open = false }
        maxWidth = 1000

        DialogTitle {
            +"出力するシートを設定してください"
        }

        DialogContent {
            Box {
                sx {
                    paddingBottom = 6.px
                }
                dayMapping.mapIndexed { index, (name, date) ->
                    Box {
                        sx {
                            display = Display.flex
                            paddingBlock = 3.px
                            gap = 6.px
                        }

                        TextField {
                            label = ReactNode("シート名")
                            value = name
                            onChange = { event ->
                                val text = (event.target.asDynamic().value as String)
                                dayMapping =
                                    dayMapping.toMutableList()
                                        .apply { set(index, text to dayMapping[index].second) }
                            }
                        }

                        TextField {
                            label = ReactNode("日付")
                            value = date.format(LocalDate.Formats.ISO)
                            variant = FormControlVariant.outlined
                            type = InputType.date
                            onChange = { event ->
                                val text = (event.target.asDynamic().value as String)
                                val changedDate = LocalDate.parse(text)
                                dayMapping =
                                    dayMapping.toMutableList()
                                        .apply { set(index, dayMapping[index].first to changedDate) }
                            }
                        }

                        IconButton {
                            Delete {}
                            onClick = { dayMapping = dayMapping.toMutableList().apply { removeAt(index) } }
                        }
                    }
                }
            }

            Button {
                fullWidth = true
                variant = ButtonVariant.outlined
                +"シートを追加"

                onClick = {
                    dayMapping += "" to Clock.System.todayIn(TimeZone.currentSystemDefault())
                }
            }
        }
        DialogContent {
            Button {
                disabled = dayMapping.isEmpty()
                fullWidth = true
                variant = ButtonVariant.contained
                +"作成"
                onClick = { event ->
                    props.onRequestCreateDiaNetXlsx(dayMapping)
                    open = false
                }
            }
        }
    }
}

fun String?.convertToEnclosedNumber() = this?.replace(Regex("(1[0-9]|2[0-9]|3[0-5]|[0-9])")) {
    when (val number = it.value.toInt()) {
        0 -> '\u24EA'.toString()
        in 1..20 -> (number + 0x245F).toChar().toString()
        in 21..35 -> (number - 20 + 0x3250).toChar().toString()
        in 36..50 -> (number - 35 + 0x32B0).toChar().toString()
        else -> it.value
    }
}?.replace("番", "")?.replace("降車", "降") ?: ""
