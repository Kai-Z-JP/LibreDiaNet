package jp.kaiz.shachia.dianet.api

import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import jp.kaiz.shachia.dianet.*
import jp.kaiz.shachia.dianet.data.*
import jp.kaiz.shachia.dianet.dsl.poi.XSSFCellStyleBuilder
import jp.kaiz.shachia.dianet.dsl.poi.workbook
import jp.kaiz.shachia.gtfs.GTFS
import jp.kaiz.shachia.gtfs.StopTime
import jp.kaiz.shachia.gtfs.io.zip.ZipUtils
import kotlinx.datetime.*
import org.apache.poi.ss.usermodel.BorderStyle
import org.apache.poi.ss.usermodel.FillPatternType
import org.apache.poi.ss.usermodel.HorizontalAlignment
import org.apache.poi.ss.usermodel.VerticalAlignment
import org.apache.poi.ss.util.CellRangeAddress
import org.apache.poi.xssf.usermodel.XSSFColor
import java.io.ByteArrayOutputStream
import java.net.URLEncoder

fun Route.poiParser() {
    post("/create") {
        try {
            val request = call.receive<DiaNetXlsxCreateRequest>()
            val gtfsZipByteArray = when (request.dateSource) {
                is GTFSDataSourceRepo -> client.get(request.dateSource.url).bodyAsBytes()
                is GTFSRawSource -> request.dateSource.zipByteArray
                else -> null
            }

            if (gtfsZipByteArray == null) {
                return@post call.respond(status = HttpStatusCode.NotFound, "")
            }

            val zipEntries = ZipUtils.extractZip(gtfsZipByteArray)
            val gtfs = GTFS.readFromZip(zipEntries)

            val byteArray = createDiaNetXlsx(gtfs, request.preset, request.dayMapping)

            val fileName = "${gtfs.agency.name}_${request.preset.name}_${
                Clock.System.now()
                    .toLocalDateTime(TimeZone.currentSystemDefault())
                    .format(LocalDateTime.Formats.ISO)
            }.xlsx"

            val encodedFileName = URLEncoder.encode(fileName, Charsets.UTF_8)


            call.response.header(
                HttpHeaders.ContentDisposition,
                ContentDisposition.Attachment.withParameter(
                    ContentDisposition.Parameters.FileName,
                    encodedFileName
                ).toString()
            )

            val contentType = ContentType.defaultForFileExtension("xlsx")
            call.response.header(
                HttpHeaders.ContentType,
                contentType.toString()
            )

            return@post call.respondOutputStream(contentType) {
                byteArray.inputStream().buffered().copyTo(this)
            }
        } catch (e: Exception) {
            e.printStackTrace()

            call.response.status(HttpStatusCode.InternalServerError)
            return@post call.respond("")
        }
    }
}


val timeReg = Regex("^\\d{1,3}$")

fun createDiaNetXlsx(gtfs: GTFS, preset: RoutePreset, dayMapping: List<Pair<String, LocalDate>>): ByteArray {

    val poles = preset.poles.map { detail -> detail to gtfs.stops.find { pole -> pole.id == detail.id }!! }

    val constructedRoutes = preset.routes.map { (routeId, direction) ->
        val trips = gtfs.trips.filter { it.routeId == routeId && it.directionId == direction }
        val stopPatterns = trips.map { trip ->
            gtfs.stopTimes.filter { it.tripId == trip.tripId }.sortedBy { it.stopSequence }.map { it.stopId }
        }.distinct().map { stopTimes ->
            stopTimes.map { stopTime -> gtfs.stops.first { it.id == stopTime } }
        }
        val route = gtfs.routes.first { it.id == routeId }
        ConstructedPreviewRoute(
            route = route,
            direction = direction,
            stopPatterns = stopPatterns
        )
    }

    val standardStops = poles.filter { (_, pole) ->
        constructedRoutes
            .flatMap(ConstructedPreviewRoute::stopPatterns)
            .all { pole in it }
    }.map { it.second }

    val calendarMapping = dayMapping.map { (name, date) ->
        name to gtfs.calendar.filter { cal ->
            val startInt = cal.startDate
            val startDate =
                LocalDate(startInt.take(4).toInt(), startInt.drop(4).take(2).toInt(), startInt.takeLast(2).toInt())
            val endInt = cal.endDate
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

    val calTripMapping = calendarMapping.map { (name, calendars) ->
        name to preset.routes.flatMap { detail ->
            val route = gtfs.routes.first { it.id == detail.id }
            val trips = gtfs.trips
                .filter { it.routeId == detail.id && it.directionId == detail.direction && it.serviceId in calendars }
            trips.map { trip ->
                ConstructedPreviewTrip(
                    route = route,
                    stopTime = gtfs.stopTimes
                        .filter { it.tripId == trip.tripId }
                        .sortedBy { it.stopSequence }
                )
            }
        }.sortedBy {
            if (standardStops.isNotEmpty()) {
                val standartStop = standardStops.first()
                it.stopTime.find { it.stopId == standartStop.id }
            } else {
                it.stopTime.first()
            }?.departHHMM()
        }
    }

    val stopPatternPoleIndexMapping = constructedRoutes.flatMap { it.stopPatterns }.associateWith { stopPattern ->
        preset.poles.mapIndexed { index, currentPole ->
            val poleIndexes = stopPattern.mapIndexedNotNull { index, stop ->
                if (stop.id == currentPole.id) index else null
            }

            when {
                poleIndexes.isEmpty() -> null
                poleIndexes.size == 1 || index == 0 -> poleIndexes.first()
                else -> {
                    val sortedDuplicated = preset.poles.count { pole -> pole.id == currentPole.id }

                    if (sortedDuplicated == poleIndexes.size) {
                        val dIndex = preset.poles.take(index).count { stopTime -> currentPole.id == stopTime.id }
                        poleIndexes[dIndex]
                    } else {
                        -1
                    }
                }
            }
        }
    }


    val sujiMaps = calTripMapping.map { (name, trips) ->
        val timeListList = trips.map { suji ->

            val stopIdPattern = suji.stopTime.map { it.stopId }
            val stopIdPatternMapping = stopPatternPoleIndexMapping.entries.first { (stopPattern) ->
                stopPattern.map { it.id } == stopIdPattern
            }.value
            val sujiTime = preset.poles.mapIndexed { index, poleDetail ->
                val poleIndex = stopIdPatternMapping[index]
                if (poleIndex == null || poleIndex == -1) ""
                else suji.stopTime[poleIndex].departHMM()
            }.toMutableList()

            val first = sujiTime.indexOfFirst(String::isNotEmpty)
            val last = sujiTime.indexOfLast(String::isNotEmpty)

            (0 until sujiTime.size).forEachIndexed { index, _ ->
                if (sujiTime[index].isEmpty()) {
                    if (index in first..last) {
                        sujiTime[index] = "‖"
                    } else {
                        sujiTime[index] = "…"
                    }
                }
            }

            sujiTime.toList()
        }

        Triple(name, trips, timeListList)
    }


    val workbook = workbook {
        val hiraginoSanSerif9 = font {
            fontName = "ヒラギノ明朝 ProN W3"
            fontHeightInPoints = 9
        }
        val hiraginoSanSerif10 = font {
            fontName = "ヒラギノ明朝 ProN W3"
            fontHeightInPoints = 10
        }
        val hiraginoKakugo10Bold = font {
            fontName = "ヒラギノ角ゴ ProN W6"
            fontHeightInPoints = 10
            bold = true
        }
        val nadia9 = font {
            fontName = "BIZ UDゴシック"
            fontHeightInPoints = 9
        }

        val normalStopStyle = style {
            font = hiraginoSanSerif10
            alignment = HorizontalAlignment.DISTRIBUTED
            verticalAlignment = VerticalAlignment.CENTER
        }

        val startEndStopNameStyle = style {
            font = hiraginoKakugo10Bold
            alignment = HorizontalAlignment.DISTRIBUTED
            verticalAlignment = VerticalAlignment.CENTER
        }

        val majorStyle: XSSFCellStyleBuilder.() -> Unit = {
            fillForegroundColorColor = XSSFColor().apply { theme = 2 }
            fillPattern = FillPatternType.SOLID_FOREGROUND
        }

        val majorStopStyle = style(normalStopStyle, majorStyle)

        val majorStopNameStyle = style(startEndStopNameStyle, majorStyle)

        val headerTitleStyle = style(normalStopStyle) {
            alignment = HorizontalAlignment.CENTER
        }

        val borderInlineStyle: XSSFCellStyleBuilder.() -> Unit = {
            borderRight = BorderStyle.THIN
            borderLeft = BorderStyle.THIN
        }

        val headerNormalStyle = style {
            font = hiraginoSanSerif9
            alignment = HorizontalAlignment.CENTER
            verticalAlignment = VerticalAlignment.CENTER

            borderInlineStyle()
        }

        val headerDestStyle = style {
            font = hiraginoSanSerif9
            alignment = HorizontalAlignment.CENTER
            verticalAlignment = VerticalAlignment.DISTRIBUTED
            rotation = 255

            borderInlineStyle()
        }

        val bodyStyle = style {
            font = nadia9
            alignment = HorizontalAlignment.CENTER
            verticalAlignment = VerticalAlignment.CENTER

            borderInlineStyle()
        }

        val bodyTimeStyle = style(bodyStyle) {
            alignment = HorizontalAlignment.RIGHT
            verticalAlignment = VerticalAlignment.BOTTOM
        }

        val bodyMajorStyle = style(bodyStyle, majorStyle)

        val bodyMajorTimeStyle = style(bodyTimeStyle, majorStyle)

        sujiMaps.forEachIndexed { index, (name, sujiList, timeListList) ->
            val poleRows = poles.mapIndexed { poleIndex, (detail, pole) ->
                val last = poles.size
                val joko = when (poleIndex) {
                    0 -> "発"

                    last - 1 -> "着"

                    else -> if (pole.platformCode == "降車") "着"
                    else if (constructedRoutes.flatMap { it.stopPatterns }.count { pole in it } == 1) {
                        if (constructedRoutes.flatMap { it.stopPatterns }
                                .any { it.indexOf(pole) == it.size - 1 }) "着" else "発"
                    } else "発"
                }

                PoleRow(pole.name, joko, pole.platformCode ?: "")
            }
            val poleCount = poleRows.size

            val sujiCount = sujiList.size
            val spacing = 30 - sujiCount % 30
            val allCount = sujiCount + spacing

            sheet(name) {
                offsetRow = 1
                offsetColumn = 1
                zoom = 130
                defaultRowHeightInPoints = 12.0f
                defaultColumnWidth = 3
                repeatingColumns = CellRangeAddress(0, 4 + poleCount, 0, 3)

                createFreezePane(4, 0)

                setColumnWidth(0, 2 * 256)
                setColumnWidth(1, (14.1 * 256).toInt())
                setColumnWidth(2, 2 * 256)
                setColumnWidth(3, 2 * 256)
                repeat(allCount) { setColumnWidth(it + 4, (3.5 * 256).toInt()) }

                setBorderTop(BorderStyle.MEDIUM, 1, 1, 1, 3 + allCount)
                setBorderBottom(BorderStyle.MEDIUM, 4 + poleCount, 4 + poleCount, 1, 3 + allCount)
                setBorderLeft(BorderStyle.MEDIUM, 1, 4 + poleCount, 1, 1)
                setBorderRight(BorderStyle.MEDIUM, 1, 4 + poleCount, 3 + allCount, 3 + allCount)

                setBorderBottom(BorderStyle.THIN, 1, 1, 1, 3 + allCount)
                setBorderBottom(BorderStyle.THIN, 2, 2, 1, 3 + allCount)
                setBorderBottom(BorderStyle.THIN, 3, 3, 1, 3 + allCount)

                setBorderBottom(BorderStyle.MEDIUM, 4, 4, 1, 3 + allCount)
                setBorderRight(BorderStyle.MEDIUM, 1, 4 + poleCount, 3, 3)


                row {
                    cell {
                        cellStyle = headerTitleStyle
                        merge(1, 3)
                        +"担　　当"
                    }
                    cell {}
                    cell {}

                    sujiList.forEach { suji ->
                        cell {
                            cellStyle = headerNormalStyle
                        }
                    }
                    repeat(spacing) {
                        cell {
                            cellStyle = headerNormalStyle
                        }
                    }
                }

                row {
                    cell {
                        cellStyle = headerTitleStyle
                        merge(1, 3)
                        +"系統ｺｰﾄﾞ"
                    }
                    cell {}
                    cell {}

                    sujiList.forEach { suji ->
                        cell {
                            cellStyle = headerNormalStyle
                            +suji.route.id.toString()
                        }
                    }
                    repeat(spacing) {
                        cell {
                            cellStyle = headerNormalStyle
                        }
                    }
                }

                row {
                    cell {
                        cellStyle = headerTitleStyle
                        merge(1, 3)
                        +"系　　統"
                    }
                    cell {}
                    cell {}

                    sujiList.forEach { suji ->
                        cell {
                            cellStyle = headerNormalStyle
                        }
                    }

                    repeat(spacing) {
                        cell {
                            cellStyle = headerNormalStyle
                        }
                    }
                }

                row {
                    cell {
                        cellStyle = headerTitleStyle
                        heightInPoints = 64.8f
                        merge(1, 3)
                        +"行　　先"
                    }
                    cell {}
                    cell {}

                    sujiList.forEach { suji ->
                        cell {
                            cellStyle = headerDestStyle
                            val stopId = suji.stopTime.last().stopId
                            val stop = poles.map { it.second }.find { it.id == stopId }
                            +(stop?.name ?: "")
                        }
                    }
                    repeat(spacing) {
                        cell {
                            cellStyle = headerDestStyle
                        }
                    }
                }

                preset.poles
                    .map { detail -> detail to poles.find { it.first == detail } }
                    .forEachIndexed { index, (detail, pole) ->
                        row {
                            val override = detail.override
                            val poleRow = poleRows[index]
                            val (name, rowSpan) = poleRows.name(index)
                            val majorStop = override.majorStop
                            if (name != null) {
                                cell {
                                    +name
                                    merge(rowSpan!!, 1)
                                    cellStyle =
                                        if (majorStop) majorStopNameStyle
                                        else if (index == 0 || index == poleCount - rowSpan) startEndStopNameStyle
                                        else normalStopStyle
                                }
                            } else {
                                cell {
                                    cellStyle = normalStopStyle
                                }
                                setBorderTop(BorderStyle.THIN, 2, 3 + allCount)
                            }

                            if (override.branchStart) {
                                setBorderTop(BorderStyle.DOUBLE, 1, 3 + allCount)
                            }

                            if (override.branchEnd) {
                                setBorderBottom(BorderStyle.DOUBLE, 1, 3 + allCount)
                            }

                            cell {
                                +poleRow.locationName
                                cellStyle = if (majorStop) majorStopStyle else normalStopStyle
                            }

                            cell {
                                +poleRows.joko(index)
                                cellStyle = if (majorStop) majorStopStyle else normalStopStyle
                            }

                            timeListList.forEach { sujiTime ->
                                cell {
                                    val text = sujiTime[index]
                                    val time = text.matches(timeReg)

                                    cellStyle =
                                        if (time) (if (majorStop) bodyMajorTimeStyle else bodyTimeStyle)
                                        else if (majorStop) bodyMajorStyle else bodyStyle
                                    +text
                                }
                            }
                            repeat(spacing) {
                                cell {
                                    cellStyle = if (majorStop) bodyMajorStyle else bodyStyle
                                    +"…"
                                }
                            }
                        }
                    }
            }
        }
    }

    return ByteArrayOutputStream().also { workbook.write(it) }.toByteArray()
}


fun StopTime.departHHMM() = departureTime?.split(":")?.let {
    val hh = it[0].padStart(2, '0')
    val mm = it[1].padStart(2, '0')
    "$hh$mm"
} ?: ""


fun StopTime.departHMM() = departureTime?.split(":")?.let {
    val hh = it[0].toInt()
    val mm = it[1].padStart(2, '0')
    "$hh$mm"
} ?: ""