package jp.kaiz.shachia.dianet.pages

import emotion.styled.styled
import io.ktor.client.request.*
import io.ktor.client.statement.*
import jp.kaiz.shachia.dianet.*
import jp.kaiz.shachia.dianet.components.Card
import jp.kaiz.shachia.dianet.components.CardContainer
import jp.kaiz.shachia.dianet.components.PresetEditor
import jp.kaiz.shachia.dianet.data.JsoGtfsFeedItem
import jp.kaiz.shachia.dianet.data.jsoGtfsFeedItem
import jp.kaiz.shachia.dianet.data.useData
import jp.kaiz.shachia.dianet.gtfs.feed.GTFSFeedItem
import jp.kaiz.shachia.dianet.gtfs.feed.GTFSFileResponse
import jp.kaiz.shachia.gtfs.GTFS
import jp.kaiz.shachia.gtfs.io.zip.ZipExtractorJs
import jp.kaiz.shachia.gtfs.io.zip.readFromZipEntries
import jp.kaiz.shachia.gtfs.js.data.JsGTFS
import js.buffer.ArrayBuffer
import js.reflect.unsafeCast
import js.typedarrays.Int8Array
import kotlinx.browser.localStorage
import kotlinx.coroutines.DelicateCoroutinesApi
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.uuid.UUID
import mui.icons.material.CloudUpload
import mui.material.*
import mui.material.Size
import mui.material.styles.TypographyVariant
import mui.system.sx
import org.w3c.dom.get
import react.*
import react.dom.html.ReactHTML.h1
import react.dom.html.ReactHTML.input
import react.dom.html.ReactHTML.label
import web.cssom.*
import web.html.InputType

const val LOCAL_STORAGE_KEY_NAME = "libre-dianet"

@OptIn(DelicateCoroutinesApi::class)
val Index = FC {
    val (presetList, setPresetList) = useState {
        val savedValueString = localStorage[LOCAL_STORAGE_KEY_NAME] ?: "[]"
        kotlinxJson.decodeFromString<List<RoutePreset>>(savedValueString)
    }
    useEffect(presetList) {
        val routePresetsJsonValue = kotlinxJson.encodeToString(presetList)
        localStorage.setItem(LOCAL_STORAGE_KEY_NAME, routePresetsJsonValue)
    }

    val (selectedPreset, setSelectedPreset) = useState<UUID>()
    val (allGtfs, setAllGtfs) = useState(mapOf<String, JsGTFS>())

    val gtfsFileResponse by useData<GTFSFileResponse>("https://api.gtfs-data.jp/v2/files")
    val gtfsFeedItems = gtfsFileResponse?.body ?: emptyList()

    useEffect(
        presetList
            .map { it.info }
            .filterIsInstance<DataRepoGtfsInformation>()
            .map { it.id }.toSet()
    ) {
        presetList
            .map { it.info }
            .filterIsInstance<DataRepoGtfsInformation>()
            .filter { it.id !in allGtfs.keys }
            .forEach {
                GlobalScope.launch {
                    val url = "https://api.gtfs-data.jp/v2/organizations/${it.orgId}/feeds/${it.feedId}/files/feed.zip"
                    val zipBytes = client.get(url).bodyAsBytes()
                    try {
                        val zipList = ZipExtractorJs().extract(zipBytes)
                        val gtfs = GTFS.readFromZipEntries(zipList)
                        setAllGtfs { current -> current + (it.id to gtfs) }
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
            }
    }

    useEffect(
        presetList.map { it.info }
            .filterIsInstance<RawGtfsInformation>()
            .map { it.id }.toSet()
    ) {
        presetList
            .map { it.info }
            .filterIsInstance<RawGtfsInformation>()
            .filter { it.id !in allGtfs }
            .map {
                GlobalScope.launch {
                    if (it.zipByteArray.isNotEmpty()) {
                        try {
                            val zipList = ZipExtractorJs().extract(it.zipByteArray)
                            val gtfs = GTFS.readFromZipEntries(zipList)
                            setAllGtfs { current -> current + (it.id to gtfs) }
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    }
                }
            }
    }

    CssBaseline {}
    Box {
        sx {
            backgroundColor = Color("#f0f0f0")
            height = 100.vh
        }
        CardContainer {
            Card {
                width = (100 * 1 / 3).pct
                h1 { +"LibreDiaNet" }

                ButtonGroup {
                    CreateNewRepoPresetButtonWithDialog {
                        gtfsFeedList = gtfsFeedItems
                        loadingGtfs = gtfsFileResponse == null
                        onCreateNewPreset = { preset ->
                            setPresetList { it + preset }
                            setSelectedPreset(preset.id)
                        }
                    }
//                      WebWorker化しないと都バスとか重くて使えない IndexedDBも検討余地あり
                    CreateNewRawPresetButtonWithDialog {
                        onCreateNewPreset = { preset ->
                            setPresetList { it + preset }
                            setSelectedPreset(preset.id)
                        }
                    }
                }

                Box { sx { height = 16.px } }

                Box {
                    sx {
                        display = Display.flex
                        flexDirection = FlexDirection.column
                        gap = 8.px
                        padding = 16.px
                        backgroundColor = Color("#eaeef6")
                        borderRadius = 8.px
                        overflowY = Auto.auto
                    }

                    presetList.forEach { preset ->
                        ButtonBase {
                            sx {
                                backgroundColor = Color(if (preset.id == selectedPreset) "lightblue" else "white")
                                padding = 8.px
                                borderRadius = 4.px
                                justifyContent = JustifyContent.start
                            }
                            onClick = { setSelectedPreset(preset.id) }
                            Box {
                                Typography {
                                    sx {
                                        textAlign = TextAlign.left
                                    }
                                    +preset.name
                                }
                                Typography {
                                    variant = TypographyVariant.body2
                                    sx {
                                        textAlign = TextAlign.left
                                        color = Color("grey")
                                    }
                                    +(preset.info.name ?: "")
                                }
                            }
                        }
                    }
                }
            }
            Card {
                width = (100 * 2 / 3).pct

                presetList.find { it.id == selectedPreset }?.let { preset ->
                    PresetEditor {
                        dataSource = when (preset.info) {
                            is DataRepoGtfsInformation -> GTFSDataSourceRepo(
                                orgId = preset.info.orgId,
                                feedId = preset.info.feedId,
                            )

                            is RawGtfsInformation -> GTFSRawSource(
                                zipByteArray = preset.info.zipByteArray
                            )

                            else -> throw NotImplementedError()
                        }
                        gtfs = allGtfs[preset.info.id]
                        this.preset = preset
                        key = preset.id.toString()
                        onUpdate = { newPreset ->
                            setPresetList { list -> list.map { if (it.id == newPreset.id) newPreset else it } }
                        }
                        onDelete = {
                            setPresetList { list ->
                                list.toMutableList().apply {
                                    remove(preset)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

external interface CreateNewRepoPresetButtonWithDialogProps : Props {
    var loadingGtfs: Boolean
    var gtfsFeedList: List<GTFSFeedItem>
    var onCreateNewPreset: (RoutePreset) -> Unit
}

val CreateNewRepoPresetButtonWithDialog = FC<CreateNewRepoPresetButtonWithDialogProps> { props ->
    var showDialog by useState(false)
    var selectedGtfs by useState<JsoGtfsFeedItem>()

    val onClose = {
        showDialog = false
        selectedGtfs = null
    }

    Button {
        color = ButtonColor.primary
        variant = ButtonVariant.contained
        fullWidth = true
        +"GTFSデータレポジトリから新しいプリセットを作成"
        onClick = { showDialog = true }
    }

    Dialog {
        maxWidth = "sm"
        fullWidth = true
        open = showDialog
        this.onClose = { _, _ -> onClose() }
        DialogTitle {
            +"GTFSデータを選択してください"
        }

        DialogContent {
            Autocomplete<AutocompleteProps<JsoGtfsFeedItem>> {
                sx {
                    padding = 3.px
                }
                loading = props.loadingGtfs
                value = selectedGtfs
                options = props.gtfsFeedList.map(::jsoGtfsFeedItem).toTypedArray()
                renderInput = { params ->
                    TextField.create {
                        sx { backgroundColor = Color("white") }
                        +params
                        label = ReactNode("GTFSデータ")
                    }
                }
                isOptionEqualToValue = { option, value ->
                    option.orgId == value.orgId && option.feedId == value.feedId
                }
                onChange = { _, value, _, _ ->
                    val feedItem = value as? JsoGtfsFeedItem ?: null
                    selectedGtfs = feedItem
                }
            }

        }

        DialogActions {
            Button {
                +"新しいプリセットを作成"
                color = ButtonColor.primary
                variant = ButtonVariant.contained
                disabled = selectedGtfs == null
                fullWidth = true
                onClick = {
                    val preset = RoutePreset(
                        info = DataRepoGtfsInformation(
                            orgId = selectedGtfs!!.orgId,
                            feedId = selectedGtfs!!.feedId,
                            name = selectedGtfs!!.label
                        )
                    )
                    props.onCreateNewPreset(preset)
                    onClose()
                }
            }
        }
    }
}


external interface CreateNewRawPresetButtonWithDialogProps : Props {
    var onCreateNewPreset: (RoutePreset) -> Unit
}

val CreateNewRawPresetButtonWithDialog = FC<CreateNewRawPresetButtonWithDialogProps> { props ->
    var showDialog by useState(false)

    val onClose = {
        showDialog = false
    }

    var gtfsFileName by useState<String>("")
    var gtfsByteArray by useState<ByteArray?>(null)

    Button {
        color = ButtonColor.primary
        variant = ButtonVariant.contained
        fullWidth = true
        +"Zipファイルから新しいプリセットを作成"
        onClick = { showDialog = true }
    }

    Dialog {
        maxWidth = "sm"
        fullWidth = true
        open = showDialog
        this.onClose = { _, _ -> onClose() }
        DialogTitle {
            +"GTFSデータをアップロードしてください"
        }

        DialogContent {
            +"Zipファイルからの読み込みはベータ版です。"
        }

        DialogContent {
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
        }

        DialogActions {
            Button {
                +"新しいプリセットを作成"
                color = ButtonColor.primary
                variant = ButtonVariant.contained
                disabled = gtfsFileName.isEmpty() || gtfsByteArray == null
                fullWidth = true
                onClick = {
                    GlobalScope.launch {
                        val preset = RoutePreset(
                            info = RawGtfsInformation(
                                zipByteArray = gtfsByteArray!!,
                                name = gtfsFileName!!,
                            )
                        )
                        props.onCreateNewPreset(preset)
                        onClose()
                    }
                }
            }
        }
    }
}

val VisuallyHiddenInput = input.styled {
//    clip = "rect(0 0 0 0)"
    clipPath = unsafeCast("inset(50%)")
    height = unsafeCast(1)
    overflow = Overflow.hidden
    position = Position.absolute
    bottom = 0.px
    left = 0.px
    whiteSpace = WhiteSpace.nowrap
    width = unsafeCast(1)
}

fun ArrayBuffer.asByteArray(): ByteArray = this.run { Int8Array(this).asByteArray() }
