package jp.kaiz.shachia.dianet.components

import js.objects.jso
import mui.icons.material.Edit
import mui.material.*
import mui.system.sx
import react.FC
import react.Props
import react.dom.onChange
import react.useState
import web.cssom.*


external interface TitleWithEditorProps : Props {
    var text: String
    var onChange: (String) -> Unit
}

val TitleWithEditor = FC<TitleWithEditorProps> { props ->
    var editing by useState(false)

    Box {
        sx {
            display = Display.flex
            flexGrow = number(1.0)
        }
        if (editing) {
            TextField {
                sx {
                    marginBlock = 0.67.em
                }
                inputProps = jso {
                    style = jso {
                        fontSize = 2.em
                        fontWeight = FontWeight.bold
                    }
                }
                variant = FormControlVariant.standard
                value = props.text
                onChange = { (it.target.asDynamic().value as String).also(props.onChange) }
                onBlur = { editing = false }
            }
        } else {
            Typography {
                sx {
                    fontSize = 2.em
                    fontWeight = FontWeight.bold
                    marginBlock = 0.67.em
                }
                +props.text
            }
            Box {
                sx { display = Display.flex }
                IconButton {
                    sx { marginBlock = Auto.auto }
                    Edit {}
                    onClick = { editing = true }
                }
            }
        }
    }
}