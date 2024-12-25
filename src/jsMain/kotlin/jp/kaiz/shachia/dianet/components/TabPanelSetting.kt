package jp.kaiz.shachia.dianet.components

import jp.kaiz.shachia.dianet.RoutePreset
import mui.material.Box
import mui.material.TextField
import mui.system.sx
import react.FC
import react.ReactNode
import react.dom.onChange
import web.cssom.NamedColor
import web.html.InputMode

external interface TabPanelSettingProps : TabPanelProps {
    var routePreset: RoutePreset
    var onUpdate: (RoutePreset) -> Unit
}

val TabPanelSetting = FC<TabPanelSettingProps> { props ->
    TabPanel {
        +props

        Box {
            TextField {
                sx {
                    backgroundColor = NamedColor.white
                }
                label = ReactNode("インデックス値")
                value = props.routePreset.index.toString()
                inputMode = InputMode.numeric
                onChange =
                    { (it.target.asDynamic().value as String).also { props.onUpdate(props.routePreset.copy(index = it.toInt())) } }
            }
        }
    }
}