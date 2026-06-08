package jp.kaiz.shachia.dianet.api

import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import jp.kaiz.shachia.dianet.*
import jp.kaiz.shachia.dianet.data.PoleRow
import jp.kaiz.shachia.dianet.data.joko
import jp.kaiz.shachia.dianet.data.name
import jp.kaiz.shachia.dianet.dsl.poi.XSSFCellStyleBuilder
import jp.kaiz.shachia.dianet.dsl.poi.workbook
import jp.kaiz.shachia.gtfs.GTFS
import jp.kaiz.shachia.gtfs.io.zip.ZipUtils
import kotlinx.datetime.*
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
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
            val gtfs = GTFS.readFromZip(zipEntries).toWorkbookData()
            val byteArray = createDiaNetXlsx(gtfs, request.preset, request.dayMapping)
            return@post call.respondWorkbook(byteArray, gtfs.agencyName, request.preset.name)
        } catch (e: Exception) {
            e.printStackTrace()

            call.response.status(HttpStatusCode.InternalServerError)
            return@post call.respond("")
        }
    }

    post("/create_from_data") {
        try {
            val request = call.receive<DiaNetXlsxCreateFromDataRequest>()
            val gtfs = request.gtfs.toWorkbookData()
            val byteArray = createDiaNetXlsx(gtfs, request.preset, request.dayMapping)
            return@post call.respondWorkbook(byteArray, gtfs.agencyName, request.preset.name)
        } catch (e: Exception) {
            e.printStackTrace()

            call.response.status(HttpStatusCode.InternalServerError)
            return@post call.respond("")
        }
    }
}


private val timeReg = Regex("^\\s?\\d{3,4}$")

private data class DiaNetWorkbookData(
    val agencyName: String,
    val stops: List<DiaNetWorkbookStop>,
    val routes: List<DiaNetWorkbookRoute>,
    val trips: List<DiaNetWorkbookTrip>,
    val stopTimes: List<DiaNetWorkbookStopTime>,
    val calendars: List<DiaNetWorkbookCalendar>
)

private data class DiaNetWorkbookStop(
    val id: String,
    val name: String,
    val platformCode: String?,
    val jokoOverride: String? = null
)

private data class DiaNetWorkbookRoute(
    val id: String,
    val shortName: String?,
    val longName: String?
)

private data class DiaNetWorkbookTrip(
    val tripId: String,
    val routeId: String,
    val directionId: Int?,
    val serviceId: String
)

private data class DiaNetWorkbookStopTime(
    val tripId: String,
    val stopId: String,
    val stopSequence: Int,
    val departureTime: String?,
    val stopPatternId: String? = null
)

private data class DiaNetWorkbookCalendar(
    val id: String,
    val startDate: String,
    val endDate: String,
    val sunday: Int,
    val monday: Int,
    val tuesday: Int,
    val wednesday: Int,
    val thursday: Int,
    val friday: Int,
    val saturday: Int
)

private data class DiaNetPreviewRoute(
    val route: DiaNetWorkbookRoute,
    val direction: Int?,
    val stopPatterns: List<DiaNetPreviewStopPattern>
)

private data class DiaNetPreviewStopPattern(
    val key: String,
    val stops: List<DiaNetWorkbookStop>
)

private data class DiaNetPreviewTrip(
    val route: DiaNetWorkbookRoute,
    val stopTime: List<DiaNetWorkbookStopTime>
)

private data class TimetableSortColumn<T>(
    val item: T,
    val compareValues: List<Int?>
)

private fun GTFS.toWorkbookData() = DiaNetWorkbookData(
    agencyName = agency.name,
    stops = stops.map { DiaNetWorkbookStop(it.id, it.name ?: "", it.platformCode) },
    routes = routes.map { DiaNetWorkbookRoute(it.id, it.shortName, it.longName) },
    trips = trips.map { DiaNetWorkbookTrip(it.tripId, it.routeId, it.directionId, it.serviceId) },
    stopTimes = stopTimes.map {
        DiaNetWorkbookStopTime(
            tripId = it.tripId,
            stopId = it.stopId ?: "",
            stopSequence = it.stopSequence,
            departureTime = it.departureTime,
            stopPatternId = null
        )
    },
    calendars = calendar.map {
        DiaNetWorkbookCalendar(
            id = it.id,
            startDate = it.startDate,
            endDate = it.endDate,
            sunday = it.sunday,
            monday = it.monday,
            tuesday = it.tuesday,
            wednesday = it.wednesday,
            thursday = it.thursday,
            friday = it.friday,
            saturday = it.saturday
        )
    }
)

private fun DiaNetGtfsExportData.toWorkbookData() = DiaNetWorkbookData(
    agencyName = agencyName,
    stops = stops.map { DiaNetWorkbookStop(it.id, it.name, it.platformCode, it.jokoOverride) },
    routes = routes.map { DiaNetWorkbookRoute(it.id, it.shortName, it.longName) },
    trips = trips.map { DiaNetWorkbookTrip(it.tripId, it.routeId, it.directionId, it.serviceId) },
    stopTimes = stopTimes.map { DiaNetWorkbookStopTime(it.tripId, it.stopId, it.stopSequence, it.departureTime, it.stopPatternId) },
    calendars = calendars.map {
        DiaNetWorkbookCalendar(
            id = it.id,
            startDate = it.startDate,
            endDate = it.endDate,
            sunday = it.sunday,
            monday = it.monday,
            tuesday = it.tuesday,
            wednesday = it.wednesday,
            thursday = it.thursday,
            friday = it.friday,
            saturday = it.saturday
        )
    }
)

private suspend fun io.ktor.server.application.ApplicationCall.respondWorkbook(
    byteArray: ByteArray,
    agencyName: String,
    presetName: String
) {
    val fileName = "${agencyName}_${presetName}_${
        Clock.System.now()
            .toLocalDateTime(TimeZone.currentSystemDefault())
            .format(LocalDateTime.Formats.ISO)
    }.xlsx"
    val encodedFileName = URLEncoder.encode(fileName, Charsets.UTF_8)
    response.header(
        HttpHeaders.ContentDisposition,
        ContentDisposition.Attachment.withParameter(
            ContentDisposition.Parameters.FileName,
            encodedFileName
        ).toString()
    )

    val contentType = ContentType.defaultForFileExtension("xlsx")
    response.header(HttpHeaders.ContentType, contentType.toString())
    respondOutputStream(contentType) {
        byteArray.inputStream().buffered().copyTo(this)
    }
}

private fun createDiaNetXlsx(gtfs: DiaNetWorkbookData, preset: RoutePreset, dayMapping: List<Pair<String, LocalDate>>): ByteArray {

    val poles = preset.poles.map { detail -> detail to gtfs.stops.find { pole -> pole.id == detail.id }!! }
    val excludedStopPatternKeys = preset.excludedStopPatterns.map { it.savedStopPatternKey() }.toSet()

    val constructedRoutes = preset.routes.map { (routeId, direction) ->
        val trips = gtfs.trips.filter { it.routeId == routeId && it.directionId == direction }
        val stopPatterns = trips.map { trip ->
            gtfs.stopTimes.filter { it.tripId == trip.tripId }.sortedBy { it.stopSequence }
        }.distinctBy { it.stopPatternKey() }.map { stopTimes ->
            DiaNetPreviewStopPattern(
                key = stopTimes.stopPatternKey(),
                stops = stopTimes.map { stopTime -> gtfs.stops.first { it.id == stopTime.stopId } }
            )
        }
        val route = gtfs.routes.first { it.id == routeId }
        DiaNetPreviewRoute(
            route = route,
            direction = direction,
            stopPatterns = stopPatterns
        )
    }

    val calendarMapping = dayMapping.map { (name, date) ->
        name to gtfs.calendars.filter { cal ->
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

    val rawCalTripMapping = calendarMapping.map { (name, calendars) ->
        name to preset.routes.flatMap { detail ->
            val route = gtfs.routes.first { it.id == detail.id }
            val trips = gtfs.trips
                .filter { it.routeId == detail.id && it.directionId == detail.direction && it.serviceId in calendars }
            trips.map { trip ->
                gtfs.stopTimes
                    .filter { it.tripId == trip.tripId }
                    .sortedBy { it.stopSequence }
            }.filter { stopTimes ->
                stopTimes.stopPatternKey() !in excludedStopPatternKeys
            }.map { stopTimes ->
                DiaNetPreviewTrip(route = route, stopTime = stopTimes)
            }
        }
    }

    val stopPatternPoleIndexMapping = constructedRoutes.flatMap { it.stopPatterns }.associate { stopPattern ->
        stopPattern.key to preset.poles.mapIndexed { index, currentPole ->
            val poleIndexes = stopPattern.stops.mapIndexedNotNull { index, stop ->
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

    val poleSpans = poles.mapIndexed { index, (_, pole) ->
        if (index > 0 && poles[index - 1].second.name == pole.name) {
            1
        } else {
            poles.drop(index).takeWhile { (_, candidate) -> candidate.name == pole.name }.size
        }
    }

    val calTripMapping = rawCalTripMapping.map { (name, trips) ->
        name to sortTimetableColumns(
            trips.map { trip ->
                val stopIdPatternMapping = stopPatternPoleIndexMapping.getValue(trip.stopTime.stopPatternKey())
                TimetableSortColumn(
                    item = trip,
                    compareValues = preset.poles.mapIndexed { index, _ ->
                        val poleIndex = stopIdPatternMapping[index]
                        if (poleIndex == null || poleIndex == -1) null else trip.stopTime[poleIndex].departHMM().trim().toIntOrNull()
                    }
                )
            },
            poleSpans
        )
    }

    val sujiMaps = calTripMapping.map { (name, trips) ->
        val timeListList = trips.map { suji ->

            val stopIdPatternMapping = stopPatternPoleIndexMapping.getValue(suji.stopTime.stopPatternKey())
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
                    else if (constructedRoutes.flatMap { it.stopPatterns }.count { pole in it.stops } == 1) {
                        if (constructedRoutes.flatMap { it.stopPatterns }
                                .any { it.stops.indexOf(pole) == it.stops.size - 1 }) "着" else "発"
                    } else "発"
                }

                PoleRow(pole.name, pole.jokoOverride ?: joko, pole.platformCode ?: "")
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
                            val rowShading = override.rowShading || override.majorStop
                            val stopNameBold = override.stopNameBold || override.majorStop
                            if (name != null) {
                                cell {
                                    +name
                                    merge(rowSpan!!, 1)
                                    cellStyle =
                                        if (rowShading && (stopNameBold || index == 0 || index == poleCount - rowSpan)) majorStopNameStyle
                                        else if (rowShading) majorStopStyle
                                        else if (stopNameBold || index == 0 || index == poleCount - rowSpan) startEndStopNameStyle
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
                                cellStyle = if (rowShading) majorStopStyle else normalStopStyle
                            }

                            cell {
                                +poleRows.joko(index)
                                cellStyle = if (rowShading) majorStopStyle else normalStopStyle
                            }

                            timeListList.forEach { sujiTime ->
                                cell {
                                    val text = if (override.horizontalLine && sujiTime[index] == "…") "——" else sujiTime[index]
                                    val time = text.matches(timeReg)

                                    cellStyle =
                                        if (time) (if (rowShading) bodyMajorTimeStyle else bodyTimeStyle)
                                        else if (rowShading) bodyMajorStyle else bodyStyle
                                    +text
                                }
                            }
                            repeat(spacing) {
                                cell {
                                    cellStyle = if (rowShading) bodyMajorStyle else bodyStyle
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


private fun DiaNetWorkbookStopTime.departHHMM() = departureTime?.split(":")?.let {
    val hh = it[0].padStart(2, '0')
    val mm = it[1].padStart(2, '0')
    "$hh$mm"
} ?: ""


private fun DiaNetWorkbookStopTime.departHMM() = departureTime?.split(":")?.let {
    val hh = it[0].toInt()
    val mm = it[1].padStart(2, '0')
    "$hh$mm".padStart(4, '\u2002')
} ?: ""

private fun <T> sortTimetableColumns(columns: List<TimetableSortColumn<T>>, poleSpans: List<Int>): List<T> {
    val sorted = mutableListOf<TimetableSortColumn<T>>()
    val remaining = columns.toMutableList()

    while (remaining.isNotEmpty()) {
        var progress = false
        val iterator = remaining.listIterator()

        while (iterator.hasNext()) {
            val check = iterator.next()
            var addIndex = -1

            if (sorted.isEmpty()) {
                addIndex = 0
            } else {
                sortedLoop@ for ((sortedIndex, target) in sorted.withIndex()) {
                    var poleIndex = 0
                    while (poleIndex < poleSpans.size) {
                        val targetTime = target.compareValueAt(poleIndex)
                        val checkTime = check.compareValueAt(poleIndex)

                        if (targetTime != null && checkTime != null) {
                            if (checkTime < targetTime) {
                                if (sorted.indexOfFirst { it.compareValueAt(poleIndex) != null } == sortedIndex && addIndex == -1) {
                                    addIndex = sortedIndex
                                    break@sortedLoop
                                }
                                break@sortedLoop
                            }
                            addIndex = sortedIndex + 1
                            break@sortedLoop
                        }

                        val colSpan = poleSpans.getOrNull(poleIndex) ?: 1
                        if (colSpan > 1) {
                            val targetTimes = target.compareValuesInRange(poleIndex, colSpan)
                            val checkTimes = check.compareValuesInRange(poleIndex, colSpan)

                            if (targetTimes.any { it != null } && checkTimes.any { it != null }) {
                                val targetFirstIndex = targetTimes.indexOfFirst { it != null }
                                val targetLastIndex = targetTimes.indexOfLast { it != null }
                                val checkFirstIndex = checkTimes.indexOfFirst { it != null }
                                val checkLastIndex = checkTimes.indexOfLast { it != null }

                                if (targetFirstIndex > checkLastIndex) {
                                    val targetFirstTime = targetTimes[targetFirstIndex]!!
                                    val checkLastTime = checkTimes[checkLastIndex]!!

                                    if (targetFirstTime > checkLastTime) {
                                        if (sortedIndex == 0) {
                                            addIndex = 0
                                            break@sortedLoop
                                        }
                                    } else if (targetFirstTime < checkLastTime) {
                                        addIndex = sortedIndex + 1
                                        break@sortedLoop
                                    }
                                } else if (targetLastIndex < checkFirstIndex) {
                                    val targetLastTime = targetTimes[targetLastIndex]!!
                                    val checkFirstTime = checkTimes[checkFirstIndex]!!

                                    if (targetLastTime < checkFirstTime) {
                                        addIndex = sortedIndex + 1
                                        break@sortedLoop
                                    } else if (targetLastTime > checkFirstTime) {
                                        if (sortedIndex == 0) {
                                            addIndex = 0
                                            break@sortedLoop
                                        }
                                    }
                                }
                            }
                        }

                        poleIndex++
                    }
                }
            }

            if (addIndex != -1) {
                sorted.add(addIndex, check)
                iterator.remove()
                progress = true
            } else if (check.compareValues.isEmpty()) {
                iterator.remove()
                progress = true
            }
        }

        if (!progress) {
            sorted.addAll(remaining)
            remaining.clear()
        }
    }

    return sorted.map(TimetableSortColumn<T>::item)
}

private fun <T> TimetableSortColumn<T>.compareValueAt(index: Int): Int? = compareValues.getOrNull(index)

private fun <T> TimetableSortColumn<T>.compareValuesInRange(start: Int, count: Int): List<Int?> =
    (start until start + count).map(::compareValueAt)

private fun List<DiaNetWorkbookStopTime>.stopPatternKey(): String {
    val patternId = firstOrNull()?.stopPatternId?.takeIf { it.isNotBlank() }
    if (patternId != null && all { it.stopPatternId == patternId }) {
        return "jp_pattern_id:$patternId"
    }
    return stopIdsPatternKey(map { it.stopId })
}

private fun List<String>.savedStopPatternKey(): String {
    if (size == 1 && (first().startsWith("jp_pattern_id:") || first().startsWith("pattern_hash:"))) {
        return first()
    }
    return stopIdsPatternKey(this)
}

private fun stopIdsPatternKey(stopIds: List<String>): String =
    "pattern_hash:${fnv1a32(Json.encodeToString(stopIds))}"

private fun fnv1a32(value: String): String {
    var hash = 0x811c9dc5.toInt()
    value.forEach { char ->
        hash = hash xor char.code
        hash *= 0x01000193
    }
    return hash.toUInt().toString(16).padStart(8, '0')
}
