@file:OptIn(DelicateCoroutinesApi::class)

package jp.kaiz.shachia.dianet.components

import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import jp.kaiz.shachia.dianet.*
import jp.kaiz.shachia.dianet.data.JsConstructedPreviewRoute
import jp.kaiz.shachia.dianet.pages.VisuallyHiddenInput
import jp.kaiz.shachia.dianet.pages.asByteArray
import jp.kaiz.shachia.gtfs.js.data.JsGTFS
import kotlinx.coroutines.DelicateCoroutinesApi
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.datetime.LocalDate
import mui.icons.material.CloudUpload
import mui.material.*
import mui.material.Size
import mui.material.styles.TypographyVariant
import mui.system.sx
import react.*
import react.dom.html.ReactHTML.label
import web.cssom.*
import web.html.InputType

val tabList = listOf(
    "路線選択",
    "停留所並順",
    "プレビュー",
    "設定"
)

external interface PresetEditorProps : Props {
    var dataSource: GTFSDateSource
    var gtfs: JsGTFS?
    var preset: RoutePreset
    var onUpdate: (RoutePreset) -> Unit
    var onDelete: () -> Unit
}

val PresetEditor = FC<PresetEditorProps> { props ->
    val preset = props.preset
    var tab by useState(0)

    var name by useState(preset.name)
    var routes by useState(preset.routes.sortedBy(RouteDetail::sCode))
    var sortedStops by useState(preset.poles)
    var presetIndex by useState(preset.index)
    var excludedStopPatterns by useState(preset.excludedStopPatterns)

    val changed = name != preset.name || routes.toSet() != preset.routes.toSet() ||
            sortedStops != preset.poles || presetIndex != preset.index || excludedStopPatterns != preset.excludedStopPatterns

    val constructedRoutes = useMemo(props.gtfs, routes) {
        props.gtfs?.let { gtfs ->
            routes.map { route ->
                val direction = route.direction
                val routeId = route.id
                val trips = gtfs.trips.filter { it.routeId == routeId && it.directionId == direction }
                val stopPatterns = trips.map { trip ->
                    gtfs.stopTimes.filter { it.tripId == trip.tripId }.sortedBy { it.stopSequence }.map { it.stopId }
                }.distinct().map { stopIds ->
                    stopIds.map { stopId -> gtfs.stops.first { it.stopId == stopId } }
                }
                val route = gtfs.routes.first { it.routeId == routeId }
                JsConstructedPreviewRoute(
                    route = route,
                    direction = direction,
                    stopPatterns = stopPatterns
                )
            }
        } ?: emptyList()
    }

    var downloading by useState(false)

    val onRequestDiaNetXlsx: (List<Pair<String, LocalDate>>) -> Unit = { dayMapping ->
        downloading = true

        val extractFileName: (String?) -> String? = {
            if (it == null) null
            else {
                val regex = Regex("""filename="?([^";]+)"?""")
                val matchResult = regex.find(it)
                matchResult?.groupValues?.get(1)
            }
        }

        GlobalScope.launch {
            try {
                val response = client.post("/api/poi_parser/create") {
                    setBody(
                        DiaNetXlsxCreateRequest(
                            dateSource = props.dataSource,
                            preset = preset,
                            dayMapping = dayMapping,
                        )
                    )
                    contentType(ContentType.Application.Json)
                }
                if (response.status == HttpStatusCode.OK) {
                    val contentDisposition = response.headers[HttpHeaders.ContentDisposition]
                    val extractedFileName = extractFileName(contentDisposition)?.decodeURLPart() ?: "dianet.xlsx"
                    response.bodyAsBytes().downloadAsFile(extractedFileName)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                downloading = false
            }
        }
    }

    Box {
        sx {
            display = Display.flex
            gap = 16.px
        }
        TitleWithEditor {
            text = name
            onChange = { name = it }
        }
        Button {
            sx {
                marginBlock = Auto.auto
            }
            disabled = !changed
            color = ButtonColor.primary
            variant = ButtonVariant.contained
            onClick = {
                val newPreset = preset.copy(
                    name = name,
                    routes = routes,
                    poles = sortedStops,
                    index = presetIndex,
                    excludedStopPatterns = excludedStopPatterns
                )
                props.onUpdate(newPreset)
            }
            +"保存"
        }
        DeleteButtonWithDialog {
            onDelete = { props.onDelete() }
        }
    }
    Box {
        +"データ: ${preset.info.name}"
    }
    if (props.preset.info is RawGtfsInformation && (props.preset.info as RawGtfsInformation).zipByteArray.isEmpty()) {
        UpdatePresetRawGtfsData {
            onUpdateInformation = { info ->
                props.onUpdate(preset.copy(info = info))
            }
        }
    } else if (props.gtfs == null) {
        Box {
            LinearProgress {}
            +"GTFSデータをロードしています..."
        }
    } else {
        Box {
            sx {
                borderBottom = Border(1.px, LineStyle.solid)
                borderColor = Color("divider")
                marginBottom = 16.px
            }
            Tabs {
                value = tab
                onChange = { _, value -> tab = value as Int }
                tabList.forEach { Tab { label = ReactNode(it) } }
            }
        }

        TabPanelSelectRoute {
            this.gtfs = props.gtfs!!
            this.index = 0
            this.value = tab
            this.routes = routes
            this.onChange = { routes = it }
        }

        TabPanelConstructRoute {
            this.gtfs = props.gtfs!!
            this.index = 1
            this.value = tab
            this.excludedStopPatterns = excludedStopPatterns
            this.onChangeExcludedPatterns = { excludedStopPatterns = it }
            this.sortedStops = sortedStops
            this.onChange = { sortedStops = it }
            this.constructedRoutes = constructedRoutes
        }

        TabPanelPreview {
            this.gtfs = props.gtfs!!
            this.index = 2
            this.value = tab
            this.routes = routes
            this.sortedStops = sortedStops
            this.excludedStopPatterns = excludedStopPatterns
            this.onRequestCreateDiaNetXlsx = onRequestDiaNetXlsx
            this.isChanged = changed
            this.isDownloading = downloading
            this.constructedRoutes = constructedRoutes
        }

        TabPanelSetting {
            this.routePreset = preset.copy(index = presetIndex)
            this.index = 3
            this.value = tab
            this.onUpdate = { presetIndex = it.index }
        }
    }
}

external interface DeleteButtonWithDialogProps : Props {
    var onDelete: () -> Unit
}

val DeleteButtonWithDialog = FC<DeleteButtonWithDialogProps> { props ->
    var open by useState(false)

    Button {
        sx {
            marginBlock = Auto.auto
        }
        color = ButtonColor.error
        variant = ButtonVariant.outlined
        +"削除"
        onClick = { open = true }
    }

    Dialog {
        this.open = open
        DialogTitle {
            +"削除を確認"
        }
        DialogContent {
            +"本当にこのプリセットを削除しますか？"
            DialogActions {
                Button {
                    +"削除"
                    variant = ButtonVariant.contained
                    color = ButtonColor.error
                    onClick = { props.onDelete(); open = false }
                }
                Button {
                    +"キャンセル"
                    variant = ButtonVariant.outlined
                    onClick = { open = false }
                }
            }
        }
    }
}

external interface UpdatePresetRawGtfsDataProps : Props {
    var onUpdateInformation: (RawGtfsInformation) -> Unit
}

val UpdatePresetRawGtfsData = FC<UpdatePresetRawGtfsDataProps> { props ->
    var gtfsFileName by useState<String>()
    var gtfsByteArray by useState<ByteArray?>(null)

    Box {
        sx {
            paddingBottom = 16.px
        }
        Typography {
            variant = TypographyVariant.h6
            +"GTFSデータをアップロードしてください"
        }

        Box {
            +"ZipデータはDiaNetを開くたびにアップロードが必要です。"
        }
    }

    Box {
        sx {
            display = Display.flex
            gap = 12.px
        }
        TextField {
            sx {
                flexGrow = number(1.0)
            }
            size = Size.small
            value = gtfsFileName
        }
        Button {
            component = label
            size = Size.small
            variant = ButtonVariant.contained
            startIcon = CloudUpload.create()
            VisuallyHiddenInput {
                type = InputType.file
                accept = "application/zip"
                onChange = { event ->
                    val files = event.target.files
                    if (files != null && files.length > 0) {
                        GlobalScope.launch {
                            val file = files[0]
                            val arrayBuffer = file.arrayBuffer()
                            gtfsByteArray = arrayBuffer.asByteArray()
                            gtfsFileName = file.name
                        }
                    }
                }
            }
            +"参照"
        }
    }

    Button {
        +"プリセットデータの更新"
        color = ButtonColor.primary
        variant = ButtonVariant.contained
        disabled = gtfsFileName == null || gtfsByteArray == null
        fullWidth = true
        onClick = {
            GlobalScope.launch {
                val info = RawGtfsInformation(
                    zipByteArray = gtfsByteArray!!,
                    name = gtfsFileName!!,
                )
                props.onUpdateInformation(info)
            }
        }
    }
}