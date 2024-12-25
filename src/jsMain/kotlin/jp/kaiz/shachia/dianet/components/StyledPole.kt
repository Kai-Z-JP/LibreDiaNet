package jp.kaiz.shachia.dianet.components

import jp.kaiz.shachia.dianet.PoleDetail
import jp.kaiz.shachia.gtfs.Stop
import mui.material.Box
import mui.system.sx
import react.FC
import react.PropsWithChildren
import react.beautiful.dnd.DraggableProvided
import react.beautiful.dnd.DraggableStateSnapshot
import web.cssom.*

external interface StyledPoleProps : PropsWithChildren {
    var pole: Stop
    var provided: DraggableProvided?
    var snapshot: DraggableStateSnapshot?
    var disabled: Boolean?
    var selected: Boolean?
    var clone: Boolean?

    var onSelectPole: ((Boolean) -> Unit)?
}

val StyledPole = FC<StyledPoleProps> { props ->
    val provided = props.provided
    val snapshot = props.snapshot
    val pole = props.pole
    val disabled = props.disabled ?: false
    val selected = props.selected ?: false
    val clone = props.clone ?: false
    val onSelectPole = props.onSelectPole

    Box {
        provided?.let {
            ref = it.innerRef
            +it.draggableProps
            if (!disabled) +it.dragHandleProps
            style = it.draggableProps.style
        }

        sx {
            backgroundColor = Color("white")
            borderRadius = 4.px
            marginBottom = 8.px
            userSelect = None.none

            if (snapshot?.isDragging == false || clone) {
                transform = important(None.none)
            }

            if (disabled || clone) {
                opacity = number(0.5)
            } else if (selected) {
                backgroundColor = important(Color("lightblue"))
            }
        }

        Box {
            sx {
                padding = 8.px
                display = Display.flex
                flexDirection = FlexDirection.row
                justifyContent = JustifyContent.spaceBetween
            }
            if (onSelectPole != null && !disabled) {
                onClick = { onSelectPole(it.shiftKey) }
            }
            PoleItem { this.pole = pole }
        }
        Box {
            sx {
                cursor = Auto.auto
            }
            +props.children
        }
    }
}

fun Stop.toPoleDetail() = PoleDetail(id)