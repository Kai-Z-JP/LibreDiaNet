package jp.kaiz.shachia.dianet.components

import mui.material.Box
import mui.system.sx
import react.FC
import react.PropsWithChildren
import web.cssom.*

val CardContainer = FC<PropsWithChildren> {
    Box {
        sx {
            display = Display.flex
            gap = 16.px
            padding = 16.px
            height = 100.pct
        }
        +it.children
    }
}

external interface CardProps : PropsWithChildren {
    var width: Width?
}

val Card = FC<CardProps> {
    Box {
        sx {
            this.width = it.width
            display = Display.flex
            flexDirection = FlexDirection.column
            backgroundColor = Color("#f8f9ff")
            padding = 16.px
            borderRadius = 16.px
            boxShadow = BoxShadow(8.px, 8.px, 16.px, rgb(0, 0, 0, 0.25))
        }
        +it.children
    }
}