package jp.kaiz.shachia.dianet.components

import react.FC
import react.PropsWithChildren

external interface TabPanelProps : PropsWithChildren {
    var value: Int
    var index: Int
}

val TabPanel = FC<TabPanelProps> {
    if (it.value == it.index) {
        +it.children
    }
}