package jp.kaiz.shachia.dianet.components

import jp.kaiz.shachia.dianet.Override
import jp.kaiz.shachia.gtfs.js.data.JsStop
import mui.material.Box
import mui.material.Checkbox
import mui.material.FormControlLabel
import mui.system.sx
import react.*
import react.beautiful.dnd.Draggable
import web.cssom.px


external interface DraggableStyledPoleProps : Props {
    var override: Override
    var pole: JsStop
    var index: Int
    var onChangeOverride: (Override) -> Unit
}

val DraggableStyledSortedPole = FC<DraggableStyledPoleProps> { props ->
    val pole = props.pole
    val index = props.index
    val override = props.override

    var open by useState(override != Override.NONE)

    Draggable {
        key = pole.stopId
        draggableId = index.toString()
        this.index = index
        children = { provided, _, _ ->

            StyledPole.create {
                this.provided = provided
                this.pole = pole

                this.onSelectPole = { _ -> open = !open }

                if (open) {
                    Box {
                        sx {
                            paddingInline = 8.px
                        }

                        FormControlLabel {
                            label = ReactNode("主要停留所")
                            control = Checkbox.create {
                                checked = override.majorStop
                                onChange = { _, checked -> props.onChangeOverride(override.copy(majorStop = checked)) }
                            }
                        }

                        FormControlLabel {
                            label = ReactNode("分岐発停")
                            control = Checkbox.create {
                                checked = override.branchStart
                                onChange =
                                    { _, checked -> props.onChangeOverride(override.copy(branchStart = checked)) }
                            }
                        }

                        FormControlLabel {
                            label = ReactNode("分岐着停")
                            control = Checkbox.create {
                                checked = override.branchEnd
                                onChange = { _, checked -> props.onChangeOverride(override.copy(branchEnd = checked)) }
                            }
                        }
                    }
                }
            }
        }
    }
}
